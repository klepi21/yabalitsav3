'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Tag,
  Trash2,
  X,
  Plus,
  Mail,
  Send,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface CouponData {
  code: string;
  active: boolean;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  appliesTo: 'all' | 'basic' | 'pro' | 'enterprise';
  expiresAt?: string;
  description?: string;
}

interface VenueSquad {
  id: string;
  name: string;
  ageGroup: string;
  athleteCount: number;
}

interface AcademyGroupUser {
  id: string;
  displayName: string;
  createdAt: string | null;
}

interface AcademyGroup {
  groupId: string;
  groupName: string;
  groupIcon: string;
  groupColor: string;
  users: AcademyGroupUser[];
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
  coupon: CouponData | null;
  coupons: CouponData[];
  createdAt: string | null;
  updatedAt: string | null;
  stats: VenueStats;
  academyGroups: AcademyGroup[];
  squads: VenueSquad[];
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

  // Coupon dialog
  const [couponVenue, setCouponVenue] = useState<VenueDetail | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    appliesTo: 'all' as 'all' | 'basic' | 'pro' | 'enterprise',
    expiresAt: '',
    description: '',
  });
  const [couponSaving, setCouponSaving] = useState(false);

  const [editingCouponCode, setEditingCouponCode] = useState<string | null>(null);

  // Coupon delete confirmation
  const [deleteCoupon, setDeleteCoupon] = useState<{ venueId: string; code: string } | null>(null);

  // Coupon email dialog
  const [emailDialog, setEmailDialog] = useState<{ venue: VenueDetail; coupon: CouponData } | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  const getCouponEmailTemplate = (venue: VenueDetail, c: CouponData) => {
    const discountText = c.discountType === 'percentage'
      ? `${c.discountValue}% έκπτωση`
      : `€${c.discountValue} έκπτωση`;
    const planText = c.appliesTo === 'all' ? 'σε όλα τα πλάνα' : `στο πλάνο ${c.appliesTo}`;
    const expiryText = c.expiresAt
      ? `\n\nΗ προσφορά ισχύει μέχρι τις ${new Date(c.expiresAt).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })}.`
      : '';

    return {
      subject: `Ειδική Προσφορά για ${venue.name} — ${discountText}!`,
      body: `Έχουμε μια ειδική προσφορά αποκλειστικά για εσάς!\n\nΧρησιμοποιήστε τον κωδικό ${c.code} κατά την ανανέωση της συνδρομής σας και κερδίστε ${discountText} ${planText}.\n\nΠώς να τον χρησιμοποιήσετε:\n1. Συνδεθείτε στο λογαριασμό σας στο yabalitsa.com\n2. Πηγαίνετε στις Ρυθμίσεις → Ανανέωση Συνδρομής\n3. Εισάγετε τον κωδικό ${c.code} στο πεδίο κουπονιού\n4. Η έκπτωση θα εφαρμοστεί αυτόματα${expiryText}\n\nΜην χάσετε αυτή την ευκαιρία!\n\nΜε εκτίμηση,\nΗ ομάδα Yabalitsa`,
    };
  };

  const openEmailDialog = (venue: VenueDetail, c: CouponData) => {
    const template = getCouponEmailTemplate(venue, c);
    setEmailSubject(template.subject);
    setEmailBody(template.body);
    setEmailDialog({ venue, coupon: c });
  };

  const handleSendCouponEmail = async () => {
    if (!emailDialog || !user) return;
    setEmailSending(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/send-coupon-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          recipientEmail: emailDialog.venue.email,
          recipientName: emailDialog.venue.name,
          subject: emailSubject,
          body: emailBody,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setEmailDialog(null);
    } catch {
      setError('Αποτυχία αποστολής email');
    } finally {
      setEmailSending(false);
    }
  };

  const openCouponDialog = (venue: VenueDetail, existingCode?: string) => {
    setCouponVenue(venue);
    if (existingCode) {
      const existing = venue.coupons.find(c => c.code === existingCode);
      if (existing) {
        setEditingCouponCode(existingCode);
        setCouponForm({
          code: existing.code,
          discountType: existing.discountType,
          discountValue: existing.discountValue,
          appliesTo: existing.appliesTo || 'all',
          expiresAt: existing.expiresAt || '',
          description: existing.description || '',
        });
        return;
      }
    }
    setEditingCouponCode(null);
    setCouponForm({ code: '', discountType: 'percentage', discountValue: 0, appliesTo: 'all', expiresAt: '', description: '' });
  };

  const handleSaveCoupon = async () => {
    if (!couponVenue || !user || !couponForm.code.trim()) return;
    setCouponSaving(true);
    try {
      const token = await user.getIdToken();
      const action = editingCouponCode ? 'update' : 'add';
      const res = await fetch('/api/admin/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          action,
          venueId: couponVenue.id,
          coupon: { ...couponForm, active: !editingCouponCode },
          couponCode: editingCouponCode,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Αποτυχία');
        return;
      }
      const data = await res.json();
      setVenues(prev => prev.map(v => v.id === couponVenue.id ? {
        ...v,
        coupons: data.coupons,
        coupon: data.coupons.find((c: CouponData) => c.active) || null,
      } : v));
      setCouponVenue(null);
    } catch { setError('Αποτυχία αποθήκευσης κουπονιού'); }
    finally { setCouponSaving(false); }
  };

  const couponApiCall = async (venueId: string, action: string, couponCode: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action, venueId, couponCode }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setVenues(prev => prev.map(v => v.id === venueId ? {
        ...v,
        coupons: data.coupons,
        coupon: data.coupons.find((c: CouponData) => c.active) || null,
      } : v));
    } catch { setError('Αποτυχία ενημέρωσης'); }
  };

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


  const getPlanBadge = (venue: VenueDetail) => {
    if (!venue.active) {
      return <Badge variant="destructive" className="text-[11px] font-black">EXPIRED</Badge>;
    }
    if (venue.plan === 'trial') {
      return <Badge className="bg-amber-100 text-amber-700 text-[11px] font-black hover:bg-amber-100">TRIAL</Badge>;
    }
    const colors: Record<string, string> = {
      Basic: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      Pro: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
      Enterprise: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    };
    return (
      <Badge className={cn('text-[11px] font-black', colors[venue.planType || 'Basic'] || colors.Basic)}>
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
                    <th className="px-4 py-3 text-left text-[12px] font-black text-zinc-400 uppercase tracking-wider">Status</th>
                    <SortableHeader label="Εγγραφή" field="createdAt" current={sortField} asc={sortAsc} onToggle={toggleSort} />
                    <th className="px-4 py-3 text-center text-[12px] font-black text-zinc-400 uppercase tracking-wider">Γήπεδα</th>
                    <SortableHeader label="Bookings" field="bookings" current={sortField} asc={sortAsc} onToggle={toggleSort} className="text-center" />
                    <SortableHeader label="Πελάτες" field="customers" current={sortField} asc={sortAsc} onToggle={toggleSort} className="text-center" />
                    <th className="px-4 py-3 text-center text-[12px] font-black text-zinc-400 uppercase tracking-wider">Academy</th>
                    <SortableHeader label="Έσοδα" field="revenue" current={sortField} asc={sortAsc} onToggle={toggleSort} className="text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredVenues.map(venue => (
                    <React.Fragment key={venue.id}>
                      <tr
                        className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                        onClick={() => setExpandedVenue(expandedVenue === venue.id ? null : venue.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-bold text-zinc-900 text-[13px]">{venue.name}</p>
                              <p className="text-[11px] text-zinc-400">{venue.email || venue.city}</p>
                            </div>
                            {expandedVenue === venue.id ? (
                              <ChevronUp className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            )}
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
                      </tr>
                      {expandedVenue === venue.id && (
                        <tr>
                          <td colSpan={8} className="bg-zinc-50/80 px-4 py-4">
                            <div className="grid grid-cols-4 gap-3 mb-4">
                              <DetailRow label="Plan" value={venue.planType || venue.plan} />
                              <DetailRow label="Ημέρες" value={venue.daysRemaining !== null ? `${venue.daysRemaining}` : '-'} />
                              <DetailRow label="Squads" value={`${venue.stats.squads}`} />
                              <DetailRow label="Staff" value={`${venue.stats.staff}`} />
                              <DetailRow label="Online Bookings" value={venue.bookingsEnabled ? 'ON' : 'OFF'} />
                              <DetailRow label="Τηλέφωνο" value={venue.phone || '-'} />
                              <DetailRow label="Έσοδα" value={venue.stats.revenue > 0 ? `€${venue.stats.revenue.toFixed(0)}` : '-'} />
                            </div>
                            {venue.squads.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-zinc-200">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-3">Τμήματα ({venue.squads.length})</p>
                                <div className="flex flex-wrap gap-2">
                                  {venue.squads.map(squad => (
                                    <div key={squad.id} className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5">
                                      <span className="text-[11px] font-bold text-zinc-700">{squad.name}</span>
                                      {squad.ageGroup && <span className="text-[9px] text-zinc-400">({squad.ageGroup})</span>}
                                      <Badge className="text-[8px] font-black bg-emerald-100 text-emerald-700 ml-1">{squad.athleteCount}</Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {venue.academyGroups.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-zinc-200">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-3">Academy Users ανά Group</p>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                  {venue.academyGroups.map(group => (
                                    <AcademyGroupCard key={group.groupId} group={group} formatDate={formatDate} />
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Coupons Section */}
                            <div className="mt-3 pt-3 border-t border-zinc-200">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Κουπόνια ({venue.coupons.length})</p>
                                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold rounded-lg" onClick={(e) => { e.stopPropagation(); openCouponDialog(venue); }}>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Νέο Κουπόνι
                                </Button>
                              </div>
                              {venue.coupons.length > 0 ? (
                                <div className="space-y-1.5">
                                  {venue.coupons.map(c => (
                                    <div key={c.code} className={cn("flex items-center gap-2 p-2 rounded-lg border", c.active ? "bg-emerald-50/50 border-emerald-100" : "bg-zinc-50 border-zinc-100")}>
                                      <Badge className={cn('text-[9px] font-black shrink-0', c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-500')}>
                                        {c.code}
                                      </Badge>
                                      <span className="text-[10px] font-bold text-zinc-500 truncate">
                                        {c.discountType === 'percentage' ? `${c.discountValue}%` : `€${c.discountValue}`}
                                        {c.appliesTo !== 'all' && ` (${c.appliesTo})`}
                                      </span>
                                      <div className="ml-auto flex items-center gap-1 shrink-0">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); couponApiCall(venue.id, c.active ? 'deactivate' : 'activate', c.code); }}
                                          className={cn("relative h-4 w-7 rounded-full transition-colors", c.active ? "bg-emerald-500" : "bg-zinc-300")}
                                        >
                                          <div className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all", c.active ? "left-[13px]" : "left-0.5")} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); openEmailDialog(venue, c); }} className="h-5 w-5 flex items-center justify-center text-zinc-400 hover:text-amber-500" title="Αποστολή email">
                                          <Mail className="h-2.5 w-2.5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); openCouponDialog(venue, c.code); }} className="h-5 w-5 flex items-center justify-center text-zinc-400 hover:text-blue-500" title="Επεξεργασία">
                                          <Tag className="h-2.5 w-2.5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setDeleteCoupon({ venueId: venue.id, code: c.code }); }} className="h-5 w-5 flex items-center justify-center text-zinc-400 hover:text-red-500" title="Διαγραφή">
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-zinc-300">Κανένα κουπόνι</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
                    <p className="text-[12px] text-zinc-400 mt-0.5">
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
                      <DetailRow label="Online Bookings" value={venue.bookingsEnabled ? 'ON' : 'OFF'} />
                      <DetailRow label="Τηλέφωνο" value={venue.phone || '-'} />
                    </div>
                    {venue.squads.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-100">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2">Τμήματα ({venue.squads.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {venue.squads.map(squad => (
                            <div key={squad.id} className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1">
                              <span className="text-[10px] font-bold text-zinc-700">{squad.name}</span>
                              <Badge className="text-[8px] font-black bg-emerald-100 text-emerald-700">{squad.athleteCount}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {venue.academyGroups.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-100">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2">Academy Users ανά Group</p>
                        <div className="space-y-2">
                          {venue.academyGroups.map(group => (
                            <AcademyGroupCard key={group.groupId} group={group} formatDate={formatDate} />
                          ))}
                        </div>
                      </div>
                    )}
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

      {/* Coupon Dialog */}
      <AlertDialog open={couponVenue !== null} onOpenChange={(open) => !open && setCouponVenue(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl p-0 max-w-md overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 pt-6 pb-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-black text-white flex items-center gap-2">
                {editingCouponCode ? <Tag className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {editingCouponCode ? 'Επεξεργασία Κουπονιού' : 'Νέο Κουπόνι'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-emerald-100 text-sm">
                {couponVenue?.name}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[10px] font-black text-zinc-400 uppercase">Κωδικός *</Label>
                <Input
                  value={couponForm.code}
                  onChange={(e) => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="π.χ. SPORT2026"
                  className="h-10 font-bold uppercase tracking-wider"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-zinc-400 uppercase">Τύπος</Label>
                <Select value={couponForm.discountType} onValueChange={(v: 'percentage' | 'fixed') => setCouponForm(p => ({ ...p, discountType: v }))}>
                  <SelectTrigger className="h-10 text-sm font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Ποσοστό (%)</SelectItem>
                    <SelectItem value="fixed">Σταθερό (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-zinc-400 uppercase">
                  Τιμή {couponForm.discountType === 'percentage' ? '(%)' : '(€)'}
                </Label>
                <Input
                  type="number"
                  value={couponForm.discountValue || ''}
                  onChange={(e) => setCouponForm(p => ({ ...p, discountValue: Number(e.target.value) }))}
                  className="h-10 font-bold"
                  min={0}
                  max={couponForm.discountType === 'percentage' ? 100 : undefined}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-zinc-400 uppercase">Εφαρμογή σε</Label>
                <Select value={couponForm.appliesTo} onValueChange={(v: 'all' | 'basic' | 'pro' | 'enterprise') => setCouponForm(p => ({ ...p, appliesTo: v }))}>
                  <SelectTrigger className="h-10 text-sm font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Όλα τα πλάνα</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-zinc-400 uppercase">Λήξη (προαιρ.)</Label>
                <Input
                  type="date"
                  value={couponForm.expiresAt}
                  onChange={(e) => setCouponForm(p => ({ ...p, expiresAt: e.target.value }))}
                  className="h-10 font-bold"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="text-[10px] font-black text-zinc-400 uppercase">Σημείωση (προαιρ.)</Label>
                <Input
                  value={couponForm.description}
                  onChange={(e) => setCouponForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="π.χ. Promo πρώτου μήνα"
                  className="h-10"
                />
              </div>
            </div>

            {/* Preview */}
            {couponForm.code && couponForm.discountValue > 0 && (
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <p className="text-[11px] font-bold text-emerald-700">
                  Κωδικός <span className="font-black">{couponForm.code.toUpperCase()}</span> →{' '}
                  {couponForm.discountType === 'percentage' ? `${couponForm.discountValue}% έκπτωση` : `€${couponForm.discountValue} έκπτωση`}
                  {couponForm.appliesTo !== 'all' && ` στο ${couponForm.appliesTo}`}
                  {couponForm.expiresAt && ` (μέχρι ${new Date(couponForm.expiresAt).toLocaleDateString('el-GR')})`}
                </p>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 flex gap-2">
            <Button variant="ghost" className="flex-1 h-10 font-bold text-zinc-400" onClick={() => setCouponVenue(null)}>
              <X className="h-4 w-4 mr-1" />
              Ακύρωση
            </Button>
            <Button
              className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              disabled={!couponForm.code.trim() || !couponForm.discountValue || couponSaving}
              onClick={handleSaveCoupon}
            >
              {couponSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4 mr-1" />}
              Αποθήκευση
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Coupon Confirmation */}
      <AlertDialog open={deleteCoupon !== null} onOpenChange={(open) => !open && setDeleteCoupon(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl p-0 max-w-sm overflow-hidden">
          <div className="bg-gradient-to-br from-red-400 via-red-500 to-rose-600 px-6 pt-6 pb-4 text-center">
            <div className="mx-auto h-12 w-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-3">
              <Trash2 className="h-5 w-5 text-white" />
            </div>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-black text-white">
                Διαγραφή Κουπονιού
              </AlertDialogTitle>
              <AlertDialogDescription className="text-red-100 text-sm mt-1">
                Σίγουρα θέλετε να διαγράψετε το κουπόνι <strong>{deleteCoupon?.code}</strong>;
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="px-6 py-5 flex gap-2">
            <Button variant="ghost" className="flex-1 h-10 font-bold text-zinc-400" onClick={() => setDeleteCoupon(null)}>
              Ακύρωση
            </Button>
            <Button
              className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={() => {
                if (deleteCoupon) {
                  couponApiCall(deleteCoupon.venueId, 'remove', deleteCoupon.code);
                  setDeleteCoupon(null);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Διαγραφή
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Coupon Email Dialog */}
      <AlertDialog open={emailDialog !== null} onOpenChange={(open) => !open && setEmailDialog(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl p-0 max-w-lg overflow-hidden">
          <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 px-6 pt-6 pb-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-black text-white flex items-center gap-2">
                <Send className="h-5 w-5" />
                Αποστολή Κουπονιού
              </AlertDialogTitle>
              <AlertDialogDescription className="text-amber-100 text-sm">
                {emailDialog?.venue.name} → {emailDialog?.venue.email || 'Δεν υπάρχει email'}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>

          {emailDialog && (
            <div className="p-6 space-y-4">
              {/* Coupon preview */}
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <Badge className="text-[10px] font-black bg-emerald-200 text-emerald-800">{emailDialog.coupon.code}</Badge>
                <span className="text-sm font-bold text-emerald-700">
                  {emailDialog.coupon.discountType === 'percentage' ? `${emailDialog.coupon.discountValue}%` : `€${emailDialog.coupon.discountValue}`}
                  {emailDialog.coupon.appliesTo !== 'all' && ` (${emailDialog.coupon.appliesTo})`}
                </span>
              </div>

              {/* Recipient */}
              <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl">
                <Mail className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-bold text-zinc-700">{emailDialog.venue.email || 'Δεν υπάρχει email'}</span>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-zinc-400 uppercase">Θέμα</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="h-10 font-bold text-sm"
                />
              </div>

              {/* Body - editable */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black text-zinc-400 uppercase">Κείμενο Email</Label>
                  <button
                    onClick={() => {
                      const template = getCouponEmailTemplate(emailDialog.venue, emailDialog.coupon);
                      setEmailSubject(template.subject);
                      setEmailBody(template.body);
                    }}
                    className="text-[9px] font-bold text-blue-500 hover:text-blue-700"
                  >
                    Επαναφορά αρχικού
                  </button>
                </div>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white resize-none transition-all leading-relaxed"
                />
              </div>
            </div>
          )}

          <div className="px-6 pb-6 flex gap-2">
            <Button variant="ghost" className="flex-1 h-10 font-bold text-zinc-400" onClick={() => setEmailDialog(null)}>
              Ακύρωση
            </Button>
            <Button
              className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 text-white font-bold"
              disabled={!emailDialog?.venue.email || emailSending || !emailSubject.trim() || !emailBody.trim()}
              onClick={handleSendCouponEmail}
            >
              {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Αποστολή
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
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
        <p className="text-[12px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>}
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
      className={cn('px-4 py-3 text-[12px] font-black text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-600 transition-colors select-none', className)}
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
      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-[12px] font-bold text-zinc-700">{value}</p>
    </div>
  );
}

const GROUP_COLOR_MAP: Record<string, string> = {
  green: 'bg-green-100 text-green-800 border-green-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  pink: 'bg-pink-100 text-pink-800 border-pink-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  teal: 'bg-teal-100 text-teal-800 border-teal-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  gray: 'bg-zinc-100 text-zinc-800 border-zinc-200',
};

function AcademyGroupCard({
  group,
  formatDate,
}: {
  group: AcademyGroup;
  formatDate: (iso: string | null) => string;
}) {
  const colorClass = GROUP_COLOR_MAP[group.groupColor] || GROUP_COLOR_MAP.gray;

  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{group.groupIcon}</span>
          <Badge className={cn('text-[11px] font-black', colorClass)}>
            {group.groupName}
          </Badge>
        </div>
        <span className="text-[11px] font-black text-zinc-500">{group.users.length}</span>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {group.users.map(user => (
          <div key={user.id} className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-700 truncate mr-2">{user.displayName}</span>
            <span className="text-zinc-400 shrink-0">{formatDate(user.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
