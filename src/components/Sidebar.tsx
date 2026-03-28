'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Users,
  GraduationCap,
  BarChart3,
  Settings,
  Trophy,
  ClipboardList,
  Dumbbell,
  Euro,
  HeartPulse,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  QrCode,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { cn, toGreekUpperCase } from '@/lib/utils';

import { SIDEBAR_PERMISSIONS, type AppRole } from '@/config/roles';

interface NavChild {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  disabled?: boolean;
  badge?: string;
  isAcademy?: boolean;
  children?: NavChild[];
}

const navigation: NavItem[] = [
  { name: toGreekUpperCase('Πίνακας Ελέγχου'), href: '/management/dashboard', icon: LayoutDashboard },
  { name: 'Γήπεδα', href: '/management/pitches', icon: Building2 },
  { name: 'Κρατήσεις', href: '/management/bookings', icon: CalendarDays },
  { name: 'Πελάτες', href: '/management/customers', icon: Users },
  {
    name: 'Ακαδημία',
    icon: GraduationCap,
    isAcademy: true,
    children: [
      { name: 'Όλοι οι Χρήστες', href: '/management/academy/users', icon: Users },
      { name: 'Τμήματα', href: '/management/academy/squads', icon: Trophy },
      { name: 'Κατηγορίες Χρηστών', href: '/management/academy/user-groups', icon: ClipboardList },
      { name: 'Προπονήσεις', href: '/management/academy/training', icon: Dumbbell },
      { name: 'Πληρωμές', href: '/management/academy/payments', icon: Euro },
      { name: 'Ιατρικά', href: '/management/academy/medical', icon: HeartPulse },
      { name: 'Αξιολογήσεις', href: '/management/academy/evaluations', icon: TrendingUp },
    ]
  },
  { name: 'Τουρνουά', href: '/management/tournaments', icon: Trophy },
  { name: 'Αναφορές', href: '/management/reports', icon: BarChart3 },
  { name: 'Ρυθμίσεις', href: '/management/settings', icon: Settings },
];

function getFilteredNavigation(role: AppRole | null): NavItem[] {
  const userRole = role || 'admin';
  const perms = SIDEBAR_PERMISSIONS[userRole];

  return navigation
    .filter(item => {
      if (item.isAcademy) return true; // academy filtered by children
      if (item.href) return perms.visibleRoutes.includes(item.href);
      return true;
    })
    .map(item => {
      if (item.children && item.isAcademy) {
        const filteredChildren = item.children.filter(
          child => perms.visibleAcademyRoutes.includes(child.href)
        );
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }
      return item;
    })
    .filter((item): item is NavItem => item !== null);
}

