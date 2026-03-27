'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search,
  Building2,
  Users,
  CalendarDays,
  GraduationCap,
  Euro,
  Loader2,
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, toGreekUpperCase } from '@/lib/utils';

const SUPER_ADMIN_EMAIL = 'nikoskoukis99@gmail.com';

interface VenueStats {
  pitches: number;
  bookings: number;
  customers: number;
  academyUsers: number;
  squads: number;
  staff: number;
  payments: number;
  revenue: number;
  lastBooking: string | null;
}

interface VenueDetail {
  id: string;
  name: string;
  city: string;
  email: string;
  phone: string;
  ownerId: string;
  plan: string;
  planType: string | null;
  daysRemaining: number | null;
  subscriptionEndDate: string | null;
  active: boolean;
  bookingsEnabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  stats: VenueStats;
}

interface KPIs {
  totalVenues: number;
  activeVenues: number;
  expiredVenues: number;
  trialVenues: number;
  totalBookings: number;
  totalCustomers: number;
  totalAcademyUsers: number;
  totalRevenue: number;
  newVenuesThisMonth: number;
}

type SortField = 'name' | 'createdAt' | 'bookings' | 'customers' | 'revenue';
type FilterStatus = 'all' | 'active' | 'trial' | 'expired';

export default function AdminPanelPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [venues, setVenues] = useState<VenueDetail[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedVenue, setExpandedVenue] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch data');
      }

      const data = await response.json();
      setVenues(data.venues || []);
      setKpis(data.kpis || null);
    } catch (err) {
      console.error('Admin panel error:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    // Only super admin
    if (user.email !== SUPER_ADMIN_EMAIL) {
      router.push('/management/dashboard');
      return;
    }
    loadData();
  }, [authLoading, user, venueOwner, router, pathname, loadData]);

  // Filter & sort
  const filteredVenues = venues
    .filter(v => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (
          !v.name.toLowerCase().includes(q) &&
          !v.email.toLowerCase().includes(q) &&
          !v.city.toLowerCase().includes(q)
        ) return false;
      }
      if (filterStatus === 'active') return v.active && v.plan !== 'trial';
      if (filterStatus === 'trial') return v.plan === 'trial' && v.active;
      if (filterStatus === 'expired') return !v.active;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'createdAt': cmp = (a.createdAt || '').localeCompare(b.createdAt || ''); break;
        case 'bookings': cmp = a.stats.bookings - b.stats.bookings; break;
        case 'customers': cmp = a.stats.customers - b.stats.customers; break;
        case 'revenue': cmp = a.stats.revenue - b.stats.revenue; break;
      }
      return sortAsc ? cmp : -cmp;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const timeAgo = (iso: string | null) => {
    if (!iso) return 'Ποτέ';
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Σήμερα';
    if (days === 1) return 'Χθες';
    if (days < 7) return `${days} μέρες πριν`;
    if (days < 30) return `${Math.floor(days / 7)} εβδ. πριν`;
    return `${Math.floor(days / 30)} μήνες πριν`;
  };

  const getPlanBadge = (venue: VenueDetail) => {
    if (!venue.active) {
      return <Badge variant="destructive" className="text-[9px] font-black">EXPIRED</Badge>;
    }
    if (venue.plan === 'trial') {
      return <Badge className="bg-amber-100 text-amber-700 text-[9px] font-black hover:bg-amber-100">TRIAL</Badge>;
    }
    const colors: Record<string, string> = {
      Basic: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      Pro: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
      Enterprise: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    };
    return (
      <Badge className={cn('text-[9px] font-black', colors[venue.planType || 'Basic'] || colors.Basic)}>
        {venue.planType || 'ACTIVE'}
      </Badge>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="text-sm text-zinc-600">{error}</p>
            <Button onClick={loadData} className="mt-4" size="sm">
              Δοκίμασε ξανά
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
            {toGreekUpperCase('Admin Panel')}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Στατιστικά πελατών & venues πλατφόρμας
          </p>
        </div>

        {/* KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <KPICard icon={Building2} label="Venues" value={kpis.totalVenues} sub={`${kpis.activeVenues} ενεργά`} color="emerald" />
            <KPICard icon={CalendarDays} label="Bookings" value={kpis.totalBookings} color="blue" />
            <KPICard icon={Users} label="Customers" value={kpis.totalCustomers} color="violet" />
            <KPICard icon={GraduationCap} label="Academy Users" value={kpis.totalAcademyUsers} color="amber" />
            <KPICard icon={Euro} label="Έσοδα" value={`€${kpis.totalRevenue.toFixed(0)}`} color="emerald" />
            <KPICard icon={TrendingUp} label="Νέα αυτόν τον μήνα" value={kpis.newVenuesThisMonth} color="blue" />
            <KPICard icon={Activity} label="Trial" value={kpis.trialVenues} color="amber" />
            <KPICard icon={AlertTriangle} label="Expired" value={kpis.expiredVenues} color="red" />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Αναζήτηση venue, email, πόλη..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'trial', 'expired'] as FilterStatus[]).map(f => (
              <Button
                key={f}
                variant={filterStatus === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(f)}
                className={cn(
                  'text-[11px] font-bold',
                  filterStatus === f && 'bg-zinc-900 text-white'
                )}
              >
                {f === 'all' ? 'Όλα' : f === 'active' ? 'Ενεργά' : f === 'trial' ? 'Trial' : 'Expired'}
                {f !== 'all' && (
                  <span className="ml-1.5 opacity-60">
                    {f === 'active' ? kpis?.activeVenues : f === 'trial' ? kpis?.trialVenues : kpis?.expiredVenues}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Table - Desktop */}
        <div className="hidden md:block">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-zinc-50/80">
                    <SortableHeader label="Venue" field="name" current={sortField} asc={sortAsc} onToggle={toggleSort} />
                    <th className="px-4 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-wider">Status</th>
                    <SortableHeader label="Εγγραφή" field="createdAt" current={sortField} asc={sortAsc} onToggle={toggleSort} />
                    <th className="px-4 py-3 text-center text-[10px] font-black text-zinc-400 uppercase tracking-wider">Γήπεδα</th>
                    <SortableHeader label="Bookings" field="bookings" current={sortField} asc={sortAsc} onToggle={toggleSort} className="text-center" />
                    <SortableHeader label="Πελάτες" field="customers" current={sortField} asc={sortAsc} onToggle={toggleSort} className="text-center" />
                    <th className="px-4 py-3 text-center text-[10px] font-black text-zinc-400 uppercase tracking-wider">Academy</th>
                    <SortableHeader label="Έσοδα" field="revenue" current={sortField} asc={sortAsc} onToggle={toggleSort} className="text-right" />
                    <th className="px-4 py-3 text-right text-[10px] font-black text-zinc-400 uppercase tracking-wider">Τελ. Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredVenues.map(venue => (
                    <tr
                      key={venue.id}
                      className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                      onClick={() => setExpandedVenue(expandedVenue === venue.id ? null : venue.id)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-zinc-900 text-[13px]">{venue.name}</p>
                          <p className="text-[11px] text-zinc-400">{venue.email || venue.city}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getPlanBadge(venue)}</td>
                      <td className="px-4 py-3 text-[12px] text-zinc-500">{formatDate(venue.createdAt)}</td>
                      <td className="px-4 py-3 text-center text-[13px] font-bold text-zinc-700">{venue.stats.pitches}</td>
                      <td className="px-4 py-3 text-center text-[13px] font-bold text-zinc-700">{venue.stats.bookings}</td>
                      <td className="px-4 py-3 text-center text-[13px] font-bold text-zinc-700">{venue.stats.customers}</td>
                      <td className="px-4 py-3 text-center text-[13px] font-bold text-zinc-700">
                        {venue.stats.academyUsers > 0 ? (
                          <span className="text-emerald-600">{venue.stats.academyUsers}</span>
                        ) : (
                          <span className="text-zinc-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-bold text-zinc-700">
                        {venue.stats.revenue > 0 ? `€${venue.stats.revenue.toFixed(0)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-[11px] text-zinc-400">
                        {timeAgo(venue.stats.lastBooking)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredVenues.length === 0 && (
              <div className="py-12 text-center text-sm text-zinc-400">
                Δεν βρέθηκαν venues
              </div>
            )}
          </Card>
        </div>

        {/* Cards - Mobile */}
        <div className="md:hidden space-y-3">
          {filteredVenues.map(venue => (
            <Card key={venue.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedVenue(expandedVenue === venue.id ? null : venue.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-zinc-900 text-[13px] truncate">{venue.name}</p>
                      {getPlanBadge(venue)}
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate">{venue.email} {venue.city ? `- ${venue.city}` : ''}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      <Clock className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                      {formatDate(venue.createdAt)}
                    </p>
                  </div>
                  {expandedVenue === venue.id ? (
                    <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0 ml-2" />
                  )}
                </div>

                {/* Quick stats row */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  <MiniStat icon={Building2} value={venue.stats.pitches} label="Γήπεδα" />
                  <MiniStat icon={CalendarDays} value={venue.stats.bookings} label="Bookings" />
                  <MiniStat icon={Users} value={venue.stats.customers} label="Πελάτες" />
                  <MiniStat icon={GraduationCap} value={venue.stats.academyUsers} label="Academy" />
                </div>

                {/* Expanded details */}
                {expandedVenue === venue.id && (
                  <div className="mt-4 pt-4 border-t border-zinc-100 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <DetailRow label="Plan" value={venue.planType || venue.plan} />
                      <DetailRow label="Ημέρες" value={venue.daysRemaining !== null ? `${venue.daysRemaining}` : '-'} />
                      <DetailRow label="Squads" value={`${venue.stats.squads}`} />
                      <DetailRow label="Staff" value={`${venue.stats.staff}`} />
                      <DetailRow label="Έσοδα" value={venue.stats.revenue > 0 ? `€${venue.stats.revenue.toFixed(0)}` : '-'} />
                      <DetailRow label="Τελ. Booking" value={timeAgo(venue.stats.lastBooking)} />
                      <DetailRow label="Online Bookings" value={venue.bookingsEnabled ? 'ON' : 'OFF'} />
                      <DetailRow label="Τηλέφωνο" value={venue.phone || '-'} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {filteredVenues.length === 0 && (
            <div className="py-12 text-center text-sm text-zinc-400">
              Δεν βρέθηκαν venues
            </div>
          )}
        </div>

        {/* Footer count */}
        <p className="text-[11px] text-zinc-400 mt-4 text-center">
          {filteredVenues.length} από {venues.length} venues
        </p>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  const bg: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className={cn('h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center mb-2', bg[color])}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <p className="text-lg sm:text-xl font-black text-zinc-900">{value}</p>
        <p className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">{label}</p>
        {sub && <p className="text-[9px] text-zinc-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SortableHeader({
  label,
  field,
  current,
  asc,
  onToggle,
  className,
}: {
  label: string;
  field: SortField;
  current: SortField;
  asc: boolean;
  onToggle: (f: SortField) => void;
  className?: string;
}) {
  const active = current === field;
  return (
    <th
      className={cn('px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-600 transition-colors select-none', className)}
      onClick={() => onToggle(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  );
}

function MiniStat({ icon: _Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-[15px] font-black text-zinc-900">{value}</p>
      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-[12px] font-bold text-zinc-700">{value}</p>
    </div>
  );
}
