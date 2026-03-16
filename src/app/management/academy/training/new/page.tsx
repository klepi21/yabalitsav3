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
  Loader2, ArrowLeft, Dumbbell, Plus, Trash2, Clock, AlertCircle, CalendarDays, User, BookOpen, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [squadsData, groups] = await Promise.all([
          squadService.getByVenue(venueId),
          userGroupService.getOrSeed(venueId),
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
      await trainingService.create({
        venueId,
        squadId: form.squadId,
        title: form.title.trim(),
        date: form.date,
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
      });
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
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-zinc-100 hover:bg-zinc-50 shrink-0 shadow-sm" asChild>
          <Link href="/management/academy/training">
            <ArrowLeft className="h-6 w-6 text-zinc-600" />
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
            <Dumbbell className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-zinc-900 uppercase">{toGreekUpperCase('Νέα Προπόνηση')}</h1>
            <p className="text-lg font-medium text-zinc-500">Προγραμματίστε την επόμενη δραστηριότητα της ομάδας.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-red-700 font-bold">{error}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setError(null)} 
              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold"
            >
              Κλείσιμο
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* General Info Card */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 sm:p-10 space-y-8">
                <div className="flex items-center gap-4 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center">
                        <CalendarDays className="h-5 w-5 text-zinc-400" />
                    </div>
                    <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Γενικά Στοιχεία</h2>
                </div>

                <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Τίτλος Προπόνησης *</Label>
                    <Input
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="π.χ. Προπόνηση U12 - Τακτική & Τελειώματα"
                    className="h-16 bg-zinc-50 border-none rounded-2xl px-6 font-bold text-lg focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    />
                </div>

                <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Τύπος Δραστηριότητας *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {TRAINING_TYPES.map((type) => {
                        const colors = TRAINING_TYPE_COLORS[type];
                        const isSelected = form.type === type;
                        return (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, type }))}
                            className={cn(
                                "h-14 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm border-2",
                                isSelected
                                ? `${colors.bg} ${colors.text} border-emerald-500 scale-[1.05] shadow-lg shadow-emerald-100`
                                : "bg-white text-zinc-500 border-zinc-100 hover:border-zinc-200"
                            )}
                        >
                            {TRAINING_TYPE_LABELS[type]}
                        </button>
                        );
                    })}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Τμήμα *</Label>
                        <div className="relative">
                            <select
                                value={form.squadId}
                                onChange={(e) => setForm((p) => ({ ...p, squadId: e.target.value }))}
                                className="h-14 w-full rounded-2xl bg-zinc-50 border-none px-6 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 appearance-none transition-all"
                            >
                                <option value="">Επιλέξτε τμήμα...</option>
                                {squads.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} ({s.ageGroup})</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                                <Plus className="h-4 w-4" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Υπεύθυνος Προπονητής *</Label>
                        <div className="relative">
                            <select
                                value={form.coachId}
                                onChange={(e) => setForm((p) => ({ ...p, coachId: e.target.value }))}
                                className="h-14 w-full rounded-2xl bg-zinc-50 border-none px-6 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 appearance-none transition-all"
                            >
                                <option value="">Επιλέξτε προπονητή...</option>
                                {coaches.map((c) => (
                                <option key={c.id} value={c.id}>{c.displayName}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                                <User className="h-4 w-4" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Ημερομηνία *</Label>
                        <Input
                            type="date"
                            value={form.date}
                            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                            className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
                        />
                    </div>
                    <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Έναρξη *</Label>
                        <Input
                            type="time"
                            value={form.startTime}
                            onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                            className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
                        />
                    </div>
                    <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Λήξη *</Label>
                        <Input
                            type="time"
                            value={form.endTime}
                            onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                            className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Drills Section Card */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 sm:p-10 space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center">
                            <Target className="h-5 w-5 text-violet-600" />
                        </div>
                        <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Ασκήσεις & Πρόγραμμα</h2>
                    </div>
                    {drills.length > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-violet-50 rounded-xl">
                            <Clock className="h-4 w-4 text-violet-600" />
                            <span className="text-sm font-black text-violet-700">{totalDrillMinutes} λ.</span>
                        </div>
                    )}
                </div>

                {drills.length > 0 && (
                    <div className="space-y-3">
                    {drills.map((drill, i) => (
                        <div key={i} className="flex items-center gap-6 p-6 rounded-2xl border border-zinc-100 bg-zinc-50/50 group transition-all hover:border-violet-200 hover:bg-white hover:shadow-md">
                            <div className="h-10 w-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center font-black text-zinc-400">
                                {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <p className="text-lg font-black text-zinc-900 uppercase tracking-tight">{drill.name}</p>
                                    <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-black">{drill.duration} λ.</span>
                                </div>
                                {drill.description && <p className="text-sm font-medium text-zinc-500">{drill.description}</p>}
                            </div>
                            <button type="button" onClick={() => removeDrill(i)} className="h-10 w-10 rounded-xl flex items-center justify-center text-zinc-300 hover:text-red-600 hover:bg-red-50 hover:border-red-100 border border-transparent transition-all">
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                    </div>
                )}

                {/* Add drill form */}
                <div className="bg-zinc-50/50 border-2 border-dashed border-zinc-200 rounded-3xl p-6 sm:p-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-6">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Όνομα Άσκησης</Label>
                            <Input
                            placeholder="π.χ. Προθέρμανση με μπάλα..."
                            value={newDrill.name}
                            onChange={(e) => setNewDrill((p) => ({ ...p, name: e.target.value }))}
                            className="h-14 bg-white border-none rounded-2xl px-6 font-bold focus:ring-4 focus:ring-violet-500/10 transition-all"
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Διάρκεια (λ.)</Label>
                            <Input
                            type="number"
                            placeholder="Λεπτά"
                            value={newDrill.duration}
                            onChange={(e) => setNewDrill((p) => ({ ...p, duration: Number(e.target.value) || 0 }))}
                            className="h-14 bg-white border-none rounded-2xl px-4 text-center font-black focus:ring-4 focus:ring-violet-500/10 transition-all"
                            min={1}
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Περιγραφή (Προαιρετικά)</Label>
                        <Input
                        placeholder="Περιγράψτε το στόχο ή τον τρόπο εκτέλεσης της άσκησης..."
                        value={newDrill.description}
                        onChange={(e) => setNewDrill((p) => ({ ...p, description: e.target.value }))}
                        className="h-14 bg-white border-none rounded-2xl px-6 font-bold focus:ring-4 focus:ring-violet-500/10 transition-all"
                        />
                    </div>
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={addDrill} 
                        disabled={!newDrill.name.trim()}
                        className="h-14 w-full rounded-2xl border-none bg-white text-zinc-900 font-bold shadow-sm hover:shadow-md hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="h-5 w-5 text-violet-600" />
                        Προσθήκη στο Πρόγραμμα
                    </Button>
                </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-10">
            {/* Assistant Coaches Card */}
            {coaches.length > 1 && (
                <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Βοηθοί</h2>
                    </div>

                    <div className="space-y-2">
                        {coaches.filter((c) => c.id !== form.coachId).map((coach) => {
                        const isSelected = form.assistantCoachIds.includes(coach.id);
                        return (
                            <label
                            key={coach.id}
                            className={cn(
                                "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300",
                                isSelected
                                ? "border-blue-500 bg-blue-50 text-blue-900 shadow-md"
                                : "border-zinc-50 bg-zinc-50 text-zinc-500 hover:border-zinc-200 hover:bg-white"
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
                            <span className="text-sm font-black uppercase tracking-tight">{coach.displayName}</span>
                            </label>
                        );
                        })}
                    </div>
                </div>
            )}

            {/* Notes Card */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 space-y-8">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Σημειώσεις</h2>
                </div>

                <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Παρατηρήσεις Προπονητή</Label>
                    <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={6}
                    className="w-full rounded-2xl bg-zinc-50 border-none p-6 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 placeholder:text-zinc-300 resize-none transition-all"
                    placeholder="Στόχοι προπόνησης, απαραίτητος εξοπλισμός, ειδικές οδηγίες..."
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4">
                <Button 
                    type="submit" 
                    disabled={isSaving} 
                    className="h-20 w-full rounded-[2rem] bg-zinc-900 hover:bg-emerald-600 text-white font-black text-xl shadow-2xl transition-all hover:translate-y-[-4px] active:translate-y-[2px]"
                >
                    {isSaving ? (
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-7 w-7 animate-spin" />
                            <span>Αποθήκευση...</span>
                        </div>
                    ) : (
                        'Δημιουργία Προπόνησης'
                    )}
                </Button>
                <Button 
                    type="button" 
                    variant="ghost" 
                    className="h-14 w-full rounded-2xl font-black text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100" 
                    onClick={() => router.back()}
                >
                    Ακύρωση
                </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
