'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Plus, Search, Users, Phone, Eye, Pencil, AlertCircle, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function CustomersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [customers, setCustomers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header & New Customer Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">
            Πελατολόγιο
          </h1>
          <p className="text-lg font-medium text-zinc-500">
            Διαχειριστείτε τους πελάτες σας και δείτε το ιστορικό τους.
          </p>
        </div>
        <Button 
          asChild 
          className="h-14 px-8 rounded-2xl bg-zinc-900 border-0 hover:bg-emerald-600 font-black text-white shadow-xl shadow-zinc-200 transition-all hover:translate-y-[-2px] active:translate-y-[1px]"
        >
          <Link href="/management/customers/new" className="flex items-center gap-3">
            <Plus className="h-6 w-6" />
            Νέος Πελάτης
          </Link>
        </Button>
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

      {/* Stats row & Search row */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-4 px-6 border-r border-zinc-100">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-black text-zinc-900">{customers.length}</p>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Σύνολο</p>
            </div>
          </div>
          
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300" />
            <Input
              type="text"
              placeholder="Αναζήτηση με όνομα, email ή τηλέφωνο..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 pl-12 border-0 bg-transparent focus:ring-0 text-zinc-900 font-bold placeholder:text-zinc-300 placeholder:font-normal"
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
                    <th className="py-6 px-8 text-xs font-black uppercase tracking-widest text-zinc-400">Πελάτης</th>
                    <th className="py-6 px-8 text-xs font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell">Email</th>
                    <th className="py-6 px-8 text-xs font-black uppercase tracking-widest text-zinc-400 hidden sm:table-cell">Τηλέφωνο</th>
                    <th className="py-6 px-8 text-right w-[100px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center font-black text-zinc-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                            {customer.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-lg font-black text-zinc-900 group-hover:text-emerald-700 transition-colors">
                              {customer.name}
                            </p>
                            <p className="text-xs font-bold text-zinc-400 md:hidden">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-8 hidden md:table-cell">
                        <span className="text-sm font-bold text-zinc-500">{customer.email || '—'}</span>
                      </td>
                      <td className="py-6 px-8 hidden sm:table-cell">
                        <div className="flex items-center gap-2 text-sm font-black text-zinc-900 tabular-nums">
                          <Phone className="h-4 w-4 text-zinc-300" />
                          {customer.phone || '—'}
                        </div>
                      </td>
                      <td className="py-6 px-8 text-right">
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
    </div>
  );
}
