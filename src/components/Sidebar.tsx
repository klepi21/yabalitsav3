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
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: { name: string; href: string; icon: React.ElementType }[];
}

const navigation: NavItem[] = [
  { name: 'Πίνακας Ελέγχου', href: '/management/dashboard', icon: LayoutDashboard },
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
    <div className="flex h-full flex-col bg-[#0f172a]">
      {/* Logo */}
      <div className="flex h-[60px] items-center px-5 border-b border-white/[0.06]">
        <Image
          src="/yabalitsalogo.png"
          alt="Yabalitsa"
          width={130}
          height={36}
          className="h-8 w-auto brightness-0 invert opacity-90"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navigation.map((item) => {
          const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false;
          const hasChildren = !!item.children;
          const isExpanded = expandedMenus.includes(item.name) || isChildActive(item);
          const isParentActive = isChildActive(item);
          const Icon = item.icon;

          if (hasChildren) {
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                    isParentActive
                      ? 'bg-white/[0.08] text-white'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-[18px] w-[18px] opacity-70" />
                    <span>{item.name}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                  )}
                </button>
                {isExpanded && (
                  <div className="mt-0.5 ml-[22px] space-y-0.5 border-l border-white/[0.06] pl-3">
                    {item.children?.map((child, _idx, siblings) => {
                      // Check exact match first, then startsWith but exclude paths that belong to other siblings
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
                            'flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                            isChildItemActive
                              ? 'text-emerald-400'
                              : 'text-slate-400 hover:text-slate-200'
                          )}
                        >
                          <ChildIcon className="h-[16px] w-[16px] opacity-60" />
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
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
              )}
            >
              <Icon className="h-[18px] w-[18px] opacity-70" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer — venue name + logout */}
      <div className="border-t border-white/[0.06] px-3 py-3 space-y-1">
        {venueOwner?.name && (
          <div className="px-3 py-1.5">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Λογαριασμός</p>
            <p className="text-[13px] text-slate-300 font-medium truncate mt-0.5">{venueOwner.name}</p>
          </div>
        )}
        <button
          onClick={() => {
            signOut();
            onNavigate?.();
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-colors"
        >
          <LogOut className="h-[18px] w-[18px] opacity-70" />
          <span>Αποσύνδεση</span>
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[260px] p-0 border-0 bg-[#0f172a]">
          <SheetTitle className="sr-only">Μενού πλοήγησης</SheetTitle>
          <NavContent onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[260px] lg:flex-col">
        <div className="flex flex-col flex-grow">
          <NavContent />
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 bg-white shadow-sm border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}
