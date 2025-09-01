'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { venueService } from '@/lib/firebase-services';
import { Venue } from '@/types';

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      const venuesData = await venueService.getAll();
      setVenues(venuesData);
    } catch (error) {
      console.error('Error loading venues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVenue = async (venueId: string) => {
    if (confirm('Are you sure you want to delete this venue?')) {
      try {
        await venueService.delete(venueId);
        await loadVenues(); // Reload the list
      } catch (error) {
        console.error('Error deleting venue:', error);
      }
    }
  };

  const filteredVenues = venues.filter(venue =>
    venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venue.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Venues</h1>
          <p className="mt-2 text-gray-600">Manage your football venues and locations</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/venue-login"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Venue Owner Login
          </Link>
          <Link
            href="/venues/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Venue
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-lg">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search venues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Venues List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredVenues.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No venues</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No venues match your search.' : 'Get started by creating your first venue.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href="/venues/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Venue
                </Link>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredVenues.map((venue) => (
              <li key={venue.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">{venue.name}</h3>
                      <p className="mt-1 text-sm text-gray-500">{venue.address}</p>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span className="mr-4">{venue.contactDetails.email}</span>
                        <span>{venue.contactDetails.phone}</span>
                      </div>
                      {venue.notes && (
                        <p className="mt-2 text-sm text-gray-500">{venue.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/venues/${venue.id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDeleteVenue(venue.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
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
