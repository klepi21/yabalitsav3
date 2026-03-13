'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  name: string;
  href?: string;
  emoji: string;
  children?: { name: string; href: string; emoji: string }[];
}

const navigation: NavItem[] = [
  { name: 'Πίνακας Ελέγχου', href: '/management/dashboard', emoji: '📊' },
  { name: 'Γήπεδα', href: '/management/pitches', emoji: '🏟️' },
  { name: 'Κρατήσεις', href: '/management/bookings', emoji: '📅' },
  { name: 'Πελάτες', href: '/management/customers', emoji: '👥' },
  {
    name: 'Ακαδημία',
    emoji: '🎓',
    children: [
      { name: 'Όλοι οι Χρήστες', href: '/management/academy/users', emoji: '👥' },
      { name: 'Τμήματα', href: '/management/academy/squads', emoji: '⚽' },
      { name: 'Κατηγορίες Χρηστών', href: '/management/academy/user-groups', emoji: '📋' },
    ]
  },
  { name: 'Αναφορές', href: '/management/reports', emoji: '📈' },
  { name: 'Ρυθμίσεις', href: '/management/settings', emoji: '⚙️' },
];

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const pathname = usePathname();
  const { signOut } = useAuth();

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(m => m !== menuName)
        : [...prev, menuName]
    );
  };

  const isChildActive = (item: NavItem) => {
    if (!item.children) return false;
    return item.children.some(child => pathname.startsWith(child.href));
  };

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
          <nav className="flex-1 space-y-2 px-4 py-3 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = item.href ? pathname === item.href : false;
              const hasChildren = !!item.children;
              const isExpanded = expandedMenus.includes(item.name);
              const isParentActive = isChildActive(item);

              if (hasChildren) {
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`group flex items-center justify-between w-full p-3 text-sm font-medium rounded-xl transition-all duration-200 border-2 ${
                        isParentActive
                          ? 'bg-football-green/10 text-football-green border-football-green'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-lg border-gray-200 hover:border-football-green'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.emoji}</span>
                        <span>{item.name}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="mt-1 ml-4 space-y-1">
                        {item.children?.map((child) => {
                          const isChildItemActive = pathname.startsWith(child.href);
                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`group flex items-center gap-2 p-2 pl-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                                isChildItemActive
                                  ? 'bg-football-green text-white'
                                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }`}
                            >
                              <span className="text-lg">{child.emoji}</span>
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href!}
                  className={`group flex flex-col items-center justify-center p-3 text-sm font-medium rounded-xl transition-all duration-200 border-2 ${
                    isActive
                      ? 'bg-football-green text-white shadow-xl transform scale-105 border-football-green'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-lg border-gray-200 hover:border-football-green'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span
                    className={`text-2xl mb-1 ${
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
          
          {/* Support Email - Mobile */}
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Υποστήριξη</div>
              <a 
                href="mailto:support@yabalitsa.com"
                className="text-sm text-football-green hover:text-football-green-light font-medium"
              >
                support@yabalitsa.com
              </a>
            </div>
          </div>
          
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
          <nav className="flex-1 space-y-2 px-4 py-3 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = item.href ? pathname === item.href : false;
              const hasChildren = !!item.children;
              const isExpanded = expandedMenus.includes(item.name);
              const isParentActive = isChildActive(item);

              if (hasChildren) {
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`group flex items-center justify-between w-full p-3 text-sm font-medium rounded-xl transition-all duration-200 border-2 ${
                        isParentActive
                          ? 'bg-football-green/10 text-football-green border-football-green'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-lg border-gray-200 hover:border-football-green'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.emoji}</span>
                        <span>{item.name}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="mt-1 ml-4 space-y-1">
                        {item.children?.map((child) => {
                          const isChildItemActive = pathname.startsWith(child.href);
                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              className={`group flex items-center gap-2 p-2 pl-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                                isChildItemActive
                                  ? 'bg-football-green text-white'
                                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }`}
                            >
                              <span className="text-lg">{child.emoji}</span>
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href!}
                  className={`group flex flex-col items-center justify-center p-3 text-sm font-medium rounded-xl transition-all duration-200 border-2 ${
                    isActive
                      ? 'bg-football-green text-white shadow-xl transform scale-105 border-football-green'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-lg border-gray-200 hover:border-football-green'
                  }`}
                >
                  <span
                    className={`text-2xl mb-1 ${
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
          
          {/* Support Email - Desktop */}
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Υποστήριξη</div>
              <a 
                href="mailto:support@yabalitsa.com"
                className="text-sm text-football-green hover:text-football-green-light font-medium"
              >
                support@yabalitsa.com
              </a>
            </div>
          </div>
          
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
