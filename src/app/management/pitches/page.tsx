'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Building2,
  Eye,
  Pencil,
  Ban,
  Power,
} from 'lucide-react';
import { Pitch } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { pitchService } from '@/lib/firebase-services';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { usePitches } from '@/lib/queries';
import { toast } from '@/lib/toast';

export default function PitchesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  // Κοινή cache: τα γήπεδα ζητούνται και από τις κρατήσεις — ένα request.
  const { pitches: rawPitches, error: loadError, isLoading, refresh } = usePitches(
    venueOwner?.venueId
  );
  const pitches = useMemo<Pitch[]>(
    () =>
      rawPitches.map((p) => ({
        ...(p as unknown as Pitch),
        createdAt: new Date(p.createdAt as string),
        updatedAt: new Date(p.updatedAt as string),
      })),
    [rawPitches]
  );
  const error = loadError ? (loadError as Error).message : null;
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, venueOwner, authLoading, router, pathname]);

  const togglePitchActive = async (pitchId: string, currentActive: boolean) => {
    try {
      await pitchService.update(pitchId, { active: !currentActive });
      await refresh();
      toast.success(currentActive ? 'Το γήπεδο απενεργοποιήθηκε' : 'Το γήπεδο ενεργοποιήθηκε');
    } catch (err) {
      console.error('Error toggling pitch active:', err);
      toast.error('Αποτυχία ενημέρωσης', 'Η κατάσταση του γηπέδου δεν άλλαξε.');
    }
  };

  const filteredPitches = pitches.filter(pitch =>
    pitch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pitch.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || isLoading) {
    return (
      <div className="space-y-10 pb-20 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-1 border-b border-zinc-50">
          <div className="space-y-2">
            <div className="h-6 w-44 bg-zinc-200 rounded" />
            <div className="h-3 w-72 bg-zinc-100 rounded" />
          </div>
          <div className="h-9 w-40 rounded-lg bg-zinc-200" />
        </div>
        {/* Filter bar skeleton */}
        <div className="h-12 w-full max-w-md rounded-xl bg-zinc-100" />
        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-zinc-100 h-56" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header & New Pitch Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-100">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-sm shrink-0">
            <Building2 className="h-7 w-7 text-emerald-500" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {'Τα Γήπεδά σας'}
            </h1>
            <p className="text-2xs font-medium text-zinc-500 leading-none">
              {'Διαχειριση εγκαταστασεων'}
            </p>
          </div>
        </div>
        
        <Button 
          asChild 
          className="h-12 px-6 rounded-2xl bg-zinc-900 hover:bg-black text-white font-semibold text-2xs shadow-lg shadow-zinc-900/10 transition-all active:scale-95 group"
        >
          <Link href="/management/pitches/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-400 group-hover:rotate-90 transition-transform duration-500" />
            {'Προσθήκη Γηπέδου'}
          </Link>
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Ban className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-red-900">{'Σφάλμα'}</p>
                <p className="text-xs text-red-700 font-medium">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              className="h-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 font-medium text-2xs"
            >
              {'Δοκιμάστε ξανά'}
            </Button>
          </div>
        </div>
      )}

      {/* Filter & Search Bar Row */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm flex-1">
          <div className="flex items-center gap-3 px-4 border-r border-zinc-100">
            <div className="h-8 w-8 rounded-xl bg-zinc-50 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-zinc-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-zinc-900 leading-none">{pitches.length}</p>
              <p className="text-2xs font-medium text-zinc-500 mt-0.5">ΣYNOLO</p>
            </div>
          </div>
          
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder={'Αναζήτηση γηπέδων...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-10 border-0 bg-transparent focus:ring-0 text-zinc-900 font-semibold text-sm placeholder:text-zinc-500 tracking-tight"
            />
          </div>
        </div>
      </div>

      {/* Pitch Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPitches.length === 0 ? (
          <Card className="col-span-full border border-zinc-200 bg-white py-16 rounded-2xl shadow-sm">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6 shadow-inner">
                <Building2 className="h-8 w-8 text-zinc-400" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
                {searchTerm ? 'Δεν βρέθηκαν γήπεδα' : 'Δεν υπάρχουν γήπεδα'}
              </h3>
              <p className="text-zinc-500 font-medium text-2xs mt-1 mb-8">
                {searchTerm 
                  ? 'Δοκιμάστε μια διαφορετική αναζήτηση.' 
                  : 'Ξεκινήστε την οργάνωση του χώρου σας προσθέτοντας το πρώτο σας γήπεδο.'}
              </p>
              {!searchTerm && (
                <Button 
                  asChild 
                  className="h-12 px-8 rounded-xl bg-zinc-900 hover:bg-black font-semibold text-white text-2xs shadow-xl shadow-zinc-200"
                >
                  <Link href="/management/pitches/new">
                    {'Προσθήκη Γηπέδου'}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPitches.map((pitch) => (
            <Card
              key={pitch.id}
              className={`rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300 ${
                !pitch.active && 'opacity-60 grayscale'
              }`}
            >
              <CardContent className="p-0">
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="h-5 border-emerald-100 bg-emerald-50 text-emerald-600 font-semibold text-2xs px-1.5 py-0">
                          {pitch.type}
                        </Badge>
                        {!pitch.active && (
                          <Badge variant="outline" className="h-5 border-red-100 bg-red-50 text-red-500 font-semibold text-2xs px-1.5 py-0">
                            OFF
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-base font-semibold tracking-tight text-zinc-900">
                        {pitch.name}
                      </h3>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                      <Building2 className="h-5 w-5 text-zinc-500 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-2xs font-medium text-zinc-500">Τιμή ώρας</p>
                      <p className="text-2xl font-bold text-zinc-900 tracking-tighter">&euro;{pitch.pricePerSlot}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xs font-medium text-zinc-500">Διάρκεια</p>
                      <p className="text-2xl font-bold text-zinc-900 tracking-tighter">
                        {pitch.slotDuration}<span className="text-2xs font-medium text-zinc-500 ml-1">λεπτά</span>
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-5 border-t border-zinc-50">
                    <Button
                      asChild
                      className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-black text-white font-semibold text-2xs transition-all"
                    >
                      <Link href={`/management/pitches/${pitch.id}/edit`} className="flex items-center justify-center gap-2">
                        <Pencil className="h-3.5 w-3.5" />
                        {'Επεξεργασία'}
                      </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => togglePitchActive(pitch.id, pitch.active)}
                        className={cn(
                          "h-11 w-11 rounded-xl transition-all border border-zinc-200",
                          pitch.active
                            ? "hover:bg-red-50 hover:border-red-100 hover:text-red-500"
                            : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100"
                        )}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="h-11 w-11 rounded-xl border border-zinc-200 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                      >
                        <Link href={`/management/pitches/${pitch.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
