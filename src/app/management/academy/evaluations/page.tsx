'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { academyUserService, userGroupService, squadService } from '@/lib/academy-services';
import { evaluationTemplateService, playerEvaluationService } from '@/lib/evaluation-services';
import {
  AcademyUser, Squad, PlayerEvaluation, EvaluationTemplate,
  DEFAULT_EVALUATION_SKILLS, EVALUATION_PERIODS, EvaluationSkill,
} from '@/types/academy';
import {
  Loader2, Star, Search, AlertCircle, X, Plus,
  Save, ClipboardList, TrendingUp, Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, toGreekUpperCase } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Simple radar chart component (SVG)
function RadarChart({ skills, ratings, previousRatings, size = 200 }: {
  skills: EvaluationSkill[];
  ratings: Record<string, number>;
  previousRatings?: Record<string, number>;
  size?: number;
}) {
  const center = size / 2;
  const maxRadius = size / 2 - 30;
  const count = skills.length;
  if (count < 3) return null;

  const angleStep = (2 * Math.PI) / count;

  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 5) * maxRadius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const gridLevels = [1, 2, 3, 4, 5];

  const currentPoints = skills.map((s, i) => getPoint(i, ratings[s.key] || 0));
  const currentPath = currentPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const prevPoints = previousRatings ? skills.map((s, i) => getPoint(i, previousRatings[s.key] || 0)) : null;
  const prevPath = prevPoints ? prevPoints.map((p) => `${p.x},${p.y}`).join(' ') : null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Grid */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={skills.map((_, i) => { const p = getPoint(i, level); return `${p.x},${p.y}`; }).join(' ')}
          fill="none" stroke="#e4e4e7" strokeWidth={level === 5 ? 1.5 : 0.5}
        />
      ))}
      {/* Axes */}
      {skills.map((_, i) => {
        const p = getPoint(i, 5);
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#e4e4e7" strokeWidth={0.5} />;
      })}
      {/* Previous ratings (ghost) */}
      {prevPath && (
        <polygon points={prevPath} fill="rgba(139, 92, 246, 0.08)" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 3" />
      )}
      {/* Current ratings */}
      <polygon points={currentPath} fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" strokeWidth={2} />
      {currentPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#10b981" stroke="white" strokeWidth={1.5} />
      ))}
      {/* Labels */}
      {skills.map((skill, i) => {
        const labelPoint = getPoint(i, 6.2);
        return (
          <text
            key={i}
            x={labelPoint.x} y={labelPoint.y}
            textAnchor="middle" dominantBaseline="middle"
            className="fill-zinc-500 text-[9px] font-bold uppercase"
          >
            {skill.label}
          </text>
        );
      })}
    </svg>
  );
}

