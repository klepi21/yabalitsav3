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
  const [error, setError] = useState<string | null>(null);
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
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] bg-[#0f172a] relative overflow-hidden flex-col justify-between p-12">
        <div>
          <Image
            src="/yabalitsalogo.png"
            alt="Yabalitsa"
            width={160}
            height={48}
            className="h-10 w-auto brightness-0 invert opacity-90"
          />
        </div>

        <div className="relative z-10">
          <h1 className="text-3xl font-semibold text-white leading-tight tracking-tight">
            Διαχειριστείτε τις<br />κρατήσεις σας εύκολα
          </h1>
          <p className="mt-4 text-slate-400 text-[15px] leading-relaxed max-w-sm">
            Η πλατφόρμα που απλοποιεί τη διαχείριση γηπέδων, κρατήσεων και πελατών σας.
          </p>
        </div>

        <p className="text-slate-600 text-xs">
          &copy; {new Date().getFullYear()} Yabalitsa
        </p>

        {/* Decorative gradient orbs */}
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-600/20 rounded-full blur-3xl" />
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl" />
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
