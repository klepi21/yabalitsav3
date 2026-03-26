'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Users, Phone, Eye, Pencil, AlertCircle, MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toGreekUpperCase } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { userService } from '@/lib/firebase-services';

export default function CustomersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [customers, setCustomers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCustomers = useCallback(async () => {
    if (!venueOwner || !user) return;

    try {
      setError(null);
      // Get auth token
      const token = await user.getIdToken();
      if (!token) {
        throw new Error('No auth token available');
      }

      // Use server-side API to fetch data with proper auth
      const response = await fetch('/api/customers/get-by-venue', {
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
        throw new Error(errorData.error || 'Failed to fetch customers');
      }

      const data = await response.json();

      // Convert ISO strings back to Date objects
      const convertedCustomers = (data.customers || []).map((customer: Omit<User, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }) => ({
        ...customer,
        createdAt: new Date(customer.createdAt),
        updatedAt: new Date(customer.updatedAt),
      }));

      setCustomers(convertedCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Αποτυχία φόρτωσης πελατών';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [venueOwner, user]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await userService.delete(deleteTarget.id);
      setCustomers(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error('Error deleting customer:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  // Check authentication
  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    loadCustomers();
  }, [user, venueOwner, authLoading, router, loadCustomers, pathname]);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-2">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-zinc-200" />
            <div className="space-y-2">
              <div className="h-6 w-44 bg-zinc-200 rounded" />
              <div className="h-3 w-56 bg-zinc-100 rounded" />
            </div>
          </div>
          <div className="h-10 w-36 rounded-xl bg-zinc-200" />
        </div>
        {/* Stats + search skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-20 rounded-2xl bg-zinc-100" />
          <div className="md:col-span-1 lg:col-span-3 h-14 rounded-2xl bg-zinc-100" />
        </div>
        {/* Table skeleton */}
        <div className="rounded-2xl bg-white border border-zinc-100 overflow-hidden">
          <div className="h-12 bg-zinc-50 border-b border-zinc-100" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-zinc-50">
              <div className="h-10 w-10 rounded-xl bg-zinc-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 bg-zinc-100 rounded" />
                <div className="h-3 w-48 bg-zinc-50 rounded" />
              </div>
              <div className="h-4 w-24 bg-zinc-50 rounded hidden md:block" />
              <div className="h-4 w-28 bg-zinc-50 rounded hidden sm:block" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & New Customer Button */}
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-200 shrink-0">
               <Users className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
             </div>
             <div className="space-y-0.5">
               <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 uppercase">
                 {toGreekUpperCase('Πελατολόγιο')}
               </h1>
               <div className="flex items-center gap-2">
                 <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <p className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest hidden sm:block">
                   {toGreekUpperCase('Διαχειριση πελατων και ιστορικο')}
                 </p>
               </div>
             </div>
          </div>
          <Button
            asChild
            className="h-10 px-3 sm:px-6 rounded-xl bg-zinc-900 hover:bg-black text-white font-black shadow-md transition-all active:scale-95 text-[11px] shrink-0"
          >
            <Link href="/management/customers/new" className="flex items-center gap-1.5 sm:gap-2">
              <Plus className="h-4 w-4 text-emerald-400" />
              <span className="hidden sm:inline">{toGreekUpperCase('Νέος Πελάτης')}</span>
              <span className="sm:hidden">{toGreekUpperCase('Νέος')}</span>
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-red-900 uppercase tracking-wider">Σφάλμα</h3>
                <p className="text-red-700 font-bold">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setError(null); loadCustomers(); }}
              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold"
            >
              Δοκιμάστε ξανά
            </Button>
          </div>
        </div>
      )}

      {/* Search and Stats - Modern Donezo Style */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex items-center gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-zinc-100 shadow-sm shrink-0">
          <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 shadow-inner">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-zinc-900 tracking-tight">{customers.length}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Πελάτες')}</p>
          </div>
        </div>

        <div className="flex-1">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-zinc-300 group-focus-within:text-emerald-500 transition-colors" />
            <Input
              placeholder={toGreekUpperCase('Αναζήτηση...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 sm:h-14 pl-10 sm:pl-12 pr-4 bg-white border-zinc-100 rounded-2xl shadow-sm focus:ring-8 focus:ring-emerald-500/5 font-bold text-xs sm:text-[13px] placeholder:text-zinc-300 w-full transition-all uppercase tracking-tight outline-none"
            />
          </div>
        </div>
      </div>

      {/* Customers Table/Grid */}
      {filteredCustomers.length === 0 ? (
        <Card className="premium-card border-none bg-zinc-50/50 py-20">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="h-24 w-24 rounded-[2.5rem] bg-white border border-zinc-100 flex items-center justify-center mb-8 shadow-sm">
              <Users className="h-12 w-12 text-zinc-200" />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 mb-2">
              {searchTerm ? 'Δεν βρέθηκαν αποτελέσματα' : 'Δεν υπάρχουν πελάτες'}
            </h3>
            <p className="text-zinc-500 font-medium max-w-sm mb-10">
              {searchTerm 
                ? 'Δοκιμάστε μια διαφορετική αναζήτηση ή καθαρίστε τα φίλτρα.' 
                : 'Ξεκινήστε την οργάνωση των πελατών σας προσθέτοντας την πρώτη επαφή.'}
            </p>
            {!searchTerm && (
              <Button 
                asChild 
                className="h-14 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black text-white"
              >
                <Link href="/management/customers/new">
                  Προσθήκη Πελάτη
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="premium-card border-none overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="py-3 sm:py-4 px-3 sm:px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Πελάτης</th>
                    <th className="py-3 sm:py-4 px-3 sm:px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell">Email</th>
                    <th className="py-3 sm:py-4 px-3 sm:px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden sm:table-cell">Τηλέφωνο</th>
                    <th className="py-3 sm:py-4 px-2 sm:px-6 text-right w-[50px] sm:w-[80px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 sm:py-4 px-3 sm:px-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-zinc-100 flex items-center justify-center font-bold text-zinc-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors text-xs shrink-0">
                            {customer.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase truncate">
                              {customer.name}
                            </p>
                            <p className="text-[10px] font-bold text-zinc-400 md:hidden truncate">{customer.phone || customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 hidden md:table-cell">
                        <span className="text-xs font-bold text-zinc-500">{customer.email || '—'}</span>
                      </td>
                      <td className="py-3 sm:py-4 px-3 sm:px-6 hidden sm:table-cell">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 tabular-nums">
                          <Phone className="h-3.5 w-3.5 text-zinc-300" />
                          {customer.phone || '—'}
                        </div>
                      </td>
                      <td className="py-3 sm:py-6 px-2 sm:px-8 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-md transition-all"
                            >
                              <MoreHorizontal className="h-5 w-5 text-zinc-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-2xl border-0 shadow-2xl p-2 animate-in fade-in zoom-in-95">
                            <DropdownMenuItem asChild className="rounded-xl h-11 font-bold text-zinc-600 focus:text-emerald-600 focus:bg-emerald-50 cursor-pointer">
                              <Link href={`/management/customers/${customer.id}`} className="flex items-center gap-3">
                                <Eye className="h-4 w-4" />
                                Προβολή Προφίλ
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded-xl h-11 font-bold text-zinc-600 focus:text-emerald-600 focus:bg-emerald-50 cursor-pointer">
                              <Link href={`/management/customers/${customer.id}/edit`} className="flex items-center gap-3">
                                <Pencil className="h-4 w-4" />
                                Επεξεργασία
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="rounded-xl h-11 font-bold text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                              onClick={() => setDeleteTarget(customer)}
                            >
                              <Trash2 className="h-4 w-4 mr-3" />
                              Διαγραφή
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl p-0 overflow-hidden w-[95vw] sm:w-full">
          <div className="p-6 sm:p-8">
            <AlertDialogHeader>
              <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl sm:text-2xl font-black text-zinc-900">Διαγραφή Πελάτη</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-500 font-medium pt-2">
                Είστε σίγουροι ότι θέλετε να διαγράψετε τον πελάτη <span className="text-zinc-900 font-black">&quot;{deleteTarget?.name}&quot;</span>;
                Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-3">
              <AlertDialogCancel className="h-11 rounded-xl border-zinc-200 font-bold">Ακύρωση</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-11 rounded-xl bg-red-600 hover:bg-red-700 font-bold border-0"
              >
                {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Οριστική Διαγραφή'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
