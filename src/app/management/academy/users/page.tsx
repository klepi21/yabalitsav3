'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { academyUserService, userGroupService, squadService } from '@/lib/academy-services';
import { AcademyUser, UserGroup, Squad, GROUP_COLORS } from '@/types/academy';

export default function AcademyUsersPage() {
  const searchParams = useSearchParams();
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

  const venueId = 'demo-venue-id';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (urlGroupId) setGroupFilter(urlGroupId);
    if (urlSquad) setSquadFilter(urlSquad);
  }, [urlGroupId, urlSquad]);

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

  const getGroup = (groupId: string) => groups.find((g) => g.id === groupId);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        searchQuery === '' ||
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.fields.email && user.fields.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.fields.phone && user.fields.phone.includes(searchQuery));

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {activeGroup ? activeGroup.namePlural : 'Χρήστες Ακαδημίας'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {activeGroup
                  ? `Διαχείριση ${activeGroup.namePlural.toLowerCase()}`
                  : 'Διαχείριση όλων των χρηστών'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(urlGroupId || urlSquad) && (
                <Link
                  href="/management/academy/users"
                  className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Καθαρισμός
                </Link>
              )}
              <Link
                href="/management/academy/users/new"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Προσθήκη
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Stats Cards - Dynamic from groups */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm min-w-[120px]">
            <p className="text-2xl font-bold text-gray-900">{userStats.total}</p>
            <p className="text-xs text-gray-500">Σύνολο</p>
          </div>
          {groups.map((group) => (
            <div
              key={group.id}
              className={`rounded-xl p-4 border shadow-sm cursor-pointer transition-all min-w-[120px] ${
                groupFilter === group.id ? 'ring-2 ring-green-500' : ''
              } ${GROUP_COLORS[group.color] || 'bg-gray-100 text-gray-800'}`}
              onClick={() => setGroupFilter(groupFilter === group.id ? 'all' : group.id)}
            >
              <p className="text-2xl font-bold">{userStats[group.id] || 0}</p>
              <p className="text-xs">
                {group.icon} {group.namePlural}
              </p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Αναζήτηση με όνομα, email ή τηλέφωνο..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Όλες οι Κατηγορίες</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.namePlural}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Δεν βρέθηκαν χρήστες</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || groupFilter !== 'all'
                ? 'Δοκιμάστε να αλλάξετε την αναζήτηση ή το φίλτρο'
                : 'Ξεκινήστε προσθέτοντας τον πρώτο χρήστη'}
            </p>
            <Link
              href="/management/academy/users/new"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
            >
              Προσθήκη Χρήστη
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const group = getGroup(user.groupId);
              return (
                <div
                  key={user.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
                        {group?.icon || '👤'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 truncate">{user.displayName}</h3>
                          {group && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${GROUP_COLORS[group.color] || 'bg-gray-100 text-gray-800'}`}>
                              {group.name}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-sm text-gray-500 space-y-0.5">
                          {user.fields.email && (
                            <p className="truncate">
                              <span className="inline-block w-4">📧</span> {user.fields.email}
                            </p>
                          )}
                          {user.fields.phone && (
                            <p>
                              <span className="inline-block w-4">📱</span> {user.fields.phone}
                            </p>
                          )}
                          {user.fields.specialization && (
                            <p>
                              <span className="inline-block w-4">🎓</span> {user.fields.specialization}
                              {user.fields.license && ` \u2022 ${user.fields.license}`}
                            </p>
                          )}
                          {user.fields.birth_year && (
                            <p>
                              <span className="inline-block w-4">📅</span> Γεννήθηκε {user.fields.birth_year} (Ηλικία{' '}
                              {new Date().getFullYear() - user.fields.birth_year})
                            </p>
                          )}
                          {user.squad_id && (
                            <p>
                              <span className="inline-block w-4">🏃</span> {getSquadName(user.squad_id)}
                            </p>
                          )}
                          {user.parent_uid && (
                            <p>
                              <span className="inline-block w-4">👨‍👩‍👧</span> Γονέας: {getParentName(user.parent_uid)}
                            </p>
                          )}
                          {user.linked_athletes && user.linked_athletes.length > 0 && (
                            <p>
                              <span className="inline-block w-4">⚽</span>{' '}
                              {user.linked_athletes.length} {user.linked_athletes.length > 1 ? 'αθλητές' : 'αθλητής'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/management/academy/users/${user.id}/edit`}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      {deleteConfirm === user.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Διαγραφή
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Ακύρωση
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(user.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
