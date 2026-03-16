'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Trophy,
  ArrowLeft,
  GitBranch,
  Layers,
  Save,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { pitchService } from '@/lib/firebase-services';
import { tournamentService } from '@/lib/tournament-services';
import { Pitch } from '@/types';
import { Tournament } from '@/types/tournament';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TournamentType = Tournament['type'];

const typeOptions: { value: TournamentType; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'league', label: 'Πρωτάθλημα', description: 'Round-robin — κάθε ομάδα παίζει με όλες', icon: Trophy },
  { value: 'knockout', label: 'Νοκ Άουτ', description: 'Αποκλεισμός — ο νικητής προχωρά', icon: GitBranch },
  { value: 'group+knockout', label: 'Όμιλοι + Νοκ Άουτ', description: 'Φάση ομίλων και μετά αποκλεισμός', icon: Layers },
];

const pitchTypes = ['5x5', '6x6', '7x7', '8x8', '9x9'] as const;

function formatDateForInput(date: Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export default function EditTournamentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [status, setStatus] = useState<Tournament['status']>('draft');

  const tournamentId = params.id as string;

  const loadData = useCallback(async () => {
    if (!tournamentId || !venueOwner) return;
    try {
      const [t, pitchesData] = await Promise.all([
        tournamentService.getById(tournamentId),
        pitchService.getByVenue(venueOwner.venueId),
      ]);
      if (t) {
        setTournament(t);
        setName(t.name);
        setDescription(t.description || '');
        setType(t.type);
        setPitchType(t.pitchType);
        setPitchId(t.pitchId || '');
        setStartDate(formatDateForInput(t.startDate));
        setEndDate(formatDateForInput(t.endDate));
        setMaxTeams(t.maxTeams);
        setMatchDuration(t.matchDuration);
        setLegs(t.legs);
        setRules(t.rules || '');
        setPrizeDescription(t.prizeDescription || '');
        setStatus(t.status);
      }
      setPitches(pitchesData);
    } catch (err) {
      console.error('Error loading tournament:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId, venueOwner]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    loadData();
  }, [user, venueOwner, authLoading, router, pathname, loadData]);

  const filteredPitches = pitches.filter(p => p.type === pitchType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueOwner || !tournament) return;

    if (!name.trim()) { setError('Εισάγετε όνομα τουρνουά'); return; }
    if (!startDate || !endDate) { setError('Εισάγετε ημερομηνίες'); return; }
    if (maxTeams < 2) { setError('Χρειάζονται τουλάχιστον 2 ομάδες'); return; }

    setIsSubmitting(true);
    setError(null);

    try {
      await tournamentService.update(tournament.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        pitchType: pitchType as Tournament['pitchType'],
        pitchId: pitchId || undefined,
        status,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        maxTeams,
        matchDuration,
        legs: type === 'league' ? legs : 1,
        rules: rules.trim() || undefined,
        prizeDescription: prizeDescription.trim() || undefined,
      });
      router.push(`/management/tournaments/${tournament.id}`);
    } catch (err) {
      console.error('Error updating tournament:', err);
      setError('Σφάλμα κατά την αποθήκευση. Δοκιμάστε ξανά.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto h-12 w-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
          <Trophy className="h-6 w-6 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900">Το τουρνουά δεν βρέθηκε</h3>
        <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href="/management/tournaments">Επιστροφή</Link>
        </Button>
      </div>
    );
  }

  const statusOptions: { value: Tournament['status']; label: string }[] = [
    { value: 'draft', label: 'Πρόχειρο' },
    { value: 'registration', label: 'Εγγραφές' },
    { value: 'active', label: 'Σε Εξέλιξη' },
    { value: 'completed', label: 'Ολοκληρωμένο' },
    { value: 'cancelled', label: 'Ακυρωμένο' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/management/tournaments/${tournament.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tournament.name}
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-600">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Επεξεργασία Τουρνουά</h1>
          <p className="text-sm text-zinc-500">Τροποποίηση στοιχείων τουρνουά</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">Βασικά Στοιχεία</h2>

          <div className="space-y-2">
            <Label className="text-zinc-700">Όνομα Τουρνουά *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="π.χ. Ανοιξιάτικο Πρωτάθλημα 2026"
              className="bg-white rounded-lg border-zinc-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-700">Περιγραφή</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Προαιρετική περιγραφή..."
              rows={3}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-700">Ημ. Έναρξης *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white rounded-lg border-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700">Ημ. Λήξης *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white rounded-lg border-zinc-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-700">Κατάσταση</Label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    status === opt.value
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tournament Type */}
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">Τύπος Τουρνουά</h2>

          <div className="grid gap-3">
            {typeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200'
                      : 'border-zinc-100 bg-zinc-50/30 hover:border-zinc-200'
                  }`}
                >
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${
                    isSelected ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isSelected ? 'text-emerald-900' : 'text-zinc-700'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-zinc-500">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {type === 'league' && (
            <div className="space-y-2">
              <Label className="text-zinc-700">Αριθμός Γύρων</Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLegs(1)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                    legs === 1 ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  Μονός (1×)
                </button>
                <button
                  type="button"
                  onClick={() => setLegs(2)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                    legs === 2 ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  Διπλός (2×)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pitch & Settings */}
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">Γήπεδο & Ρυθμίσεις</h2>

          <div className="space-y-2">
            <Label className="text-zinc-700">Τύπος Γηπέδου</Label>
            <div className="flex items-center gap-1.5">
              {pitchTypes.map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => { setPitchType(pt); setPitchId(''); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    pitchType === pt
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>
          </div>

          {filteredPitches.length > 0 && (
            <div className="space-y-2">
              <Label className="text-zinc-700">Γήπεδο (Προαιρετικό)</Label>
              <div className="grid gap-2">
                {filteredPitches.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPitchId(pitchId === p.id ? '' : p.id)}
                    className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all text-sm ${
                      pitchId === p.id
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : 'border-zinc-100 hover:border-zinc-200'
                    }`}
                  >
                    <span className={pitchId === p.id ? 'font-medium text-emerald-900' : 'text-zinc-700'}>
                      {p.name}
                    </span>
                    <span className="text-xs text-zinc-400">{p.slotDuration}&apos; / &euro;{p.pricePerSlot}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-700">Μέγ. Ομάδες *</Label>
              <Input
                type="number"
                min={2}
                max={64}
                value={maxTeams}
                onChange={(e) => setMaxTeams(parseInt(e.target.value) || 2)}
                className="bg-white rounded-lg border-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700">Διάρκεια Αγώνα (λεπτά)</Label>
              <Input
                type="number"
                min={10}
                max={120}
                value={matchDuration}
                onChange={(e) => setMatchDuration(parseInt(e.target.value) || 60)}
                className="bg-white rounded-lg border-zinc-200"
              />
            </div>
          </div>
        </div>

        {/* Extra Info */}
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">Πρόσθετα</h2>

          <div className="space-y-2">
            <Label className="text-zinc-700">Κανόνες</Label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Κανόνες τουρνουά (προαιρετικό)..."
              rows={3}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-700">Έπαθλο</Label>
            <Input
              value={prizeDescription}
              onChange={(e) => setPrizeDescription(e.target.value)}
              placeholder="π.χ. Κύπελλο + 500€"
              className="bg-white rounded-lg border-zinc-200"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild className="rounded-lg">
            <Link href={`/management/tournaments/${tournament.id}`}>Ακύρωση</Link>
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Αποθήκευση...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Αποθήκευση
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
