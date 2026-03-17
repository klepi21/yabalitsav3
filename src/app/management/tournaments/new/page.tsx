'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Trophy,
  ArrowLeft,
  Swords,
  GitBranch,
  Layers,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { pitchService } from '@/lib/firebase-services';
import { tournamentService } from '@/lib/tournament-services';
import { Pitch } from '@/types';
import { Tournament } from '@/types/tournament';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type TournamentType = Tournament['type'];

const typeOptions: { value: TournamentType; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'league', label: 'Πρωτάθλημα', description: 'Round-robin — κάθε ομάδα παίζει με όλες', icon: Trophy },
  { value: 'knockout', label: 'Νοκ Άουτ', description: 'Αποκλεισμός — ο νικητής προχωρά', icon: GitBranch },
  { value: 'group+knockout', label: 'Όμιλοι + Νοκ Άουτ', description: 'Φάση ομίλων και μετά αποκλεισμός', icon: Layers },
];

const pitchTypes = ['5x5', '6x6', '7x7', '8x8', '9x9'] as const;

export default function NewTournamentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TournamentType>('league');
  const [pitchType, setPitchType] = useState<string>('5x5');
  const [pitchId, setPitchId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxTeams, setMaxTeams] = useState(8);
  const [matchDuration, setMatchDuration] = useState(60);
  const [legs, setLegs] = useState(1);
  const [rules, setRules] = useState('');
  const [prizeDescription, setPrizeDescription] = useState('');

  const loadPitches = useCallback(async () => {
    if (!venueOwner) return;
    try {
      const data = await pitchService.getByVenue(venueOwner.venueId);
      setPitches(data);
    } catch (err) {
      console.error('Error loading pitches:', err);
    }
  }, [venueOwner]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    loadPitches();
  }, [user, venueOwner, authLoading, router, pathname, loadPitches]);

  const filteredPitches = pitches.filter(p => p.type === pitchType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueOwner) return;

    if (!name.trim()) { setError('Εισάγετε όνομα τουρνουά'); return; }
    if (!startDate || !endDate) { setError('Εισάγετε ημερομηνίες'); return; }
    if (maxTeams < 2) { setError('Χρειάζονται τουλάχιστον 2 ομάδες'); return; }

    setIsSubmitting(true);
    setError(null);

    try {
      const id = await tournamentService.create({
        venueId: venueOwner.venueId,
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        pitchType: pitchType as Tournament['pitchType'],
        pitchId: pitchId || undefined,
        status: 'draft',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        maxTeams,
        matchDuration,
        legs: type === 'league' ? legs : 1,
        rules: rules.trim() || undefined,
        prizeDescription: prizeDescription.trim() || undefined,
      });
      router.push(`/management/tournaments/${id}`);
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError('Σφάλμα κατά τη δημιουργία. Δοκιμάστε ξανά.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 px-4 sm:px-0">
      {/* Back Button */}
      <Link
        href="/management/tournaments"
        className="group inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-emerald-600 transition-colors"
      >
        <div className="h-8 w-8 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </div>
        Επιστροφή στα Τουρνουά
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-zinc-100">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 rounded-[1.75rem] bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
            <Trophy className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase leading-none">
              Νέο Τουρνουά
            </h1>
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
              Δημιουργία νέας διοργάνωσης
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {error && (
          <div className="rounded-2xl border-2 border-red-100 bg-red-50 p-6 text-sm font-bold text-red-700 animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {/* Basic Info Section */}
        <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-10 space-y-10">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-violet-600" />
            </div>
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Βασικά Στοιχεία</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4 md:col-span-2 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Όνομα Τουρνουά *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="π.χ. Ανοιξιάτικο Πρωτάθλημα 2026"
                className="h-14 bg-zinc-50 border-none rounded-2xl px-6 text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-4 md:col-span-2 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Περιγραφή</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Περιγράψτε το τουρνουά σας (προαιρετικά)..."
                rows={4}
                className="w-full bg-zinc-50 border-none rounded-[2rem] px-6 py-4 text-sm font-bold text-zinc-900 placeholder:text-zinc-300 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-4 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Ημ. Έναρξης *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-4 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Ημ. Λήξης *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        {/* Tournament Type Section */}
        <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-10 space-y-10">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <GitBranch className="h-5 w-5 text-violet-600" />
            </div>
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Τύπος Διοργάνωσης</h2>
          </div>

          <div className="grid gap-6">
            {typeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={cn(
                    "flex items-center gap-6 rounded-[2rem] border-2 p-6 text-left transition-all duration-300",
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/30 shadow-lg shadow-emerald-50/50"
                      : "border-zinc-50 bg-zinc-50 text-zinc-400 hover:border-zinc-100 hover:bg-zinc-100/50"
                  )}
                >
                  <div className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center transition-all",
                    isSelected ? "bg-emerald-600 text-white" : "bg-white text-zinc-300"
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "text-lg font-black uppercase tracking-tight leading-tight",
                      isSelected ? "text-emerald-900" : "text-zinc-400"
                    )}>
                      {opt.label}
                    </p>
                    <p className={cn(
                      "text-xs font-bold mt-0.5",
                      isSelected ? "text-emerald-600" : "text-zinc-400/60"
                    )}>
                      {opt.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="h-6 w-6 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                      <Plus className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {type === 'league' && (
            <div className="space-y-6 pt-6 border-t border-zinc-50 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Αριθμός Γύρων (Φάση Πρωταθλήματος)</Label>
              <div className="flex items-center gap-4">
                {[
                  { value: 1, label: 'Μονός Γύρος (1×)' },
                  { value: 2, label: 'Διπλός Γύρος (2×)' }
                ].map((leg) => (
                  <button
                    key={leg.value}
                    type="button"
                    onClick={() => setLegs(leg.value as 1 | 2)}
                    className={cn(
                      "flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                      legs === leg.value
                        ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                        : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200"
                    )}
                  >
                    {leg.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pitch & Settings Section */}
        <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-10 space-y-10">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Layers className="h-5 w-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Γήπεδο & Ρυθμίσεις</h2>
          </div>

          <div className="space-y-6 text-left">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Τύπος Γηπέδου</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {pitchTypes.map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => { setPitchType(pt); setPitchId(''); }}
                  className={cn(
                    "px-6 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    pitchType === pt
                      ? "bg-zinc-900 text-white shadow-lg shadow-zinc-200"
                      : "bg-zinc-50 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                  )}
                >
                  {pt}
                </button>
              ))}
            </div>
          </div>

          {filteredPitches.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-zinc-50 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Επιλογή Γηπέδου (Προαιρετικό)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredPitches.map((p) => {
                  const isSelected = pitchId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPitchId(pitchId === p.id ? '' : p.id)}
                      className={cn(
                        "flex items-center justify-between rounded-[1.5rem] border-2 p-5 text-left transition-all duration-300",
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/30 shadow-md shadow-emerald-50/50"
                          : "border-zinc-50 bg-zinc-50 text-zinc-400 hover:border-zinc-100 hover:bg-zinc-100/50"
                      )}
                    >
                      <div>
                        <p className={cn(
                          "text-sm font-black uppercase tracking-tight",
                          isSelected ? "text-emerald-900" : "text-zinc-500"
                        )}>
                          {p.name}
                        </p>
                        <p className={cn(
                          "text-[10px] font-bold mt-0.5",
                          isSelected ? "text-emerald-600" : "text-zinc-400/60"
                        )}>
                          {p.slotDuration}&apos; / {p.pricePerSlot}€
                        </p>
                      </div>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                          <Plus className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-6 border-t border-zinc-50">
            <div className="space-y-4 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Μέγιστος Αριθμός Ομάδων *</Label>
              <Input
                type="number"
                min={2}
                max={64}
                value={maxTeams}
                onChange={(e) => setMaxTeams(parseInt(e.target.value) || 2)}
                className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-4 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Διάρκεια Αγώνα (λεπτά)</Label>
              <Input
                type="number"
                min={10}
                max={120}
                value={matchDuration}
                onChange={(e) => setMatchDuration(parseInt(e.target.value) || 60)}
                className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        {/* Extra Info Section */}
        <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-10 space-y-10">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Layers className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Πρόσθετα Στοιχεία</h2>
          </div>

          <div className="space-y-4 text-left">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Κανόνες Διοργάνωσης</Label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Ειδικοί κανόνες, μορφότυπο, κλπ..."
              rows={4}
              className="w-full bg-zinc-50 border-none rounded-[2rem] px-6 py-4 text-sm font-bold text-zinc-900 placeholder:text-zinc-300 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="space-y-4 text-left">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Έπαθλο & Βραβεία</Label>
            <Input
              value={prizeDescription}
              onChange={(e) => setPrizeDescription(e.target.value)}
              placeholder="π.χ. Κύπελλο + 500€ στην 1η ομάδα"
              className="h-14 bg-zinc-50 border-none rounded-2xl px-6 font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-6">
          <Button 
            type="button" 
            variant="ghost" 
            asChild 
            className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] text-zinc-400 hover:text-zinc-600"
          >
            <Link href="/management/tournaments">Ακύρωση</Link>
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-14 px-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-emerald-100 min-w-[200px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Δημιουργία...
              </>
            ) : (
              <>
                <Swords className="h-5 w-5 mr-2" />
                Δημιουργία Τουρνουά
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
