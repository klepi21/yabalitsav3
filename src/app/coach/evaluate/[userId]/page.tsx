'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Star,
  Loader2,
  Save,
  Check,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { academyUserService, squadService } from '@/lib/academy-services';
import { evaluationTemplateService, playerEvaluationService } from '@/lib/evaluation-services';
import { DEFAULT_EVALUATION_SKILLS, EVALUATION_PERIODS } from '@/types/academy';
import type { AcademyUser, EvaluationSkill, Squad } from '@/types/academy';

export default function CoachEvaluatePage() {
  const params = useParams();
  const router = useRouter();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const userId = params.userId as string;

  const [athlete, setAthlete] = useState<AcademyUser | null>(null);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [skills, setSkills] = useState<EvaluationSkill[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [period, setPeriod] = useState(() => {
    const q = Math.ceil((new Date().getMonth() + 1) / 3);
    return `${new Date().getFullYear()}-Q${q}`;
  });
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading || !venueOwner) return;

    const load = async () => {
      try {
        // Load athlete
        const users = await academyUserService.getByVenue(venueId);
        const found = users.find(u => u.id === userId);
        if (!found) { router.back(); return; }
        setAthlete(found);

        // Load squad
        const squadIds = found.squad_ids || (found.squad_id ? [found.squad_id] : []);
        if (squadIds.length > 0) {
          const squads = await squadService.getByVenue(venueId);
          setSquad(squads.find(s => squadIds.includes(s.id)) || null);
        }

        // Load template
        const templates = await evaluationTemplateService.getByVenue(venueId);
        if (templates.length > 0) {
          setSkills(templates[0].skills);
          setTemplateId(templates[0].id);
          const initRatings: Record<string, number> = {};
          templates[0].skills.forEach(s => { initRatings[s.key] = 3; });
          setRatings(initRatings);
        } else {
          setSkills(DEFAULT_EVALUATION_SKILLS);
          const initRatings: Record<string, number> = {};
          DEFAULT_EVALUATION_SKILLS.forEach(s => { initRatings[s.key] = 3; });
          setRatings(initRatings);
        }
      } catch (err) {
        console.error('Failed to load:', err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [userId, venueOwner, authLoading, router, venueId]);

  const setRating = useCallback((key: string, value: number) => {
    setRatings(prev => ({ ...prev, [key]: value }));
    setSavedSuccess(false);
  }, []);

  const handleSave = async () => {
    if (!athlete) return;
    setIsSaving(true);
    try {
      // Ensure template exists
      let tId = templateId;
      if (!tId) {
        tId = await evaluationTemplateService.create({
          venueId,
          name: 'Αξιολόγηση',
          skills,
        });
        setTemplateId(tId);
      }

      const [year, quarter] = period.split('-');
      const periodInfo = EVALUATION_PERIODS.find(p => p.value === quarter);

      await playerEvaluationService.create({
        venueId,
        athleteId: athlete.id,
        athleteName: athlete.displayName,
        squadId: squad?.id || '',
        squadName: squad ? `${squad.name} (${squad.ageGroup})` : '',
        coachId: user?.uid || '',
        coachName: venueOwner?.name || '',
        templateId: tId,
        period,
        periodLabel: `${periodInfo?.label || quarter} ${year}`,
        ratings,
        notes,
      });

      setSavedSuccess(true);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Period options
  const currentYear = new Date().getFullYear();
  const periodOptions: { value: string; label: string }[] = [];
  for (const year of [currentYear, currentYear - 1]) {
    for (const p of EVALUATION_PERIODS) {
      periodOptions.push({
        value: `${year}-${p.value}`,
        label: `${p.label} ${year}`,
      });
    }
  }

  const currentPeriodLabel = periodOptions.find(p => p.value === period)?.label || period;

  // Average rating
  const avgRating = skills.length > 0
    ? (Object.values(ratings).reduce((a, b) => a + b, 0) / skills.length).toFixed(1)
    : '0';

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <p className="text-zinc-400">Ο αθλητής δεν βρέθηκε</p>
      </div>
    );
  }

  if (savedSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-zinc-50 px-6">
        <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
          <Check className="h-10 w-10 text-emerald-600" />
        </div>
        <h2 className="text-xl font-black text-zinc-900 text-center">Η αξιολόγηση αποθηκεύτηκε!</h2>
        <p className="text-sm text-zinc-400 mt-2 text-center">
          {athlete.displayName} · {currentPeriodLabel} · {avgRating}/5
        </p>
        <div className="flex gap-3 mt-8">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 rounded-xl bg-zinc-100 text-zinc-600 font-bold text-sm active:scale-95 transition-all"
          >
            Πίσω
          </button>
          <button
            onClick={() => {
              setSavedSuccess(false);
              const initRatings: Record<string, number> = {};
              skills.forEach(s => { initRatings[s.key] = 3; });
              setRatings(initRatings);
              setNotes('');
            }}
            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm active:scale-95 transition-all"
          >
            Νέα Αξιολόγηση
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-zinc-100">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-zinc-400 active:text-zinc-600 -ml-1 p-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-center flex-1 px-2">
              <p className="text-sm font-black text-zinc-900 truncate">{athlete.displayName}</p>
              <p className="text-[11px] text-zinc-400 font-medium">
                {squad ? `${squad.name} (${squad.ageGroup})` : 'Αξιολόγηση'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-emerald-600">{avgRating}</span>
              <span className="text-[12px] text-zinc-400 font-bold">/5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="px-4 py-3">
        <button
          onClick={() => setShowPeriodPicker(!showPeriodPicker)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-zinc-100 shadow-sm active:bg-zinc-50"
        >
          <span className="text-sm font-bold text-zinc-900">{currentPeriodLabel}</span>
          <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", showPeriodPicker && "rotate-180")} />
        </button>
        {showPeriodPicker && (
          <div className="mt-2 bg-white rounded-xl border border-zinc-100 shadow-lg overflow-hidden">
            {periodOptions.map(p => (
              <button
                key={p.value}
                onClick={() => { setPeriod(p.value); setShowPeriodPicker(false); }}
                className={cn(
                  "w-full text-left px-4 py-3 text-sm font-medium border-b border-zinc-50 last:border-none active:bg-zinc-50",
                  period === p.value ? "bg-emerald-50 text-emerald-700 font-bold" : "text-zinc-700"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Skills Rating */}
      <div className="flex-1 px-4 space-y-2 pb-28">
        {skills.map(skill => {
          const rating = ratings[skill.key] || 0;
          return (
            <div key={skill.key} className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">{skill.label}</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    onClick={() => setRating(skill.key, value)}
                    className="flex-1 active:scale-90 transition-transform"
                  >
                    <div className={cn(
                      "flex items-center justify-center py-3 rounded-xl transition-all",
                      value <= rating
                        ? "bg-amber-400 shadow-sm shadow-amber-200"
                        : "bg-zinc-100"
                    )}>
                      <Star className={cn(
                        "h-6 w-6",
                        value <= rating ? "text-white fill-white" : "text-zinc-300"
                      )} />
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-2 px-1">
                <span className="text-[11px] text-zinc-300 font-bold">ΑΡΧΑΡΙΟΣ</span>
                <span className="text-[11px] text-zinc-300 font-bold">ΑΡΙΣΤΟΣ</span>
              </div>
            </div>
          );
        })}

        {/* Notes */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Σχόλια Προπονητή</p>
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); setSavedSuccess(false); }}
            placeholder="Γράψε σχόλια για τον αθλητή..."
            rows={4}
            className="w-full rounded-xl border border-zinc-100 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
          />
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-zinc-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-zinc-400 font-medium">
              {skills.length} δεξιότητες · Μ.Ο. {avgRating}/5
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Αποθήκευση
          </button>
        </div>
      </div>
    </div>
  );
}
