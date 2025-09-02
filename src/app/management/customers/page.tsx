'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  UsersIcon,
  ArrowLeftIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/lib/firebase-services';
import { User } from '@/types';

export default function CustomersPage() {
  const router = useRouter();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  
  const [customers, setCustomers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Check authentication
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !venueOwner) {
      router.push('/venue-login');
      return;
    }
    
    loadCustomers();
  }, [user, venueOwner, authLoading, router]);

  const loadCustomers = async () => {
    if (!venueOwner) return;
    
    try {
      const customersData = await userService.getByVenue();
      setCustomers(customersData || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => 
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/management/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Επιστροφή στον Πίνακα Ελέγχου
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Πελάτες</h1>
          <p className="mt-2 text-gray-600">Διαχείριση πληροφοριών πελατών για το γήπεδό σας</p>
        </div>
        <Link
          href="/management/customers/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Προσθήκη Πελάτη
        </Link>
      </div>

      {/* Search */}
      <div className="max-w-lg">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Αναζήτηση πελατών..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-football-green focus:border-football-green sm:text-sm"
          />
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-white shadow-lg rounded-2xl border border-gray-100">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? 'Δεν βρέθηκαν πελάτες.' : 'Δεν υπάρχουν πελάτες ακόμα'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Δοκιμάστε να αλλάξετε τους όρους αναζήτησης.' : 'Ξεκινήστε προσθέτοντας τον πρώτο σας πελάτη.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href="/management/customers/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Προσθήκη Πελάτη
                </Link>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <li key={customer.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-football-green flex items-center justify-center">
                        <UsersIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      <div className="flex items-center text-sm text-gray-500">
                        <EnvelopeIcon className="mr-1 h-4 w-4" />
                        {customer.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <PhoneIcon className="mr-1 h-4 w-4" />
                        {customer.phone}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      href={`/management/customers/${customer.id}`}
                      className="text-sm text-football-green hover:text-football-green-light"
                    >
                      Προβολή
                    </Link>
                    <Link
                      href={`/management/customers/${customer.id}/edit`}
                      className="text-sm text-football-green hover:text-football-green-light"
                    >
                      Επεξεργασία
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
