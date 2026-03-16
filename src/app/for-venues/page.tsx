'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Phone,
  Lock,
  Building2,
  MapPin,
  FileText,
  Check,
  Loader2,
  Sparkles,
  PartyPopper,
  ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import SupportEmail from '@/components/SupportEmail';

export default function ForVenuesPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setSuccess] = useState<string | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);

  const [form, setForm] = useState({
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    password: '',
    confirmPassword: '',
    venueName: '',
    venueAddress: '',
    venueCity: '',
    venueEmail: '',
    venuePhone: '',
    venueAfm: '',
    venueDoy: '',
    plan: 'trial',
    acceptTerms: false
  });

  const passHasMinLen = form.password.length >= 6;
  const passHasUpper = /[A-Z]/.test(form.password);
  const passHasSymbol = /[!@#$%^&*()_+\-={}\[\]:;"'`~<>,.?/\\]/.test(form.password);
  const passMatches = form.password.length > 0 && form.password === form.confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const strong = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-={}\[\]:;"'`~<>,.?/\\]).{6,}$/;
      if (!strong.test(form.password)) {
        throw new Error('Ο κωδικός πρέπει να έχει 6+ χαρακτήρες, 1 κεφαλαίο και 1 σύμβολο.');
      }
      if (form.password !== form.confirmPassword) {
        throw new Error('Οι κωδικοί δεν ταιριάζουν.');
      }
      const afmOk = /^\d{9}$/.test(form.venueAfm);
      if (!afmOk) {
        throw new Error('Το ΑΦΜ πρέπει να έχει 9 ψηφία.');
      }
      if (!form.acceptTerms) {
        throw new Error('Πρέπει να αποδεχθείς τους Όρους Χρήσης και την Πολιτική Απορρήτου.');
      }

      const cred = await createUserWithEmailAndPassword(auth, form.ownerEmail, form.password);
      const idToken = await cred.user.getIdToken();

      const venueResponse = await fetch('/api/venues/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          venueName: form.venueName,
          venueAddress: form.venueAddress,
          venueCity: form.venueCity,
          venueEmail: form.venueEmail,
          venuePhone: form.venuePhone,
          venueAfm: form.venueAfm,
          venueDoy: form.venueDoy,
          ownerName: form.ownerName,
          ownerEmail: form.ownerEmail,
          ownerPhone: form.ownerPhone,
          plan: form.plan
        })
      });

      if (!venueResponse.ok) {
        const errorData = await venueResponse.json();
        throw new Error(errorData.error || 'Failed to create venue');
      }

      await venueResponse.json();

      setSuccess('ok');
      setShowCongrats(true);
      setForm({
        ownerName: '', ownerEmail: '', ownerPhone: '', password: '', confirmPassword: '',
        venueName: '', venueAddress: '', venueCity: '', venueEmail: '', venuePhone: '', venueAfm: '', venueDoy: '',
        plan: 'trial', acceptTerms: false
      });
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const code = (err as { code?: string })?.code || '';
      const firebaseErrors: Record<string, string> = {
        'auth/email-already-in-use': 'Αυτό το email χρησιμοποιείται ήδη. Δοκιμάστε να συνδεθείτε ή χρησιμοποιήστε άλλο email.',
        'auth/invalid-email': 'Μη έγκυρη διεύθυνση email.',
        'auth/weak-password': 'Ο κωδικός πρέπει να είναι τουλάχιστον 6 χαρακτήρες.',
        'auth/operation-not-allowed': 'Η εγγραφή δεν είναι διαθέσιμη αυτή τη στιγμή.',
        'auth/too-many-requests': 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.',
        'auth/network-request-failed': 'Πρόβλημα σύνδεσης. Ελέγξτε το internet σας.',
      };
      setError(firebaseErrors[code] || (err as Error)?.message || 'Κάτι πήγε στραβά.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] bg-[#0f172a] relative overflow-hidden flex-col justify-between p-12 shrink-0">
        <div>
          <Image
            src="/yabalitsalogo.png"
            alt="Yabalitsa"
            width={160}
            height={48}
            className="h-10 w-auto brightness-0 invert opacity-90"
          />
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-3xl font-semibold text-white leading-tight tracking-tight">
              Διαχειρίσου τα<br />γηπεδάκια σου εύκολα
            </h1>
            <p className="mt-4 text-slate-400 text-[15px] leading-relaxed max-w-sm">
              Κρατήσεις, πελάτες, έσοδα — όλα σε μία πλατφόρμα. Ξεκίνα δωρεάν σήμερα.
            </p>
          </div>

          <div className="space-y-4">
            {[
              'Online κρατήσεις 24/7',
              'Διαχείριση πελατών & ακαδημίας',
              'Αναλυτικά reports εσόδων',
              'QR code για άμεσες κρατήσεις',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <span className="text-slate-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-white">15 ημέρες δωρεάν</span>
            </div>
            <p className="text-slate-400 text-[13px] leading-relaxed">
              Χωρίς πιστωτική κάρτα. Χωρίς δεσμεύσεις. Επίλεξε πλάνο μετά τη δοκιμαστική περίοδο.
            </p>
          </div>
        </div>

        <p className="text-slate-600 text-xs relative z-10">
          &copy; {new Date().getFullYear()} Yabalitsa
        </p>

        {/* Decorative gradient orbs */}
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-600/20 rounded-full blur-3xl" />
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl" />
      </div>

      {/* Right panel — form */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[560px] mx-auto px-6 py-10 lg:py-12">
          {/* Mobile header */}
          <div className="lg:hidden mb-8">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-700 transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Αρχική
            </Link>
            <div className="flex justify-center mb-6">
              <Image src="/yabalitsalogo.png" alt="Yabalitsa" width={140} height={40} className="h-9 w-auto" />
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">15 ημέρες δωρεάν</span>
              </div>
              <p className="text-xs text-emerald-700">Χωρίς πιστωτική κάρτα. Χωρίς δεσμεύσεις.</p>
            </div>
          </div>

          {/* Desktop back link */}
          <div className="hidden lg:block mb-8">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Αρχική
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">
              Δημιουργία λογαριασμού
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Συμπληρώστε τα στοιχεία σας για να ξεκινήσετε
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Owner section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                <User className="h-4 w-4 text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-900">Στοιχεία Ιδιοκτήτη</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-700">Ονοματεπώνυμο</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      className="pl-10 h-11 bg-white"
                      value={form.ownerName}
                      onChange={e => setForm({ ...form, ownerName: e.target.value })}
                      placeholder="π.χ. Γιάννης Παπαδόπουλος"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-700">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      type="email"
                      className="pl-10 h-11 bg-white"
                      value={form.ownerEmail}
                      onChange={e => setForm({ ...form, ownerEmail: e.target.value })}
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-700">Τηλέφωνο</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      className="pl-10 h-11 bg-white"
                      value={form.ownerPhone}
                      onChange={e => setForm({ ...form, ownerPhone: e.target.value })}
                      placeholder="69xxxxxxxx"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-700">Κωδικός</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      type="password"
                      className="pl-10 h-11 bg-white"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="********"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-700">Επιβεβαίωση Κωδικού</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      type="password"
                      className="pl-10 h-11 bg-white"
                      value={form.confirmPassword}
                      onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="********"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Password checklist */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-1">
                {[
                  { ok: passHasMinLen, label: '6+ χαρακτήρες' },
                  { ok: passHasUpper, label: '1 κεφαλαίο γράμμα' },
                  { ok: passHasSymbol, label: '1 σύμβολο (!@#...)' },
                  { ok: passMatches, label: 'Οι κωδικοί ταιριάζουν' },
                ].map(({ ok, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center transition-colors ${ok ? 'bg-emerald-100' : 'bg-zinc-100'}`}>
                      <Check className={`h-2.5 w-2.5 transition-colors ${ok ? 'text-emerald-600' : 'text-zinc-300'}`} />
                    </div>
                    <span className={`text-xs transition-colors ${ok ? 'text-emerald-700' : 'text-zinc-400'}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Venue section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                <Building2 className="h-4 w-4 text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-900">Στοιχεία Γηπέδου</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-700">Επωνυμία Εταιρείας</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      className="pl-10 h-11 bg-white"
                      value={form.venueName}
                      onChange={e => setForm({ ...form, venueName: e.target.value })}
                      placeholder="π.χ. Sport Arena"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-700">Διεύθυνση</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      className="pl-10 h-11 bg-white"
                      value={form.venueAddress}
                      onChange={e => setForm({ ...form, venueAddress: e.target.value })}
                      placeholder="π.χ. Λεωφ. Κηφισίας 120"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-700">Πόλη</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="flex h-11 w-full items-center justify-between rounded-lg border border-zinc-200/70 bg-white px-3 text-sm text-zinc-900 hover:bg-zinc-50 transition-colors">
                        <span className={form.venueCity ? 'text-zinc-900' : 'text-zinc-400'}>
                          {form.venueCity || 'Επιλέξτε πόλη'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-64 overflow-y-auto">
                      {['Αθήνα', 'Θεσσαλονίκη', 'Πάτρα', 'Ηράκλειο', 'Λάρισα', 'Βόλος', 'Ιωάννινα', 'Χανιά', 'Καβάλα', 'Ρόδος', 'Σέρρες', 'Αλεξανδρούπολη', 'Κατερίνη', 'Τρίκαλα', 'Καλαμάτα', 'Κέρκυρα', 'Κομοτηνή', 'Ξάνθη', 'Δράμα', 'Κοζάνη', 'Άλλη'].map((city) => (
                        <DropdownMenuItem
                          key={city}
                          onClick={() => setForm({ ...form, venueCity: city })}
                          className={form.venueCity === city ? 'bg-zinc-100 font-medium' : ''}
                        >
                          {city}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-700">ΑΦΜ Επιχείρησης</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      className="pl-10 h-11 bg-white"
                      value={form.venueAfm}
                      onChange={e => setForm({ ...form, venueAfm: e.target.value })}
                      placeholder="9 ψηφία"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-700">Δ.Ο.Υ.</Label>
                  <Input
                    className="h-11 bg-white"
                    value={form.venueDoy}
                    onChange={e => setForm({ ...form, venueDoy: e.target.value })}
                    placeholder="π.χ. Αμαρουσίου"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-700">Email Γηπέδου</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      type="email"
                      className="pl-10 h-11 bg-white"
                      value={form.venueEmail}
                      onChange={e => setForm({ ...form, venueEmail: e.target.value })}
                      placeholder="info@venue.gr"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-700">Τηλέφωνο Γηπέδου</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      className="pl-10 h-11 bg-white"
                      value={form.venuePhone}
                      onChange={e => setForm({ ...form, venuePhone: e.target.value })}
                      placeholder="21xxxxxxxx"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Terms + Submit */}
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="acceptTerms"
                  checked={form.acceptTerms}
                  onCheckedChange={(checked) => setForm({ ...form, acceptTerms: checked === true })}
                  className="mt-0.5"
                />
                <label htmlFor="acceptTerms" className="text-[13px] text-zinc-500 leading-relaxed select-none cursor-pointer">
                  Αποδέχομαι τους{' '}
                  <Link href="/terms" className="font-medium text-emerald-600 hover:text-emerald-700 underline-offset-2 hover:underline">
                    Όρους Χρήσης
                  </Link>{' '}
                  και την{' '}
                  <Link href="/privacy" className="font-medium text-emerald-600 hover:text-emerald-700 underline-offset-2 hover:underline">
                    Πολιτική Απορρήτου
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-[15px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Δημιουργία...
                  </>
                ) : (
                  <>
                    Ξεκίνα δωρεάν
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-[13px] text-zinc-500">
                Έχετε ήδη λογαριασμό;{' '}
                <Link href="/venue-login" className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                  Σύνδεση
                </Link>
              </p>
            </div>
          </form>

          {/* Support */}
          <div className="mt-12 pt-8 border-t border-zinc-100 text-center">
            <p className="text-sm text-zinc-500 mb-3">Χρειάζεστε βοήθεια;</p>
            <SupportEmail variant="compact" />
          </div>
        </div>
      </div>

      {/* Success dialog */}
      <Dialog open={showCongrats} onOpenChange={setShowCongrats}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center">
              <PartyPopper className="h-7 w-7 text-emerald-600" />
            </div>
            <DialogTitle className="text-xl">Συγχαρητήρια!</DialogTitle>
            <DialogDescription className="mt-2">
              Η εγγραφή σας ολοκληρώθηκε. Μπορείτε να ξεκινήσετε να χρησιμοποιείτε το διαχειριστικό.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => router.push('/management')}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Μετάβαση στο Διαχειριστικό
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCongrats(false)}
            >
              Κλείσιμο
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
