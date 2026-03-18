'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/lib/firebase-services';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, Trophy, LineChart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email('Μη έγκυρη διεύθυνση email'),
  password: z.string().min(6, 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function VenueLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'inactive'
      ? 'Ο λογαριασμός σας έχει απενεργοποιηθεί. Επικοινωνήστε μαζί μας.'
      : searchParams.get('error') === 'expired'
      ? 'Η συνδρομή σας έχει λήξει. Ανανεώστε για να συνεχίσετε.'
      : searchParams.get('error') === 'trial_expired'
      ? 'Η δοκιμαστική περίοδος έληξε. Επιλέξτε πλάνο για να συνεχίσετε.'
      : null
  );
  const [showPassword, setShowPassword] = useState(false);
  const redirectTo = searchParams.get('redirect') || '/management/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (searchParams.get('error') === 'inactive') {
      setError('Η δοκιμαστική περίοδος του λογαριασμού σας έχει λήξει. Επικοινωνήστε μαζί μας για αναβάθμιση.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (user && venueOwner) {
      router.push(redirectTo);
    }
  }, [user, venueOwner, authLoading, router, redirectTo]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const handleFormSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.signIn(data.email, data.password);
    } catch (err) {
      console.error('Login error:', err);
      setError('Μη έγκυρο email ή κωδικός');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] relative overflow-hidden flex-col justify-between p-12 bg-[#040D12]">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image src="/bg_auth_football.png" alt="Yabalitsa background" fill className="object-cover opacity-40 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#040D12] via-[#040D12]/80 to-[#040D12]/40" />
        </div>

        <div className="relative z-10">
          <Link href="/">
            <Image
              src="/yabalo.png"
              alt="Yabalitsa"
              width={160}
              height={32}
              className="h-9 w-auto brightness-0 invert hover:opacity-80 transition cursor-pointer"
            />
          </Link>
        </div>

        <div className="relative z-10 mb-8 mt-auto">
          <h1 className="text-3xl sm:text-4xl font-medium text-white leading-tight tracking-tight mb-10">
            Ολοκληρωμένη διαχείριση<br/>
            για το <span className="text-emerald-400 font-bold">αθλητικό σας κέντρο</span>
          </h1>

          <div className="space-y-8">
            <div className="flex items-start gap-5">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-2xl text-emerald-400 mt-1 shadow-[0_0_15px_-3px_rgba(52,211,153,0.3)]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Αστραπιαίες Κρατήσεις</h3>
                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">Αυτόματο ημερολόγιο γηπέδων 5x5, αυτόματος έλεγχος διαθεσιμότητας και οργάνωση πελατολογίου.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-5">
              <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-2xl text-blue-400 mt-1 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Λογισμικό Ακαδημίας</h3>
                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">Διαχείριση ιατρικών πιστοποιητικών, οργάνωση ηλικιακών τμημάτων ομάδων και αυτόματο Player Passport.</p>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className="bg-orange-500/10 border border-orange-500/20 p-2.5 rounded-2xl text-orange-400 mt-1 shadow-[0_0_15px_-3px_rgba(249,115,22,0.3)]">
                <LineChart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Οικονομικά Reports</h3>
                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">Πλήρης έλεγχος των μηνιαίων συνδρομών, έξυπνες ειδοποιήσεις για ανεξόφλητες καρτέλες αθλητών.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between pt-8 border-t border-white/10 mt-10">
          <p className="text-zinc-500 text-xs font-medium">
            &copy; {new Date().getFullYear()} Yabalitsa SaaS
          </p>
          <div className="flex gap-4 text-[10px] font-black tracking-widest text-emerald-500/80">
            <span>SECURE ENCRYPTED</span>
            <span>GDPR COMPLIANT</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 bg-zinc-50">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex justify-center mb-10 lg:hidden">
            <Image
              src="/yabalitsalogo.png"
              alt="Yabalitsa"
              width={140}
              height={40}
              className="h-9 w-auto"
            />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">
              Συνδεθείτε
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Εισάγετε τα στοιχεία σας για πρόσβαση στη πλατφόρμα
            </p>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="email@example.com"
                  className="pl-10 h-11 bg-white"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-700">Κωδικός</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="********"
                  className="pl-10 pr-10 h-11 bg-white"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Σύνδεση...
                </>
              ) : (
                <>
                  Σύνδεση
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-500">
              Δεν έχετε λογαριασμό;{' '}
              <a href="/for-venues" className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                Εγγραφή
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VenueLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    }>
      <VenueLoginContent />
    </Suspense>
  );
}
