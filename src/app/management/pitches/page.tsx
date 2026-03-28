'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { toGreekUpperCase, cn } from '@/lib/utils';

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

  const togglePitchActive = async (pitchId: string, currentActive: boolean) => {
    try {
      await pitchService.update(pitchId, { active: !currentActive });
      setPitches(prev => prev.map(p => p.id === pitchId ? { ...p, active: !currentActive } : p));
    } catch (err) {
      console.error('Error toggling pitch active:', err);
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
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
              {toGreekUpperCase('Τα Γήπεδά σας')}
            </h1>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
              {toGreekUpperCase('Διαχειριση εγκαταστασεων')}
            </p>
          </div>
        </div>
        
        <Button 
          asChild 
          className="h-12 px-6 rounded-2xl bg-zinc-900 hover:bg-black text-white font-black text-[11px] shadow-lg shadow-zinc-900/10 transition-all active:scale-95 group uppercase tracking-widest"
        >
          <Link href="/management/pitches/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-400 group-hover:rotate-90 transition-transform duration-500" />
            {toGreekUpperCase('Προσθήκη Γηπέδου')}
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
                <p className="text-xs font-black text-red-900 uppercase tracking-wider">{toGreekUpperCase('Σφάλμα')}</p>
                <p className="text-xs text-red-700 font-bold">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setError(null); loadPitches(); }}
              className="h-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 font-bold text-[12px]"
            >
              {toGreekUpperCase('Δοκιμάστε ξανά')}
            </Button>
          </div>
        </div>
      )}

      {/* Filter & Search Bar Row */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm flex-1">
          <div className="flex items-center gap-3 px-4 border-r border-zinc-100">
            <div className="h-8 w-8 rounded-xl bg-zinc-50 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-xl font-black text-zinc-900 leading-none">{pitches.length}</p>
              <p className="text-[8px] font-bold text-zinc-400 uppercase mt-0.5 tracking-wider">ΣYNOLO</p>
            </div>
          </div>
          
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300" />
            <Input
              type="text"
              placeholder={toGreekUpperCase('Αναζήτηση γηπέδων...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-10 border-0 bg-transparent focus:ring-0 text-zinc-900 font-bold text-sm placeholder:text-zinc-300 uppercase tracking-tight"
            />
          </div>
        </div>
      </div>

      {/* Pitch Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPitches.length === 0 ? (
          <Card className="col-span-full border-2 border-dashed border-zinc-100 bg-zinc-50/50 py-16 rounded-2xl shadow-none">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center mb-6 shadow-sm">
                <Building2 className="h-8 w-8 text-zinc-200" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">
                {searchTerm ? 'Δεν βρέθηκαν γήπεδα' : 'Δεν υπάρχουν γήπεδα'}
              </h3>
              <p className="text-zinc-400 font-bold text-[12px] uppercase tracking-widest mt-1 mb-8">
                {searchTerm 
                  ? 'Δοκιμάστε μια διαφορετική αναζήτηση.' 
                  : 'Ξεκινήστε την οργάνωση του χώρου σας προσθέτοντας το πρώτο σας γήπεδο.'}
              </p>
              {!searchTerm && (
                <Button 
                  asChild 
                  className="h-12 px-8 rounded-xl bg-zinc-900 hover:bg-black font-black text-white uppercase text-[11px] tracking-widest shadow-xl shadow-zinc-200"
                >
                  <Link href="/management/pitches/new">
                    {toGreekUpperCase('Προσθήκη Γηπέδου')}
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
                        <Badge variant="outline" className="h-5 border-emerald-100 bg-emerald-50 text-emerald-600 font-black text-[8px] uppercase px-1.5 py-0">
                          {toGreekUpperCase(pitch.type)}
                        </Badge>
                        {!pitch.active && (
                          <Badge variant="outline" className="h-5 border-red-100 bg-red-50 text-red-500 font-black text-[8px] uppercase px-1.5 py-0">
                            OFF
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-[17px] font-black tracking-tight text-zinc-900 uppercase">
                        {toGreekUpperCase(pitch.name)}
                      </h3>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                      <Building2 className="h-5 w-5 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">TIMH SLOT</p>
                      <p className="text-2xl font-black text-zinc-900 tracking-tighter">&euro;{pitch.pricePerSlot}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">ΔΙΑΡΚΕΙΑ</p>
                      <p className="text-2xl font-black text-zinc-900 tracking-tighter">
                        {pitch.slotDuration}<span className="text-[12px] font-bold text-zinc-400 ml-1">MIN</span>
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-5 border-t border-zinc-50">
                    <Button
                      asChild
                      className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-black text-white font-black text-[12px] tracking-widest transition-all uppercase"
                    >
                      <Link href={`/management/pitches/${pitch.id}/edit`} className="flex items-center justify-center gap-2">
                        <Pencil className="h-3.5 w-3.5" />
                        {toGreekUpperCase('Επεξεργασία')}
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
