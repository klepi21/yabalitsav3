'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { pricingConfig, pricingUtils } from '@/lib/pricing';

export default function SubscriptionRenewalPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<1 | 6 | 12>(1);
  const [venueData, setVenueData] = useState<any>(null);
  const [currentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Get pricing configuration
  const plans = pricingUtils.getAllPlans();

  const durations = [
    { months: 1 as const, label: '1 Μήνας', discount: pricingUtils.getDiscountPercentage(1) },
    { months: 6 as const, label: '6 Μήνες', discount: pricingUtils.getDiscountPercentage(6) },
    { months: 12 as const, label: '12 Μήνες', discount: pricingUtils.getDiscountPercentage(12) }
  ];

  // Fetch venue data for current subscription info
  useEffect(() => {
    const fetchVenueData = async () => {
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const { getAuth } = await import('firebase/auth');
        
        const auth = getAuth();
        if (auth.currentUser?.uid) {
          const venuesRef = collection(db, 'yabalitsa_venues');
          const q = query(venuesRef, where('ownerId', '==', auth.currentUser.uid));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const venueDoc = querySnapshot.docs[0];
            setVenueData({ id: venueDoc.id, ...venueDoc.data() });
          }
        }
      } catch (error) {
        console.error('Error fetching venue data:', error);
      }
    };
    
    fetchVenueData();
  }, []);

  // Calculate subscription end date
  const calculateSubscriptionEndDate = () => {
    if (!selectedPlan || !venueData) return null;
    
    const baseDate = new Date(currentDate);
    const remainingDays = venueData.daysRemaining || 0;
    
    // Add remaining days to current date
    baseDate.setDate(baseDate.getDate() + remainingDays);
    
    // Add selected duration months
    baseDate.setMonth(baseDate.getMonth() + Number(selectedDuration));
    
    return baseDate;
  };

  // Format date in Greek
  const formatGreekDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return date.toLocaleDateString('el-GR', options);
  };

  // Handle payment
  const handlePayment = async () => {
    if (!selectedPlan || !venueData) return;

    setIsLoading(true);
    try {
      const selectedPlanData = plans.find(p => p.id === selectedPlan);
      if (!selectedPlanData) return;

      // Get current user UID
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      
      if (!auth.currentUser?.uid) {
        alert('Παρακαλώ συνδεθείτε πρώτα');
        return;
      }

      // Create payment intent
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan,
          planName: selectedPlanData.name,
          duration: selectedDuration,
          basePrice: selectedPlanData.basePrice,
          userUid: auth.currentUser.uid,
          amount: pricingUtils.getStripeAmount(selectedPlanData.basePrice, selectedDuration), // Amount in cents
        }),
      });

      const { clientSecret, error } = await response.json();

      if (error) {
        alert('Σφάλμα: ' + error);
        return;
      }

      // Redirect to Stripe Checkout or handle with Stripe Elements
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      
      if (!stripe) {
        alert('Σφάλμα φόρτωσης Stripe');
        return;
      }

      // For now, we'll use a simple redirect approach
      // You can implement Stripe Elements for a more integrated experience
      window.location.href = `/payment/checkout?payment_intent=${clientSecret}`;

    } catch (error) {
      console.error('Payment error:', error);
      alert('Υπήρξε σφάλμα με την πληρωμή. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/management/settings"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Επιστροφή στις Ρυθμίσεις
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Ανανέωση Συνδρομής</h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Current Subscription Info */}
          {venueData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Τρέχουσα Συνδρομή</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {venueData.daysRemaining || 0}
                  </div>
                  <div className="text-sm text-gray-600">ημέρες που απομένουν</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900 mb-1">
                    {venueData.plan === 'subscription' ? 'Συνδρομή' : 'Δωρεάν Trial'}
                  </div>
                  <div className="text-sm text-gray-600">τρέχον πλάνο</div>
                </div>
              </div>
              
              {/* Trial Info Message */}
              {(!venueData.plan || venueData.plan !== 'subscription') && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800 text-center">
                    🎉 Είσαι στο <strong>δωρεάν trial</strong>! Μετά τις {venueData.daysRemaining || 0} ημέρες θα χρειαστεί να επιλέξεις πλάνο συνδρομής για να συνεχίσεις να χρησιμοποιείς την πλατφόρμα.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Plan Selection - Horizontal Layout */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Επιλέξτε το Πλάνο Σας</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                    selectedPlan === plan.id
                      ? 'border-green-500 bg-green-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        ΠΟΛΥ ΣΥΝΗΘΙΣΜΕΝΟ
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                    
                    {/* Price Section */}
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        €{plan.basePrice}
                        <span className="text-lg font-normal text-gray-500">/μήνα</span>
                      </div>
                      <div className="text-sm text-gray-600">+ΦΠΑ (24%)</div>
                    </div>
                    
                    {/* Features */}
                    <ul className="space-y-2 text-sm text-gray-600">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center justify-center">
                          <span className="text-green-500 mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Duration Selection & Payment Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Duration Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Διάρκεια Συνδρομής</h3>
              
              <div className="space-y-3">
                {durations.map((duration) => (
                  <div
                    key={duration.months}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                      selectedDuration === duration.months
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedDuration(duration.months)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 text-lg">{duration.label}</div>
                        {duration.discount > 0 && (
                          <div className="text-sm text-green-600 font-medium">
                            🎉 Έκπτωση {duration.discount}%
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {pricingUtils.formatPrice(pricingUtils.calculateMonthlyPrice(selectedPlan ? plans.find(p => p.id === selectedPlan)?.basePrice || 0 : 0, duration.months))}
                          <span className="text-sm font-normal text-gray-500">/μήνα</span>
                        </div>
                        <div className="text-xs text-gray-500">με ΦΠΑ</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            {selectedPlan && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Σύνοψη Πληρωμής</h3>
                
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Πλάνο:</span>
                    <span className="font-semibold text-gray-900">
                      {plans.find(p => p.id === selectedPlan)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Διάρκεια:</span>
                    <span className="font-semibold text-gray-900">
                      {durations.find(d => d.months === selectedDuration)?.label}
                    </span>
                  </div>
                  
                  {/* Subscription End Date */}
                  {calculateSubscriptionEndDate() && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Η συνδρομή θα ισχύει μέχρι:</span>
                      <span className="font-semibold text-green-700">
                        {formatGreekDate(calculateSubscriptionEndDate()!)}
                      </span>
                    </div>
                  )}
                  
                  {/* Price Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Βασική τιμή:</span>
                      <span className="text-gray-900">
                        €{plans.find(p => p.id === selectedPlan)?.basePrice}
                        <span className="text-gray-500"> × {selectedDuration} μήνες</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ΦΠΑ (24%):</span>
                      <span className="text-gray-900">
                        €{((plans.find(p => p.id === selectedPlan)?.basePrice || 0) * selectedDuration * 0.24).toFixed(2)}
                      </span>
                    </div>
                    {selectedDuration > 1 && (
                      <div className="flex justify-between text-green-600 font-medium">
                        <span>🎉 Έκπτωση:</span>
                        <span>
                          €{((plans.find(p => p.id === selectedPlan)?.basePrice || 0) * selectedDuration * (selectedDuration === 6 ? 0.10 : 0.20)).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                      <span>Σύνολο:</span>
                      <span>
                        {pricingUtils.formatPrice(pricingUtils.calculateTotalPrice(plans.find(p => p.id === selectedPlan)?.basePrice || 0, selectedDuration))}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-1">με ΦΠΑ</div>
                  </div>
                </div>

                {/* Payment Button */}
                <button
                  onClick={handlePayment}
                  disabled={!selectedPlan || isLoading}
                  className="w-full mt-6 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {isLoading ? '⏳ Επεξεργασία...' : '💳 Πληρωμή με Κάρτα'}
                </button>
                
                <p className="text-xs text-gray-500 text-center mt-2">
                  Ασφαλής πληρωμή μέσω Stripe
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