export default function EvaluationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<AcademyUser[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [evaluations, setEvaluations] = useState<PlayerEvaluation[]>([]);
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [squadFilter, setSquadFilter] = useState('all');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formAthlete, setFormAthlete] = useState<AcademyUser | null>(null);
  const [formPeriod, setFormPeriod] = useState(() => {
    const q = Math.ceil((new Date().getMonth() + 1) / 3);
    return `${new Date().getFullYear()}-Q${q}`;
  });
  const [formRatings, setFormRatings] = useState<Record<string, number>>({});
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Detail view
  const [detailAthlete, setDetailAthlete] = useState<AcademyUser | null>(null);

  // Template settings
  const [showSettings, setShowSettings] = useState(false);
  const [templateSkills, setTemplateSkills] = useState<EvaluationSkill[]>([]);
  const [newSkillLabel, setNewSkillLabel] = useState('');

  const venueId = venueOwner?.venueId || '';

  const loadData = useCallback(async () => {
    if (!venueId) return;
    try {
      setIsLoading(true);
      const [usersData, groupsData, squadsData, evalsData, templatesData] = await Promise.all([
        academyUserService.getByVenue(venueId),
        userGroupService.getByVenue(venueId),
        squadService.getByVenue(venueId),
        playerEvaluationService.getByVenue(venueId),
        evaluationTemplateService.getByVenue(venueId),
      ]);
      setSquads(squadsData);
      setEvaluations(evalsData);
      setTemplates(templatesData);

      const evalGroups = groupsData.filter((g) => g.capabilities.includes('player_evaluation'));
      const evalGroupIds = new Set(evalGroups.map((g) => g.id));
      setAthletes(usersData.filter((u) => evalGroupIds.has(u.groupId)));

      // Init template skills
      if (templatesData.length > 0) {
        setTemplateSkills(templatesData[0].skills);
      } else {
        setTemplateSkills(DEFAULT_EVALUATION_SKILLS);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης');
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }
    loadData();
  }, [user, venueOwner, authLoading, router, pathname, loadData]);

  const activeTemplate = templates[0] || null;
  const skills = activeTemplate?.skills || templateSkills;

  const getAthleteEvals = (athleteId: string) =>
    evaluations.filter((e) => e.athleteId === athleteId).sort((a, b) => b.period.localeCompare(a.period));

  const getLatestEval = (athleteId: string) => getAthleteEvals(athleteId)[0] || null;

  const getAvgRating = (eval_: PlayerEvaluation) => {
    const vals = Object.values(eval_.ratings);
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  };

  const filteredAthletes = useMemo(() => {
    return athletes.filter((a) => {
      const matchesSearch = search === '' || a.displayName.toLowerCase().includes(search.toLowerCase());
      const matchesSquad = squadFilter === 'all' ||
        (a.squad_ids || []).includes(squadFilter) || a.squad_id === squadFilter;
      return matchesSearch && matchesSquad;
    });
  }, [athletes, search, squadFilter]);

  const openEvalForm = (athlete: AcademyUser) => {
    setFormAthlete(athlete);
    const initRatings: Record<string, number> = {};
    skills.forEach((s) => { initRatings[s.key] = 3; });
    setFormRatings(initRatings);
    setFormNotes('');
    setShowForm(true);
  };

  const handleSaveEval = async () => {
    if (!formAthlete) return;
    setIsSaving(true);
    try {
      // Ensure template exists
      let templateId = activeTemplate?.id || '';
      if (!templateId) {
        templateId = await evaluationTemplateService.create({
          venueId, name: 'Αξιολόγηση', skills: templateSkills,
        });
        setTemplates([{ id: templateId, venueId, name: 'Αξιολόγηση', skills: templateSkills, createdAt: new Date(), updatedAt: new Date() }]);
      }

      const athleteSquadIds = formAthlete.squad_ids || (formAthlete.squad_id ? [formAthlete.squad_id] : []);
      const squad = squads.find((s) => athleteSquadIds.includes(s.id));
      const [year, quarter] = formPeriod.split('-');
      const periodInfo = EVALUATION_PERIODS.find((p) => p.value === quarter);

      await playerEvaluationService.create({
        venueId,
        athleteId: formAthlete.id,
        athleteName: formAthlete.displayName,
        squadId: squad?.id || '',
        squadName: squad ? `${squad.name} (${squad.ageGroup})` : '',
        coachId: user?.uid || '',
        coachName: venueOwner?.name || '',
        templateId,
        period: formPeriod,
        periodLabel: `${periodInfo?.label || quarter} ${year}`,
        ratings: formRatings,
        notes: formNotes,
      });

      await loadData();
      setShowForm(false);
      setFormAthlete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία αποθήκευσης');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (activeTemplate) {
        await evaluationTemplateService.update(activeTemplate.id, { skills: templateSkills });
      } else {
        await evaluationTemplateService.create({ venueId, name: 'Αξιολόγηση', skills: templateSkills });
      }
      await loadData();
      setShowSettings(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία αποθήκευσης');
    }
  };

  const currentYear = new Date().getFullYear();
  const periodOptions = [];
  for (let y = currentYear; y >= currentYear - 1; y--) {
    for (const p of EVALUATION_PERIODS) {
      periodOptions.push({ value: `${y}-${p.value}`, label: `${p.label} ${y}` });
    }
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>;

  // Detail view for an athlete
  if (detailAthlete) {
    const athleteEvals = getAthleteEvals(detailAthlete.id);
    const latest = athleteEvals[0];
    const previous = athleteEvals[1];

    return (
      <div className="space-y-8 pb-20">
        <div className="flex items-center gap-3.5 pb-2 border-b border-zinc-50">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-zinc-200 shrink-0" onClick={() => setDetailAthlete(null)}>
            <X className="h-4 w-4 text-zinc-400" />
          </Button>
          <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shrink-0">
            <TrendingUp className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">{toGreekUpperCase(detailAthlete.displayName)}</h1>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{toGreekUpperCase('Ιστορικό Αξιολογήσεων')}</p>
          </div>
          <div className="ml-auto">
            <Button size="sm" onClick={() => openEvalForm(detailAthlete)} className="h-9 px-4 rounded-lg bg-zinc-900 hover:bg-black text-white font-bold text-[10px] uppercase">
              <Plus className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />{toGreekUpperCase('Νέα Αξιολόγηση')}
            </Button>
          </div>
        </div>

        {/* Radar chart - latest vs previous */}
        {latest && (
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Τελευταία Αξιολόγηση')} — {latest.periodLabel}</h3>
              {previous && (
                <div className="flex items-center gap-3 text-[9px] font-bold">
                  <span className="flex items-center gap-1"><span className="h-2 w-6 rounded-full bg-emerald-500 inline-block" /> {latest.periodLabel}</span>
                  <span className="flex items-center gap-1"><span className="h-0.5 w-6 border-t-2 border-dashed border-violet-400 inline-block" /> {previous.periodLabel}</span>
                </div>
              )}
            </div>
            <RadarChart skills={skills} ratings={latest.ratings} previousRatings={previous?.ratings} size={280} />
            <div className="flex items-center justify-center gap-2 mt-4">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span className="text-lg font-black text-zinc-900">{getAvgRating(latest).toFixed(1)}</span>
              <span className="text-xs font-bold text-zinc-400">/ 5</span>
            </div>
            {latest.notes && (
              <div className="mt-4 p-3 bg-zinc-50 rounded-xl">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">{toGreekUpperCase('Σχόλια Προπονητή')}</p>
                <p className="text-sm text-zinc-600">{latest.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* All evaluations timeline */}
        <div className="space-y-3">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Ιστορικό')}</h3>
          {athleteEvals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center">
              <ClipboardList className="h-8 w-8 text-zinc-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-zinc-400">{toGreekUpperCase('Δεν υπάρχουν αξιολογήσεις')}</p>
            </div>
          ) : (
            athleteEvals.map((ev) => (
              <div key={ev.id} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Star className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-900">{ev.periodLabel}</p>
                  <p className="text-[10px] text-zinc-400">{ev.coachName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-black text-zinc-900">{getAvgRating(ev).toFixed(1)}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {skills.slice(0, 4).map((s) => (
                      <div key={s.key} className="text-center">
                        <p className="text-[7px] font-bold text-zinc-300">{s.label.slice(0, 3)}</p>
                        <p className="text-[10px] font-black text-zinc-600">{ev.ratings[s.key] || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-sm font-bold text-red-700">{error}</p></div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-50">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-200 shrink-0">
            <TrendingUp className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">{toGreekUpperCase('Αξιολογήσεις')}</h1>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{toGreekUpperCase('Κάρτα προόδου αθλητών')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="h-9 px-4 rounded-lg border-zinc-200 font-bold text-[10px] uppercase">
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />{toGreekUpperCase('Ρυθμίσεις')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input placeholder={toGreekUpperCase('Αναζήτηση αθλητή...')} value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-10 bg-white rounded-lg border-zinc-100 shadow-sm font-bold text-xs uppercase" />
        </div>
        <Select value={squadFilter} onValueChange={setSquadFilter}>
          <SelectTrigger className="h-10 px-4 rounded-lg bg-white border-zinc-100 shadow-sm font-bold text-xs min-w-[160px] uppercase">
            <SelectValue placeholder={toGreekUpperCase('Τμήμα')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="font-bold text-sm">{toGreekUpperCase('Όλα')}</SelectItem>
            {squads.map((s) => (<SelectItem key={s.id} value={s.id} className="font-bold text-sm">{toGreekUpperCase(s.name)}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {/* Athletes Grid */}
      {athletes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-100 bg-white p-16 text-center">
          <ClipboardList className="h-10 w-10 text-zinc-200 mx-auto mb-4" />
          <h3 className="text-lg font-black text-zinc-900 mb-2">{toGreekUpperCase('Δεν υπάρχουν αθλητές')}</h3>
          <p className="text-sm text-zinc-400">Ενεργοποιήστε τη δυνατότητα &quot;Αξιολόγηση αθλητή&quot; σε κάποια κατηγορία χρηστών.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAthletes.map((athlete) => {
            const latest = getLatestEval(athlete.id);
            const evalCount = getAthleteEvals(athlete.id).length;
            const athleteSquadIds = athlete.squad_ids || (athlete.squad_id ? [athlete.squad_id] : []);
            const squad = squads.find((s) => athleteSquadIds.includes(s.id));

            return (
              <div key={athlete.id} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center text-sm font-black text-zinc-400">
                      {athlete.displayName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 uppercase group-hover:text-emerald-700 transition-colors">{toGreekUpperCase(athlete.displayName)}</p>
                      {squad && <p className="text-[10px] text-zinc-400">{squad.name}</p>}
                    </div>
                  </div>
                  {latest && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-black text-amber-700">{getAvgRating(latest).toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {latest ? (
                  <div className="mb-3">
                    <div className="grid grid-cols-4 gap-1.5">
                      {skills.slice(0, 4).map((s) => (
                        <div key={s.key} className="text-center p-1.5 bg-zinc-50 rounded-lg">
                          <p className="text-[7px] font-bold text-zinc-400 uppercase">{s.label.slice(0, 4)}</p>
                          <p className="text-xs font-black text-zinc-700">{latest.ratings[s.key] || '—'}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-zinc-300 mt-1.5">{latest.periodLabel} • {evalCount} αξιολ.</p>
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-300 mb-3 italic">Χωρίς αξιολόγηση</p>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDetailAthlete(athlete)} className="flex-1 h-8 rounded-lg text-[9px] font-bold uppercase border-zinc-200">
                    <TrendingUp className="h-3 w-3 mr-1" />{toGreekUpperCase('Ιστορικό')}
                  </Button>
                  <Button size="sm" onClick={() => openEvalForm(athlete)} className="flex-1 h-8 rounded-lg text-[9px] font-bold uppercase bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="h-3 w-3 mr-1" />{toGreekUpperCase('Αξιολόγηση')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Evaluation Form Dialog */}
      <AlertDialog open={showForm} onOpenChange={(open) => !open && setShowForm(false)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl p-0 max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
          {formAthlete && (
            <>
              <div className="bg-gradient-to-br from-zinc-800 via-zinc-900 to-black px-6 pt-6 pb-4">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-base font-black text-white tracking-tight text-left">
                    {toGreekUpperCase('Αξιολόγηση')}: {formAthlete.displayName}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400 text-xs text-left">
                    {toGreekUpperCase('Βαθμολογήστε τις δεξιότητες 1-5')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Period selector */}
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Περίοδος')}</Label>
                  <Select value={formPeriod} onValueChange={setFormPeriod}>
                    <SelectTrigger className="h-10 rounded-lg bg-zinc-50 border-none font-bold text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {periodOptions.map((p) => (<SelectItem key={p.value} value={p.value} className="font-bold text-sm">{p.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Skills rating */}
                <div className="space-y-3">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Δεξιότητες')}</Label>
                  {skills.map((skill) => (
                    <div key={skill.key} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50">
                      <span className="text-xs font-bold text-zinc-700">{skill.label}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setFormRatings((prev) => ({ ...prev, [skill.key]: v }))}
                            className="p-0.5 transition-all"
                          >
                            <Star className={cn(
                              "h-5 w-5 transition-colors",
                              v <= (formRatings[skill.key] || 0)
                                ? "text-amber-400 fill-amber-400"
                                : "text-zinc-200"
                            )} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Σχόλια Προπονητή')}</Label>
                  <textarea
                    value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3}
                    className="w-full rounded-xl bg-zinc-50 border-none p-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-zinc-300 resize-none"
                    placeholder="Σχόλια, παρατηρήσεις, στόχοι..."
                  />
                </div>
              </div>

              <div className="px-6 pb-6">
                <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
                  <AlertDialogAction onClick={handleSaveEval} disabled={isSaving}
                    className="h-11 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg m-0">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {toGreekUpperCase('Αποθήκευση')}
                  </AlertDialogAction>
                  <AlertDialogCancel className="h-9 w-full rounded-xl border-none bg-transparent text-zinc-400 font-bold text-sm m-0">
                    {toGreekUpperCase('Ακύρωση')}
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </div>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Template Settings Dialog */}
      <AlertDialog open={showSettings} onOpenChange={(open) => !open && setShowSettings(false)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl p-0 max-w-md overflow-hidden">
          <div className="bg-gradient-to-br from-zinc-800 via-zinc-900 to-black px-6 pt-6 pb-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-black text-white tracking-tight text-left">
                {toGreekUpperCase('Ρυθμίσεις Αξιολόγησης')}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400 text-xs text-left">
                {toGreekUpperCase('Ορίστε τις δεξιότητες που αξιολογούνται')}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              {templateSkills.map((skill, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50">
                  <span className="text-xs font-bold text-zinc-700 flex-1">{skill.label}</span>
                  <button
                    onClick={() => setTemplateSkills((prev) => prev.filter((_, idx) => idx !== i))}
                    className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Νέα δεξιότητα..." value={newSkillLabel} onChange={(e) => setNewSkillLabel(e.target.value)}
                className="h-10 flex-1 bg-zinc-50 border-none rounded-lg font-bold text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSkillLabel.trim()) {
                    setTemplateSkills((prev) => [...prev, { key: newSkillLabel.trim().toLowerCase().replace(/\s+/g, '_'), label: newSkillLabel.trim() }]);
                    setNewSkillLabel('');
                  }
                }}
              />
              <Button variant="outline" size="sm" disabled={!newSkillLabel.trim()} className="h-10 px-3 rounded-lg"
                onClick={() => {
                  if (newSkillLabel.trim()) {
                    setTemplateSkills((prev) => [...prev, { key: newSkillLabel.trim().toLowerCase().replace(/\s+/g, '_'), label: newSkillLabel.trim() }]);
                    setNewSkillLabel('');
                  }
                }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="px-6 pb-6">
            <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
              <AlertDialogAction onClick={handleSaveTemplate}
                className="h-11 w-full rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-sm shadow-lg m-0">
                <Save className="h-4 w-4 mr-2" />{toGreekUpperCase('Αποθήκευση')}
              </AlertDialogAction>
              <AlertDialogCancel className="h-9 w-full rounded-xl border-none bg-transparent text-zinc-400 font-bold text-sm m-0">
                {toGreekUpperCase('Ακύρωση')}
              </AlertDialogCancel>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
