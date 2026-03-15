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
      const matchesSquad = !squadFilter || user.squad_id === squadFilter;

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
              onClick={() => setError(null)}
              className="text-destructive/60 hover:text-destructive shrink-0"
            >
              Κλείσιμο
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {activeGroup ? activeGroup.namePlural : 'Χρήστες Ακαδημίας'}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {activeGroup
              ? `Διαχείριση ${activeGroup.namePlural.toLowerCase()}`
              : 'Διαχείριση όλων των χρηστών της ακαδημίας'}
          </p>
        </div>
        <Button asChild>
          <Link href="/management/academy/users/new">
            <Plus className="h-4 w-4" />
            Προσθήκη
          </Link>
        </Button>
      </div>

      {/* Stats pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setGroupFilter('all')}
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 transition-all duration-150 ${
            groupFilter === 'all'
              ? 'border-zinc-300 bg-white shadow-sm'
              : 'border-zinc-100/60 bg-white/60 hover:border-zinc-200/80'
          }`}
        >
          <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center">
            <Users className="h-4 w-4 text-zinc-600" />
          </div>
          <div className="text-left">
            <p className="text-lg font-semibold tracking-tight text-zinc-900">{userStats.total}</p>
            <p className="text-[11px] text-zinc-400 leading-none">Σύνολο</p>
          </div>
        </button>
        {groups.map((group) => {
          const isActive = groupFilter === group.id;
          return (
            <button
              key={group.id}
              onClick={() => setGroupFilter(isActive ? 'all' : group.id)}
              className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 transition-all duration-150 ${
                isActive
                  ? 'border-zinc-300 bg-white shadow-sm'
                  : 'border-zinc-100/60 bg-white/60 hover:border-zinc-200/80'
              }`}
            >
              <Badge variant="secondary" className={`h-8 w-8 rounded-lg p-0 flex items-center justify-center text-xs ${GROUP_COLORS[group.color] || ''}`}>
                {group.icon || '👤'}
              </Badge>
              <div className="text-left">
                <p className="text-lg font-semibold tracking-tight text-zinc-900">{userStats[group.id] || 0}</p>
                <p className="text-[11px] text-zinc-400 leading-none">{group.namePlural}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search + Filter row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Αναζήτηση με όνομα, email ή τηλέφωνο..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="flex h-9 rounded-lg border border-zinc-200/70 bg-white px-3 py-1 text-sm shadow-none transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-[200px]"
        >
          <option value="all">Όλες οι Κατηγορίες</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.namePlural}</option>
          ))}
        </select>
        {(urlGroupId || urlSquad || groupFilter !== 'all' || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setGroupFilter('all'); setSquadFilter(null); setSearchQuery(''); }}
            className="text-zinc-400 hover:text-zinc-600 shrink-0"
          >
            Καθαρισμός
          </Button>
        )}
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-zinc-100/60 bg-white py-16">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-zinc-50 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-900 mb-1">Δεν βρέθηκαν χρήστες</h3>
            <p className="text-[13px] text-zinc-400 mb-5">
              {searchQuery || groupFilter !== 'all'
                ? 'Δοκιμάστε να αλλάξετε την αναζήτηση ή το φίλτρο.'
                : 'Ξεκινήστε προσθέτοντας τον πρώτο χρήστη.'}
            </p>
            {!searchQuery && groupFilter === 'all' && (
              <Button size="sm" asChild>
                <Link href="/management/academy/users/new">
                  <Plus className="h-4 w-4" />
                  Προσθήκη Χρήστη
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
                <TableHead className="text-[13px] text-zinc-400 font-medium pl-5">Χρήστης</TableHead>
                <TableHead className="text-[13px] text-zinc-400 font-medium hidden md:table-cell">Κατηγορία</TableHead>
                <TableHead className="text-[13px] text-zinc-400 font-medium hidden lg:table-cell">Επικοινωνία</TableHead>
                <TableHead className="text-[13px] text-zinc-400 font-medium hidden xl:table-cell">Πληροφορίες</TableHead>
                <TableHead className="text-[13px] text-zinc-400 font-medium text-right pr-5 w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => {
                const group = getGroup(u.groupId);
                return (
                  <TableRow key={u.id} className="border-b border-zinc-100/40 hover:bg-zinc-50/50">
                    <TableCell className="pl-5 py-3.5">
                      <div>
                        <div className="text-sm font-medium text-zinc-900">{u.displayName}</div>
                        {/* Mobile-only: show group badge + contact inline */}
                        <div className="flex items-center gap-2 mt-1 md:hidden">
                          {group && (
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${GROUP_COLORS[group.color] || ''}`}>
                              {group.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5 lg:hidden">
                          {u.fields.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {u.fields.phone}
                            </span>
                          )}
                          {u.fields.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3" />
                              {u.fields.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-3.5">
                      {group && (
                        <Badge variant="secondary" className={`text-[11px] ${GROUP_COLORS[group.color] || ''}`}>
                          {group.name}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-3.5">
                      <div className="space-y-0.5">
                        {u.fields.email && (
                          <p className="text-[13px] text-zinc-500 flex items-center gap-1.5 truncate max-w-[220px]">
                            <Mail className="h-3 w-3 shrink-0 text-zinc-400" />
                            {u.fields.email}
                          </p>
                        )}
                        {u.fields.phone && (
                          <p className="text-[13px] text-zinc-500 flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0 text-zinc-400" />
                            {u.fields.phone}
                          </p>
                        )}
                        {!u.fields.email && !u.fields.phone && (
                          <span className="text-[13px] text-zinc-300">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {u.fields.specialization && (
                          <span className="text-[11px] text-zinc-500 flex items-center gap-1 bg-zinc-50 rounded-md px-2 py-0.5">
                            <GraduationCap className="h-3 w-3" />
                            {u.fields.specialization}
                          </span>
                        )}
                        {typeof u.fields.birth_year === 'number' && (
                          <span className="text-[11px] text-zinc-500 flex items-center gap-1 bg-zinc-50 rounded-md px-2 py-0.5">
                            <Calendar className="h-3 w-3" />
                            {u.fields.birth_year}
                          </span>
                        )}
                        {u.squad_id && (
                          <span className="text-[11px] text-zinc-500 flex items-center gap-1 bg-zinc-50 rounded-md px-2 py-0.5">
                            <Trophy className="h-3 w-3" />
                            {getSquadName(u.squad_id)}
                          </span>
                        )}
                        {u.parent_uid && (
                          <span className="text-[11px] text-zinc-500 flex items-center gap-1 bg-zinc-50 rounded-md px-2 py-0.5">
                            <UserCheck className="h-3 w-3" />
                            {getParentName(u.parent_uid)}
                          </span>
                        )}
                        {u.linked_athletes && u.linked_athletes.length > 0 && (
                          <span className="text-[11px] text-zinc-500 flex items-center gap-1 bg-zinc-50 rounded-md px-2 py-0.5">
                            <Trophy className="h-3 w-3" />
                            {u.linked_athletes.length} {u.linked_athletes.length > 1 ? 'αθλητές' : 'αθλητής'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-5 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem asChild>
                            <Link href={`/management/academy/users/${u.id}/edit`}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Επεξεργασία
                            </Link>
                          </DropdownMenuItem>
                          <AlertDialog open={deleteConfirm === u.id} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => { e.preventDefault(); setDeleteConfirm(u.id); }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Διαγραφή
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Διαγραφή χρήστη</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Είστε σίγουροι ότι θέλετε να διαγράψετε τον χρήστη &quot;{u.displayName}&quot;; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                                <AlertDialogAction variant="destructive" onClick={() => handleDelete(u.id)}>
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
  );
}
