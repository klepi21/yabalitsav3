'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { academyUserService, userGroupService, squadService } from '@/lib/academy-services';
import { AcademyUser, UserGroup, Squad, GROUP_COLORS } from '@/types/academy';
import { Loader2, Plus, Search, Users, Pencil, Trash2, Mail, Phone, GraduationCap, Calendar, Trophy, UserCheck, MoreHorizontal, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
        const [usersData, groupsData, squadsData] = await Promise.all([
          academyUserService.getByVenue(venueId),
          userGroupService.getOrSeed(venueId),
          squadService.getByVenue(venueId),
        ]);
        setUsers(usersData);
        setGroups(groupsData);
        setSquads(squadsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, venueOwner, authLoading, router, venueId, pathname]);

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

  const getParentName = (parentId: string) => {
    const parent = users.find((u) => u.id === parentId);
    return parent?.displayName || 'Άγνωστος';
  };

  const activeGroup = groupFilter !== 'all' ? getGroup(groupFilter) : null;

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <div className="flex items-center gap-8">
           <div className="h-24 w-24 rounded-[2rem] bg-zinc-900 flex items-center justify-center text-white shadow-2xl shadow-zinc-200 shrink-0">
             <Users className="h-12 w-12 text-emerald-400" />
           </div>
           <div className="space-y-2">
             <h1 className="text-6xl font-black tracking-tight text-zinc-900 uppercase">
               {activeGroup ? toGreekUpperCase(activeGroup.namePlural) : toGreekUpperCase('Μέλη Ακαδημίας')}
             </h1>
             <p className="text-2xl font-bold text-zinc-400 uppercase tracking-tight">
               {activeGroup
                 ? toGreekUpperCase(`Διαχείριση των ${activeGroup.namePlural.toLowerCase()}`)
                 : toGreekUpperCase('Δείτε και διαχειριστείτε όλα τα μέλη')}
             </p>
           </div>
        </div>
        
        <Button asChild className="h-20 px-12 rounded-[1.5rem] bg-zinc-900 hover:bg-black text-white font-black text-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all active:scale-95 group">
          <Link href="/management/academy/users/new" className="flex items-center gap-4">
            <Plus className="h-8 w-8 text-emerald-400 group-hover:scale-125 transition-transform" />
            {toGreekUpperCase('Προσθήκη Μέλους')}
          </Link>
        </Button>
      </div>


      {/* Stats Cards — hide when filtered by squad */}
      {!urlSquad && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <button
            onClick={() => setGroupFilter('all')}
            className={cn(
              "flex flex-col items-start p-10 rounded-[2.5rem] border-2 transition-all duration-500 text-left group overflow-hidden relative",
              groupFilter === 'all'
                ? "bg-zinc-900 text-white border-zinc-900 shadow-2xl scale-105 z-10"
                : "bg-white text-zinc-900 border-zinc-100 hover:border-emerald-200 hover:shadow-2xl"
            )}
          >
            <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center mb-8 transition-all shadow-sm", 
              groupFilter === 'all' ? "bg-white/10 text-emerald-400" : "bg-zinc-50 text-zinc-300 group-hover:bg-emerald-50 group-hover:text-emerald-500"
            )}>
              <Users className="h-8 w-8" />
            </div>
            <p className="text-5xl font-black leading-none mb-3 tracking-tighter">{userStats.total}</p>
            <p className={cn("text-[11px] font-black uppercase tracking-[0.3em]", 
              groupFilter === 'all' ? "text-zinc-400" : "text-zinc-400"
            )}>{toGreekUpperCase('Σύνολο Μελών')}</p>
            <div className="absolute -bottom-6 -right-6 opacity-0 group-hover:opacity-10 transition-all duration-500 group-hover:scale-110">
                 <Users className="h-32 w-32 -rotate-12" />
            </div>
          </button>

          {groups.map((group) => {
            const isActive = groupFilter === group.id;
            return (
              <button
                key={group.id}
                onClick={() => setGroupFilter(isActive ? 'all' : group.id)}
                className={cn(
                  "flex flex-col items-start p-10 rounded-[2.5rem] border-2 transition-all duration-500 text-left group overflow-hidden relative",
                  isActive
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xl scale-105 z-10 ring-[1rem] ring-emerald-50"
                    : "bg-white text-zinc-900 border-zinc-100 hover:border-emerald-200 hover:shadow-2xl"
                )}
              >
                <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center mb-8 text-3xl transition-all shadow-sm", 
                  isActive ? "bg-white/20 text-white shadow-lg" : "bg-zinc-50 shadow-inner group-hover:bg-emerald-50 group-hover:scale-110"
                )}>
                  {group.icon || '👤'}
                </div>
                <p className="text-5xl font-black leading-none mb-3 tracking-tighter uppercase">{userStats[group.id] || 0}</p>
                <p className={cn("text-[11px] font-black uppercase tracking-[0.3em]", 
                  isActive ? "text-emerald-100" : "text-zinc-400"
                )}>{toGreekUpperCase(group.namePlural)}</p>
                <div className="absolute -bottom-6 -right-6 opacity-0 group-hover:opacity-10 transition-all duration-500 group-hover:scale-110">
                     <span className="text-8xl -rotate-12 inline-block">{group.icon || '👤'}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters Row */}
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 h-8 w-8 text-zinc-300 group-focus-within:text-emerald-500 transition-all group-focus-within:scale-110" />
          <Input
            placeholder={toGreekUpperCase('Αναζήτηση με όνομα, email ή τηλέφωνο...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-20 pl-20 pr-8 bg-white rounded-[1.5rem] border-2 border-zinc-50 shadow-sm focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 font-black text-xl placeholder:text-zinc-200 w-full transition-all uppercase"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {!urlSquad && (
            <Select value={groupFilter} onValueChange={(val: string) => setGroupFilter(val)}>
                <SelectTrigger className="h-20 px-10 rounded-[1.5rem] bg-white border-2 border-zinc-50 shadow-sm font-black text-[15px] focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all min-w-[280px] uppercase">
                    <SelectValue placeholder={toGreekUpperCase('Όλες οι Κατηγορίες')} />
                </SelectTrigger>
                <SelectContent className="rounded-[2.5rem] border-zinc-100 shadow-2xl p-3">
                    <SelectItem value="all" className="font-black text-[15px] rounded-2xl py-4 uppercase tracking-tight mb-1">{toGreekUpperCase('Όλες οι Κατηγορίες')}</SelectItem>
                    {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id} className="font-black text-[15px] rounded-2xl py-4 uppercase tracking-tight mb-1">{toGreekUpperCase(g.namePlural)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          )}

          {(urlGroupId || urlSquad || groupFilter !== 'all' || searchQuery) && (
            <Button
              variant="ghost"
              onClick={() => { setGroupFilter('all'); setSquadFilter(null); setSearchQuery(''); }}
              className="h-20 px-10 text-zinc-400 hover:text-red-500 font-black rounded-[1.5rem] hover:bg-red-50 transition-all uppercase text-[13px] tracking-[0.25em]"
            >
              <Trash2 className="h-5 w-5 mr-3" />
              {toGreekUpperCase('Καθαρισμός')}
            </Button>
          )}
        </div>
      </div>

      {/* Users Content Container */}
      <div className="space-y-6">
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm py-32 text-center">
            <div className="mx-auto h-24 w-24 bg-zinc-50 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
              <Users className="h-12 w-12 text-zinc-200" />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 mb-2">Δεν βρέθηκαν χρήστες</h3>
            <p className="text-zinc-500 font-medium text-lg max-w-sm mx-auto px-6">
              {searchQuery || groupFilter !== 'all'
                ? 'Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης ή τα φίλτρα σας.'
                : 'Ξεκινήστε προσθέτοντας τα πρώτα μέλη στην ακαδημία σας.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile/Tablet Card Layout (hidden on Desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:hidden">
              {filteredUsers.map((u) => {
                const group = getGroup(u.groupId);
                return (
                  <div key={u.id} className="bg-white rounded-[3rem] border border-zinc-100 p-10 space-y-8 shadow-sm active:bg-zinc-50 transition-all hover:shadow-2xl hover:border-emerald-100 group">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="h-20 w-20 rounded-[1.75rem] border-2 border-zinc-100 bg-zinc-50 flex items-center justify-center text-3xl font-black text-zinc-300 group-hover:bg-emerald-50 group-hover:text-emerald-500 group-hover:border-emerald-100 transition-all shadow-sm shrink-0">
                            {toGreekUpperCase(u.displayName.charAt(0))}
                        </div>
                        <div className="space-y-2 min-w-0">
                          <p className="text-3xl font-black text-zinc-900 leading-none uppercase tracking-tight group-hover:text-emerald-700 transition-colors truncate">{toGreekUpperCase(u.displayName)}</p>
                          {group && (
                            <div className={cn("inline-flex items-center px-4 py-2 rounded-[1rem] font-black text-[10px] uppercase tracking-[0.25em] border-none shadow-sm", GROUP_COLORS[group.color] || '')}>
                              {toGreekUpperCase(group.name)}
                            </div>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-zinc-50 hover:bg-white border border-zinc-100 shrink-0">
                            <MoreHorizontal className="h-8 w-8 text-zinc-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80 p-5 rounded-[2.5rem] shadow-2xl border-zinc-100 animate-in zoom-in-95 duration-200">
                          <DropdownMenuItem asChild className="rounded-2xl px-6 py-6 font-black text-[16px] uppercase tracking-widest cursor-pointer group mb-2">
                            <Link href={`/management/academy/users/${u.id}/edit`} className="flex items-center w-full">
                              <div className="h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center mr-4 group-hover:bg-emerald-50 transition-colors">
                                <Pencil className="h-6 w-6 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                              </div>
                              {toGreekUpperCase('Επεξεργασία')}
                            </Link>
                          </DropdownMenuItem>
                          <AlertDialog open={deleteConfirm === u.id} onOpenChange={(open: boolean) => !open && setDeleteConfirm(null)}>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e: Event) => { e.preventDefault(); setDeleteConfirm(u.id); }}
                                className="rounded-2xl px-6 py-6 font-black text-[16px] uppercase tracking-widest cursor-pointer text-red-600 focus:text-red-700 group"
                              >
                                <div className="h-12 w-12 rounded-xl bg-red-50/50 flex items-center justify-center mr-4 group-hover:bg-red-100 transition-colors">
                                    <Trash2 className="h-6 w-6 text-red-400 group-hover:scale-110 transition-transform" />
                                </div>
                                {toGreekUpperCase('Διαγραφή')}
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[3rem] p-12">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-3xl font-black text-zinc-900 uppercase tracking-tight">Διαγραφή μέλους</AlertDialogTitle>
                                    <AlertDialogDescription className="text-xl font-medium text-zinc-500 mt-4 leading-relaxed uppercase">
                                        Είστε σίγουροι ότι θέλετε να διαγράψετε τον χρήστη <span className="text-zinc-900 font-black underline decoration-red-500/30 underline-offset-8">&quot;{u.displayName}&quot;</span>;
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-12 gap-4 flex-col sm:flex-row">
                                    <AlertDialogCancel className="h-20 px-10 rounded-[1.5rem] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 bg-zinc-100 border-none">Ακύρωση</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={() => handleDelete(u.id)}
                                        className="h-20 px-10 rounded-[1.5rem] bg-red-600 text-white font-black hover:bg-black transition-all text-lg uppercase tracking-widest shadow-xl shadow-red-200"
                                    >
                                        Διαγραφή
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-8 border-t border-zinc-100">
                        {u.fields.phone ? (
                            <a href={`tel:${u.fields.phone}`} className="flex flex-col items-start gap-2 p-5 rounded-[1.5rem] bg-zinc-50 hover:bg-emerald-50 hover:shadow-inner transition-all group/item">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 text-zinc-300 group-hover/item:text-emerald-500" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover/item:text-emerald-600">Τηλέφωνο</p>
                                </div>
                                <p className="text-lg font-black text-zinc-900 group-hover/item:text-emerald-700">{u.fields.phone}</p>
                            </a>
                        ) : (
                            <div className="flex flex-col items-start gap-2 p-5 rounded-[1.5rem] bg-zinc-50/50">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Τηλέφωνο</p>
                                <p className="text-lg font-black text-zinc-200">—</p>
                            </div>
                        )}
                        {(u.squad_id || (u.squad_ids && u.squad_ids[0])) ? (
                             <div className="flex flex-col items-start gap-2 p-5 rounded-[1.5rem] bg-emerald-50/50 border border-emerald-100/50 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <Trophy className="h-3 w-3 text-emerald-500" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60">Τμήμα</p>
                                </div>
                                <p className="text-lg font-black text-emerald-800 truncate w-full leading-tight">{toGreekUpperCase(getSquadName(u.squad_id || u.squad_ids![0]))}</p>
                             </div>
                        ) : (
                            <div className="flex flex-col items-start gap-2 p-5 rounded-[1.5rem] bg-zinc-50/50">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Τμήμα</p>
                                <p className="text-lg font-black text-zinc-200">—</p>
                            </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (hidden on Mobile/Tablet) */}
            <div className="hidden lg:block bg-white rounded-[3rem] border-2 border-zinc-50 shadow-2xl shadow-zinc-200/40 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-none hover:bg-transparent bg-zinc-900">
                    <TableHead className="h-24 px-10 text-[12px] font-black uppercase tracking-[0.3em] text-zinc-400">{toGreekUpperCase('Ονοματεπώνυμο')}</TableHead>
                    <TableHead className="h-24 px-10 text-[12px] font-black uppercase tracking-[0.3em] text-zinc-400">{toGreekUpperCase('Κατηγορία')}</TableHead>
                    <TableHead className="h-24 px-10 text-[12px] font-black uppercase tracking-[0.3em] text-zinc-400">{toGreekUpperCase('Επικοινωνία')}</TableHead>
                    <TableHead className="h-24 px-10 text-[12px] font-black uppercase tracking-[0.3em] text-zinc-400">{toGreekUpperCase('Στοιχεία & Τμήματα')}</TableHead>
                    <TableHead className="h-24 px-10 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const group = getGroup(u.groupId);
                    return (
                      <TableRow key={u.id} className="group border-t border-zinc-50 hover:bg-emerald-50/40 transition-all duration-300">
                        <TableCell className="px-10 py-10">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-xl font-black text-zinc-300 group-hover:bg-white group-hover:text-emerald-500 transition-all shadow-inner">
                                    {toGreekUpperCase(u.displayName.charAt(0))}
                                </div>
                                <p className="text-2xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight leading-none">{toGreekUpperCase(u.displayName)}</p>
                            </div>
                        </TableCell>
                        <TableCell className="px-10 py-10">
                          {group && (
                            <div className={cn("inline-flex items-center px-5 py-2 rounded-[1.25rem] font-black text-[11px] uppercase tracking-[0.25em] border-none shadow-sm", GROUP_COLORS[group.color] || '')}>
                              {toGreekUpperCase(group.name)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-10 py-8">
                          <div className="space-y-2">
                            {u.fields.email && (
                              <p className="text-[15px] font-black text-zinc-400 flex items-center gap-3 lowercase group-hover:text-zinc-600 transition-colors">
                                <Mail className="h-4 w-4 text-emerald-500/40" />
                                {u.fields.email}
                              </p>
                            )}
                            {u.fields.phone && (
                              <p className="text-[15px] font-black text-zinc-900 flex items-center gap-3 group-hover:text-emerald-600 transition-colors">
                                <Phone className="h-4 w-4 text-emerald-500/40" />
                                {u.fields.phone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-10 py-8">
                          <div className="flex flex-wrap gap-2.5">
                            {u.fields.birth_year && (
                                <span className="bg-zinc-100 text-zinc-500 font-black text-[11px] px-4 py-1.5 rounded-xl uppercase tracking-widest">
                                    {u.fields.birth_year}
                                </span>
                            )}
                            {(u.squad_ids || (u.squad_id ? [u.squad_id] : [])).map((sid) => (
                              <span key={sid} className="bg-emerald-50 text-emerald-600 font-black text-[11px] px-4 py-1.5 rounded-xl border-2 border-emerald-100/50 uppercase tracking-widest">
                                {toGreekUpperCase(getSquadName(sid))}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="px-10 py-8 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-zinc-50 group-hover:bg-white border border-transparent group-hover:border-zinc-100 transition-all">
                                <MoreHorizontal className="h-7 w-7 text-zinc-400 group-hover:text-zinc-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64 p-3 rounded-[2rem] shadow-2xl border-zinc-100 animate-in zoom-in-95 duration-200">
                              <DropdownMenuItem asChild className="rounded-xl px-5 py-4 font-black text-xs uppercase tracking-[0.2em] cursor-pointer transition-colors group">
                                <Link href={`/management/academy/users/${u.id}/edit`} className="flex items-center">
                                  <Pencil className="h-4 w-4 mr-4 text-zinc-300 group-hover:text-emerald-500 transition-colors" />
                                  Επεξεργασία
                                </Link>
                              </DropdownMenuItem>
                              <AlertDialog open={deleteConfirm === u.id} onOpenChange={(open: boolean) => !open && setDeleteConfirm(null)}>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e: Event) => { e.preventDefault(); setDeleteConfirm(u.id); }}
                                    className="rounded-xl px-5 py-4 font-black text-xs uppercase tracking-[0.2em] cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 transition-colors group mt-1"
                                  >
                                    <Trash2 className="h-4 w-4 mr-4 text-red-300 group-hover:scale-110 transition-transform" />
                                    Διαγραφή
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem] p-12">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-3xl font-black text-zinc-900 uppercase tracking-tight">Διαγραφή μέλους</AlertDialogTitle>
                                    <AlertDialogDescription className="text-xl font-medium text-zinc-500 mt-4 leading-relaxed uppercase">
                                      Είστε σίγουροι ότι θέλετε να διαγράψετε τον χρήστη <span className="text-zinc-900 font-black underline decoration-red-500/30 underline-offset-8">&quot;{u.displayName}&quot;</span>;
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="mt-12 gap-4">
                                    <AlertDialogCancel className="h-16 px-10 rounded-[1.25rem] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 bg-zinc-100 border-none">Ακύρωση</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(u.id)}
                                      className="h-16 px-10 rounded-[1.25rem] bg-red-600 text-white font-black hover:bg-black transition-all text-lg uppercase tracking-widest shadow-xl shadow-red-200"
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
