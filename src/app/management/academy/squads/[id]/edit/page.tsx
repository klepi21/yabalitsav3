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
import { cn, toGreekUpperCase } from '@/lib/utils';

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <div className="flex items-center gap-8">
           <Button variant="outline" size="icon" className="h-16 w-16 rounded-2xl border-2 border-zinc-100 hover:bg-zinc-50 hover:border-zinc-200 transition-all shrink-0 group" asChild>
            <Link href="/management/academy/squads">
              <ArrowLeft className="h-8 w-8 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            </Link>
          </Button>
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-[1.5rem] bg-zinc-900 flex items-center justify-center text-white shadow-2xl shadow-zinc-200 shrink-0">
              <Trophy className="h-10 w-10 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tight text-zinc-900 uppercase">
                {toGreekUpperCase('Επεξεργασία Τμήματος')}
              </h1>
              <p className="text-xl font-bold text-zinc-400 uppercase tracking-tight">
                {toGreekUpperCase('Ενημέρωση στοιχείων και μελών')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-red-700 font-black uppercase">{toGreekUpperCase(error)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-black uppercase">
              {toGreekUpperCase('Κλείσιμο')}
            </Button>
          </div>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit}>
        <div className="rounded-[2.5rem] border border-zinc-100 bg-white p-10 lg:p-16 space-y-12 shadow-sm">
          <div className="space-y-4">
            <Label htmlFor="name" className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] ml-2">
                {toGreekUpperCase('Όνομα Τμήματος *')}
            </Label>
            <Input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={toGreekUpperCase('π.χ. Λιοντάρια U12')}
              className="h-20 px-8 bg-zinc-50 rounded-[1.5rem] border-none shadow-inner focus:ring-8 focus:ring-emerald-500/10 font-black text-xl placeholder:text-zinc-200 w-full transition-all uppercase"
            />
          </div>

          <div className="space-y-6">
            <Label className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] ml-2">
                {toGreekUpperCase('Ηλικιακή Κατηγορία *')}
            </Label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {AGE_GROUPS.map((ag) => (
                <button
                  key={ag}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, ageGroup: ag }))}
                  className={`h-16 rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all duration-300 border-none shadow-sm ${
                    formData.ageGroup === ag
                      ? 'bg-zinc-900 text-white shadow-xl scale-110 z-10'
                      : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600'
                  }`}
                >
                  {ag}
                </button>
              ))}
            </div>
          </div>

          {coaches.length > 0 && (
            <div className="space-y-6">
              <Label className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] ml-2">
                {toGreekUpperCase('Ανάθεση Προπονητών')}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {coaches.map((coach) => {
                  const isSelected = formData.coachIds.includes(coach.id);
                  return (
                    <label
                      key={coach.id}
                      className={`flex items-center p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group/coach ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 shadow-lg scale-[1.02]'
                          : 'border-zinc-50 bg-zinc-50/50 hover:border-emerald-100 hover:bg-white hover:shadow-xl'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isSelected}
                        onChange={() => toggleCoach(coach.id)}
                      />
                      <div className="flex items-center gap-6 z-10">
                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0 ${
                          isSelected ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-zinc-300 group-hover/coach:bg-emerald-50 group-hover/coach:text-emerald-500'
                        }`}>
                          <Trophy className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                          <p className={`text-xl font-black uppercase tracking-tight transition-colors ${isSelected ? 'text-emerald-900' : 'text-zinc-900 group-hover/coach:text-emerald-700'}`}>
                            {toGreekUpperCase(coach.displayName)}
                          </p>
                          {coach.fields.specialization && (
                            <p className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${isSelected ? 'text-emerald-500' : 'text-zinc-400'}`}>
                              {toGreekUpperCase(String(coach.fields.specialization))}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={`absolute top-0 right-0 p-4 transition-all duration-500 ${isSelected ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-45 opacity-0'}`}>
                           <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg">
                               <Users className="h-5 w-5" />
                           </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Athletes in Squad */}
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b-2 border-zinc-50 pb-4">
              <Label className="text-zinc-900 font-black text-xl uppercase tracking-tight">
                {toGreekUpperCase('Αθλητές στο Τμήμα')}
              </Label>
              <div className="px-6 py-2 bg-zinc-900 text-white rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl">
                {squadAthletes.length} {toGreekUpperCase('Αθλητές')}
              </div>
            </div>

            {/* Current athletes */}
            {squadAthletes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {squadAthletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className="flex items-center justify-between p-6 rounded-[1.5rem] bg-emerald-50/40 border-2 border-emerald-100/50 hover:border-emerald-300 hover:bg-emerald-50 transition-all group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Users className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-lg font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase(athlete.displayName)}</p>
                        {athlete.fields.birth_year && (
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">{toGreekUpperCase(String(`Γέννηση: ${athlete.fields.birth_year}`))}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAthleteFromSquad(athlete.id)}
                      className="h-12 w-12 rounded-xl flex items-center justify-center bg-white text-zinc-300 hover:text-red-500 hover:shadow-lg transition-all active:scale-90 shadow-sm"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search & add athletes */}
            <div className="rounded-[2rem] bg-zinc-50 border-2 border-zinc-100 p-8 space-y-6 shadow-inner">
              <div className="flex items-center gap-4 text-zinc-400">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                   <Plus className="h-6 w-6" />
                </div>
                <span className="font-black text-xs uppercase tracking-[0.2em]">{toGreekUpperCase('Προσθήκη νέου αθλητή στο τμήμα')}</span>
              </div>
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-300 group-focus-within:text-emerald-500 transition-colors" />
                <Input
                  type="text"
                  placeholder={toGreekUpperCase('Αναζήτηση αθλητή από την ακαδημία...')}
                  value={athleteSearch}
                  onChange={(e) => setAthleteSearch(e.target.value)}
                  className="pl-16 h-16 bg-white rounded-[1.25rem] border-none shadow-sm focus:ring-8 focus:ring-emerald-500/10 font-bold text-lg uppercase transition-all"
                />
              </div>
              
              {athleteSearch && (
                <div className="max-h-72 overflow-y-auto rounded-[1.5rem] border-2 border-zinc-100 bg-white shadow-2xl divide-y divide-zinc-50 animate-in fade-in slide-in-from-top-4">
                  {availableAthletes.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center gap-4">
                        <Users className="h-10 w-10 text-zinc-100" />
                        <p className="font-black text-sm text-zinc-300 uppercase tracking-widest">{toGreekUpperCase('Δεν βρέθηκαν αθλητές')}</p>
                    </div>
                  ) : (
                    availableAthletes.map((athlete) => (
                      <button
                        key={athlete.id}
                        type="button"
                        onClick={() => { addAthleteToSquad(athlete); setAthleteSearch(''); }}
                        className="w-full flex items-center justify-between p-6 hover:bg-emerald-50 transition-all text-left group/item"
                      >
                        <div className="flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-zinc-50 flex items-center justify-center group-hover/item:bg-white group-hover/item:scale-110 transition-all shrink-0">
                                <Users className="h-7 w-7 text-zinc-300 group-hover/item:text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-xl font-black text-zinc-900 group-hover/item:text-emerald-700 uppercase tracking-tight transition-colors">{toGreekUpperCase(athlete.displayName)}</p>
                                {athlete.fields.birth_year && (
                                    <p className="text-[10px] font-black text-zinc-400 group-hover/item:text-emerald-500 uppercase tracking-widest mt-0.5">{toGreekUpperCase(String(`Γέννηση: ${athlete.fields.birth_year}`))}</p>
                                )}
                            </div>
                        </div>
                        <div className="h-10 w-10 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-300 group-hover/item:bg-emerald-500 group-hover/item:text-white transition-all shadow-sm">
                            <Plus className="h-5 w-5" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 pt-12 border-t border-zinc-50">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-20 rounded-[1.5rem] border-2 border-zinc-100 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 font-black uppercase text-lg tracking-widest transition-all"
              onClick={() => router.back()}
            >
              {toGreekUpperCase('Ακύρωση')}
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1 h-20 rounded-[1.5rem] bg-zinc-900 hover:bg-black text-white font-black uppercase text-xl tracking-widest transition-all shadow-2xl active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-7 w-7 animate-spin mr-3 text-emerald-400" />
                  {toGreekUpperCase('Αποθήκευση...')}
                </>
              ) : (
                toGreekUpperCase('Αποθήκευση Αλλαγών')
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
