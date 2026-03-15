'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { squadService, academyUserService, userGroupService } from '@/lib/academy-services';
import { AcademyUser } from '@/types/academy';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const AGE_GROUPS = ['U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U21', 'Ανδρών'];

export default function NewSquadPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [coaches, setCoaches] = useState<AcademyUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    ageGroup: 'U12',
    coachIds: [] as string[],
  });

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }
    const loadCoaches = async () => {
      try {
        const groups = await userGroupService.getOrSeed(venueId);
        const coachGroup = groups.find((g) => g.isDefault && g.name === 'Προπονητής');
        if (coachGroup) {
          const coachUsers = await academyUserService.getByGroup(venueId, coachGroup.id);
          setCoaches(coachUsers);
        }
      } catch (err) {
        console.error('Failed to load coaches:', err);
      }
    };
    loadCoaches();
  }, [user, venueOwner, authLoading, router, venueId, pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Το όνομα τμήματος είναι υποχρεωτικό');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await squadService.create({
        ...formData,
        venueId,
      });
      router.push('/management/academy/squads');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία δημιουργίας τμήματος');
      setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-muted">
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6">
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/management">Διαχείριση</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/management/academy/squads">Τμήματα</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Νέο Τμήμα</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="-ml-2">
              <Link href="/management/academy/squads">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Νέο Τμήμα</h1>
              <p className="text-sm text-muted-foreground">Προσθήκη νέας ομάδας ή ηλικιακής κατηγορίας</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 max-w-2xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="space-y-6">
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
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isLoading ? 'Δημιουργία...' : 'Δημιουργία Τμήματος'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
