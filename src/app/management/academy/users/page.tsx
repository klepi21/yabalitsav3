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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <button
            onClick={() => setGroupFilter('all')}
            className={cn(
              "flex flex-col items-start p-4 rounded-xl border transition-all duration-300 text-left group overflow-hidden relative",
              groupFilter === 'all'
                ? "bg-zinc-900 text-white border-zinc-900 shadow-lg scale-105 z-10"
                : "bg-white text-zinc-900 border-zinc-100 hover:border-emerald-200 hover:shadow-md"
            )}
          >
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-3 transition-all shadow-sm", 
              groupFilter === 'all' ? "bg-white/10 text-emerald-400" : "bg-zinc-50 text-zinc-300 group-hover:bg-emerald-50 group-hover:text-emerald-500"
            )}>
              <Users className="h-3.5 w-3.5" />
            </div>
            <p className="text-xl font-black leading-none mb-1 tracking-tight">{userStats.total}</p>
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
                  "flex flex-col items-start p-4 rounded-xl border transition-all duration-300 text-left group overflow-hidden relative",
                  isActive
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-lg scale-105 z-10"
                    : "bg-white text-zinc-900 border-zinc-100 hover:border-emerald-200 hover:shadow-md"
                )}
              >
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-3 text-base transition-all shadow-sm", 
                  isActive ? "bg-white/20 text-white" : "bg-zinc-50"
                )}>
                  {group.icon || '👤'}
                </div>
                <p className="text-xl font-black leading-none mb-1 tracking-tight uppercase">{userStats[group.id] || 0}</p>
                <p className={cn("text-[8px] font-bold uppercase tracking-wider", 
                  isActive ? "text-emerald-100" : "text-zinc-400"
                )}>{toGreekUpperCase(group.namePlural)}</p>
              </button>
            );
          })}
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
                        <p className="text-lg font-black text-zinc-900 leading-tight uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{toGreekUpperCase(u.displayName)}</p>
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
                    <TableHead className="h-10 px-4 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const group = getGroup(u.groupId);
                    return (
                      <TableRow key={u.id} className="group border-t border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="px-4 py-3">
                            <p className="text-base font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{toGreekUpperCase(u.displayName)}</p>
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
