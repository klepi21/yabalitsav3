'use client'
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { InView } from 'react-intersection-observer';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Mode = 'light' | 'dark';

interface Props {
  mode: Mode;
}

export const WaitlistComponent = ({ mode }: Props) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email.trim() === '' || !email.includes('@')) {
      setError('Παρακαλώ εισάγετε ένα έγκυρο email');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Save email to Firebase waitlist collection
      await addDoc(collection(db, 'yabalitsa-waitlist'), {
        email: email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
        source: 'app-waitlist'
      });

      setSubmitted(true);
      setEmail('');
    } catch (err) {
      console.error('Error saving to waitlist:', err);
      setError('Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailValid = email.trim() !== '' && email.includes('@');

  return (
    <div className="flex justify-center items-center py-4">
      <InView triggerOnce threshold={0.5}>
        {({ inView, ref }) => (
          <div ref={ref} className={`${mode === 'dark' ? 'bg-black/60 border border-zinc-600' : 'bg-white/60'} w-full max-w-sm mx-auto rounded-lg ${submitted ? 'p-2' : 'p-4'} z-50 backdrop-blur-sm`}>
            {!submitted ? (
              <div>
                <div className="text-center mb-3">
                  <motion.h3
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : -10 }}
                    transition={{ duration: 0.3 }}
                    className={`${mode === 'dark' ? 'text-white' : 'text-gray-800'} text-lg font-semibold mb-2 font-sans lowercase`}
                  >
                    Μπες στη λίστα αναμονής
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: inView ? 1 : 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className={`${mode === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs mb-3 font-sans lowercase`}
                  >
                    Βρες παιχνίδια ποδοσφαίρου κοντά σου!
                  </motion.p>
                </div>
                <motion.form
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 10 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="flex items-center justify-center"
                  onSubmit={handleSubmit}
                >
                  <input
                    type="email"
                    placeholder="Email"
                    className="flex-1 w-full bg-white appearance-none rounded-l-lg py-1.5 px-3 text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline border border-gray-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                  <motion.button
                    type="submit"
                    disabled={!isEmailValid || isLoading}
                    className={`bg-black text-white py-1.5 px-4 rounded-r-lg focus:outline-none text-sm ${isEmailValid && !isLoading ? 'cursor-pointer hover:bg-opacity-90' : 'cursor-not-allowed opacity-50'}`}
                  >
                    {isLoading ? '...' : 'Εγγραφή'}
                  </motion.button>
                </motion.form>
                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-600 text-xs mt-1 text-center"
                  >
                    {error}
                  </motion.p>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 10 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-center"
              >
                <motion.h3
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`${mode === 'dark' ? 'text-white' : 'text-gray-800'} text-lg font-semibold mb-2 font-sans lowercase`}
                >
                  Είσαι στη λίστα!
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className={`${mode === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs font-sans lowercase`}
                >
                  Θα σε ενημερώσουμε!
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="mt-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={`${mode === 'dark' ? 'text-gray-300' : 'text-slate-800'} w-6 h-6 mx-auto`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </motion.div>
              </motion.div>
            )}
          </div>
        )}
      </InView>
    </div>
  );
};
