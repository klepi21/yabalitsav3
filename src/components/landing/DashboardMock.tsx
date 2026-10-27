'use client';
/* eslint-disable no-restricted-syntax -- σταθερός καμβάς 1280px που κλιμακώνεται ολόκληρος· τα μεγέθη κειμένου είναι σε pixel του καμβά, όχι της σελίδας. */

import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  QrCode,
  Radio,
  CalendarCheck,
  UserSearch,
  Clock,
  AlertTriangle,
  User,
  Bell,
  Plus,
} from 'lucide-react';

/* Αναπαράσταση του πίνακα ελέγχου σε κώδικα, αντί για στιγμιότυπο οθόνης:
   δείχνει πάντα το προϊόν όπως είναι (μόνο κρατήσεις) και δεν ξεπερνιέται
   σιωπηλά όταν αλλάζει το UI. Σχεδιάζεται σε σταθερό καμβά 1280x760 και
   κλιμακώνεται ώστε να χωράει στο πλάτος του laptop. */
const W = 1280;
const H = 760;

const PitchIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const NAV = [
  { name: 'Πίνακας Ελέγχου', icon: LayoutDashboard, active: true },
  { name: 'Γήπεδα', icon: Building2 },
  { name: 'Κρατήσεις', icon: CalendarDays },
  { name: 'Πελάτες', icon: Users },
];
const NAV2 = [
  { name: 'Αναφορές', icon: BarChart3 },
  { name: 'Ρυθμίσεις', icon: Settings },
];

const TODAY = [
  { name: 'Γιώργος Παπαδόπουλος', pitch: 'Γήπεδο 1', time: '18:00', status: 'Επιβεβαιωμένη', tone: 'emerald' },
  { name: 'Ομάδα Κώστα', pitch: 'Γήπεδο 2', time: '19:00', status: 'Επιβεβαιωμένη', tone: 'emerald' },
  { name: 'Νίκος Αλεξίου', pitch: 'Γήπεδο 1', time: '20:00', status: 'Σε αναμονή', tone: 'amber' },
  { name: 'Δημήτρης Ζαφειρίου', pitch: 'Γήπεδο 3', time: '21:00', status: 'Επιβεβαιωμένη', tone: 'emerald' },
];

const PENDING = [
  { name: 'Νίκος Αλεξίου', pitch: 'Γήπεδο 1', when: 'Σήμ 20:00' },
  { name: 'Μάριος Κ.', pitch: 'Γήπεδο 2', when: 'Πέμ 19:00' },
  { name: 'Ομάδα Λευτέρη', pitch: 'Γήπεδο 3', when: 'Παρ 21:00' },
];

