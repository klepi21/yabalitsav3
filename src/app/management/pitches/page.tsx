'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
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
import { toGreekUpperCase } from '@/lib/utils';

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header & New Pitch Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-1 border-b border-zinc-50">
        <div>
          <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase">
            {toGreekUpperCase('Τα Γήπεδά σας')}
          </h1>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight">
            {toGreekUpperCase('Διαχειριστείτε τις λεπτομέρειες και τη διαθεσιμότητα των γηπέδων σας.')}
          </p>
        </div>
        <Button 
          asChild 
          className="h-9 px-5 rounded-lg bg-zinc-900 border-0 hover:bg-black font-bold text-[12px] text-white shadow-md transition-all active:scale-95 group"
        >
          <Link href="/management/pitches/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
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
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-2.5 px-3 border-r border-zinc-50">
            <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-black text-zinc-900 leading-none">{pitches.length}</p>
            </div>
          </div>
          
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-300" />
            <Input
              type="text"
              placeholder={toGreekUpperCase('Αναζήτηση...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 border-0 bg-transparent focus:ring-0 text-zinc-900 font-bold text-xs placeholder:text-zinc-300 uppercase"
            />
          </div>
        </div>
      </div>

      {/* Pitch Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPitches.length === 0 ? (
          <Card className="col-span-full border-none bg-zinc-50/50 py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-xl bg-white border border-zinc-100 flex items-center justify-center mb-6 shadow-sm">
                <Building2 className="h-8 w-8 text-zinc-200" />
              </div>
              <h3 className="text-lg font-black text-zinc-900 mb-1">
                {searchTerm ? 'Δεν βρέθηκαν γήπεδα' : 'Δεν υπάρχουν γήπεδα'}
              </h3>
              <p className="text-zinc-500 font-medium text-xs max-w-xs mb-8">
                {searchTerm 
                  ? 'Δοκιμάστε μια διαφορετική αναζήτηση.' 
                  : 'Ξεκινήστε την οργάνωση του χώρου σας προσθέτοντας το πρώτο σας γήπεδο.'}
              </p>
              {!searchTerm && (
                <Button 
                  asChild 
                  className="h-12 px-8 rounded-xl bg-zinc-900 hover:bg-black font-black text-white uppercase text-xs"
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
              className={`premium-card group border overflow-hidden hover:translate-y-[-4px] transition-all duration-300 shadow-sm ${
                pitch.active ? 'border-zinc-100/50' : 'border-red-200/50 opacity-60'
              }`}
            >
              <CardContent className="p-0">
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold text-[8px] uppercase tracking-wider px-1.5 py-0.5 shadow-none">
                          {toGreekUpperCase(pitch.type)}
                        </Badge>
                        {!pitch.active && (
                          <Badge className="bg-red-50 text-red-600 border-none font-bold text-[8px] uppercase tracking-wider px-1.5 py-0.5 shadow-none">
                            {toGreekUpperCase('Ανενεργό')}
                          </Badge>
                        )}
                      </div>
                      <h3 className={`text-lg font-black tracking-tight leading-tight transition-colors uppercase ${
                        pitch.active ? 'text-zinc-900 group-hover:text-emerald-700' : 'text-zinc-400'
                      }`}>
                        {pitch.name}
                      </h3>
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-all duration-500">
                      <Building2 className="h-4 w-4 text-zinc-300 group-hover:text-emerald-600 transition-colors" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-50/50 rounded-lg p-3 border border-zinc-100 group-hover:bg-white transition-all">
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Τιμή (Slot)</p>
                      <div className="flex items-end gap-1">
                        <span className="text-lg font-black text-zinc-900 tracking-tight">&euro;{pitch.pricePerSlot}</span>
                      </div>
                    </div>
                    <div className="bg-zinc-50/50 rounded-lg p-3 border border-zinc-100 group-hover:bg-white transition-all">
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Διάρκεια</p>
                      <div className="flex items-end gap-1">
                        <span className="text-lg font-black text-zinc-900 tracking-tight">{pitch.slotDuration}</span>
                        <span className="text-[8px] font-bold text-zinc-400 pb-0.5 uppercase">{toGreekUpperCase('Λεπτά')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-zinc-50 group-hover:border-emerald-50 transition-colors">
                    <Button
                      asChild
                      className="flex-1 h-9 rounded-lg bg-zinc-900 hover:bg-black text-white font-bold transition-all text-[11px] group/btn"
                    >
                      <Link href={`/management/pitches/${pitch.id}/edit`} className="flex items-center gap-2">
                        <Pencil className="h-3 w-3 group-hover/btn:scale-110 transition-transform" />
                        {toGreekUpperCase('Επεξεργασία')}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => togglePitchActive(pitch.id, pitch.active)}
                      className={`h-9 w-9 rounded-lg transition-all ${
                        pitch.active
                          ? 'border-zinc-100 text-emerald-500 hover:text-red-500 hover:border-red-100 hover:bg-red-50'
                          : 'border-red-100 text-red-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50'
                      }`}
                      title={pitch.active ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-9 w-9 rounded-lg border-zinc-100 text-zinc-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 transition-all"
                    >
                      <Link href={`/management/pitches/${pitch.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
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
