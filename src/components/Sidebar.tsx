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
    <div className="flex h-full flex-col bg-[#1e293b]">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-white/[0.04] shrink-0">
        <Image
          src="/yabalitsalogo.png"
          alt="Yabalitsa"
          width={100}
          height={28}
          className="h-7 w-auto brightness-0 invert opacity-100"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {navigation.map((item) => {
          const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false;
          const hasChildren = !!item.children;
          const isExpanded = expandedMenus.includes(item.name) || isChildActive(item);
          const isParentActive = isChildActive(item);
          const Icon = item.icon;

          if (hasChildren) {
            return (
              <div key={item.name} className="py-0.5">
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all duration-200 min-h-[32px]',
                    isParentActive
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn("h-3.5 w-3.5 transition-opacity", isParentActive ? "opacity-100" : "opacity-60")} />
                    <span>{toGreekUpperCase(item.name)}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 opacity-40" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                  )}
                </button>
                {isExpanded && (
                  <div className="mt-0.5 ml-4 space-y-0.5 border-l border-white/5 pl-3">
                    {item.children?.map((child, _idx, siblings) => {
                      const otherSiblingPaths = siblings.filter(s => s.href !== child.href).map(s => s.href);
                      const isChildItemActive = pathname === child.href || (
                        pathname.startsWith(child.href) &&
                        !otherSiblingPaths.some(sp => pathname.startsWith(sp))
                      );
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          onClick={onNavigate}
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-2 py-1 text-[10px] font-bold tracking-tight transition-colors min-h-[28px]',
                            isChildItemActive
                              ? 'text-emerald-400'
                              : 'text-slate-400 hover:text-slate-100'
                          )}
                        >
                          <ChildIcon className={cn("h-3 w-3", isChildItemActive ? "opacity-100" : "opacity-50")} />
                          <span>{toGreekUpperCase(child.name)}</span>
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
                'flex items-center gap-2.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all duration-200 min-h-[32px]',
                isActive
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 transition-opacity", isActive ? "opacity-100" : "opacity-60")} />
              <span>{toGreekUpperCase(item.name)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer — venue name + logout */}
      <div className="border-t border-white/[0.04] px-3 py-3 space-y-1.5 shrink-0">
        {venueOwner?.name && (
          <div className="px-2 pb-1">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{toGreekUpperCase('Λογαριασμός')}</p>
            <p className="text-[11px] text-white font-bold truncate mt-0.5">{venueOwner.name}</p>
          </div>
        )}
        <button
          onClick={() => {
            signOut();
            onNavigate?.();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 min-h-[32px]"
        >
          <LogOut className="h-3.5 w-3.5 opacity-60" />
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
        <SheetContent side="left" className="w-[300px] p-0 border-0 bg-[#1e293b]">
          <SheetTitle className="sr-only">Μενού πλοήγησης</SheetTitle>
          <NavContent onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[240px] lg:flex-col">
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