export default function DashboardMock() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${W} / ${H}` }}
      role="img"
      aria-label="Ο πίνακας ελέγχου του Yabalitsa με τις σημερινές κρατήσεις και τις online κρατήσεις προς επιβεβαίωση"
    >
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 flex bg-zinc-50 text-zinc-900 font-sans select-none"
        style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 bg-white border-r border-zinc-100 flex flex-col">
          <div className="h-16 flex items-center px-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/yabalitsalogo.png" alt="" className="h-8 w-auto" />
          </div>
          <div className="px-3 flex-1">
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Μενού</p>
            {NAV.map(({ name, icon: Icon, active }) => (
              <div
                key={name}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] ${
                  active ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-zinc-600 font-medium'
                }`}
              >
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-600 rounded-r-full" />}
                <Icon className={`h-4 w-4 ${active ? 'text-emerald-600' : 'text-zinc-500'}`} />
                {name}
              </div>
            ))}
            <p className="px-3 mt-5 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Διαχείριση</p>
            {NAV2.map(({ name, icon: Icon }) => (
              <div key={name} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-zinc-600 font-medium">
                <Icon className="h-4 w-4 text-zinc-500" />
                {name}
              </div>
            ))}
          </div>
          <div className="p-3 space-y-3">
            <div className="px-3 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-emerald-600">Online Κρατήσεις</span>
              <span className="h-5 w-9 rounded-full bg-emerald-500 relative">
                <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white" />
              </span>
            </div>
            <div className="rounded-2xl p-4 bg-zinc-900 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl" />
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                <QrCode className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-[13px] font-semibold text-white">Δημιουργήστε το QR Code</p>
              <div className="mt-3 py-2 rounded-lg bg-emerald-400 text-zinc-950 text-[11px] font-semibold text-center">Φτιάξε QR</div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-16 shrink-0 bg-white border-b border-zinc-200 px-8 flex items-center justify-between">
            <span className="text-[15px] font-semibold">Πίνακας ελέγχου</span>
            <div className="flex items-center gap-4">
              <span className="relative">
                <Bell className="h-5 w-5 text-zinc-600" />
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">3</span>
              </span>
              <span className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center justify-center">ΓΠ</span>
            </div>
          </header>

          <div className="flex-1 p-8 space-y-6 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm">
                  <LayoutDashboard className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h1 className="text-[26px] font-bold tracking-tight leading-none">Πίνακας Ελέγχου</h1>
                  <p className="text-[11px] font-semibold text-zinc-500 mt-1.5">
                    Διαχείριση γηπέδου <span className="text-emerald-500">Arena 5x5</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-11 px-5 rounded-2xl bg-zinc-900 text-white text-[12px] font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4 text-emerald-400" /> Γρήγορη Κράτηση
                </div>
                <div className="h-11 px-5 rounded-2xl border border-zinc-200 bg-white text-[12px] font-semibold flex items-center">Σελίδα Booking</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Σήμερα', value: 9, detail: 'Κρατήσεις ημέρας', icon: <PitchIcon className="h-5 w-5 text-emerald-600" /> },
                { label: 'Τώρα', value: 2, detail: 'Σε εξέλιξη στα γήπεδα', icon: <Radio className="h-5 w-5 text-blue-600" /> },
                { label: 'Επερχόμενες', value: 47, detail: 'Από σήμερα και μετά', icon: <CalendarCheck className="h-5 w-5 text-emerald-600" /> },
                { label: 'Προς επιβεβαίωση', value: 3, detail: 'Περιμένουν απάντηση', icon: <UserSearch className="h-5 w-5 text-amber-600" /> },
              ].map((s) => (
                <div key={s.label} className="h-[92px] rounded-2xl border border-zinc-200 bg-white px-5 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-500">{s.label}</p>
                    <p className="text-[28px] font-bold tracking-tighter leading-none mt-1">{s.value}</p>
                    <p className="text-[11px] font-medium text-zinc-500 mt-1.5">{s.detail}</p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">{s.icon}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-3 pb-1">
                  <div className="h-10 w-10 rounded-2xl bg-white border border-zinc-100 shadow flex items-center justify-center">
                    <Clock className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold tracking-tight">Σημερινές Κρατήσεις</p>
                    <p className="text-[11px] font-semibold text-zinc-500">Πρόγραμμα ημέρας</p>
                  </div>
                </div>
                {TODAY.map((b) => (
                  <div key={b.name + b.time} className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-zinc-200">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold">{b.name}</p>
                        <p className="text-[11px] text-zinc-500">
                          {b.pitch} <span className="text-zinc-300">•</span> <span className="text-emerald-600 font-medium">{b.time}</span>
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        b.tone === 'amber'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 pb-1">
                  <div className="h-10 w-10 rounded-2xl bg-white border border-zinc-100 shadow flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold tracking-tight">Προς επιβεβαίωση</p>
                    <p className="text-[11px] font-semibold text-zinc-500">Online κρατήσεις που περιμένουν απάντηση</p>
                  </div>
                </div>
                {PENDING.map((b) => (
                  <div key={b.name} className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-amber-200/70">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold">{b.name}</p>
                        <p className="text-[11px] text-zinc-500">
                          {b.pitch} <span className="text-zinc-300">•</span> <span className="text-amber-700 font-medium">{b.when}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-700">Άνοιγμα →</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
