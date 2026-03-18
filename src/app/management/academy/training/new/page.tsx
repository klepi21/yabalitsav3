'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { trainingService } from '@/lib/training-services';
import { squadService, academyUserService, userGroupService } from '@/lib/academy-services';
import { Squad, AcademyUser } from '@/types/academy';
import { TrainingType, TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS, TrainingDrill } from '@/types/training';
import {
  Loader2, ArrowLeft, Dumbbell, Plus, Trash2, Clock, AlertCircle, CalendarDays, User, BookOpen, Target, Save, Repeat, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, toGreekUpperCase } from '@/lib/utils';

const TRAINING_TYPES: TrainingType[] = ['training', 'friendly', 'fitness', 'tactical', 'recovery'];

export default function NewTrainingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [coaches, setCoaches] = useState<AcademyUser[]>([]);

  const venueId = venueOwner?.venueId || '';

  const [form, setForm] = useState({
    title: '',
    squadId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '17:00',
    endTime: '18:30',
    type: 'training' as TrainingType,
    coachId: '',
    assistantCoachIds: [] as string[],
    notes: '',
  });
  const [drills, setDrills] = useState<TrainingDrill[]>([]);
  const [newDrill, setNewDrill] = useState({ name: '', duration: 15, description: '' });

  // Recurring
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringWeeks, setRecurringWeeks] = useState(4);

  const DAYS = ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'];

  const toggleRecurringDay = (day: number) => {
    setRecurringDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const getRecurringDates = (): string[] => {
    if (!isRecurring || recurringDays.length === 0) return [form.date];
    const dates: string[] = [];
    const startDate = new Date(form.date + 'T00:00:00');
    const weekStart = new Date(startDate);
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    for (let week = 0; week < recurringWeeks; week++) {
      for (const day of recurringDays) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + week * 7 + day);
        if (d >= startDate) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          dates.push(key);
        }
      }
    }
    return dates.sort();
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [squadsData, groups] = await Promise.all([
          squadService.getByVenue(venueId),
          userGroupService.getByVenue(venueId),
        ]);
        setSquads(squadsData);
        const coachGroup = groups.find((g) => g.capabilities?.includes('coach_squads'));
        if (coachGroup) {
          const coachUsers = await academyUserService.getByGroup(venueId, coachGroup.id);
          setCoaches(coachUsers);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, venueOwner, authLoading, router, venueId, pathname]);

  const addDrill = () => {
    if (!newDrill.name.trim()) return;
    setDrills((prev) => [...prev, { ...newDrill, name: newDrill.name.trim(), description: newDrill.description.trim() || undefined }]);
    setNewDrill({ name: '', duration: 15, description: '' });
  };

  const removeDrill = (index: number) => {
    setDrills((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Ο τίτλος είναι υποχρεωτικός'); return; }
    if (!form.squadId) { setError('Επιλέξτε τμήμα'); return; }
    if (!form.coachId) { setError('Επιλέξτε προπονητή'); return; }

    try {
      setIsSaving(true);
      setError(null);
      const coach = coaches.find((c) => c.id === form.coachId);
      const dates = getRecurringDates();
      const recurringGroupId = isRecurring && dates.length > 1 ? crypto.randomUUID() : undefined;
      for (const date of dates) {
        await trainingService.create({
          venueId,
          squadId: form.squadId,
          title: form.title.trim(),
          date,
          startTime: form.startTime,
          endTime: form.endTime,
          type: form.type,
          coachId: form.coachId,
          coachName: coach?.displayName || '',
          assistantCoachIds: form.assistantCoachIds,
          notes: form.notes,
          drills,
          attendance: [],
          status: 'scheduled',
          ...(recurringGroupId ? { recurringGroupId } : {}),
        });
      }
      router.push('/management/academy/training');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία δημιουργίας');
      setIsSaving(false);
    }
  };

  const totalDrillMinutes = drills.reduce((sum, d) => sum + d.duration, 0);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-50">
        <div className="flex items-center gap-3.5">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-zinc-200 shrink-0" asChild>
            <Link href="/management/academy/training">
              <ArrowLeft className="h-4 w-4 text-zinc-400" />
            </Link>
          </Button>
          <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-200 shrink-0">
            <Dumbbell className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
              {toGreekUpperCase('Νέα Προπόνηση')}
            </h1>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {toGreekUpperCase('Προγραμματίστε την επόμενη δραστηριότητα')}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm font-bold text-red-700">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Info */}
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-zinc-50 flex items-center justify-center">
                  <CalendarDays className="h-4 w-4 text-zinc-400" />
                </div>
                <h2 className="text-base font-black text-zinc-900 tracking-tight uppercase">
                  {toGreekUpperCase('Γενικά Στοιχεία')}
                </h2>
              </div>

              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Τίτλος Προπόνησης')} *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="π.χ. Προπόνηση U12 - Τακτική & Τελειώματα"
                  className="h-11 bg-zinc-50 border-none rounded-xl px-4 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Τύπος Δραστηριότητας')} *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {TRAINING_TYPES.map((type) => {
                    const colors = TRAINING_TYPE_COLORS[type];
                    const isSelected = form.type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, type }))}
                        className={cn(
                          "h-10 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border",
                          isSelected
                            ? `${colors.bg} ${colors.text} ${colors.border} shadow-md ring-2 ring-zinc-100`
                            : "bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200"
                        )}
                      >
                        {toGreekUpperCase(TRAINING_TYPE_LABELS[type])}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Τμήμα')} *</Label>
                  <Select value={form.squadId} onValueChange={(val: string) => setForm((p) => ({ ...p, squadId: val }))}>
                    <SelectTrigger className="h-11 px-4 bg-zinc-50 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-emerald-500/20 uppercase">
                      <SelectValue placeholder={toGreekUpperCase('Επιλέξτε τμήμα...')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-zinc-100 shadow-2xl">
                      {squads.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="font-bold text-sm">{toGreekUpperCase(`${s.name} (${s.ageGroup})`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Προπονητής')} *</Label>
                  <Select value={form.coachId} onValueChange={(val: string) => setForm((p) => ({ ...p, coachId: val }))}>
                    <SelectTrigger className="h-11 px-4 bg-zinc-50 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-emerald-500/20 uppercase">
                      <SelectValue placeholder={toGreekUpperCase('Επιλέξτε προπονητή...')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-zinc-100 shadow-2xl">
                      {coaches.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="font-bold text-sm">{toGreekUpperCase(c.displayName)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Ημερομηνία')} *</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className="h-11 bg-zinc-50 border-none rounded-xl px-4 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Έναρξη')} *</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                    className="h-11 bg-zinc-50 border-none rounded-xl px-4 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Λήξη')} *</Label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                    className="h-11 bg-zinc-50 border-none rounded-xl px-4 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Recurring */}
              <div className="space-y-3 pt-4 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-zinc-400" />
                    <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      {toGreekUpperCase('Επαναλαμβανόμενη')}
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={cn(
                      "relative h-6 w-10 rounded-full transition-all",
                      isRecurring ? "bg-emerald-500" : "bg-zinc-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all",
                      isRecurring ? "left-[18px]" : "left-0.5"
                    )} />
                  </button>
                </div>

                {isRecurring && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label className="text-[8px] font-black uppercase tracking-widest text-emerald-600">
                        {toGreekUpperCase('Ημέρες')}
                      </Label>
                      <div className="grid grid-cols-7 gap-1.5">
                        {DAYS.map((day, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleRecurringDay(i)}
                            className={cn(
                              "h-9 rounded-lg text-[9px] font-black uppercase transition-all",
                              recurringDays.includes(i)
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-white text-zinc-400 border border-zinc-200 hover:border-emerald-300"
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[8px] font-black uppercase tracking-widest text-emerald-600">
                        {toGreekUpperCase('Εβδομάδες')}
                      </Label>
                      <div className="flex items-center gap-2">
                        {[2, 4, 6, 8, 12].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setRecurringWeeks(w)}
                            className={cn(
                              "h-8 px-3 rounded-lg text-xs font-black transition-all",
                              recurringWeeks === w
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-white text-zinc-500 border border-zinc-200 hover:border-emerald-300"
                            )}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    {recurringDays.length > 0 && (
                      <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-emerald-100">
                        <CalendarDays className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <p className="text-[10px] font-bold text-emerald-700">
                          <span className="font-black">{getRecurringDates().length}</span> προπονήσεις
                          ({recurringDays.map((d) => DAYS[d]).join(', ')} x {recurringWeeks} εβδ.)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Drills */}
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center">
                    <Target className="h-4 w-4 text-violet-600" />
                  </div>
                  <h2 className="text-base font-black text-zinc-900 tracking-tight uppercase">
                    {toGreekUpperCase('Ασκήσεις')}
                  </h2>
                </div>
                {drills.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 rounded-lg">
                    <Clock className="h-3.5 w-3.5 text-violet-600" />
                    <span className="text-xs font-black text-violet-700">{totalDrillMinutes} λ.</span>
                  </div>
                )}
              </div>

              {drills.length > 0 && (
                <div className="space-y-2">
                  {drills.map((drill, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-white hover:shadow-sm transition-all">
                      <div className="h-8 w-8 rounded-lg bg-white border border-zinc-100 flex items-center justify-center text-sm font-black text-zinc-400">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-zinc-900 truncate">{drill.name}</p>
                          <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-md text-[9px] font-black shrink-0">{drill.duration} λ.</span>
                        </div>
                        {drill.description && <p className="text-[11px] text-zinc-400 truncate mt-0.5">{drill.description}</p>}
                      </div>
                      <button type="button" onClick={() => removeDrill(i)} className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add drill */}
              <div className="bg-zinc-50/50 border border-dashed border-zinc-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Άσκηση')}</Label>
                    <Input
                      placeholder="π.χ. Προθέρμανση με μπάλα..."
                      value={newDrill.name}
                      onChange={(e) => setNewDrill((p) => ({ ...p, name: e.target.value }))}
                      className="h-10 bg-white border-none rounded-lg px-3 font-bold text-sm focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Λεπτά')}</Label>
                    <Input
                      type="number"
                      value={newDrill.duration}
                      onChange={(e) => setNewDrill((p) => ({ ...p, duration: Number(e.target.value) || 0 }))}
                      className="h-10 bg-white border-none rounded-lg px-3 text-center font-black text-sm focus:ring-2 focus:ring-violet-500/20"
                      min={1}
                    />
                  </div>
                </div>
                <Input
                  placeholder="Περιγραφή (προαιρετικά)..."
                  value={newDrill.description}
                  onChange={(e) => setNewDrill((p) => ({ ...p, description: e.target.value }))}
                  className="h-10 bg-white border-none rounded-lg px-3 font-bold text-sm focus:ring-2 focus:ring-violet-500/20"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addDrill}
                  disabled={!newDrill.name.trim()}
                  className="h-10 w-full rounded-lg border-zinc-200 font-bold text-xs hover:bg-white"
                >
                  <Plus className="h-4 w-4 mr-2 text-violet-600" />
                  {toGreekUpperCase('Προσθήκη')}
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assistant Coaches */}
            {coaches.length > 1 && (
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <h2 className="text-base font-black text-zinc-900 tracking-tight uppercase">
                    {toGreekUpperCase('Βοηθοί')}
                  </h2>
                </div>
                <div className="space-y-2">
                  {coaches.filter((c) => c.id !== form.coachId).map((coach) => {
                    const isSelected = form.assistantCoachIds.includes(coach.id);
                    return (
                      <label
                        key={coach.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                          isSelected
                            ? "border-blue-300 bg-blue-50 shadow-sm"
                            : "border-zinc-100 bg-zinc-50 hover:border-zinc-200 hover:bg-white"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isSelected}
                          onChange={() => {
                            setForm((p) => ({
                              ...p,
                              assistantCoachIds: isSelected
                                ? p.assistantCoachIds.filter((id) => id !== coach.id)
                                : [...p.assistantCoachIds, coach.id],
                            }));
                          }}
                        />
                        <div className={cn(
                          "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all",
                          isSelected ? "bg-blue-600 border-blue-600" : "bg-white border-zinc-200"
                        )}>
                          {isSelected && <Plus className="h-3 w-3 text-white" />}
                        </div>
                        <span className={cn("text-xs font-bold uppercase", isSelected ? "text-blue-900" : "text-zinc-500")}>
                          {coach.displayName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-amber-600" />
                </div>
                <h2 className="text-base font-black text-zinc-900 tracking-tight uppercase">
                  {toGreekUpperCase('Σημειώσεις')}
                </h2>
              </div>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={5}
                className="w-full rounded-xl bg-zinc-50 border-none p-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 placeholder:text-zinc-300 resize-none transition-all"
                placeholder="Στόχοι, εξοπλισμός, οδηγίες..."
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isSaving}
                className="h-12 w-full rounded-xl bg-zinc-900 hover:bg-black text-white font-black text-sm shadow-lg transition-all active:scale-[0.98]"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2 text-emerald-400" />
                )}
                {isSaving
                  ? toGreekUpperCase('Αποθήκευση...')
                  : isRecurring && recurringDays.length > 0
                    ? toGreekUpperCase(`Δημιουργία ${getRecurringDates().length} Προπονήσεων`)
                    : toGreekUpperCase('Δημιουργία Προπόνησης')
                }
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full rounded-xl font-bold text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 text-sm"
                onClick={() => router.back()}
              >
                {toGreekUpperCase('Ακύρωση')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
