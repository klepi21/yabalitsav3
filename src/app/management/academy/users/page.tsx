'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { academyUserService, userGroupService, squadService, academyPaymentService } from '@/lib/academy-services';
import { AcademyUser, AcademyPayment, UserGroup, Squad, GROUP_COLORS } from '@/types/academy';
import { Loader2, Plus, Search, Users, Pencil, Trash2, Mail, Phone, MoreHorizontal, AlertCircle, ChevronLeft, ChevronRight, CircleDollarSign, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, toGreekUpperCase } from '@/lib/utils';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function AcademyUsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<AcademyUser[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [payments, setPayments] = useState<AcademyPayment[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [initAmount, setInitAmount] = useState<string>('');
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const urlGroupId = searchParams.get('group');
  const urlSquad = searchParams.get('squad');
  const [groupFilter, setGroupFilter] = useState<string | 'all'>(urlGroupId || 'all');
  const [squadFilter, setSquadFilter] = useState<string | null>(urlSquad);

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`); return; }
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [usersData, groupsData, squadsData, paymentsData] = await Promise.all([
          academyUserService.getByVenue(venueId),
          userGroupService.getOrSeed(venueId),
          squadService.getByVenue(venueId),
          academyPaymentService.getByVenueAndMonth(venueId, selectedMonth),
        ]);
        setUsers(usersData);
        setGroups(groupsData);
        setSquads(squadsData);

        // Auto-sync: create missing payment records for athletes not yet in this month
        if (paymentsData.length > 0) {
          const athleteGroupIds = new Set(groupsData.filter(g => g.capabilities.includes('squad_assignment')).map(g => g.id));
          const allAthletes = usersData.filter(u => athleteGroupIds.has(u.groupId));
          const existingUserIds = new Set(paymentsData.map(p => p.userId));
          const missing = allAthletes.filter(a => !existingUserIds.has(a.id));

          if (missing.length > 0) {
            const defaultAmount = paymentsData[0].amount;
            await academyPaymentService.initMonth(venueId, missing, selectedMonth, defaultAmount);
            const updatedPayments = await academyPaymentService.getByVenueAndMonth(venueId, selectedMonth);
            setPayments(updatedPayments);
          } else {
            setPayments(paymentsData);
          }
        } else {
          setPayments(paymentsData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, venueOwner, authLoading, router, venueId, pathname, selectedMonth]);

  useEffect(() => {
    if (urlGroupId) setGroupFilter(urlGroupId);
    if (urlSquad) setSquadFilter(urlSquad);
  }, [urlGroupId, urlSquad]);

  const getGroup = (groupId: string) => groups.find((g) => g.id === groupId);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        searchQuery === '' ||
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (typeof user.fields.email === 'string' && user.fields.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (typeof user.fields.phone === 'string' && user.fields.phone.includes(searchQuery));

      const matchesGroup = groupFilter === 'all' || user.groupId === groupFilter;
      const matchesSquad = !squadFilter || (user.squad_ids || []).includes(squadFilter) || user.squad_id === squadFilter;

      return matchesSearch && matchesGroup && matchesSquad;
    });
  }, [users, searchQuery, groupFilter, squadFilter]);

  const userStats = useMemo(() => {
    const stats: Record<string, number> = { total: users.length };
    groups.forEach((g) => {
      stats[g.id] = users.filter((u) => u.groupId === g.id).length;
    });
    return stats;
  }, [users, groups]);

  const handleDelete = async (userId: string) => {
    try {
      await academyUserService.delete(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία διαγραφής');
    }
  };

  const getSquadName = (squadId: string) => {
    const squad = squads.find((s) => s.id === squadId);
    return squad ? `${squad.name} (${squad.ageGroup})` : 'Χωρίς τμήμα';
  };

  const _getParentName = (parentId: string) => {
    const parent = users.find((u) => u.id === parentId);
    return parent?.displayName || 'Άγνωστος';
  };

  const activeGroup = groupFilter !== 'all' ? getGroup(groupFilter) : null;

  // Payment helpers
  const getPaymentForUser = (userId: string) => payments.find(p => p.userId === userId);

  const athleteGroups = groups.filter(g => g.capabilities.includes('squad_assignment'));
  const isAthleteGroup = (groupId: string) => athleteGroups.some(g => g.id === groupId);
  const showPayments = groupFilter === 'all' || (activeGroup !== null && isAthleteGroup(groupFilter));

  const togglePayment = async (userId: string) => {
    const existing = getPaymentForUser(userId);
    if (existing) {
      const newPaid = !existing.paid;
      await academyPaymentService.togglePaid(existing.id, newPaid);
      setPayments(prev => prev.map(p => p.id === existing.id ? { ...p, paid: newPaid, paidAt: newPaid ? new Date().toISOString() : undefined } : p));
    }
  };

  const changeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatMonth = (month: string) => {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  };

  const handleInitMonth = async () => {
    const amount = parseFloat(initAmount);
    if (!amount || amount <= 0 || !venueId) return;
    setIsInitializing(true);
    try {
      const athletes = users.filter(u => isAthleteGroup(u.groupId));
      await academyPaymentService.initMonth(venueId, athletes, selectedMonth, amount);
      const updated = await academyPaymentService.getByVenueAndMonth(venueId, selectedMonth);
      setPayments(updated);
      setShowInitDialog(false);
      setInitAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία αρχικοποίησης');
    } finally {
      setIsInitializing(false);
    }
  };

  const paidCount = payments.filter(p => p.paid).length;
  const totalPaymentsAmount = payments.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);


  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-red-700 font-bold">{error}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setError(null)} 
              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold"
            >
              Κλείσιμο
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-2 border-b border-zinc-50">
        <div className="flex items-center gap-3.5">
           <div className="h-11 w-11 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shrink-0">
             <Users className="h-5 w-5 text-emerald-400" />
           </div>
           <div className="space-y-0.5">
             <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase">
               {activeGroup ? toGreekUpperCase(activeGroup.namePlural) : toGreekUpperCase('Χρήστες Ακαδημίας')}
             </h1>
             <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight">
               {activeGroup
                 ? toGreekUpperCase(`Διαχείριση των ${activeGroup.namePlural.toLowerCase()}`)
                 : toGreekUpperCase('Δείτε και διαχειριστείτε όλα τα μέλη')}
             </p>
           </div>
        </div>
        
        <Button asChild className="h-10 px-5 rounded-lg bg-zinc-900 hover:bg-black text-white font-bold text-[12px] shadow-md transition-all active:scale-95 group">
          <Link href="/management/academy/users/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            {toGreekUpperCase('Προσθήκη Μέλους')}
          </Link>
        </Button>
      </div>

      {/* Stats Cards — hide when filtered by squad */}
      {!urlSquad && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => setGroupFilter('all')}
            className={cn(
              "flex flex-col items-start p-3 rounded-xl border transition-all duration-300 text-left group overflow-hidden relative",
              groupFilter === 'all'
                ? "bg-zinc-900 text-white border-zinc-900 shadow-lg scale-105 z-10"
                : "bg-white text-zinc-900 border-zinc-100 hover:border-emerald-200 hover:shadow-md"
            )}
          >
            <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center mb-2 transition-all shadow-sm", 
              groupFilter === 'all' ? "bg-white/10 text-emerald-400" : "bg-zinc-50 text-zinc-300 group-hover:bg-emerald-50 group-hover:text-emerald-500"
            )}>
              <Users className="h-3 w-3" />
            </div>
            <p className="text-lg font-black leading-none mb-1 tracking-tight">{userStats.total}</p>
            <p className={cn("text-[8px] font-bold uppercase tracking-wider", 
              groupFilter === 'all' ? "text-zinc-400" : "text-zinc-400"
            )}>{toGreekUpperCase('Σύνολο')}</p>
          </button>

          {groups.map((group) => {
            const isActive = groupFilter === group.id;
            return (
              <button
                key={group.id}
                onClick={() => setGroupFilter(isActive ? 'all' : group.id)}
                className={cn(
                  "flex flex-col items-start p-3 rounded-xl border transition-all duration-300 text-left group overflow-hidden relative",
                  isActive
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-lg scale-105 z-10"
                    : "bg-white text-zinc-900 border-zinc-100 hover:border-emerald-200 hover:shadow-md"
                )}
              >
                <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center mb-2 text-sm transition-all shadow-sm", 
                  isActive ? "bg-white/20 text-white" : "bg-zinc-50"
                )}>
                  {group.icon || '👤'}
                </div>
                <p className="text-lg font-black leading-none mb-1 tracking-tight uppercase">{userStats[group.id] || 0}</p>
                <p className={cn("text-[8px] font-bold uppercase tracking-wider", 
                  isActive ? "text-emerald-100" : "text-zinc-400"
                )}>{toGreekUpperCase(group.namePlural)}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Monthly Payments Section */}
      {showPayments && (
        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CircleDollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="text-[13px] font-black text-zinc-900 uppercase tracking-tight">{toGreekUpperCase('Μηνιαίες Πληρωμές')}</h3>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => changeMonth(-1)} className="h-8 w-8 rounded-lg bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center transition-colors">
                <ChevronLeft className="h-4 w-4 text-zinc-500" />
              </button>
              <span className="text-sm font-black text-zinc-900 min-w-[160px] text-center uppercase">
                {toGreekUpperCase(formatMonth(selectedMonth))}
              </span>
              <button onClick={() => changeMonth(1)} className="h-8 w-8 rounded-lg bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center transition-colors">
                <ChevronRight className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
          </div>

          {payments.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-emerald-50 p-3 text-center">
                  <p className="text-lg font-black text-emerald-700">{paidCount}/{payments.length}</p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-600">{toGreekUpperCase('Πληρωμένοι')}</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-lg font-black text-red-600">{payments.length - paidCount}</p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-red-500">{toGreekUpperCase('Ανεξόφλητοι')}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <p className="text-lg font-black text-blue-700">€{totalPaymentsAmount.toFixed(0)}</p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-blue-600">{toGreekUpperCase('Εισπράξεις')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-zinc-400 font-bold mb-3">{toGreekUpperCase('Δεν υπάρχουν εγγραφές πληρωμών για αυτόν τον μήνα')}</p>
              <AlertDialog open={showInitDialog} onOpenChange={setShowInitDialog}>
                <AlertDialogTrigger asChild>
                  <Button className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    {toGreekUpperCase('Ετοιμασία Μήνα')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl p-6">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-black">{toGreekUpperCase('Ετοιμασία Πληρωμών')}</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-zinc-500">
                      {toGreekUpperCase(`Θα δημιουργηθούν εγγραφές πληρωμών για ${formatMonth(selectedMonth)} για όλους τους αθλητές.`)}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-1.5 block">{toGreekUpperCase('Μηνιαίο ποσό (€)')}</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={initAmount}
                      onChange={(e) => setInitAmount(e.target.value)}
                      placeholder="π.χ. 50"
                      className="h-10 rounded-lg font-bold"
                    />
                  </div>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel className="h-10 rounded-lg font-bold">{toGreekUpperCase('Ακύρωση')}</AlertDialogCancel>
                    <Button
                      onClick={handleInitMonth}
                      disabled={isInitializing || !initAmount || parseFloat(initAmount) <= 0}
                      className="h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      {isInitializing ? <Loader2 className="h-4 w-4 animate-spin" /> : toGreekUpperCase('Δημιουργία')}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      )}

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-emerald-500 transition-colors" />
          <Input
            placeholder={toGreekUpperCase('Αναζήτηση...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10 pr-4 bg-white rounded-lg border-zinc-100 shadow-sm focus:ring-4 focus:ring-emerald-500/10 font-bold text-xs placeholder:text-zinc-300 w-full transition-all uppercase"
          />
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          {!urlSquad && (
            <Select value={groupFilter} onValueChange={(val: string) => setGroupFilter(val)}>
                <SelectTrigger className="h-10 px-4 rounded-lg bg-white border-zinc-100 shadow-sm font-bold text-xs focus:ring-4 focus:ring-emerald-500/10 transition-all min-w-[180px] uppercase">
                    <SelectValue placeholder={toGreekUpperCase('Όλες οι Κατηγορίες')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-zinc-100 shadow-2xl p-1">
                    <SelectItem value="all" className="font-bold text-xs rounded-lg py-2 uppercase tracking-tight">{toGreekUpperCase('Όλες οι Κατηγορίες')}</SelectItem>
                    {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id} className="font-bold text-xs rounded-lg py-2 uppercase tracking-tight">{toGreekUpperCase(g.namePlural)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          )}

          {(urlGroupId || urlSquad || groupFilter !== 'all' || searchQuery) && (
            <Button
              variant="ghost"
              onClick={() => { setGroupFilter('all'); setSquadFilter(null); setSearchQuery(''); }}
              className="h-10 px-4 text-zinc-400 hover:text-zinc-900 font-black rounded-lg hover:bg-zinc-100 touch-target uppercase text-[10px] tracking-[0.2em]"
            >
              {toGreekUpperCase('Καθαρισμός')}
            </Button>
          )}
        </div>
      </div>

      {/* Users Content Container */}
      <div className="space-y-6">
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm py-20 text-center">
            <div className="mx-auto h-16 w-16 bg-zinc-50 rounded-xl flex items-center justify-center mb-6 shadow-inner">
              <Users className="h-8 w-8 text-zinc-200" />
            </div>
            <h3 className="text-xl font-black text-zinc-900 mb-1">Δεν βρέθηκαν χρήστες</h3>
            <p className="text-zinc-500 font-medium text-base max-w-sm mx-auto px-6">
              {searchQuery || groupFilter !== 'all'
                ? 'Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης ή τα φίλτρα σας.'
                : 'Ξεκινήστε προσθέτοντας τα πρώτα μέλη στην ακαδημία σας.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile/Tablet Card Layout (hidden on Desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:hidden">
              {filteredUsers.map((u) => {
                const group = getGroup(u.groupId);
                return (
                  <div key={u.id} className="bg-white rounded-2xl border border-zinc-100 p-5 space-y-4 shadow-sm active:bg-zinc-50 transition-all hover:shadow-md group">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-zinc-900 leading-tight uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{toGreekUpperCase(u.displayName)}</p>
                        {group && (
                          <div className={cn("inline-flex items-center px-3 py-1 rounded-lg font-black text-[8px] uppercase tracking-wider border-none shadow-sm", GROUP_COLORS[group.color] || '')}>
                            {toGreekUpperCase(group.name)}
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg bg-zinc-50 hover:bg-white border border-zinc-100">
                            <MoreHorizontal className="h-5 w-5 text-zinc-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl border-zinc-100 animate-in zoom-in-95 duration-200">
                          <DropdownMenuItem asChild className="rounded-xl px-4 py-3 font-bold cursor-pointer transition-colors">
                            <Link href={`/management/academy/users/${u.id}/edit`} className="flex items-center w-full">
                              <Pencil className="h-4 w-4 mr-3 text-zinc-400" />
                              {toGreekUpperCase('Επεξεργασία')}
                            </Link>
                          </DropdownMenuItem>
                          <AlertDialog open={deleteConfirm === u.id} onOpenChange={(open: boolean) => !open && setDeleteConfirm(null)}>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e: Event) => { e.preventDefault(); setDeleteConfirm(u.id); }}
                                className="rounded-xl px-4 py-3 font-bold cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-4 w-4 mr-3" />
                                {toGreekUpperCase('Διαγραφή')}
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2.5rem] p-10">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-2xl font-black text-zinc-900">Διαγραφή χρήστη</AlertDialogTitle>
                                    <AlertDialogDescription className="text-lg font-medium text-zinc-500 mt-2">
                                        Είστε σίγουροι ότι θέλετε να διαγράψετε τον χρήστη <span className="text-zinc-900 font-bold">&quot;{u.displayName}&quot;</span>;
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-10 gap-3">
                                    <AlertDialogCancel className="h-14 px-8 rounded-2xl font-bold border-zinc-100">Ακύρωση</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={() => handleDelete(u.id)}
                                        className="h-14 px-8 rounded-2xl bg-red-600 text-white font-black hover:bg-red-700 shadow-lg shadow-red-200"
                                    >
                                        Διαγραφή
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-50">
                        {u.fields.phone && (
                            <a href={`tel:${u.fields.phone}`} className="flex flex-col items-start gap-1 p-2 rounded-lg bg-zinc-50">
                                <p className="text-[9px] font-black uppercase text-zinc-400">Τηλέφωνο</p>
                                <p className="text-xs font-bold text-zinc-900">{u.fields.phone}</p>
                            </a>
                        )}
                        {(u.squad_id || (u.squad_ids && u.squad_ids[0])) && (
                             <div className="flex flex-col items-start gap-1 p-2 rounded-lg bg-zinc-50">
                                <p className="text-[9px] font-black uppercase text-zinc-400">Τμήμα</p>
                                <p className="text-xs font-bold text-zinc-900 truncate w-full">{getSquadName(u.squad_id || u.squad_ids![0])}</p>
                             </div>
                        )}
                        {showPayments && isAthleteGroup(u.groupId) && (() => {
                          const payment = getPaymentForUser(u.id);
                          if (!payment) return null;
                          return (
                            <button
                              onClick={() => togglePayment(u.id)}
                              className={cn(
                                "flex items-center justify-between gap-3 p-3 rounded-xl col-span-2 transition-all active:scale-[0.98] border-2",
                                payment.paid
                                  ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-red-50 border-red-200 hover:bg-red-100"
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                {payment.paid
                                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                  : <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                                }
                                <div className="text-left">
                                  <p className={cn("text-sm font-black", payment.paid ? "text-emerald-700" : "text-red-600")}>
                                    {payment.paid ? toGreekUpperCase('Εξοφλημένο') : toGreekUpperCase('Ανεξόφλητο')}
                                  </p>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase">{formatMonth(selectedMonth)}</p>
                                </div>
                              </div>
                              <span className={cn("text-lg font-black", payment.paid ? "text-emerald-700" : "text-red-600")}>
                                €{payment.amount}
                              </span>
                            </button>
                          );
                        })()}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden lg:block bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-none hover:bg-transparent bg-zinc-50/50">
                    <TableHead className="h-10 px-4 text-[8px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Χρήστης')}</TableHead>
                    <TableHead className="h-10 px-4 text-[8px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Κατηγορία')}</TableHead>
                    <TableHead className="h-10 px-4 text-[8px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Επικοινωνία')}</TableHead>
                    <TableHead className="h-10 px-4 text-[8px] font-black uppercase tracking-widest text-zinc-400">{toGreekUpperCase('Πληροφορίες')}</TableHead>
                    {showPayments && <TableHead className="h-10 px-4 text-[8px] font-black uppercase tracking-widest text-zinc-400 text-center">{toGreekUpperCase('Πληρωμή')}</TableHead>}
                    <TableHead className="h-10 px-4 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const group = getGroup(u.groupId);
                    return (
                      <TableRow key={u.id} className="group border-t border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="px-4 py-3">
                            <p className="text-base font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{toGreekUpperCase(u.displayName)}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {group && (
                            <div className={cn("inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[8px] uppercase tracking-wider border-none shadow-sm", GROUP_COLORS[group.color] || '')}>
                              {toGreekUpperCase(group.name)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="space-y-0.5">
                            {u.fields.email && (
                              <p className="text-[11px] font-bold text-zinc-500 flex items-center gap-1.5">
                                <Mail className="h-3 w-3 text-zinc-300" />
                                {u.fields.email}
                              </p>
                            )}
                            {u.fields.phone && (
                              <p className="text-[11px] font-bold text-zinc-500 flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-zinc-300" />
                                {u.fields.phone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {u.fields.birth_year && (
                                <span className="bg-zinc-50 text-zinc-500 font-bold text-[10px] px-2 py-0.5 rounded-md">
                                    {u.fields.birth_year}
                                </span>
                            )}
                            {(u.squad_ids || (u.squad_id ? [u.squad_id] : [])).map((sid) => (
                              <span key={sid} className="bg-emerald-50 text-emerald-600 font-bold text-[10px] px-2 py-0.5 rounded-md border border-emerald-100">
                                {getSquadName(sid)}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        {showPayments && (
                          <TableCell className="px-4 py-3 text-center">
                            {isAthleteGroup(u.groupId) && (() => {
                              const payment = getPaymentForUser(u.id);
                              if (!payment) return <span className="text-[10px] text-zinc-300">—</span>;
                              return (
                                <button
                                  onClick={() => togglePayment(u.id)}
                                  className={cn(
                                    "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all border-2 active:scale-95",
                                    payment.paid
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                      : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                  )}
                                >
                                  {payment.paid
                                    ? <CheckCircle2 className="h-4 w-4" />
                                    : <XCircle className="h-4 w-4" />
                                  }
                                  €{payment.amount}
                                  <span className="hidden xl:inline">— {payment.paid ? toGreekUpperCase('Εξοφλημένο') : toGreekUpperCase('Ανεξόφλητο')}</span>
                                </button>
                              );
                            })()}
                          </TableCell>
                        )}
                        <TableCell className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl border-zinc-100">
                              <DropdownMenuItem asChild className="rounded-xl px-4 py-3 font-bold cursor-pointer transition-colors">
                                <Link href={`/management/academy/users/${u.id}/edit`}>
                                  <Pencil className="h-4 w-4 mr-3 text-zinc-400" />
                                  Επεξεργασία
                                </Link>
                              </DropdownMenuItem>
                              <AlertDialog open={deleteConfirm === u.id} onOpenChange={(open: boolean) => !open && setDeleteConfirm(null)}>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e: Event) => { e.preventDefault(); setDeleteConfirm(u.id); }}
                                    className="rounded-xl px-4 py-3 font-bold cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4 mr-3" />
                                    Διαγραφή
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem] p-10">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-2xl font-black text-zinc-900">Διαγραφή χρήστη</AlertDialogTitle>
                                    <AlertDialogDescription className="text-lg font-medium text-zinc-500 mt-2">
                                      Είστε σίγουροι ότι θέλετε να διαγράψετε τον χρήστη <span className="text-zinc-900 font-bold">&quot;{u.displayName}&quot;</span>;
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="mt-10 gap-3">
                                    <AlertDialogCancel className="h-14 px-8 rounded-2xl font-bold border-zinc-100">Ακύρωση</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(u.id)}
                                      className="h-14 px-8 rounded-2xl bg-red-600 text-white font-black hover:bg-red-700 shadow-lg shadow-red-200"
                                    >
                                      Διαγραφή
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
