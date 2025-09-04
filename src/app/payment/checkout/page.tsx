'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setMessage('Stripe δεν έχει φορτωθεί ακόμα');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setMessage('Σφάλμα με την κάρτα');
      return;
    }

    if (!cardComplete) {
      setMessage('Παρακαλώ συμπληρώστε όλα τα στοιχεία της κάρτας');
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      console.log('🔄 Confirming payment with client secret:', clientSecret);
      
      // Confirm the payment using the card element
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (error) {
        console.error('❌ Payment error:', error);
        setMessage(error.message || 'Παρουσιάστηκε σφάλμα κατά την πληρωμή');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('✅ Payment succeeded:', paymentIntent.id);
        
        // Call our finalize endpoint
        const response = await fetch('/api/stripe/finalize-one-time-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Redirect to success page
          router.push('/management/settings/renewal/success');
        } else {
          setMessage(result.error || 'Σφάλμα κατά την ενεργοποίηση του πλάνου');
        }
      } else {
        setMessage('Η πληρωμή δεν ολοκληρώθηκε επιτυχώς');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setMessage('Παρουσιάστηκε σφάλμα κατά την πληρωμή');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Πληρωμή με Κάρτα</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Στοιχεία Κάρτας
            </label>
            <div className="p-3 border border-gray-300 rounded-md">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                    invalid: {
                      color: '#9e2146',
                    },
                  },
                }}
                onChange={(event) => {
                  setCardComplete(event.complete);
                  if (event.error) {
                    setMessage(event.error.message);
                  } else {
                    setMessage(null);
                  }
                }}
              />
            </div>
          </div>
          
          {message && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{message}</p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!stripe || !elements || isProcessing || !cardComplete}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            isProcessing || !stripe || !elements || !cardComplete
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isProcessing ? 'Επεξεργασία...' : 'Πληρωμή με Κάρτα'}
        </button>
      </form>
    </div>
  );
}

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const paymentIntentParam = searchParams.get('payment_intent');
    
    if (!paymentIntentParam) {
      router.push('/management/settings/renewal');
      return;
    }

    // Extract client secret from the parameter
    // The parameter should be in format: pi_xxxxx_secret_xxxxx
    if (paymentIntentParam.includes('_secret_')) {
      setClientSecret(paymentIntentParam);
    } else {
      console.error('Invalid payment intent format');
      router.push('/management/settings/renewal');
      return;
    }

    setLoading(false);
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Σφάλμα: Δεν βρέθηκε έγκυρο payment intent</p>
          <button 
            onClick={() => router.push('/management/settings/renewal')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Επιστροφή
          </button>
        </div>
      </div>
    );
  }

  const options = {
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Πληρωμή Πλάνου</h1>
            <p className="text-gray-600 mt-2">Ολοκληρώστε την πληρωμή για να ενεργοποιήσετε το πλάνο σας</p>
          </div>

          <Elements options={options} stripe={stripePromise}>
            <CheckoutForm clientSecret={clientSecret} />
          </Elements>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Φόρτωση πληρωμής...</p>
        </div>
      </div>
    }>
      <CheckoutPageContent />
    </Suspense>
  );
}
