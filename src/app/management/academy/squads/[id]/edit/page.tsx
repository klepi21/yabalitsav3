'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { squadService, academyUserService, userGroupService } from '@/lib/academy-services';
import { AcademyUser } from '@/types/academy';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
        <Button variant="ghost" size="icon" asChild className="-ml-2">
          <Link href="/management/academy/squads">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Επεξεργασία Τμήματος</h1>
          <p className="text-sm text-zinc-500 mt-1">Ενημέρωση στοιχείων τμήματος</p>
        </div>
      </div>

      <div className="max-w-2xl">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="name">Όνομα Τμήματος *</Label>
                <Input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="π.χ. Λιοντάρια U12, Ακαδημία Juniors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ageGroup">Ηλικιακή Κατηγορία *</Label>
                <select
                  id="ageGroup"
                  value={formData.ageGroup}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ageGroup: e.target.value }))}
                  className="flex h-9 w-full rounded-lg border border-zinc-200/70 bg-transparent px-3 py-1 text-sm shadow-none transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {AGE_GROUPS.map((ag) => (
                    <option key={ag} value={ag}>{ag}</option>
                  ))}
                </select>
              </div>

              {coaches.length > 0 && (
                <div className="space-y-2">
                  <Label>Ανάθεση Προπονητών</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {coaches.map((coach) => (
                      <label
                        key={coach.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.coachIds.includes(coach.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={formData.coachIds.includes(coach.id)}
                          onChange={() => toggleCoach(coach.id)}
                        />
                        <div className="flex items-center gap-3">
                          <Trophy className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{coach.displayName}</p>
                            <p className="text-xs text-muted-foreground">{coach.fields.specialization}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                >
                  Ακύρωση
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση Αλλαγών'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
