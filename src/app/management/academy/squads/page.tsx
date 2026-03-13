'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { squadService, academyUserService } from '@/lib/academy-services';
import { Squad, AcademyUser } from '@/types/academy';

export default function SquadsPage() {
  const router = useRouter();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [users, setUsers] = useState<AcademyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push('/venue-login'); return; }
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [squadsData, usersData] = await Promise.all([
          squadService.getByVenue(venueId),
          academyUserService.getByVenue(venueId),
        ]);
        setSquads(squadsData);
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Αποτυχία φόρτωσης τμημάτων');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, venueOwner, authLoading, router, venueId]);

  const handleDelete = async (squadId: string) => {
    try {
      await squadService.delete(squadId);
      setSquads((prev) => prev.filter((s) => s.id !== squadId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία διαγραφής τμήματος');
    }
  };

  const getCoachNames = (coachIds: string[]) => {
    return coachIds
      .map((id) => users.find((u) => u.id === id)?.displayName)
      .filter(Boolean)
      .join(', ') || 'Χωρίς προπονητή';
  };

  const getAthleteCount = (squadId: string) => {
    return users.filter((u) => u.squad_id === squadId).length;
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
              <h1 className="text-xl font-bold text-gray-900">Τμήματα</h1>
              <p className="text-sm text-gray-500 mt-1">Διαχείριση ομάδων και ηλικιακών κατηγοριών</p>
            </div>
            <Link
              href="/management/academy/squads/new"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Νέο Τμήμα
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {squads.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-4">⚽</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Δεν υπάρχουν τμήματα</h3>
            <p className="text-gray-500 mb-6">Δημιουργήστε το πρώτο τμήμα για να οργανώσετε τους αθλητές</p>
            <Link
              href="/management/academy/squads/new"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
            >
              Δημιουργία Τμήματος
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {squads.map((squad) => (
              <div
                key={squad.id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{squad.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                      {squad.ageGroup}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/management/academy/squads/${squad.id}/edit`}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                    {deleteConfirm === squad.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(squad.id)}
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
                        onClick={() => setDeleteConfirm(squad.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-lg">🏆</span>
                    <span className="truncate">{getCoachNames(squad.coachIds)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-lg">🏃</span>
                    <span>{getAthleteCount(squad.id)} αθλητές</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link
                    href={`/management/academy/users?squad=${squad.id}`}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Προβολή Ρόστερ →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
