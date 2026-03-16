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
import { cn } from '@/lib/utils';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">
            {activeGroup ? activeGroup.namePlural : 'Χρήστες Ακαδημίας'}
          </h1>
          <p className="text-lg font-medium text-zinc-500">
            {activeGroup
              ? `Διαχείριση των ${activeGroup.namePlural.toLowerCase()} της ακαδημίας σας.`
              : 'Δείτε και διαχειριστείτε όλα τα μέλη της ακαδημίας σας.'}
          </p>
        </div>
        <Button asChild className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-200 transition-all hover:translate-y-[-2px] active:translate-y-[1px]">
          <Link href="/management/academy/users/new" className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Προσθήκη Μέλους
          </Link>
        </Button>
      </div>

      {/* Stats Cards — hide when filtered by squad */}
      {!urlSquad && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <button
            onClick={() => setGroupFilter('all')}
            className={cn(
              "flex flex-col items-start p-6 rounded-3xl border transition-all duration-200 text-left group",
              groupFilter === 'all'
                ? "bg-zinc-900 text-white border-zinc-900 shadow-xl shadow-zinc-200 scale-105 z-10"
                : "bg-white text-zinc-900 border-zinc-100 hover:border-emerald-200 hover:bg-emerald-50/10"
            )}
          >
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-4 transition-colors", 
              groupFilter === 'all' ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-400 group-hover:bg-emerald-100 group-hover:text-emerald-600"
            )}>
              <Users className="h-5 w-5" />
            </div>
            <p className="text-2xl font-black leading-none mb-1">{userStats.total}</p>
            <p className={cn("text-[10px] font-black uppercase tracking-widest", 
              groupFilter === 'all' ? "text-zinc-400" : "text-zinc-400"
            )}>Σύνολο</p>
          </button>

          {groups.map((group) => {
            const isActive = groupFilter === group.id;
            return (
              <button
                key={group.id}
                onClick={() => setGroupFilter(isActive ? 'all' : group.id)}
                className={cn(
                  "flex flex-col items-start p-6 rounded-3xl border transition-all duration-200 text-left group",
                  isActive
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xl shadow-emerald-200 scale-105 z-10"
                    : "bg-white text-zinc-900 border-zinc-100 hover:border-emerald-200 hover:bg-emerald-50/10"
                )}
              >
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-4 text-lg", 
                  isActive ? "bg-white/20 text-white" : "bg-zinc-100"
                )}>
                  {group.icon || '👤'}
                </div>
                <p className="text-2xl font-black leading-none mb-1">{userStats[group.id] || 0}</p>
                <p className={cn("text-[10px] font-black uppercase tracking-widest", 
                  isActive ? "text-emerald-100" : "text-zinc-400"
                )}>{group.namePlural}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <Input
            placeholder="Αναζήτηση με όνομα, email ή τηλέφωνο..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 pl-12 pr-4 bg-white rounded-2xl border-zinc-100 shadow-sm focus:ring-emerald-500 font-medium text-lg placeholder:text-zinc-400 w-full"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {!urlSquad && (
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="h-14 px-6 rounded-2xl bg-white border border-zinc-100 shadow-sm text-zinc-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all min-w-[200px]"
            >
              <option value="all">Όλες οι Κατηγορίες</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.namePlural}</option>
              ))}
            </select>
          )}

          {(urlGroupId || urlSquad || groupFilter !== 'all' || searchQuery) && (
            <Button
              variant="ghost"
              onClick={() => { setGroupFilter('all'); setSquadFilter(null); setSearchQuery(''); }}
              className="h-14 px-6 text-zinc-400 hover:text-zinc-900 font-bold rounded-2xl hover:bg-zinc-50"
            >
              Καθαρισμός
            </Button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm overflow-hidden pointer-events-auto">
        {filteredUsers.length === 0 ? (
          <div className="py-32 text-center">
            <div className="mx-auto h-24 w-24 bg-zinc-50 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
              <Users className="h-12 w-12 text-zinc-200" />
            </div>
            <h3 className="text-2xl font-black text-zinc-900 mb-2">Δεν βρέθηκαν χρήστες</h3>
            <p className="text-zinc-500 font-medium text-lg max-w-sm mx-auto">
              {searchQuery || groupFilter !== 'all'
                ? 'Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης ή τα φίλτρα σας.'
                : 'Ξεκινήστε προσθέτοντας τα πρώτα μέλη στην ακαδημία σας.'}
            </p>
            {!searchQuery && groupFilter === 'all' && (
              <Button asChild className="mt-10 h-14 px-10 rounded-2xl bg-emerald-600 text-white font-black">
                <Link href="/management/academy/users/new">Προσθήκη Χρήστη</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="h-16 px-8 text-[11px] font-black uppercase tracking-widest text-zinc-400">Χρήστης</TableHead>
                  <TableHead className="h-16 px-8 text-[11px] font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell">Κατηγορία</TableHead>
                  <TableHead className="h-16 px-8 text-[11px] font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell">Επικοινωνία</TableHead>
                  <TableHead className="h-16 px-8 text-[11px] font-black uppercase tracking-widest text-zinc-400 hidden xl:table-cell">Πληροφορίες</TableHead>
                  <TableHead className="h-16 px-8 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => {
                  const group = getGroup(u.groupId);
                  return (
                    <TableRow key={u.id} className="group border-t border-zinc-50 hover:bg-emerald-50/30 transition-colors">
                      <TableCell className="px-8 py-6">
                        <div>
                          <p className="text-lg font-black text-zinc-900 group-hover:text-emerald-700 transition-colors">{u.displayName}</p>
                          {/* Mobile-only tags */}
                          <div className="flex flex-wrap items-center gap-2 mt-2 md:hidden">
                            {group && (
                              <Badge className={cn("rounded-xl px-2.5 py-0.5 font-black text-[9px] uppercase tracking-widest border-none", GROUP_COLORS[group.color] || '')}>
                                {group.name}
                              </Badge>
                            )}
                            {u.fields.phone && (
                                <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {u.fields.phone}
                                </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-6 hidden md:table-cell">
                        {group && (
                          <Badge className={cn("rounded-xl px-4 py-1.5 font-black text-[10px] uppercase tracking-widest border-none", GROUP_COLORS[group.color] || '')}>
                            {group.name}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-8 py-6 hidden lg:table-cell">
                        <div className="space-y-1">
                          {u.fields.email && (
                            <p className="text-[13px] font-bold text-zinc-500 flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-zinc-300" />
                              {u.fields.email}
                            </p>
                          )}
                          {u.fields.phone && (
                            <p className="text-[13px] font-bold text-zinc-500 flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-zinc-300" />
                              {u.fields.phone}
                            </p>
                          )}
                          {!u.fields.email && !u.fields.phone && (
                            <span className="text-zinc-300 font-bold">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-6 hidden xl:table-cell">
                        <div className="flex flex-wrap gap-2">
                          {u.fields.specialization && (
                            <span className="inline-flex items-center gap-1.5 bg-zinc-50 text-zinc-500 font-bold text-[11px] px-3 py-1 rounded-xl">
                              <GraduationCap className="h-3.5 w-3.5" />
                              {u.fields.specialization}
                            </span>
                          )}
                          {typeof u.fields.birth_year === 'number' && (
                            <span className="inline-flex items-center gap-1.5 bg-zinc-50 text-zinc-500 font-bold text-[11px] px-3 py-1 rounded-xl">
                              <Calendar className="h-3.5 w-3.5" />
                              {u.fields.birth_year}
                            </span>
                          )}
                          {(u.squad_ids || (u.squad_id ? [u.squad_id] : [])).map((sid) => (
                            <span key={sid} className="inline-flex items-center gap-1.5 bg-zinc-50 text-zinc-500 font-bold text-[11px] px-3 py-1 rounded-xl">
                              <Trophy className="h-3.5 w-3.5" />
                              {getSquadName(sid)}
                            </span>
                          ))}
                          {u.parent_uid && (
                            <span className="inline-flex items-center gap-1.5 bg-zinc-50 text-zinc-500 font-bold text-[11px] px-3 py-1 rounded-xl">
                              <UserCheck className="h-3.5 w-3.5" />
                              {getParentName(u.parent_uid)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50">
                              <MoreHorizontal className="h-5 w-5" />
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
                                    Είστε σίγουροι ότι θέλετε να διαγράψετε τον χρήστη <span className="text-zinc-900 font-bold">&quot;{u.displayName}&quot;</span>; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
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
        )}
      </div>
    </div>
  );
}
