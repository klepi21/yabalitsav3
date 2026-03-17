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
  Swords,
  ClipboardList,
  Dumbbell,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  Smartphone,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn, toGreekUpperCase } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: { name: string; href: string; icon: React.ElementType }[];
}

const navigation: NavItem[] = [
  { name: toGreekUpperCase('Πίνακας Ελέγχου'), href: '/management/dashboard', icon: LayoutDashboard },
  { name: 'Γήπεδα', href: '/management/pitches', icon: Building2 },
  { name: 'Κρατήσεις', href: '/management/bookings', icon: CalendarDays },
  { name: 'Πελάτες', href: '/management/customers', icon: Users },
  {
    name: 'Ακαδημία',
    icon: GraduationCap,
    children: [
      { name: 'Όλοι οι Χρήστες', href: '/management/academy/users', icon: Users },
      { name: 'Τμήματα', href: '/management/academy/squads', icon: Trophy },
      { name: 'Κατηγορίες Χρηστών', href: '/management/academy/user-groups', icon: ClipboardList },
      { name: 'Προπονήσεις', href: '/management/academy/training', icon: Dumbbell },
    ]
  },
  {
    name: 'Τουρνουά',
    icon: Trophy,
    children: [
      { name: 'Όλα τα Τουρνουά', href: '/management/tournaments', icon: Swords },
      { name: 'Νέο Τουρνουά', href: '/management/tournaments/new', icon: ClipboardList },
    ]
  },
  { name: 'Αναφορές', href: '/management/reports', icon: BarChart3 },
  { name: 'Ρυθμίσεις', href: '/management/settings', icon: Settings },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const pathname = usePathname();
  const { signOut, venueOwner } = useAuth();

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
    <div className="flex h-full flex-col bg-white border-r border-zinc-100">
      {/* Logo */}
      <div className="flex h-[88px] items-center px-10">
        <Image
          src="/yabalitsalogo.png"
          alt="Yabalitsa"
          width={180}
          height={60}
          className="h-10 w-auto"
        />
      </div>

      {/* Navigation */}
      <div className="flex-1 px-6 py-4 overflow-y-auto space-y-8">
        {/* Menu Section */}
        <div className="space-y-2">
            <p className="px-4 text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Menu</p>
            <div className="space-y-1">
                {navigation.slice(0, 4).map((item) => {
                    const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            href={item.href!}
                            onClick={onNavigate}
                            className={cn(
                                'group relative flex items-center gap-4 rounded-2xl px-5 py-4 text-[15px] font-black transition-all duration-300',
                                isActive
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1.5 bg-emerald-600 rounded-r-full" />
                            )}
                            <Icon className={cn("h-6 w-6", isActive ? "text-emerald-600" : "text-zinc-400 group-hover:text-zinc-900")} />
                            <span>{item.name}</span>
                        </Link>
                    )
                })}
            </div>
        </div>

        {/* Categories / Sections */}
        {navigation.slice(4).map((item) => {
          const hasChildren = !!item.children;
          const isExpanded = expandedMenus.includes(item.name) || isChildActive(item);
          const isParentActive = isChildActive(item);
          const Icon = item.icon;

          if (hasChildren) {
            return (
              <div key={item.name} className="space-y-2">
                <p className="px-4 text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">{item.name}</p>
                <div className="space-y-1">
                    {item.children?.map((child) => {
                        const isChildItemActive = pathname === child.href;
                        const ChildIcon = child.icon;
                        return (
                            <Link
                                key={child.name}
                                href={child.href}
                                onClick={onNavigate}
                                className={cn(
                                    'group relative flex items-center gap-4 rounded-2xl px-5 py-4 text-[15px] font-black transition-all duration-300',
                                    isChildItemActive
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                                )}
                            >
                                {isChildItemActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1.5 bg-emerald-600 rounded-r-full" />
                                )}
                                <ChildIcon className={cn("h-6 w-6", isChildItemActive ? "text-emerald-600" : "text-zinc-400 group-hover:text-zinc-900")} />
                                <span>{child.name}</span>
                            </Link>
                        );
                    })}
                </div>
              </div>
            );
          }

          return (
            <div key={item.name} className="space-y-2">
                 <p className="px-4 text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">General</p>
                 <Link
                    href={item.href!}
                    onClick={onNavigate}
                    className={cn(
                        'group relative flex items-center gap-4 rounded-2xl px-5 py-4 text-[15px] font-black transition-all duration-300',
                        pathname === item.href
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                    )}
                >
                    {pathname === item.href && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1.5 bg-emerald-600 rounded-r-full" />
                    )}
                    <Icon className={cn("h-6 w-6", pathname === item.href ? "text-emerald-600" : "text-zinc-400 group-hover:text-zinc-900")} />
                    <span>{item.name}</span>
                </Link>
            </div>
          );
        })}
      </div>

      {/* Mobile App Promo Card */}
      <div className="px-6 pb-6">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 p-8 text-white group cursor-pointer shadow-2xl">
              <div className="relative z-10 space-y-4">
                  <div className="h-10 w-10 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                      <Smartphone className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h4 className="text-xl font-black leading-tight">
                        {toGreekUpperCase('Κατεβάστε το Mobile App')}
                  </h4>
                  <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-black transition-all active:scale-95 group-hover:shadow-lg group-hover:shadow-emerald-900/40">
                      {toGreekUpperCase('Download')}
                      <ArrowUpRight className="h-4 w-4" />
                  </button>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -right-4 -bottom-4 h-32 w-32 bg-emerald-600/20 rounded-full blur-3xl transition-transform group-hover:scale-150" />
              <div className="absolute -top-8 -left-8 h-24 w-24 bg-emerald-400/10 rounded-full blur-2xl" />
          </div>
      </div>

      {/* Footer / Logout */}
      <div className="px-6 py-6 border-t border-zinc-50">
          <button
            onClick={() => {
                signOut();
                onNavigate?.();
            }}
            className="flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-[15px] font-black text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-all duration-300"
          >
            <LogOut className="h-6 w-6 opacity-60" />
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
        <SheetContent side="left" className="w-[320px] p-0 border-0 bg-white">
          <SheetTitle className="sr-only">Μενού πλοήγησης</SheetTitle>
          <NavContent onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[320px] lg:flex-col">
        <div className="flex flex-col flex-grow">
          <NavContent />
        </div>
      </div>

      <div className="lg:hidden fixed top-6 left-6 z-40">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-2xl p-4 bg-white shadow-2xl border border-zinc-100 text-zinc-900 hover:bg-zinc-50 transition-all active:scale-90 ring-4 ring-black/5"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-8 w-8" />
        </button>
      </div>
    </>
  );
}

