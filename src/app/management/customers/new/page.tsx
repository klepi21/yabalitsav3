'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/lib/firebase-services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Alert, AlertDescription } from '@/components/ui/alert';

const customerSchema = z.object({
  name: z.string().min(1, 'Το όνομα είναι υποχρεωτικό'),
  email: z.string().email('Μη έγκυρη διεύθυνση email').optional().or(z.literal('')),
  phone: z.string().min(5, 'Μη έγκυρος αριθμός τηλεφώνου'),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function NewCustomerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, venueOwner, isLoading: authLoading } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user || !venueOwner) router.push(`/venue-login?redirect=${encodeURIComponent(pathname)}`);
  }, [user, venueOwner, authLoading, router, pathname]);

  const onSubmit = async (data: CustomerFormData) => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await userService.create({
        name: data.name,
        email: data.email || '',
        phone: data.phone,
        venueIds: venueOwner?.venueId ? [venueOwner.venueId] : [],
      });
      setSuccess('Ο πελάτης δημιουργήθηκε επιτυχώς!');
      reset({ name: '', email: '', phone: '' });
      // Redirect back to customers list after brief delay
      setTimeout(() => router.push('/management/customers'), 800);
    } catch (e) {
      console.error(e);
      setError('Αποτυχία δημιουργίας πελάτη. Δοκιμάστε ξανά.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/management/dashboard">Πίνακας Ελέγχου</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/management/customers">Πελάτες</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Νέος Πελάτης</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h2 className="text-2xl font-semibold text-foreground">Νέος Πελάτης</h2>

      {success && (
        <Alert>
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader />
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="name">Όνομα</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Ονοματεπώνυμο"
                className="mt-1.5"
              />
              {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="email">Email (προαιρετικό)</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="email@domain.gr"
                  className="mt-1.5"
                />
                {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Τηλέφωνο</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="69XXXXXXXX"
                  className="mt-1.5"
                />
                {errors.phone && <p className="mt-1 text-sm text-destructive">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href="/management/customers">Ακύρωση</Link>
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isSaving ? 'Αποθήκευση...' : 'Δημιουργία Πελάτη'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
