'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Plus, Search, Building2, Clock, Banknote, Eye, Pencil } from 'lucide-react';
import { Pitch } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function PitchesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadPitches = useCallback(async () => {
    if (!venueOwner || !user) return;

    try {
      setError(null);
      // Get auth token
      const token = await user.getIdToken();
      if (!token) {
        throw new Error('No auth token available');
      }

      // Use server-side API to fetch data with proper auth
      const response = await fetch('/api/pitches/get-by-venue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          venueId: venueOwner.venueId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pitches');
      }

      const data = await response.json();

      // Convert ISO strings back to Date objects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const convertedPitches = (data.pitches || []).map((pitch: any) => ({
        ...pitch,
        createdAt: new Date(pitch.createdAt),
        updatedAt: new Date(pitch.updatedAt),
      }));

      setPitches(convertedPitches);
    } catch (error) {
      console.error('Error loading pitches:', error);
      const errorMessage = error instanceof Error ? error.message : 'Αποτυχία φόρτωσης γηπέδων';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [venueOwner, user]);

  // Check authentication
  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    loadPitches();
  }, [user, venueOwner, authLoading, router, loadPitches, pathname]);

  const filteredPitches = pitches.filter(pitch =>
    pitch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pitch.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-destructive">Σφάλμα κατά τη φόρτωση γηπέδων</h3>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setError(null); loadPitches(); }}
              className="text-destructive/60 hover:text-destructive shrink-0"
            >
              Δοκιμάστε ξανά
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Γήπεδα</h1>
          <p className="text-sm text-zinc-500 mt-1">Διαχείριση των ποδοσφαιρικών γηπέδων του χώρου σας</p>
        </div>
        <Button asChild>
          <Link href="/management/pitches/new">
            <Plus className="h-4 w-4" />
            Προσθήκη Γηπέδου
          </Link>
        </Button>
      </div>

      {/* Stats + Search row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-100/60 bg-white px-5 py-3.5">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight text-zinc-900">{pitches.length}</p>
            <p className="text-[13px] text-zinc-400">Σύνολο Γηπέδων</p>
          </div>
        </div>

        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Αναζήτηση γηπέδων..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Pitches List */}
      {filteredPitches.length === 0 ? (
        <div className="rounded-xl border border-zinc-100/60 bg-white py-16">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-900 mb-1">
              {searchTerm ? 'Δεν βρέθηκαν γήπεδα' : 'Δεν υπάρχουν γήπεδα ακόμα'}
            </h3>
            <p className="text-[13px] text-zinc-400 mb-5">
              {searchTerm ? 'Δοκιμάστε να αλλάξετε τους όρους αναζήτησης.' : 'Ξεκινήστε προσθέτοντας το πρώτο σας γήπεδο.'}
            </p>
            {!searchTerm && (
              <Button size="sm" asChild>
                <Link href="/management/pitches/new">
                  <Plus className="h-4 w-4" />
                  Προσθήκη Γηπέδου
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPitches.map((pitch, index) => {
            const colors = [
              { bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'border-emerald-200/60 bg-emerald-50 text-emerald-700' },
              { bg: 'bg-blue-50', text: 'text-blue-600', badge: 'border-blue-200/60 bg-blue-50 text-blue-700' },
              { bg: 'bg-violet-50', text: 'text-violet-600', badge: 'border-violet-200/60 bg-violet-50 text-violet-700' },
            ];
            const color = colors[index % colors.length];

            return (
              <div
                key={pitch.id}
                className="group rounded-xl border border-zinc-100/60 bg-white p-5 hover:border-zinc-200/80 hover:shadow-sm transition-all duration-150"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg ${color.bg} flex items-center justify-center shrink-0`}>
                      <Building2 className={`h-5 w-5 ${color.text}`} />
                    </div>
                    <h4 className="text-[15px] font-semibold text-zinc-900">{pitch.name}</h4>
                  </div>
                  <Badge variant="outline" className={`text-[11px] ${color.badge}`}>
                    {pitch.type}
                  </Badge>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-zinc-400 flex items-center gap-1.5">
                      <Banknote className="h-3.5 w-3.5" />
                      Τιμή ανά Κράτηση
                    </span>
                    <span className="text-[15px] font-semibold text-zinc-900">&euro;{pitch.pricePerSlot}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-zinc-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Διάρκεια Κράτησης
                    </span>
                    <span className="text-sm font-medium text-zinc-600">{pitch.slotDuration} λεπτά</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-zinc-100/60">
                  <Button size="sm" className="flex-1 h-8 text-xs" asChild>
                    <Link href={`/management/pitches/${pitch.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" />
                      Επεξεργασία
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900" asChild>
                    <Link href={`/management/pitches/${pitch.id}`}>
                      <Eye className="h-3.5 w-3.5" />
                      Προβολή
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
