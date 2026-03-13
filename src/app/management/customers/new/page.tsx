'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/lib/firebase-services';

const customerSchema = z.object({
  name: z.string().min(1, 'Το όνομα είναι υποχρεωτικό'),
  email: z.string().email('Μη έγκυρη διεύθυνση email').optional().or(z.literal('')),
  phone: z.string().min(5, 'Μη έγκυρος αριθμός τηλεφώνου'),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function NewCustomerPage() {
  const router = useRouter();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) router.push('/venue-login');
  }, [user, venueOwner, authLoading, router]);

  const onSubmit = async (data: CustomerFormData) => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await userService.create({
        name: data.name,
        email: data.email || '',
        phone: data.phone,
        venueIds: venueOwner?.venueId ? [venueOwner.venueId] : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      setSuccess('Ο πελάτης δημιουργήθηκε επιτυχώς!');
      reset({ name: '', email: '', phone: '' });
      // Redirect back to customers list after brief delay
      setTimeout(() => router.push('/management/customers'), 800);
    } catch (e) {
      console.error(e);
      setError('Αποτυχία δημιουργίας πελάτη. Δοκιμάστε ξανά.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-football-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/management/customers" className="text-sm text-gray-500 hover:text-gray-700">
          ← Επιστροφή στους Πελάτες
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Νέος Πελάτης</h1>
      </div>

      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">{success}</div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Όνομα</label>
              <input
                {...register('name')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-football-green focus:ring-football-green sm:text-sm"
                placeholder="Ονοματεπώνυμο"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email (προαιρετικό)</label>
                <input
                  type="email"
                  {...register('email')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-football-green focus:ring-football-green sm:text-sm"
                  placeholder="email@domain.gr"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Τηλέφωνο</label>
                <input
                  {...register('phone')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-football-green focus:ring-football-green sm:text-sm"
                  placeholder="69XXXXXXXX"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green disabled:opacity-50"
              >
                {isSaving ? 'Αποθήκευση...' : 'Δημιουργία Πελάτη'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


