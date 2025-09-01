'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Πίνακας Ελέγχου', href: '/dashboard', emoji: '📊' },
  { name: 'Γήπεδα', href: '/pitches', emoji: '🏟️' },
  { name: 'Κρατήσεις', href: '/bookings', emoji: '📅' },
  { name: 'Πελάτες', href: '/customers', emoji: '👥' },
  { name: 'Ρυθμίσεις', href: '/settings', emoji: '⚙️' },
];

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-20 items-center justify-between px-6">
            <div className="flex items-center justify-center flex-1">
              <img
                src="/yabalitsalogo.png"
                alt="Yabalitsa"
                className="h-12 w-auto"
              />
            </div>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="border-b border-gray-200 mx-4 mb-4"></div>
          <nav className="flex-1 space-y-4 px-4 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex flex-col items-center justify-center p-4 text-sm font-medium rounded-xl transition-all duration-200 border-2 ${
                    isActive
                      ? 'bg-football-green text-white shadow-xl transform scale-105 border-football-green'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-lg border-gray-200 hover:border-football-green'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span
                    className={`text-3xl mb-2 ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  >
                    {item.emoji}
                  </span>
                  <span className="text-center text-xs">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* Logout button - Mobile */}
          <div className="px-4 py-4 border-t border-gray-200">
            <button
              onClick={() => {
                signOut();
                setSidebarOpen(false);
              }}
              className="group flex flex-col items-center justify-center p-4 text-sm font-medium rounded-xl transition-all duration-200 border-2 text-red-600 hover:bg-red-50 hover:text-red-700 hover:shadow-lg border-red-200 hover:border-red-300 w-full"
            >
              <span className="text-3xl mb-2 text-red-400 group-hover:text-red-500">
                🚪
              </span>
              <span className="text-center text-xs">Αποσύνδεση</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-20 items-center justify-center px-6">
            <img
              src="/yabalitsalogo.png"
              alt="Yabalitsa"
              className="h-12 w-auto"
            />
          </div>
          <div className="border-b border-gray-200 mx-4 mb-4"></div>
          <nav className="flex-1 space-y-4 px-4 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex flex-col items-center justify-center p-4 text-sm font-medium rounded-xl transition-all duration-200 border-2 ${
                    isActive
                      ? 'bg-football-green text-white shadow-xl transform scale-105 border-football-green'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-lg border-gray-200 hover:border-football-green'
                  }`}
                >
                  <span
                    className={`text-3xl mb-2 ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  >
                    {item.emoji}
                  </span>
                  <span className="text-center text-xs">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* Logout button - Desktop */}
          <div className="px-4 py-4 border-t border-gray-200">
            <button
              onClick={signOut}
              className="group flex flex-col items-center justify-center p-4 text-sm font-medium rounded-xl transition-all duration-200 border-2 text-red-600 hover:bg-red-50 hover:text-red-700 hover:shadow-lg border-red-200 hover:border-red-300 w-full"
            >
              <span className="text-3xl mb-2 text-red-400 group-hover:text-red-500">
                🚪
              </span>
              <span className="text-center text-xs">Αποσύνδεση</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button
          type="button"
          className="text-gray-500 hover:text-gray-600"
          onClick={() => setSidebarOpen(true)}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}
