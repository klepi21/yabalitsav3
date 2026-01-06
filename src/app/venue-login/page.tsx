'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/lib/firebase-services';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

const loginSchema = z.object({
  email: z.string().email('Μη έγκυρη διεύθυνση email'),
  password: z.string().min(6, 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function VenueLoginPage() {
  const router = useRouter();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Check if user is already logged in
  useEffect(() => {
    if (authLoading) return;
    
    if (user && venueOwner) {
      // Always redirect to their dashboard (no venueId needed)
      router.push('/management/dashboard');
    }
  }, [user, venueOwner, authLoading, router]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-football-green"></div>
      </div>
    );
  }

  const handleFormSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Sign in with Firebase Auth
      await authService.signIn(data.email, data.password);
      
      // The auth context will handle the redirect automatically
      // No need to manually redirect here
    } catch (err) {
      console.error('Login error:', err);
      setError('Μη έγκυρο email ή κωδικός');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Section - Login Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center px-8 lg:px-12 xl:px-16 relative z-30">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Image
                src="/yabalitsalogo.png"
                alt="Yabalitsa Logo"
                width={120}
                height={120}
                className="w-auto h-auto"
              />
            </div>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Συνδεθείτε στον λογαριασμό σας
              </h2>
              <p className="text-sm text-gray-600">
                Εισάγετε τη διεύθυνση email και τον κωδικό πρόσβασής σας για να συνδεθείτε
              </p>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Διεύθυνση Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    {...register('email')}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-football-green focus:border-football-green transition-all duration-200"
                    placeholder="Email Address"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Κωδικός Πρόσβασης
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    {...register('password')}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-football-green focus:border-football-green transition-all duration-200"
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-football-green hover:bg-football-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-football-green disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? 'Σύνδεση...' : 'Σύνδεση'}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Δεν έχετε λογαριασμό;{' '}
                <a href="/for-venues" className="font-medium text-football-green hover:text-football-green-light">
                  Εγγραφή
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Dashboard Image */}
      <div className="hidden lg:flex lg:w-3/5 bg-football-green flex-col relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 z-0">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpolygon points='30 0 60 30 30 60 0 30'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Content - Same Row as Logo */}
        <div className="relative z-20 flex flex-col items-center justify-center text-center text-white px-12 pt-16 pb-8">
          <div className="max-w-lg">
            <h2 className="text-4xl font-bold mb-4">
              Διαχειριστείτε το γήπεδό σας με επαγγελματικότητα
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Ενισχύστε την επιχείρησή σας με το πιο προηγμένο σύστημα διαχείρισης γηπέδων
            </p>
          </div>
        </div>

        {/* Dashboard Image - Smaller and More Zoomed In */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-16">
          <div className="w-3/4 h-3/4">
            <Image
              src="/dash.png"
              alt="Yabalitsa Dashboard"
              width={800}
              height={600}
              className="w-full h-full object-cover rounded-3xl shadow-2xl"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
