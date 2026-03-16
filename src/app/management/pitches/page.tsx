'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, 
  Plus, 
  Search, 
  Building2, 
  Clock, 
  Banknote, 
  Eye, 
  Pencil, 
  Ban 
} from 'lucide-react';
import { Pitch } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
    <div className="space-y-10 pb-20">
      {/* Header & New Pitch Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">
            Τα Γήπεδά σας
          </h1>
          <p className="text-lg font-medium text-zinc-500">
            Διαχειριστείτε τις λεπτομέρειες και τη διαθεσιμότητα των γηπέδων σας.
          </p>
        </div>
        <Button 
          asChild 
          className="h-14 px-8 rounded-2xl bg-zinc-900 border-0 hover:bg-emerald-600 font-black text-white shadow-xl shadow-zinc-200 transition-all hover:translate-y-[-2px] active:translate-y-[1px]"
        >
          <Link href="/management/pitches/new" className="flex items-center gap-3">
            <Plus className="h-6 w-6" />
            Προσθήκη Γηπέδου
          </Link>
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <Ban className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-red-900 uppercase tracking-wider">Σφάλμα</h3>
                <p className="text-red-700 font-bold">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setError(null); loadPitches(); }}
              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold"
            >
              Δοκιμάστε ξανά
            </Button>
          </div>
        </div>
      )}

      {/* Filter & Search Bar Row */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-4 px-6 border-r border-zinc-100">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-black text-zinc-900">{pitches.length}</p>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Σύνολο</p>
            </div>
          </div>
          
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300" />
            <Input
              type="text"
              placeholder="Αναζήτηση με όνομα ή τύπο..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 pl-12 border-0 bg-transparent focus:ring-0 text-zinc-900 font-bold placeholder:text-zinc-300 placeholder:font-normal"
            />
          </div>
        </div>
      </div>

      {/* Pitch Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPitches.length === 0 ? (
          <Card className="col-span-full premium-card border-none bg-zinc-50/50 py-20">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="h-24 w-24 rounded-[2.5rem] bg-white border border-zinc-100 flex items-center justify-center mb-8 shadow-sm">
                <Building2 className="h-12 w-12 text-zinc-200" />
              </div>
              <h3 className="text-2xl font-black text-zinc-900 mb-2">
                {searchTerm ? 'Δεν βρέθηκαν αποτελέσματα' : 'Δεν υπάρχουν γήπεδα'}
              </h3>
              <p className="text-zinc-500 font-medium max-w-sm mb-10">
                {searchTerm 
                  ? 'Δοκιμάστε μια διαφορετική αναζήτηση ή καθαρίστε τα φίλτρα.' 
                  : 'Ξεκινήστε την οργάνωση του χώρου σας προσθέτοντας το πρώτο σας γήπεδο.'}
              </p>
              {!searchTerm && (
                <Button 
                  asChild 
                  className="h-14 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black text-white"
                >
                  <Link href="/management/pitches/new">
                    Προσθήκη Γηπέδου
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPitches.map((pitch) => (
            <Card 
              key={pitch.id} 
              className="premium-card group border-0 overflow-hidden hover:translate-y-[-4px] transition-all duration-300"
            >
              <CardContent className="p-0">
                {/* Header Decoration */}
                <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="p-8 space-y-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Badge className="bg-emerald-50 text-emerald-700 border-none font-black text-[10px] uppercase tracking-wider px-3 py-1 mb-2">
                        {pitch.type}
                      </Badge>
                      <h3 className="text-2xl font-black text-zinc-900 tracking-tight leading-tight group-hover:text-emerald-700 transition-colors">
                        {pitch.name}
                      </h3>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-all duration-500">
                      <Building2 className="h-7 w-7 text-zinc-300 group-hover:text-emerald-600 transition-colors" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 group-hover:bg-white group-hover:border-emerald-100 transition-all">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Τιμή (Slot)</p>
                      <div className="flex items-end gap-1">
                        <span className="text-2xl font-black text-zinc-900 tracking-tight">&euro;{pitch.pricePerSlot}</span>
                      </div>
                    </div>
                    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 group-hover:bg-white group-hover:border-emerald-100 transition-all">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Διάρκεια</p>
                      <div className="flex items-end gap-1">
                        <span className="text-2xl font-black text-zinc-900 tracking-tight">{pitch.slotDuration}</span>
                        <span className="text-[10px] font-black text-zinc-400 pb-1">λεπτά</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-6 border-t border-zinc-100">
                    <Button 
                      asChild 
                      className="flex-1 h-12 rounded-xl bg-zinc-900 hover:bg-emerald-600 text-white font-bold transition-all"
                    >
                      <Link href={`/management/pitches/${pitch.id}/edit`} className="flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Επεξεργασία
                      </Link>
                    </Button>
                    <Button 
                      asChild 
                      variant="outline"
                      className="h-12 w-12 rounded-xl border-zinc-200 text-zinc-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all"
                    >
                      <Link href={`/management/pitches/${pitch.id}`}>
                        <Eye className="h-5 w-5" />
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
