'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { squadService, academyUserService, userGroupService } from '@/lib/academy-services';
import { AcademyUser } from '@/types/academy';
import { ArrowLeft, Loader2, Trophy, AlertCircle, Users, Search, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AGE_GROUPS = ['U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U21', 'Ανδρών'];

export default function EditSquadPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [coaches, setCoaches] = useState<AcademyUser[]>([]);
  const [athletes, setAthletes] = useState<AcademyUser[]>([]);
  const [squadAthletes, setSquadAthletes] = useState<AcademyUser[]>([]);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const squadId = params?.id as string;
  const venueId = venueOwner?.venueId || '';

  const [formData, setFormData] = useState({
    name: '',
    ageGroup: 'U12',
    coachIds: [] as string[],
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }

    const loadData = async () => {
      try {
        setIsLoading(true);
        const [squad, groups] = await Promise.all([
          squadService.getById(squadId),
          userGroupService.getOrSeed(venueId),
        ]);

        if (!squad) {
          setError('Το τμήμα δεν βρέθηκε');
          setIsLoading(false);
          return;
        }

        setFormData({
          name: squad.name,
          ageGroup: squad.ageGroup,
          coachIds: squad.coachIds || [],
        });

        const allUsers = await academyUserService.getByVenue(venueId);

        const coachGroup = groups.find((g) => g.name === 'Προπονητής');
        if (coachGroup) {
          setCoaches(allUsers.filter((u) => u.groupId === coachGroup.id));
        }

        // Find athletes: groups with squad_assignment capability, or fallback to all users with squad_id
        const athleteGroupIds = groups
          .filter((g) => g.capabilities?.includes('squad_assignment'))
          .map((g) => g.id);

        const allAthletes = athleteGroupIds.length > 0
          ? allUsers.filter((u) => athleteGroupIds.includes(u.groupId))
          : allUsers.filter((u) => u.squad_ids?.length || u.squad_id);

        setSquadAthletes(allAthletes.filter((a) => (a.squad_ids || []).includes(squadId) || a.squad_id === squadId));
        setAthletes(allAthletes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης τμήματος');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, venueOwner, authLoading, router, venueId, squadId, pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Το όνομα τμήματος είναι υποχρεωτικό');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await squadService.update(squadId, {
        name: formData.name,
        ageGroup: formData.ageGroup,
        coachIds: formData.coachIds,
      });

      // Update athlete squad assignments
      const currentSquadAthleteIds = squadAthletes.map((a) => a.id);
      const originalSquadAthleteIds = athletes
        .filter((a) => (a.squad_ids || []).includes(squadId) || a.squad_id === squadId)
        .map((a) => a.id);

      // Remove athletes no longer in squad
      const removedIds = originalSquadAthleteIds.filter((id) => !currentSquadAthleteIds.includes(id));
      for (const id of removedIds) {
        const athlete = athletes.find((a) => a.id === id);
        const newSquadIds = (athlete?.squad_ids || []).filter((sid) => sid !== squadId);
        await academyUserService.update(id, { squad_ids: newSquadIds, squad_id: newSquadIds[0] || '' });
      }

      // Add new athletes to squad
      const addedIds = currentSquadAthleteIds.filter((id) => !originalSquadAthleteIds.includes(id));
      for (const id of addedIds) {
        const athlete = athletes.find((a) => a.id === id);
        const newSquadIds = [...(athlete?.squad_ids || []), squadId];
        await academyUserService.update(id, { squad_ids: newSquadIds, squad_id: newSquadIds[0] || '' });
      }

      router.push('/management/academy/squads');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία ενημέρωσης τμήματος');
      setIsSaving(false);
    }
  };

  const addAthleteToSquad = (athlete: AcademyUser) => {
    setSquadAthletes((prev) => [...prev, athlete]);
  };

  const removeAthleteFromSquad = (athleteId: string) => {
    setSquadAthletes((prev) => prev.filter((a) => a.id !== athleteId));
  };

  const availableAthletes = athletes.filter(
    (a) => !squadAthletes.some((sa) => sa.id === a.id) &&
      (athleteSearch === '' || a.displayName.toLowerCase().includes(athleteSearch.toLowerCase()))
  );

  const toggleCoach = (coachId: string) => {
    setFormData((prev) => ({
      ...prev,
      coachIds: prev.coachIds.includes(coachId)
        ? prev.coachIds.filter((id) => id !== coachId)
        : [...prev.coachIds, coachId],
    }));
  };

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
          <Link href="/management/academy/squads">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Επεξεργασία Τμήματος</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Ενημέρωση στοιχείων τμήματος</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-destructive/60 hover:text-destructive shrink-0">
              Κλείσιμο
            </Button>
          </div>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-zinc-100/60 bg-white p-6 sm:p-8 space-y-8">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-700">Όνομα Τμήματος *</Label>
            <Input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="π.χ. Λιοντάρια U12, Ακαδημία Juniors"
              className="h-11 bg-white"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-zinc-700">Ηλικιακή Κατηγορία *</Label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {AGE_GROUPS.map((ag) => (
                <button
                  key={ag}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, ageGroup: ag }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 border ${
                    formData.ageGroup === ag
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  {ag}
                </button>
              ))}
            </div>
          </div>

          {coaches.length > 0 && (
            <div className="space-y-3">
              <Label className="text-zinc-700">Ανάθεση Προπονητών</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {coaches.map((coach) => {
                  const isSelected = formData.coachIds.includes(coach.id);
                  return (
                    <label
                      key={coach.id}
                      className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isSelected}
                        onChange={() => toggleCoach(coach.id)}
                      />
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-emerald-100' : 'bg-zinc-100'
                        }`}>
                          <Trophy className={`h-4 w-4 ${isSelected ? 'text-emerald-600' : 'text-zinc-400'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{coach.displayName}</p>
                          <p className="text-xs text-zinc-400">{coach.fields.specialization}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Athletes in Squad */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-700">Αθλητές στο Τμήμα</Label>
              <span className="text-xs text-zinc-400">{squadAthletes.length} αθλητές</span>
            </div>

            {/* Current athletes */}
            {squadAthletes.length > 0 && (
              <div className="space-y-1.5">
                {squadAthletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Users className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{athlete.displayName}</p>
                        {athlete.fields.birth_year && (
                          <p className="text-xs text-zinc-400">Γέννηση: {athlete.fields.birth_year}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAthleteFromSquad(athlete.id)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search & add athletes */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Plus className="h-4 w-4" />
                <span className="font-medium">Προσθήκη αθλητή</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Αναζήτηση αθλητή..."
                  value={athleteSearch}
                  onChange={(e) => setAthleteSearch(e.target.value)}
                  className="pl-10 h-10 bg-white"
                />
              </div>
              {athleteSearch && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100">
                  {availableAthletes.length === 0 ? (
                    <div className="p-3 text-center text-sm text-zinc-400">Δεν βρέθηκαν αθλητές</div>
                  ) : (
                    availableAthletes.map((athlete) => (
                      <button
                        key={athlete.id}
                        type="button"
                        onClick={() => { addAthleteToSquad(athlete); setAthleteSearch(''); }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-zinc-50 transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{athlete.displayName}</p>
                          {athlete.fields.birth_year && (
                            <p className="text-xs text-zinc-400">Γέννηση: {athlete.fields.birth_year}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-100/60">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
              onClick={() => router.back()}
            >
              Ακύρωση
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1 h-11"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                'Αποθήκευση Αλλαγών'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
