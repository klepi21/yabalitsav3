'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/lib/firebase-services';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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

export default function EditCustomerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, venueOwner, isLoading: authLoading } = useAuth();

  const [customer, setCustomer] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const customerId = params?.id as string;

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  // Check authentication
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

        // Load customer data
        const customerData = await userService.getById(customerId);
        if (!customerData) {
          setError('Ο πελάτης δεν βρέθηκε');
          return;
        }
        setCustomer(customerData);

        // Set form values
        setValue('name', customerData.name);
        setValue('email', customerData.email || '');
        setValue('phone', customerData.phone);

      } catch (error) {
        console.error('Error loading customer data:', error);
        setError('Σφάλμα στη φόρτωση των δεδομένων του πελάτη');
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
    setSuccess(null);

    try {
      await userService.update(customer.id, {
        name: data.name,
        email: data.email || '',
        phone: data.phone,
        updatedAt: new Date(),
      });

      setSuccess('Ο πελάτης ενημερώθηκε επιτυχώς!');

      // Update local state
      setCustomer({
        ...customer,
        name: data.name,
        email: data.email || '',
        phone: data.phone,
        updatedAt: new Date(),
      });

      // Redirect back to customer details after brief delay
      setTimeout(() => router.push(`/management/customers/${customer.id}`), 1000);

    } catch (e) {
      console.error(e);
      setError('Αποτυχία ενημέρωσης πελάτη. Δοκιμάστε ξανά.');
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
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive text-lg mb-4">{error}</p>
        <Button variant="destructive" asChild>
          <Link href="/management/customers">Επιστροφή στους Πελάτες</Link>
        </Button>
      </div>
    );
  }

  if (!customer) {
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
            <BreadcrumbLink href={`/management/customers/${customer.id}`}>{customer.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Επεξεργασία</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h2 className="text-2xl font-semibold text-foreground">Επεξεργασία Πελάτη</h2>

      {/* Success Message */}
      {success && (
        <Alert>
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Edit Form */}
      <Card>
        <CardHeader />
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <Label htmlFor="name">Όνομα *</Label>
                <Input
                  type="text"
                  id="name"
                  {...register('name')}
                  className={`mt-1.5 ${errors.name ? 'border-destructive' : ''}`}
                  placeholder="Εισάγετε το όνομα"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone">Τηλέφωνο *</Label>
                <Input
                  type="tel"
                  id="phone"
                  {...register('phone')}
                  className={`mt-1.5 ${errors.phone ? 'border-destructive' : ''}`}
                  placeholder="Εισάγετε το τηλέφωνο"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  {...register('email')}
                  className={`mt-1.5 ${errors.email ? 'border-destructive' : ''}`}
                  placeholder="Εισάγετε το email (προαιρετικό)"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Read-only Info */}
            <div className="rounded-lg bg-muted p-4">
              <h3 className="text-sm font-medium text-foreground mb-3">Πληροφορίες Συστήματος</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ID Πελάτη:</span>
                  <span className="ml-2 font-mono text-foreground">{customer.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ημ/νία Δημιουργίας:</span>
                  <span className="ml-2 text-foreground">
                    {new Date(customer.createdAt).toLocaleDateString('el-GR')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Τελευταία Ενημέρωση:</span>
                  <span className="ml-2 text-foreground">
                    {new Date(customer.updatedAt).toLocaleDateString('el-GR')}
                  </span>
                </div>
                {customer.venueIds && customer.venueIds.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Γήπεδα:</span>
                    <span className="ml-2 text-foreground">{customer.venueIds.length}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href={`/management/customers/${customer.id}`}>
                  Ακύρωση
                </Link>
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ενημέρωση...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Αποθήκευση Αλλαγών
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
