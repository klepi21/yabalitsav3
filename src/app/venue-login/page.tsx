'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/lib/firebase-services';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toGreekUpperCase } from '@/lib/utils';

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
      <div className="hidden lg:flex lg:w-[540px] xl:w-[650px] bg-zinc-900 relative overflow-hidden flex-col justify-between p-20">
        <div>
          <Image
            src="/yabalitsalogo.png"
            alt="Yabalitsa"
            width={240}
            height={72}
            className="h-16 w-auto brightness-0 invert opacity-100"
          />
        </div>

        <div className="relative z-10 space-y-8">
          <h1 className="text-6xl font-black text-white leading-tight tracking-tighter uppercase italic">
            {toGreekUpperCase('Διαχειριστείτε τις κρατήσεις σας με στυλ')}
          </h1>
          <p className="text-2xl font-bold text-zinc-400 leading-relaxed max-w-lg uppercase tracking-tight">
            Η ΠΙΟ ΕΞΕΛΙΓΜΕΝΗ ΠΛΑΤΦΟΡΜΑ ΓΙΑ ΤΗ ΔΙΑΧΕΙΡΙΣΗ ΤΟΥ ΑΘΛΗΤΙΚΟΥ ΣΑΣ ΚΕΝΤΡΟΥ.
          </p>
          <div className="flex items-center gap-6 pt-4">
              <div className="h-1 w-20 bg-emerald-500 rounded-full" />
              <div className="h-1 w-8 bg-zinc-800 rounded-full" />
              <div className="h-1 w-4 bg-zinc-800 rounded-full" />
          </div>
        </div>

        <p className="text-zinc-600 font-bold uppercase tracking-widest text-sm">
          &copy; {new Date().getFullYear()} YABALITSA PRO
        </p>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_50%)]" />
        <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px]" />
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-10 bg-[#fafafa]">
        <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-right-8 duration-700">
          {/* Mobile logo */}
          <div className="flex justify-center mb-16 lg:hidden">
            <Image
              src="/yabalitsalogo.png"
              alt="Yabalitsa"
              width={200}
              height={60}
              className="h-12 w-auto"
            />
          </div>

          <div className="mb-12">
            <h2 className="text-5xl font-black text-zinc-900 tracking-tighter uppercase italic">
              {toGreekUpperCase('Είσοδος')}
            </h2>
            <p className="mt-4 text-lg font-bold text-zinc-400 uppercase tracking-tight">
              {toGreekUpperCase('Πρόσβαση στο κέντρο ελέγχου σας')}
            </p>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
            {error && (
              <Alert variant="destructive" className="rounded-3xl bg-red-50 border-red-100 p-6 animate-in shake duration-500">
                <AlertDescription className="text-red-700 font-bold uppercase text-center">{toGreekUpperCase(error)}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Label htmlFor="email" className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] ml-2">Email</Label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-300 group-focus-within:text-emerald-500 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@venue.com"
                  className="pl-16 h-18 py-8 bg-white border-2 border-zinc-100 rounded-2xl font-bold text-lg focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-zinc-200"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs font-black text-red-500 uppercase tracking-tight ml-2">{toGreekUpperCase(errors.email.message || '')}</p>
              )}
            </div>

            <div className="space-y-4">
              <Label htmlFor="password" className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] ml-2">{toGreekUpperCase('Κωδικός')}</Label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-300 group-focus-within:text-emerald-500 transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="********"
                  className="pl-16 pr-16 h-18 py-8 bg-white border-2 border-zinc-100 rounded-2xl font-bold text-lg focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-zinc-200"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-6 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-xl hover:bg-zinc-50 text-zinc-300 hover:text-emerald-500 transition-all"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-6 w-6" />
                  ) : (
                    <Eye className="h-6 w-6" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-black text-red-500 uppercase tracking-tight ml-2">{toGreekUpperCase(errors.password.message || '')}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-20 bg-zinc-900 hover:bg-black text-white rounded-[1.5rem] font-black text-xl uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 group"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-4 h-8 w-8 animate-spin text-emerald-400" />
                  {toGreekUpperCase('Σύνδεση...')}
                </>
              ) : (
                <>
                  {toGreekUpperCase('Είσοδος')}
                  <ArrowRight className="ml-4 h-8 w-8 text-emerald-400 group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-sm font-black text-zinc-300 uppercase tracking-widest">
              {toGreekUpperCase('Δεν έχετε λογαριασμό;')} {' '}
              <a href="/for-venues" className="text-emerald-600 hover:text-emerald-500 transition-colors ml-2 border-b-2 border-emerald-100">
                {toGreekUpperCase('Εγγραφή')}
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
