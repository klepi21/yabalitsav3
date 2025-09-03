'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'succeeded' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setPaymentStatus('processing');
    setErrorMessage('');

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setErrorMessage('Σφάλμα φόρτωσης στοιχείων κάρτας');
      setIsLoading(false);
      setPaymentStatus('failed');
      return;
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (error) {
        setErrorMessage(error.message || 'Η πληρωμή απέτυχε');
        setPaymentStatus('failed');
      } else if (paymentIntent.status === 'succeeded') {
        setPaymentStatus('succeeded');

        // Finalize on server to ensure subscription creation (backup to webhook)
        try {
          await fetch('/api/stripe/finalize-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
          });
        } catch (finalizeErr) {
          console.error('Finalize payment call failed:', finalizeErr);
        }

        // Redirect to success page after a short delay
        setTimeout(() => {
          router.push('/management/settings/renewal/success');
        }, 2000);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMessage('Υπήρξε ένα απροσδόκητο σφάλμα');
      setPaymentStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (paymentStatus === 'succeeded') {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-green-700 mb-2">Η πληρωμή ολοκληρώθηκε!</h2>
        <p className="text-gray-600">Η συνδρομή σας ενεργοποιήθηκε επιτυχώς.</p>
        <p className="text-sm text-gray-500 mt-2">Θα μεταφερθείτε αυτόματα...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Στοιχεία Κάρτας
        </label>
        <div className="bg-white border border-gray-300 rounded-md p-3">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#374151',
                  '::placeholder': {
                    color: '#9CA3AF',
                  },
                },
                invalid: {
                  color: '#EF4444',
                },
              },
            }}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-800">
            <strong>Σφάλμα:</strong> {errorMessage}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isLoading || paymentStatus === 'processing'}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {paymentStatus === 'processing' ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Επεξεργασία πληρωμής...
          </>
        ) : (
          'Ολοκλήρωση Πληρωμής'
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Ασφαλής πληρωμή μέσω Stripe. Τα στοιχεία της κάρτας σας κρυπτογραφούνται και δεν αποθηκεύονται.
      </p>
    </form>
  );
}

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string>('');

  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');
    if (paymentIntent) {
      setClientSecret(paymentIntent);
    } else {
      // If no payment intent, redirect back
      router.push('/management/settings/renewal');
    }
  }, [searchParams, router]);

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <svg className="animate-spin mx-auto h-8 w-8 text-gray-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Φόρτωση στοιχείων πληρωμής...</p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm clientSecret={clientSecret} />
    </Elements>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/management/settings/renewal"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Πίσω
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Πληρωμή</h1>
          <div className="w-12"></div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-64">
              <div className="text-center">
                <svg className="animate-spin mx-auto h-8 w-8 text-gray-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Φόρτωση...</p>
              </div>
            </div>
          }>
            <CheckoutPageContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}