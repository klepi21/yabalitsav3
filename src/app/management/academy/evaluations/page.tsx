'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCoachFilter } from '@/hooks/useCoachFilter';
import { academyUserService, userGroupService, squadService } from '@/lib/academy-services';
import { evaluationTemplateService, playerEvaluationService } from '@/lib/evaluation-services';
import {
  AcademyUser, Squad, PlayerEvaluation, EvaluationTemplate,
  DEFAULT_EVALUATION_SKILLS, EVALUATION_PERIODS, EvaluationSkill,
} from '@/types/academy';
import {
  Loader2, Star, Search, AlertCircle, X, Plus,
  Save, ClipboardList, TrendingUp, Settings2, Send, CheckCircle2, Download, Eye,
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

// Generate Player Passport HTML for print/preview
function generateEvalHTML(
  eval_: PlayerEvaluation,
  skills: EvaluationSkill[],
  venueName: string,
): string {
  const avgRating = Object.values(eval_.ratings).length > 0
    ? (Object.values(eval_.ratings).reduce((s, v) => s + v, 0) / Object.values(eval_.ratings).length)
    : 0;

  const ratingsRows = skills.map((skill) => {
    const rating = eval_.ratings[skill.key] || 0;
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    return `<tr>
      <td style="padding:10px 16px;font-weight:700;color:#374151;border-bottom:1px solid #f1f5f9">${skill.label}</td>
      <td style="padding:10px 16px;text-align:center;color:#f59e0b;font-size:18px;letter-spacing:2px;border-bottom:1px solid #f1f5f9">${stars}</td>
      <td style="padding:10px 16px;text-align:center;font-weight:700;color:#1e293b;border-bottom:1px solid #f1f5f9">${rating}/5</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      @page { size: A4; margin: 0; }
      body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: white; color: #1e293b; }
      .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; }
      .header { background: linear-gradient(135deg, #18181b, #27272a); padding: 32px; text-align: center; }
      .header h1 { color: #10b981; font-size: 24px; margin: 0 0 4px; letter-spacing: -0.5px; }
      .header p { color: #71717a; font-size: 11px; margin: 4px 0; text-transform: uppercase; letter-spacing: 2px; }
      .info { padding: 24px 32px; background: #fafafa; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-start; }
      .info-left h2 { font-size: 20px; font-weight: 800; margin: 0 0 4px; text-transform: uppercase; }
      .info-left p { color: #71717a; font-size: 13px; margin: 0; }
      .badge { background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 12px 20px; text-align: center; }
      .badge .num { font-size: 28px; font-weight: 800; color: #92400e; }
      .badge .sub { font-size: 10px; font-weight: 700; color: #b45309; }
      .content { padding: 24px 32px; }
      .section-title { color: #9ca3af; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
      thead th { background: #f8fafc; padding: 10px 16px; font-size: 9px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
      .notes { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; color: #166534; font-size: 14px; line-height: 1.6; margin-top: 24px; }
      .notes-title { color: #9ca3af; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 24px 0 12px; }
      .footer { padding: 20px 32px; background: #fafafa; border-top: 1px solid #e5e7eb; text-align: center; position: absolute; bottom: 0; left: 0; right: 0; }
      .footer p { color: #9ca3af; font-size: 11px; margin: 2px 0; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
  </head><body>
    <div class="page" style="position:relative">
      <div class="header">
        <h1>⚽ PLAYER PASSPORT</h1>
        <p>Κάρτα Προόδου Αθλητή</p>
        <p style="margin-top:8px">${venueName}</p>
      </div>
      <div class="info">
        <div class="info-left">
          <h2>${eval_.athleteName}</h2>
          <p>${eval_.squadName} &nbsp;|&nbsp; ${eval_.periodLabel} &nbsp;|&nbsp; ${eval_.coachName}</p>
        </div>
        <div class="badge">
          <div class="num">${avgRating.toFixed(1)}</div>
          <div class="sub">/ 5.0</div>
        </div>
      </div>
      <div class="content">
        <p class="section-title">Αξιολόγηση Δεξιοτήτων</p>
        <table>
          <thead><tr>
            <th style="text-align:left">Δεξιότητα</th>
            <th style="text-align:center">Βαθμολογία</th>
            <th style="text-align:center">Βαθμός</th>
          </tr></thead>
          <tbody>${ratingsRows}</tbody>
        </table>
        ${eval_.notes ? `<p class="notes-title">Σχόλια Προπονητή</p><div class="notes">${eval_.notes}</div>` : ''}
      </div>
      <div class="footer">
        <p>${venueName} — Yabalitsa</p>
        <p>${new Date().toLocaleDateString('el-GR')}</p>
      </div>
    </div>
  </body></html>`;
}

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
            className="fill-zinc-500 text-[11px] font-bold uppercase"
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
  const { filterSquads, isUserInVisibleSquad } = useCoachFilter();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<AcademyUser[]>([]);
  const [allUsers, setAllUsers] = useState<AcademyUser[]>([]);
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
  const [sendingEval, setSendingEval] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState<string | null>(null);
  const [sendConfirm, setSendConfirm] = useState<{ eval_: PlayerEvaluation; athlete: AcademyUser } | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

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
      setSquads(filterSquads(squadsData));
      setAllUsers(usersData);
      setEvaluations(evalsData);
      setTemplates(templatesData);

      const evalGroups = groupsData.filter((g) => g.capabilities.includes('player_evaluation'));
      const evalGroupIds = new Set(evalGroups.map((g) => g.id));
      setAthletes(usersData.filter((u) => evalGroupIds.has(u.groupId) && isUserInVisibleSquad(u)));

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
  }, [venueId, filterSquads, isUserInVisibleSquad]);

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

  const getNotificationEmail = (athlete: AcademyUser) => {
    const parent = allUsers.find((u) => u.linked_athletes?.includes(athlete.id));
    if (parent?.fields?.email) return { email: parent.fields.email as string, name: parent.displayName };
    if (athlete.fields?.contact_email) return { email: athlete.fields.contact_email as string, name: athlete.displayName };
    if (athlete.fields?.email) return { email: athlete.fields.email as string, name: athlete.displayName };
    return null;
  };

  const handleSendEval = async (ev: PlayerEvaluation, athlete: AcademyUser) => {
    const contact = getNotificationEmail(athlete);
    if (!contact) {
      setError(`Δεν βρέθηκε email για τον/την ${athlete.displayName}`);
      return;
    }
    setSendingEval(ev.id);
    try {
      const avgRating = (Object.values(ev.ratings).reduce((s, v) => s + v, 0) / Object.values(ev.ratings).length).toFixed(1);
      const token = await user?.getIdToken();
      const res = await fetch('/api/academy/send-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          parentEmail: contact.email,
          parentName: contact.name,
          athleteName: ev.athleteName,
          squadName: ev.squadName,
          periodLabel: ev.periodLabel,
          ratings: ev.ratings,
          skills,
          notes: ev.notes,
          coachName: ev.coachName,
          venueName: venueOwner?.name || '',
          avgRating,
          venueId,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const now = new Date().toISOString();
      await playerEvaluationService.update(ev.id, { sentAt: now });
      setEvaluations((prev) => prev.map((e) => e.id === ev.id ? { ...e, sentAt: now } : e));
      setSentSuccess(ev.id);
      setTimeout(() => setSentSuccess(null), 3000);
    } catch {
      setError('Αποτυχία αποστολής');
    } finally {
      setSendingEval(null);
    }
  };

  const handlePreviewPDF = (ev: PlayerEvaluation) => {
    const html = generateEvalHTML(ev, skills, venueOwner?.name || '');
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setPdfPreviewUrl(url);
  };

  const handleDownloadPDF = (ev: PlayerEvaluation) => {
    const html = generateEvalHTML(ev, skills, venueOwner?.name || '');
    const printWindow = window.open('', '_blank');
    if (!printWindow) { setError('Ενεργοποιήστε τα popups για εκτύπωση PDF'); return; }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const currentYear = new Date().getFullYear();
  const periodOptions: { value: string; label: string }[] = [];
  for (let y = currentYear; y >= currentYear - 1; y--) {
    for (const p of EVALUATION_PERIODS) {
      periodOptions.push({ value: `${y}-${p.value}`, label: `${p.label} ${y}` });
    }
  }

  if (isLoading) return (
    <div className="space-y-8 pb-20 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-50">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-zinc-200" />
          <div className="space-y-2">
            <div className="h-6 w-40 bg-zinc-200 rounded" />
            <div className="h-3 w-52 bg-zinc-100 rounded" />
          </div>
        </div>
        <div className="h-9 w-28 rounded-lg bg-zinc-200" />
      </div>
      {/* Filters skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-10 flex-1 rounded-lg bg-zinc-100" />
        <div className="h-10 w-40 rounded-lg bg-zinc-100" />
      </div>
      {/* Athletes grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-zinc-100 h-44" />
        ))}
      </div>
    </div>
  );

  // Dialogs rendered in both views
  const renderDialogs = () => (
    <>
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
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Περίοδος')}</Label>
                  <Select value={formPeriod} onValueChange={setFormPeriod}>
                    <SelectTrigger className="h-10 rounded-lg bg-zinc-50 border-none font-bold text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {periodOptions.map((p) => (<SelectItem key={p.value} value={p.value} className="font-bold text-sm">{p.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Δεξιότητες')}</Label>
                  {skills.map((skill) => (
                    <div key={skill.key} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50">
                      <span className="text-xs font-bold text-zinc-700">{skill.label}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <button key={v} type="button" onClick={() => setFormRatings((prev) => ({ ...prev, [skill.key]: v }))} className="p-0.5 transition-all">
                            <Star className={cn("h-5 w-5 transition-colors", v <= (formRatings[skill.key] || 0) ? "text-amber-400 fill-amber-400" : "text-zinc-200")} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Σχόλια Προπονητή')}</Label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3}
                    className="w-full rounded-xl bg-zinc-50 border-none p-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-zinc-300 resize-none"
                    placeholder="Σχόλια, παρατηρήσεις, στόχοι..." />
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

      {/* Send Evaluation Confirmation Dialog */}
      <AlertDialog open={sendConfirm !== null} onOpenChange={(open) => !open && setSendConfirm(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-0 max-w-sm overflow-hidden">
          {sendConfirm && (() => {
            const { eval_, athlete } = sendConfirm;
            const contact = getNotificationEmail(athlete);
            const avgR = Object.values(eval_.ratings).length > 0
              ? (Object.values(eval_.ratings).reduce((s, v) => s + v, 0) / Object.values(eval_.ratings).length).toFixed(1)
              : '0';
            return (
              <>
                <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 px-8 pt-8 pb-6 text-center">
                  <div className="mx-auto h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-600/20">
                    <Send className="h-6 w-6 text-white" />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-black text-white tracking-tight">
                      {toGreekUpperCase('Player Passport')}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-amber-100 text-sm mt-1">
                      {toGreekUpperCase('Προεπισκόπηση, λήψη ή αποστολή')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <div className="px-8 py-6 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                    <div className="h-10 w-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-lg shadow-sm">⚽</div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-zinc-900">{eval_.athleteName}</p>
                      <p className="text-[11px] text-zinc-400 font-medium">{eval_.periodLabel} • {eval_.squadName}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-black text-amber-700">{avgR}</span>
                    </div>
                  </div>
                  {contact ? (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-300">{toGreekUpperCase('Παραλήπτης')}</p>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center"><Send className="h-3.5 w-3.5 text-blue-500" /></div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{contact.name}</p>
                          <p className="text-[11px] text-zinc-400 font-medium">{contact.email}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                      <AlertCircle className="h-4 w-4 text-red-400 inline mr-2" />
                      <span className="text-xs font-bold text-red-600">{toGreekUpperCase('Δεν βρέθηκε email γονέα ή αθλητή. Προσθέστε email για αποστολή.')}</span>
                    </div>
                  )}
                  {eval_.sentAt && (
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-lg">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Τελευταία αποστολή: {new Date(eval_.sentAt).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
                <div className="px-8 pb-8">
                  <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
                    {contact ? (
                      <AlertDialogAction onClick={() => { handleSendEval(eval_, athlete); setSendConfirm(null); }}
                        className="h-12 w-full rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98] m-0">
                        <Send className="h-4 w-4 mr-2" />{toGreekUpperCase('Αποστολή Email')}
                      </AlertDialogAction>
                    ) : null}
                    <AlertDialogCancel className="h-10 w-full rounded-xl border-none bg-transparent text-zinc-400 hover:text-zinc-600 font-bold text-sm m-0">
                      {toGreekUpperCase('Κλείσιμο')}
                    </AlertDialogCancel>
                  </AlertDialogFooter>
                </div>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview Dialog */}
      <AlertDialog open={pdfPreviewUrl !== null} onOpenChange={(open) => { if (!open) { if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); } }}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl p-0 w-[95vw] max-w-4xl overflow-hidden" style={{ maxHeight: '95vh' }}>
          <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-100 bg-white">
            <AlertDialogHeader className="p-0 space-y-0">
              <AlertDialogTitle className="text-sm font-black text-zinc-900 uppercase">{toGreekUpperCase('Player Passport — Προεπισκόπηση')}</AlertDialogTitle>
              <AlertDialogDescription className="sr-only">Προεπισκόπηση PDF αξιολόγησης</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogCancel className="h-8 w-8 rounded-lg border-none p-0 flex items-center justify-center text-zinc-400 hover:text-zinc-600 m-0">
              <X className="h-4 w-4" />
            </AlertDialogCancel>
          </div>
          {pdfPreviewUrl && (
            <iframe src={pdfPreviewUrl} className="w-full border-none" style={{ height: 'calc(95vh - 52px)' }} />
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Template Settings Dialog */}
      <AlertDialog open={showSettings} onOpenChange={(open) => !open && setShowSettings(false)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl p-0 max-w-md overflow-hidden">
          <div className="bg-gradient-to-br from-zinc-800 via-zinc-900 to-black px-6 pt-6 pb-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-black text-white tracking-tight text-left">{toGreekUpperCase('Ρυθμίσεις Αξιολόγησης')}</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400 text-xs text-left">{toGreekUpperCase('Ορίστε τις δεξιότητες που αξιολογούνται')}</AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              {templateSkills.map((skill, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50">
                  <span className="text-xs font-bold text-zinc-700 flex-1">{skill.label}</span>
                  <button onClick={() => setTemplateSkills((prev) => prev.filter((_, idx) => idx !== i))} className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Νέα δεξιότητα..." value={newSkillLabel} onChange={(e) => setNewSkillLabel(e.target.value)} className="h-10 flex-1 bg-zinc-50 border-none rounded-lg font-bold text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter' && newSkillLabel.trim()) { setTemplateSkills((prev) => [...prev, { key: newSkillLabel.trim().toLowerCase().replace(/\s+/g, '_'), label: newSkillLabel.trim() }]); setNewSkillLabel(''); } }} />
              <Button variant="outline" size="sm" disabled={!newSkillLabel.trim()} className="h-10 px-3 rounded-lg"
                onClick={() => { if (newSkillLabel.trim()) { setTemplateSkills((prev) => [...prev, { key: newSkillLabel.trim().toLowerCase().replace(/\s+/g, '_'), label: newSkillLabel.trim() }]); setNewSkillLabel(''); } }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="px-6 pb-6">
            <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
              <AlertDialogAction onClick={handleSaveTemplate} className="h-11 w-full rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-sm shadow-lg m-0">
                <Save className="h-4 w-4 mr-2" />{toGreekUpperCase('Αποθήκευση')}
              </AlertDialogAction>
              <AlertDialogCancel className="h-9 w-full rounded-xl border-none bg-transparent text-zinc-400 font-bold text-sm m-0">{toGreekUpperCase('Ακύρωση')}</AlertDialogCancel>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // Detail view variables
  const detailEvals = detailAthlete ? getAthleteEvals(detailAthlete.id) : [];
  const detailLatest = detailEvals[0] || null;
  const detailPrevious = detailEvals[1] || null;

  if (detailAthlete) {
    const athleteEvals = detailEvals;
    const latest = detailLatest;
    const previous = detailPrevious;

    return (
      <><div className="space-y-8 pb-20">
        <div className="flex items-center gap-3.5 pb-2 border-b border-zinc-50">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-zinc-200 shrink-0" onClick={() => setDetailAthlete(null)}>
            <X className="h-4 w-4 text-zinc-400" />
          </Button>
          <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shrink-0">
            <TrendingUp className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">{toGreekUpperCase(detailAthlete.displayName)}</h1>
            <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest">{toGreekUpperCase('Ιστορικό Αξιολογήσεων')}</p>
          </div>
          <div className="ml-auto">
            <Button size="sm" onClick={() => openEvalForm(detailAthlete)} className="h-9 px-4 rounded-lg bg-zinc-900 hover:bg-black text-white font-bold text-[12px] uppercase">
              <Plus className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />{toGreekUpperCase('Νέα Αξιολόγηση')}
            </Button>
          </div>
        </div>

        {/* Radar chart - latest vs previous */}
        {latest && (
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Τελευταία Αξιολόγηση')} — {latest.periodLabel}</h3>
              {previous && (
                <div className="flex items-center gap-3 text-[11px] font-bold">
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
                <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-1">{toGreekUpperCase('Σχόλια Προπονητή')}</p>
                <p className="text-sm text-zinc-600">{latest.notes}</p>
              </div>
            )}
            {/* Send to parent button */}
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => detailAthlete && setSendConfirm({ eval_: latest, athlete: detailAthlete })}
                disabled={sendingEval === latest.id}
                className={cn(
                  "flex-1 h-9 rounded-lg font-bold text-[12px] uppercase",
                  latest.sentAt ? "border-emerald-200 text-emerald-600" : "border-zinc-200"
                )}
              >
                {sendingEval === latest.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : sentSuccess === latest.id ? (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                )}
                {latest.sentAt ? toGreekUpperCase('Επαναποστολή') : toGreekUpperCase('Αποστολή στον Γονέα')}
              </Button>
              {latest.sentAt && (
                <span className="text-[11px] text-emerald-500 font-bold">
                  Στάλθηκε {new Date(latest.sentAt).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' })}
                </span>
              )}
            </div>
            {/* Preview & Download */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => handlePreviewPDF(latest)} className="h-9 rounded-lg font-bold text-[12px] uppercase border-zinc-200">
                <Eye className="h-3.5 w-3.5 mr-1.5" />{toGreekUpperCase('Προεπισκόπηση')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(latest)} className="h-9 rounded-lg font-bold text-[12px] uppercase border-zinc-200">
                <Download className="h-3.5 w-3.5 mr-1.5" />{toGreekUpperCase('Εκτύπωση / PDF')}
              </Button>
            </div>
          </div>
        )}

        {/* All evaluations timeline */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Ιστορικό')}</h3>
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
                  <p className="text-[12px] text-zinc-400">{ev.coachName}</p>
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
                        <p className="text-[12px] font-black text-zinc-600">{ev.ratings[s.key] || '—'}</p>
                      </div>
                    ))}
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePreviewPDF(ev)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center bg-zinc-50 text-zinc-400 hover:bg-blue-50 hover:text-blue-500 transition-all"
                      title="Προεπισκόπηση"
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(ev)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center bg-zinc-50 text-zinc-400 hover:bg-violet-50 hover:text-violet-500 transition-all"
                      title="Εκτύπωση / PDF"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => detailAthlete && setSendConfirm({ eval_: ev, athlete: detailAthlete })}
                      disabled={sendingEval === ev.id}
                      className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center transition-all",
                        ev.sentAt
                          ? "bg-emerald-50 text-emerald-500 hover:bg-emerald-100"
                          : "bg-zinc-50 text-zinc-400 hover:bg-amber-50 hover:text-amber-500"
                      )}
                      title={ev.sentAt
                        ? `Στάλθηκε: ${new Date(ev.sentAt).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                        : 'Αποστολή email'
                      }
                    >
                      {sendingEval === ev.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : sentSuccess === ev.id ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {renderDialogs()}
      </>
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
            <p className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest">{toGreekUpperCase('Κάρτα προόδου αθλητών')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="h-9 px-4 rounded-lg border-zinc-200 font-bold text-[12px] uppercase">
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
                      {squad && <p className="text-[12px] text-zinc-400">{squad.name}</p>}
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
                    <p className="text-[11px] text-zinc-300 mt-1.5">{latest.periodLabel} • {evalCount} αξιολ.</p>
                  </div>
                ) : (
                  <p className="text-[12px] text-zinc-300 mb-3 italic">Χωρίς αξιολόγηση</p>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDetailAthlete(athlete)} className="flex-1 h-8 rounded-lg text-[11px] font-bold uppercase border-zinc-200">
                    <TrendingUp className="h-3 w-3 mr-1" />{toGreekUpperCase('Ιστορικό')}
                  </Button>
                  <Button size="sm" onClick={() => openEvalForm(athlete)} className="flex-1 h-8 rounded-lg text-[11px] font-bold uppercase bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="h-3 w-3 mr-1" />{toGreekUpperCase('Αξιολόγηση')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {renderDialogs()}
    </div>
  );
}
