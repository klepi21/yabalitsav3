'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { userGroupService } from '@/lib/academy-services';
import { UserGroup, GROUP_COLORS } from '@/types/academy';

export default function UserGroupsPage() {
  const router = useRouter();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push('/venue-login'); return; }
    loadGroups();
  }, [user, venueOwner, authLoading]);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const data = await userGroupService.getOrSeed(venueId);
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await userGroupService.delete(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία διαγραφής');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Κατηγορίες Χρηστών</h1>
              <p className="text-sm text-gray-500 mt-1">Διαχείριση κατηγοριών και πεδίων</p>
            </div>
            <Link
              href="/management/academy/user-groups/new"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Νέα Κατηγορία
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 max-w-4xl mx-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{group.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-lg">{group.name}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${GROUP_COLORS[group.color] || 'bg-gray-100 text-gray-800'}`}>
                        {group.namePlural}
                      </span>
                      {group.isDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Προεπιλογή
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.fields.map((field) => (
                        <span
                          key={field.key}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-gray-100 text-gray-700"
                        >
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                          <span className="ml-1 text-gray-400">({field.type})</span>
                        </span>
                      ))}
                      {group.fields.length === 0 && (
                        <span className="text-xs text-gray-400">Χωρίς πρόσθετα πεδία</span>
                      )}
                    </div>
                    {group.capabilities.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {group.capabilities.includes('squad_assignment') && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Ανάθεση σε τμήμα</span>
                        )}
                        {group.capabilities.includes('parent_linking') && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Σύνδεση γονέα</span>
                        )}
                        {group.capabilities.includes('coach_squads') && (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">Ανάθεση τμημάτων</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!group.isDefault && (
                    <>
                      <Link
                        href={`/management/academy/user-groups/${group.id}/edit`}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      {deleteConfirm === group.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(group.id)}
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
                          onClick={() => setDeleteConfirm(group.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
