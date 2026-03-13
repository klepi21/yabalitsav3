'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { squadService, academyUserService, userGroupService } from '@/lib/academy-services';
import { AcademyUser, UserGroup } from '@/types/academy';

const AGE_GROUPS = ['U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U21', 'Ανδρών'];

export default function NewSquadPage() {
  const router = useRouter();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [coaches, setCoaches] = useState<AcademyUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    ageGroup: 'U12',
    coachIds: [] as string[],
  });

  const venueId = venueOwner?.venueId || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) { router.push('/venue-login'); return; }
    loadCoaches();
  }, [user, venueOwner, authLoading]);

  const loadCoaches = async () => {
    try {
      const groups = await userGroupService.getOrSeed(venueId);
      const coachGroup = groups.find((g) => g.isDefault && g.name === 'Προπονητής');
      if (coachGroup) {
        const coachUsers = await academyUserService.getByGroup(venueId, coachGroup.id);
        setCoaches(coachUsers);
      }
    } catch (err) {
      console.error('Failed to load coaches:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Το όνομα τμήματος είναι υποχρεωτικό');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await squadService.create({
        ...formData,
        venueId,
      });
      router.push('/management/academy/squads');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Αποτυχία δημιουργίας τμήματος');
      setIsLoading(false);
    }
  };

  const toggleCoach = (coachId: string) => {
    setFormData((prev) => ({
      ...prev,
      coachIds: prev.coachIds.includes(coachId)
        ? prev.coachIds.filter((id) => id !== coachId)
        : [...prev.coachIds, coachId],
    }));
  };

  const inputClasses =
    'mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base';
  const labelClasses = 'block text-sm font-medium text-gray-700 mb-1';
  const selectClasses =
    'mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/management/academy/squads"
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Νέο Τμήμα</h1>
              <p className="text-sm text-gray-500">Προσθήκη νέας ομάδας ή ηλικιακής κατηγορίας</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 max-w-2xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div>
            <label htmlFor="name" className={labelClasses}>Όνομα Τμήματος *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className={inputClasses}
              placeholder="π.χ. Λιοντάρια U12, Ακαδημία Juniors"
            />
          </div>

          <div>
            <label htmlFor="ageGroup" className={labelClasses}>Ηλικιακή Κατηγορία *</label>
            <select
              id="ageGroup"
              value={formData.ageGroup}
              onChange={(e) => setFormData((prev) => ({ ...prev, ageGroup: e.target.value }))}
              className={selectClasses}
            >
              {AGE_GROUPS.map((ag) => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>
          </div>

          {coaches.length > 0 && (
            <div>
              <label className={labelClasses}>Ανάθεση Προπονητών</label>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {coaches.map((coach) => (
                  <label
                    key={coach.id}
                    className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                      formData.coachIds.includes(coach.id)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.coachIds.includes(coach.id)}
                      onChange={() => toggleCoach(coach.id)}
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🏆</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{coach.displayName}</p>
                        <p className="text-xs text-gray-500">{coach.fields.specialization}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-4 border border-gray-300 rounded-xl text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-4 bg-green-600 text-white rounded-xl text-base font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isLoading ? 'Δημιουργία...' : 'Δημιουργία Τμήματος'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