function SidebarSkeleton() {
  return (
    <div className="flex h-full flex-col bg-white border-r border-zinc-100/80 animate-pulse">
      <div className="flex h-20 items-center px-6 shrink-0 mb-2">
        <div className="h-9 w-40 bg-zinc-100 rounded-lg" />
      </div>
      <nav className="flex-1 px-3 py-2">
        <div className="space-y-4">
          <div>
            <div className="h-3 w-12 bg-zinc-100 rounded mx-4 mb-3" />
            <div className="space-y-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="h-4 w-4 bg-zinc-100 rounded" />
                  <div className="h-3.5 bg-zinc-100 rounded" style={{ width: `${60 + i * 15}px` }} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="h-3 w-16 bg-zinc-100 rounded mx-4 mb-3" />
            <div className="space-y-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="h-4 w-4 bg-zinc-100 rounded" />
                  <div className="h-3.5 bg-zinc-100 rounded" style={{ width: `${50 + i * 20}px` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </nav>
      <div className="p-4 space-y-4">
        <div className="h-32 bg-zinc-100 rounded-2xl" />
        <div className="h-10 bg-zinc-50 rounded-xl" />
      </div>
    </div>
  );
}

const SUPER_ADMIN_EMAIL = 'nikoskoukis99@gmail.com';

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const pathname = usePathname();
  const { signOut, userRole, bookingsEnabled, setBookingsEnabled, isLoading, user } = useAuth();

  // Show skeleton while auth is loading
  if (isLoading) return <SidebarSkeleton />;

  const role = userRole || 'admin';
  const filteredNav = getFilteredNavigation(userRole);
  const perms = SIDEBAR_PERMISSIONS[role];

  // Split: items with href go to "menu", items with children or management go to "management"
  const menuItems = filteredNav.filter(item => item.href && !['Τουρνουά', 'Αναφορές', 'Ρυθμίσεις'].includes(item.name));
  const managementItems = filteredNav.filter(item => item.children || ['Τουρνουά', 'Αναφορές', 'Ρυθμίσεις'].includes(item.name));

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
    <div className="flex h-full flex-col bg-white border-r border-zinc-100/80">
      {/* Logo Area */}
      <div className="flex h-20 items-center px-6 shrink-0 mb-2">
        <Link href="/management/dashboard" className="flex items-center gap-3">
          <Image
            src="/yabalitsalogo.png"
            alt="Yabalitsa"
            width={160}
            height={45}
            className="h-9 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto scrollbar-hide">
        <div className="space-y-4">
          {/* Main Menu Group */}
          <div>
            <p className="px-4 text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 font-mono">
              {toGreekUpperCase('Μενού')}
            </p>
            <div className="space-y-0.5">
              {menuItems.map((item) => {
                const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href!}
                    onClick={onNavigate}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-lg px-4 py-2 text-[12px] font-bold transition-all duration-300',
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-600 rounded-r-full" />
                    )}
                    <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive ? "text-emerald-600" : "text-zinc-400 group-hover:text-zinc-900")} />
                    <span>{toGreekUpperCase(item.name)}</span>
                    {item.name === 'Κρατήσεις' && (
                      <span className="ml-auto bg-emerald-600 text-white text-[11px] px-1.5 py-0.5 rounded-md font-black">
                        NEW
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Academy & More Group */}
          <div>
            <p className="px-4 text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 font-mono">
              {toGreekUpperCase('Διαχείριση')}
            </p>
            <div className="space-y-1">
              {managementItems.map((item) => {
                const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false;
                const isParentActive = isChildActive(item);
                const isExpanded = expandedMenus.includes(item.name) || isParentActive;
                const Icon = item.icon;

                if (item.disabled) {
                  return (
                    <div
                      key={item.name}
                      className="group relative flex items-center gap-3 rounded-lg px-4 py-2 text-[12px] font-bold text-zinc-300 cursor-not-allowed"
                    >
                      <Icon className="h-4 w-4 text-zinc-200" />
                      <span>{toGreekUpperCase(item.name)}</span>
                      {item.badge && (
                        <span className="ml-auto bg-zinc-100 text-zinc-400 text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  );
                }

                if (item.children) {
                  return (
                    <div key={item.name} className="space-y-0.5">
                      <button
                        onClick={() => toggleMenu(item.name)}
                        className={cn(
                          'group relative flex w-full items-center justify-between rounded-lg px-4 py-2 text-[12px] font-bold transition-all duration-300',
                          isParentActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                        )}
                      >
                        {isParentActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-600 rounded-r-full" />
                        )}
                        <div className="flex items-center gap-3">
                          <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isParentActive ? "text-emerald-600" : "text-zinc-400 group-hover:text-zinc-900")} />
                          <span>{toGreekUpperCase(item.name)}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 opacity-40" />
                        ) : (
                          <ChevronRight className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="ml-7 space-y-0.5 pt-0.5 border-l border-zinc-100 pl-3">
                          {item.children.map((child) => {
                            const isChildItemActive = pathname === child.href;
                            return (
                              <Link
                                key={child.name}
                                href={child.href}
                                onClick={onNavigate}
                                className={cn(
                                  'block py-1 text-[11px] font-bold transition-colors',
                                  isChildItemActive
                                    ? 'text-emerald-600'
                                    : 'text-zinc-400 hover:text-zinc-900'
                                )}
                              >
                                {toGreekUpperCase(child.name)}
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
                    onClick={onNavigate}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-lg px-4 py-2 text-[12px] font-bold transition-all duration-300',
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-600 rounded-r-full" />
                    )}
                    <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive ? "text-emerald-600" : "text-zinc-400 group-hover:text-zinc-900")} />
                    <span>{toGreekUpperCase(item.name)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Super Admin Link */}
        {user?.email === SUPER_ADMIN_EMAIL && (
          <div className="mt-4">
            <p className="px-4 text-[11px] font-black text-red-400 uppercase tracking-[0.2em] mb-2 font-mono">
              SUPER ADMIN
            </p>
            <Link
              href="/management/admin-panel"
              onClick={onNavigate}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-4 py-2 text-[12px] font-bold transition-all duration-300',
                pathname === '/management/admin-panel'
                  ? 'bg-red-50 text-red-700'
                  : 'text-zinc-500 hover:bg-red-50/50 hover:text-red-600'
              )}
            >
              {pathname === '/management/admin-panel' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-red-600 rounded-r-full" />
              )}
              <Shield className={cn("h-4 w-4 transition-transform group-hover:scale-110", pathname === '/management/admin-panel' ? "text-red-600" : "text-zinc-400 group-hover:text-red-500")} />
              <span>{toGreekUpperCase('Admin Panel')}</span>
            </Link>
          </div>
        )}
      </nav>

      <div className="p-4 space-y-4">
        {/* Bookings Status Toggle (Admin Only) */}
        {perms.showBookingsToggle && (
          <div className="px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100/50 flex items-center justify-between gap-3 shadow-inner group">
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className={cn(
                "text-[12px] font-black uppercase tracking-widest transition-colors truncate",
                bookingsEnabled ? "text-emerald-600" : "text-zinc-400 group-hover:text-red-400"
              )}>
                {bookingsEnabled ? toGreekUpperCase('Online Κρατήσεις') : toGreekUpperCase('Κρατήσεις Ανενεργές')}
              </p>
              {!bookingsEnabled && (
                <p className="text-[7px] font-bold text-red-400/70 uppercase leading-none tracking-tighter">
                  {toGreekUpperCase('Σελίδα & QR Ανενεργά')}
                </p>
              )}
            </div>
            <Switch
              checked={bookingsEnabled}
              onCheckedChange={setBookingsEnabled}
              className="scale-[0.8] data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-200"
            />
          </div>
        )}

        {/* QR Code Card */}
        {perms.showQrCard && (
          <div className="relative">
            <Link 
              href={bookingsEnabled ? "/management/booking/qr" : "#"} 
              onClick={(e) => {
                if (!bookingsEnabled) e.preventDefault();
                onNavigate?.();
              }}
              className={cn(
                "block relative overflow-hidden rounded-2xl p-5 group transition-all duration-500",
                bookingsEnabled 
                  ? "bg-zinc-900 border-0 cursor-pointer hover:shadow-xl hover:shadow-emerald-900/10" 
                  : "bg-zinc-100 border border-zinc-200 cursor-not-allowed opacity-80"
              )}
            >
               {/* Abstract Background Shapes */}
               {bookingsEnabled && (
                 <>
                   <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-colors" />
                   <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl" />
                 </>
               )}
               
               <div className="relative z-10 flex flex-col gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center backdrop-blur-md",
                    bookingsEnabled ? "bg-white/10" : "bg-zinc-200"
                  )}>
                    <QrCode className={cn("h-4 w-4", bookingsEnabled ? "text-emerald-400" : "text-zinc-400")} />
                  </div>
                  
                  <div>
                    <p className={cn(
                      "text-sm font-bold tracking-tight",
                      bookingsEnabled ? "text-white" : "text-zinc-400"
                    )}>
                      {bookingsEnabled ? toGreekUpperCase('Δημιουργήστε το QR Code') : toGreekUpperCase('QR Code Ανενεργό')}
                    </p>
                    <p className={cn(
                      "text-[12px] font-medium mt-0.5",
                      bookingsEnabled ? "text-emerald-400/80" : "text-zinc-400/60"
                    )}>
                      {bookingsEnabled ? 'ΓΙΑ ΤΗ ΣΕΛΙΔΑ BOOKING' : 'Online Κρατήσεις: OFF'}
                    </p>
                  </div>
                  {bookingsEnabled && (
                    <div className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-black transition-all active:scale-95 shadow-lg shadow-emerald-900/20 uppercase">
                      <QrCode className="h-3 w-3 mr-1" />
                      ΦΤΙΑΞΕ QR
                    </div>
                  )}
               </div>
            </Link>
          </div>
        )}

        <button
          onClick={() => {
            signOut();
            onNavigate?.();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] font-bold text-red-500 hover:bg-red-50 transition-all duration-300"
        >
          <LogOut className="h-5 w-5" />
          <span>{toGreekUpperCase('Αποσύνδεση')}</span>
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[280px] p-0 border-0 bg-white">
          <SheetTitle className="sr-only">Μενού πλοήγησης</SheetTitle>
          <NavContent onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[260px] lg:flex-col">
        <div className="flex flex-col flex-grow">
          <NavContent />
        </div>
      </div>

      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl p-3 bg-white shadow-2xl border border-zinc-100 text-zinc-900 hover:bg-zinc-50 transition-all active:scale-90 ring-4 ring-black/5"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}

