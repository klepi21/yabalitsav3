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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-zinc-100">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-xl shadow-zinc-200 shrink-0 hover:border-emerald-200 transition-colors">
            <Building2 className="h-7 w-7 text-emerald-500" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-3xl font-black tracking-tighter text-zinc-900 uppercase">
              {toGreekUpperCase('Τα Γήπεδά σας')}
            </h1>
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">
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
              className="h-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 font-bold text-[10px]"
            >
              {toGreekUpperCase('Δοκιμάστε ξανά')}
            </Button>
          </div>
        </div>
      )}

      {/* Filter & Search Bar Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm w-full lg:max-w-md group focus-within:border-emerald-200 transition-all">
          <Search className="h-4 w-4 text-zinc-400 ml-2" />
          <Input
            type="text"
            placeholder={toGreekUpperCase('Αναζήτηση ονόματος ή τύπου...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 border-0 bg-transparent focus-visible:ring-0 text-zinc-900 font-bold text-xs placeholder:text-zinc-300 uppercase p-0"
          />
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-10 px-4 rounded-xl border-zinc-200 bg-white text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
            ΣΥΝΟΛΟ: <span className="text-zinc-900 ml-1">{pitches.length}</span>
          </Badge>
          <Badge variant="outline" className="h-10 px-4 rounded-xl border-emerald-100 bg-emerald-50/30 text-emerald-600 font-bold text-[10px] uppercase tracking-widest">
            ΕΝΕΡΓΑ: <span className="font-black ml-1">{pitches.filter(p => p.active).length}</span>
          </Badge>
        </div>
      </div>

      {/* Pitch Grid */}
      {/* Pitch List View */}
      <div className="space-y-3">
        {filteredPitches.length === 0 ? (
          <Card className="border-2 border-dashed border-zinc-100 bg-zinc-50/50 shadow-none py-16">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center mb-6 shadow-sm">
                <Building2 className="h-8 w-8 text-zinc-200" />
              </div>
              <h3 className="text-zinc-900 font-black uppercase tracking-tight">
                {searchTerm ? 'Δεν βρέθηκαν γήπεδα' : 'Δεν υπάρχουν γήπεδα'}
              </h3>
              <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-widest max-w-xs">
                {searchTerm 
                  ? 'Δοκιμάστε μια διαφορετική αναζήτηση.' 
                  : 'Ξεκινήστε την οργάνωση του χώρου σας προσθέτοντας το πρώτο σας γήπεδο.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPitches.map((pitch) => (
            <div 
              key={pitch.id}
              className={cn(
                "group relative flex items-center justify-between p-5 rounded-2xl bg-white border transition-all duration-300",
                pitch.active 
                  ? "border-zinc-200 hover:border-emerald-200 hover:shadow-lg shadow-zinc-200/20" 
                  : "border-zinc-100 opacity-60 bg-zinc-50/30"
              )}
            >
              <div className="flex items-center gap-6 flex-1 min-w-0">
                <div className={cn(
                  "h-14 w-14 rounded-2xl border flex items-center justify-center shrink-0 transition-colors duration-500",
                  pitch.active 
                    ? "bg-zinc-50 border-zinc-100 group-hover:bg-emerald-50 group-hover:border-emerald-100" 
                    : "bg-zinc-100 border-zinc-200"
                )}>
                  <Building2 className={cn(
                    "h-6 w-6 transition-colors",
                    pitch.active ? "text-zinc-400 group-hover:text-emerald-500" : "text-zinc-300"
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={cn(
                      "text-lg font-black tracking-tight uppercase truncate",
                      pitch.active ? "text-zinc-900" : "text-zinc-400"
                    )}>
                      {pitch.name}
                    </h3>
                    <Badge className={cn(
                      "border-none font-black text-[8px] uppercase tracking-widest px-2 py-0.5 shadow-none shrink-0",
                      pitch.active ? "bg-emerald-50 text-emerald-600" : "bg-zinc-200 text-zinc-500"
                    )}>
                      {toGreekUpperCase(pitch.type)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-zinc-400 font-bold text-[10px] uppercase tracking-wider">
                      <span className="text-zinc-900 font-black">€{pitch.pricePerSlot}</span>
                      <span>/ SLOT</span>
                    </div>
                    <div className="h-1 w-1 rounded-full bg-zinc-200" />
                    <div className="flex items-center gap-1.5 text-zinc-400 font-bold text-[10px] uppercase tracking-wider">
                      <span className="text-zinc-900 font-black">{pitch.slotDuration}</span>
                      <span>ΛΕΠΤΑ</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-4">
                <div className="flex items-center gap-2 pr-4 border-r border-zinc-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePitchActive(pitch.id, pitch.active)}
                    className={cn(
                      "h-10 w-10 rounded-xl transition-all",
                      pitch.active
                        ? "text-emerald-500 hover:bg-emerald-50"
                        : "text-zinc-400 hover:bg-zinc-100"
                    )}
                    title={pitch.active ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
                  >
                    <Link href={`/management/pitches/${pitch.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50"
                  >
                    <Link href={`/management/pitches/${pitch.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                
                <div className="pl-2 hidden sm:block">
                   <div className={cn(
                     "h-2 w-2 rounded-full",
                     pitch.active ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-zinc-300"
                   )} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
