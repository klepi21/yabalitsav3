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
  Loader2, ArrowLeft, Dumbbell, Plus, Trash2, Clock, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-200 shrink-0" asChild>
          <Link href="/management/academy/training">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <Dumbbell className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Νέα Προπόνηση</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Δημιουργία νέας προπόνησης</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6 sm:p-8 space-y-8">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-zinc-700">Τίτλος *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="π.χ. Προπόνηση U12 - Τακτική"
              className="h-11 bg-white"
            />
          </div>

          {/* Type */}
          <div className="space-y-3">
            <Label className="text-zinc-700">Τύπος Προπόνησης *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {TRAINING_TYPES.map((type) => {
                const colors = TRAINING_TYPE_COLORS[type];
                const isSelected = form.type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, type }))}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border ${
                      isSelected
                        ? `${colors.bg} ${colors.text} ${colors.border}`
                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    {TRAINING_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Squad + Coach */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-zinc-700">Τμήμα *</Label>
              <select
                value={form.squadId}
                onChange={(e) => setForm((p) => ({ ...p, squadId: e.target.value }))}
                className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none"
              >
                <option value="">Επιλέξτε τμήμα...</option>
                {squads.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.ageGroup})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700">Προπονητής *</Label>
              <select
                value={form.coachId}
                onChange={(e) => setForm((p) => ({ ...p, coachId: e.target.value }))}
                className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none"
              >
                <option value="">Επιλέξτε προπονητή...</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>{c.displayName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assistant Coaches */}
          {coaches.length > 1 && (
            <div className="space-y-3">
              <Label className="text-zinc-700">Βοηθοί Προπονητές</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {coaches.filter((c) => c.id !== form.coachId).map((coach) => {
                  const isSelected = form.assistantCoachIds.includes(coach.id);
                  return (
                    <label
                      key={coach.id}
                      className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-zinc-200 hover:border-zinc-300 text-zinc-600'
                      }`}
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
                      <span className="text-sm font-medium">{coach.displayName}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label className="text-zinc-700">Ημερομηνία *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="h-11 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700">Ώρα Έναρξης *</Label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                className="h-11 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700">Ώρα Λήξης *</Label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                className="h-11 bg-white"
              />
            </div>
          </div>

          {/* Drills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-700">Ασκήσεις</Label>
              {drills.length > 0 && (
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {totalDrillMinutes} λεπτά
                </span>
              )}
            </div>

            {drills.length > 0 && (
              <div className="space-y-1.5">
                {drills.map((drill, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-zinc-50/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{drill.name}</p>
                      <p className="text-xs text-zinc-400">
                        {drill.duration} λεπτά
                        {drill.description && ` — ${drill.description}`}
                      </p>
                    </div>
                    <button type="button" onClick={() => removeDrill(i)} className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add drill form */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_80px] gap-3">
                <Input
                  placeholder="Όνομα άσκησης..."
                  value={newDrill.name}
                  onChange={(e) => setNewDrill((p) => ({ ...p, name: e.target.value }))}
                  className="h-10 bg-white"
                />
                <Input
                  type="number"
                  placeholder="Λεπτά"
                  value={newDrill.duration}
                  onChange={(e) => setNewDrill((p) => ({ ...p, duration: Number(e.target.value) || 0 }))}
                  className="h-10 bg-white"
                  min={1}
                />
              </div>
              <Input
                placeholder="Περιγραφή (προαιρετικό)..."
                value={newDrill.description}
                onChange={(e) => setNewDrill((p) => ({ ...p, description: e.target.value }))}
                className="h-10 bg-white"
              />
              <Button type="button" variant="outline" size="sm" onClick={addDrill} disabled={!newDrill.name.trim()}>
                <Plus className="h-4 w-4" />
                Προσθήκη Άσκησης
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-zinc-700">Σημειώσεις Προπονητή</Label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
              className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Στόχοι προπόνησης, σημειώσεις..."
            />
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-100/60">
            <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => router.back()}>
              Ακύρωση
            </Button>
            <Button type="submit" disabled={isSaving} className="flex-1 h-11">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                'Δημιουργία Προπόνησης'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
