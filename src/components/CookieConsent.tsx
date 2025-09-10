'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie, Settings } from 'lucide-react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, can't be disabled
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    const consentTimestamp = localStorage.getItem('cookie-consent-timestamp');
    
    if (!consent || !consentTimestamp) {
      setShowBanner(true);
    } else {
      // Check if consent is older than 2 months (60 days)
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
      const savedTimestamp = new Date(consentTimestamp);
      
      if (savedTimestamp < twoMonthsAgo) {
        // Consent expired, show banner again
        setShowBanner(true);
        // Clear old consent data
        localStorage.removeItem('cookie-consent');
        localStorage.removeItem('cookie-consent-timestamp');
      } else {
        // Consent is still valid
        const savedPreferences = JSON.parse(consent);
        setPreferences(savedPreferences);
      }
    }
  }, []);

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    localStorage.setItem('cookie-consent', JSON.stringify(allAccepted));
    localStorage.setItem('cookie-consent-timestamp', new Date().toISOString());
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptSelected = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences));
    localStorage.setItem('cookie-consent-timestamp', new Date().toISOString());
    setShowBanner(false);
    setShowSettings(false);
  };

  const rejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    setPreferences(onlyNecessary);
    localStorage.setItem('cookie-consent', JSON.stringify(onlyNecessary));
    localStorage.setItem('cookie-consent-timestamp', new Date().toISOString());
    setShowBanner(false);
    setShowSettings(false);
  };

  const togglePreference = (key: keyof typeof preferences) => {
    if (key === 'necessary') return; // Can't disable necessary cookies
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* Mobile Layout */}
          <div className="block sm:hidden">
            <div className="flex items-start space-x-2 mb-3">
              <Cookie className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  🍪 Cookies
                </h3>
                <p className="text-gray-600 text-xs leading-relaxed">
                  Χρησιμοποιούμε cookies για να βελτιώσουμε την εμπειρία σας.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col space-y-2">
              <div className="flex space-x-2">
                <button
                  onClick={rejectAll}
                  className="flex-1 px-3 py-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Απόρριψη
                </button>
                <button
                  onClick={acceptAll}
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Αποδοχή
                </button>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center justify-center space-x-1 px-3 py-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-3 h-3" />
                <span>Ρυθμίσεις</span>
              </button>
            </div>
            
            <div className="mt-2 text-center">
              <a 
                href="/privacy" 
                className="text-emerald-600 hover:text-emerald-700 underline text-xs"
              >
                Πολιτική Απορρήτου
              </a>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:block">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <Cookie className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    🍪 Χρησιμοποιούμε Cookies
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Χρησιμοποιούμε cookies για να βελτιώσουμε την εμπειρία σας, να αναλύσουμε την επισκεψιμότητα 
                    και να παρέχουμε εξατομικευμένο περιεχόμενο. Μπορείτε να επιλέξετε ποια cookies να αποδεχτείτε.
                  </p>
                  <div className="mt-3 text-xs text-gray-500">
                    <a 
                      href="/privacy" 
                      className="text-emerald-600 hover:text-emerald-700 underline"
                    >
                      Διαβάστε περισσότερα στην Πολιτική Απορρήτου
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Ρυθμίσεις</span>
                </button>
                
                <button
                  onClick={rejectAll}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Απόρριψη Όλων
                </button>
                
                <button
                  onClick={acceptAll}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Αποδοχή Όλων
                </button>
              </div>
            </div>
          </div>

          {/* Cookie Settings */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-3">Ρυθμίσεις Cookies</h4>
                <div className="space-y-2 sm:space-y-3">
                  {/* Necessary Cookies */}
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 pr-2">
                      <h5 className="font-medium text-gray-900 text-sm sm:text-base">Απαραίτητα Cookies</h5>
                      <p className="text-xs sm:text-sm text-gray-600">Απαραίτητα για τη λειτουργία της πλατφόρμας</p>
                    </div>
                    <div className="flex items-center flex-shrink-0">
                      <div className="w-8 h-5 sm:w-10 sm:h-6 bg-emerald-600 rounded-full flex items-center justify-end px-1">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full"></div>
                      </div>
                      <span className="ml-1 sm:ml-2 text-xs sm:text-sm text-gray-500 hidden sm:inline">Πάντα ενεργά</span>
                    </div>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex-1 pr-2">
                      <h5 className="font-medium text-gray-900 text-sm sm:text-base">Αναλυτικά Cookies</h5>
                      <p className="text-xs sm:text-sm text-gray-600">Βοηθούν να κατανοήσουμε πώς χρησιμοποιείτε την πλατφόρμα</p>
                    </div>
                    <button
                      onClick={() => togglePreference('analytics')}
                      className={`w-8 h-5 sm:w-10 sm:h-6 rounded-full flex items-center transition-colors flex-shrink-0 ${
                        preferences.analytics ? 'bg-emerald-600 justify-end' : 'bg-gray-300 justify-start'
                      }`}
                    >
                      <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full mx-0.5 sm:mx-1"></div>
                    </button>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex-1 pr-2">
                      <h5 className="font-medium text-gray-900 text-sm sm:text-base">Marketing Cookies</h5>
                      <p className="text-xs sm:text-sm text-gray-600">Χρησιμοποιούνται για εξατομικευμένες διαφημίσεις</p>
                    </div>
                    <button
                      onClick={() => togglePreference('marketing')}
                      className={`w-8 h-5 sm:w-10 sm:h-6 rounded-full flex items-center transition-colors flex-shrink-0 ${
                        preferences.marketing ? 'bg-emerald-600 justify-end' : 'bg-gray-300 justify-start'
                      }`}
                    >
                      <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full mx-0.5 sm:mx-1"></div>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Ακύρωση
                  </button>
                  <button
                    onClick={acceptSelected}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Αποθήκευση Επιλογών
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

