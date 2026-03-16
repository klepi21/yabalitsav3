'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { squadService, academyUserService, userGroupService } from '@/lib/academy-services';
import { AcademyUser } from '@/types/academy';
import { ArrowLeft, Loader2, Trophy, AlertCircle } from 'lucide-react';
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

        const coachGroup = groups.find((g) => g.isDefault && g.name === 'Προπονητής');
        if (coachGroup) {
          const coachUsers = await academyUserService.getByGroup(venueId, coachGroup.id);
          setCoaches(coachUsers);
        }
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
      router.push('/management/academy/squads');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία ενημέρωσης τμήματος');
      setIsSaving(false);
    }
  };

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
