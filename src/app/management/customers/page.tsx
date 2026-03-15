'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Plus, Search, Users, Phone, Eye, Pencil, AlertCircle, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setError(null); loadCustomers(); }}
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Πελάτες</h1>
          <p className="text-sm text-zinc-500 mt-1">Διαχείριση πληροφοριών πελατών για το γήπεδό σας</p>
        </div>
        <Button asChild>
          <Link href="/management/customers/new">
            <Plus className="h-4 w-4" />
            Νέος Πελάτης
          </Link>
        </Button>
      </div>

      {/* Stats + Search row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-100/60 bg-white px-5 py-3.5">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight text-zinc-900">{customers.length}</p>
            <p className="text-[13px] text-zinc-400">Σύνολο Πελατών</p>
          </div>
        </div>

        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Αναζήτηση πελατών..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Customers Table */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-xl border border-zinc-100/60 bg-white py-16">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-900 mb-1">
              {searchTerm ? 'Δεν βρέθηκαν πελάτες' : 'Δεν υπάρχουν πελάτες ακόμα'}
            </h3>
            <p className="text-[13px] text-zinc-400 mb-5">
              {searchTerm ? 'Δοκιμάστε να αλλάξετε τους όρους αναζήτησης.' : 'Ξεκινήστε προσθέτοντας τον πρώτο σας πελάτη.'}
            </p>
            {!searchTerm && (
              <Button size="sm" asChild>
                <Link href="/management/customers/new">
                  <Plus className="h-4 w-4" />
                  Προσθήκη Πελάτη
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-100/60 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-zinc-100/60 hover:bg-transparent">
                <TableHead className="text-[13px] text-zinc-400 font-medium pl-5">Πελάτης</TableHead>
                <TableHead className="text-[13px] text-zinc-400 font-medium hidden sm:table-cell">Email</TableHead>
                <TableHead className="text-[13px] text-zinc-400 font-medium hidden sm:table-cell">Τηλέφωνο</TableHead>
                <TableHead className="text-[13px] text-zinc-400 font-medium text-right pr-5 w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id} className="border-b border-zinc-100/40 hover:bg-zinc-50/50">
                  <TableCell className="pl-5 py-3">
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{customer.name}</div>
                      <div className="flex items-center gap-1 text-xs text-zinc-400 sm:hidden">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell py-3">
                    <span className="text-[13px] text-zinc-500">{customer.email || '—'}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell py-3">
                    <span className="text-[13px] text-zinc-500">{customer.phone || '—'}</span>
                  </TableCell>
                  <TableCell className="text-right pr-5 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem asChild>
                          <Link href={`/management/customers/${customer.id}`}>
                            <Eye className="h-3.5 w-3.5 mr-2" />
                            Προβολή
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/management/customers/${customer.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Επεξεργασία
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
