'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/lib/firebase-services';
import { User } from '@/types';

const customerSchema = z.object({
  name: z.string().min(1, 'Το όνομα είναι υποχρεωτικό'),
  email: z.string().email('Μη έγκυρη διεύθυνση email').optional().or(z.literal('')),
  phone: z.string().min(5, 'Μη έγκυρος αριθμός τηλεφώνου'),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [customer, setCustomer] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const customerId = params?.id as string;

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  // Check authentication
  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }

    const loadCustomerData = async () => {
      if (!customerId) return;

      try {
        setIsLoading(true);

        // Load customer data
        const customerData = await userService.getById(customerId);
        if (!customerData) {
          setError('Ο πελάτης δεν βρέθηκε');
          return;
        }
        setCustomer(customerData);

        // Set form values
        setValue('name', customerData.name);
        setValue('email', customerData.email || '');
        setValue('phone', customerData.phone);

      } catch (error) {
        console.error('Error loading customer data:', error);
        setError('Σφάλμα στη φόρτωση των δεδομένων του πελάτη');
      } finally {
        setIsLoading(false);
      }
    };
    loadCustomerData();
  }, [user, venueOwner, authLoading, router, customerId, setValue]);

  const onSubmit = async (data: CustomerFormData) => {
    if (!customer) return;
    
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await userService.update(customer.id, {
        name: data.name,
        email: data.email || '',
        phone: data.phone,
        updatedAt: new Date(),
      });
      
      setSuccess('Ο πελάτης ενημερώθηκε επιτυχώς!');
      
      // Update local state
      setCustomer({
        ...customer,
        name: data.name,
        email: data.email || '',
        phone: data.phone,
        updatedAt: new Date(),
      });
      
      // Redirect back to customer details after brief delay
      setTimeout(() => router.push(`/management/customers/${customer.id}`), 1000);
      
    } catch (e) {
      console.error(e);
      setError('Αποτυχία ενημέρωσης πελάτη. Δοκιμάστε ξανά.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-football-green"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="text-red-600 text-2xl mb-4">❌</div>
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <Link 
            href="/management/customers"
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Επιστροφή στους Πελάτες
          </Link>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={`/management/customers/${customer.id}`}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Επιστροφή στον Πελάτη
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Επεξεργασία Πελάτη</h1>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckIcon className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-green-800">{success}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XMarkIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Edit Form */}
      <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Όνομα *
              </label>
              <input
                type="text"
                id="name"
                {...register('name')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-football-green ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Εισάγετε το όνομα"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Τηλέφωνο *
              </label>
              <input
                type="tel"
                id="phone"
                {...register('phone')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-football-green ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Εισάγετε το τηλέφωνο"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                {...register('email')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-football-green ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Εισάγετε το email (προαιρετικό)"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Read-only Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Πληροφορίες Συστήματος</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">ID Πελάτη:</span>
                <span className="ml-2 font-mono text-gray-700">{customer.id}</span>
              </div>
              <div>
                <span className="text-gray-500">Ημ/νία Δημιουργίας:</span>
                <span className="ml-2 text-gray-700">
                  {new Date(customer.createdAt).toLocaleDateString('el-GR')}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Τελευταία Ενημέρωση:</span>
                <span className="ml-2 text-gray-700">
                  {new Date(customer.updatedAt).toLocaleDateString('el-GR')}
                </span>
              </div>
              {customer.venueIds && customer.venueIds.length > 0 && (
                <div>
                  <span className="text-gray-500">Venues:</span>
                  <span className="ml-2 text-gray-700">{customer.venueIds.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <Link
              href={`/management/customers/${customer.id}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
            >
              Ακύρωση
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Ενημέρωση...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Αποθήκευση Αλλαγών
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
