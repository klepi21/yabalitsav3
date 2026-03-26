'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, AlertCircle, ArrowLeft, Pencil, User, Phone, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/lib/firebase-services';
import { User as UserType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toGreekUpperCase } from '@/lib/utils';

const customerSchema = z.object({
  name: z.string().min(1, 'Το όνομα είναι υποχρεωτικό'),
  email: z.string().email('Μη έγκυρη διεύθυνση email').optional().or(z.literal('')),
  phone: z.string().min(5, 'Μη έγκυρος αριθμός τηλεφώνου'),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function EditCustomerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [customer, setCustomer] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerId = params?.id as string;

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user || !venueOwner) {
      router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const loadCustomerData = async () => {
      if (!customerId) return;
      try {
        setIsLoading(true);
        const customerData = await userService.getById(customerId);
        if (!customerData) {
          setError('Ο πελάτης δεν βρέθηκε');
          return;
        }
        setCustomer(customerData);
        setValue('name', customerData.name);
        setValue('email', customerData.email || '');
        setValue('phone', customerData.phone);
      } catch (err) {
        console.error('Error loading customer data:', err);
        setError('Σφάλμα στη φόρτωση');
      } finally {
        setIsLoading(false);
      }
    };
    loadCustomerData();
  }, [user, venueOwner, authLoading, router, customerId, setValue, pathname]);

  const onSubmit = async (data: CustomerFormData) => {
    if (!customer) return;
    setIsSaving(true);
    setError(null);
    try {
      await userService.update(customer.id, {
        name: data.name,
        email: data.email || '',
        phone: data.phone,
        updatedAt: new Date(),
      });
      router.push(`/management/customers/${customer.id}`);
    } catch (e) {
      console.error(e);
      setError('Αποτυχία ενημέρωσης. Δοκιμάστε ξανά.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto h-12 w-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-zinc-400" />
        </div>
        <h3 className="text-lg font-black tracking-tight text-zinc-900">{error}</h3>
        <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
          <Link href="/management/customers">Επιστροφή στους Πελάτες</Link>
        </Button>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-6 sm:space-y-8 pb-20">
      {/* Navigation & Header */}
      <div className="space-y-5">
        <Link
          href={`/management/customers/${customer.id}`}
          className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-zinc-400 hover:text-emerald-600 transition-all group"
        >
          <div className="h-8 w-8 rounded-xl bg-white border border-zinc-100 flex items-center justify-center group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <span className="hidden sm:inline">Επιστροφή</span>
          <span className="sm:hidden">Πίσω</span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-blue-600 shadow-xl shadow-blue-200 flex items-center justify-center shrink-0">
            <Pencil className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 uppercase">
              {toGreekUpperCase('Επεξεργασία')}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-zinc-500 truncate">{customer.name}</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm font-bold text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      <Card className="rounded-2xl border-none shadow-sm">
        <CardContent className="p-5 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-0.5 flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Ονοματεπώνυμο *
              </Label>
              <Input
                type="text"
                id="name"
                {...register('name')}
                placeholder="π.χ. Γιάννης Παπαδόπουλος"
                className="h-11 sm:h-12 px-4 rounded-xl border-zinc-200 font-medium text-sm sm:text-base focus:ring-emerald-500"
              />
              {errors.name && (
                <p className="text-xs font-bold text-red-500 ml-1">{errors.name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-0.5 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                Τηλέφωνο *
              </Label>
              <Input
                type="tel"
                id="phone"
                {...register('phone')}
                placeholder="π.χ. 6970000000"
                className="h-11 sm:h-12 px-4 rounded-xl border-zinc-200 font-medium text-sm sm:text-base focus:ring-emerald-500"
              />
              {errors.phone && (
                <p className="text-xs font-bold text-red-500 ml-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-0.5 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                Email (προαιρετικό)
              </Label>
              <Input
                type="email"
                id="email"
                {...register('email')}
                placeholder="π.χ. email@example.com"
                className="h-11 sm:h-12 px-4 rounded-xl border-zinc-200 font-medium text-sm sm:text-base focus:ring-emerald-500"
              />
              {errors.email && (
                <p className="text-xs font-bold text-red-500 ml-1">{errors.email.message}</p>
              )}
            </div>

            {/* System Info */}
            <div className="rounded-xl bg-zinc-50 p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Πληροφορίες Συστήματος</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-bold text-zinc-500">
                <span>Δημιουργία: {new Date(customer.createdAt).toLocaleDateString('el-GR')}</span>
                <span>Ενημέρωση: {new Date(customer.updatedAt).toLocaleDateString('el-GR')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 sm:h-12 rounded-xl font-bold border-zinc-200 text-zinc-500 hover:text-zinc-700"
                onClick={() => router.push(`/management/customers/${customer.id}`)}
              >
                Ακύρωση
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-11 sm:h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
