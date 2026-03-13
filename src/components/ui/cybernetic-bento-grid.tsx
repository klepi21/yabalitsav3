'use client';

import React, { useEffect, useRef } from 'react';

// Reusable BentoItem component
const BentoItem = ({ className = '', children }: { className?: string; children: React.ReactNode }) => {
    const itemRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const item = itemRef.current;
        if (!item) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = item.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            item.style.setProperty('--mouse-x', `${x}px`);
            item.style.setProperty('--mouse-y', `${y}px`);
        };

        item.addEventListener('mousemove', handleMouseMove);

        return () => {
            item.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div 
            ref={itemRef} 
            className={`bg-white border-2 border-gray-200 rounded-2xl p-6 relative overflow-hidden transition-all duration-300 cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/10 hover:border-gray-300 ${className}`}
        >
            {children}
        </div>
    );
};

// Main Component
export const CyberneticBentoGrid = () => {
    return (
        <div className="py-16 bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="w-full max-w-6xl mx-auto px-6">
                <h1 className="text-4xl sm:text-5xl font-bold text-black text-center mb-12">Πώς θα σας βοηθήσει το Yabalitsa Management</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <BentoItem className="lg:col-span-2 lg:row-span-2 flex flex-col justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-black">Οργάνωση Κρατήσεων</h2>
                            <p className="mt-2 text-gray-600">Οι περισσότεροι χρησιμοποιούν τετράδια. Το Yabalitsa οργανώνει όλες τις κρατήσεις σας σε ένα σύστημα που μειώνει τις ακυρώσεις κατά 87%.</p>
                        </div>
                        <div className="mt-4 h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                            📅 Ημερολόγιο Κρατήσεων
                        </div>
                    </BentoItem>
                    <BentoItem>
                        <h2 className="text-xl font-bold text-black">Ανάλυση Εσόδων</h2>
                        <p className="mt-2 text-gray-600 text-sm">Παρακολουθήστε τα έσοδά σας με αναλυτικά στοιχεία και αναφορές για καλύτερες αποφάσεις.</p>
                    </BentoItem>
                    <BentoItem>
                        <h2 className="text-xl font-bold text-black">Αυτοματοποιημένες Ειδοποιήσεις</h2>
                        <p className="mt-2 text-gray-600 text-sm">Στείλτε αυτόματα SMS και email στους πελάτες για επιβεβαίωση κρατήσεων και υπενθυμίσεις.</p>
                    </BentoItem>
                    <BentoItem className="lg:row-span-2">
                        <h2 className="text-xl font-bold text-black">Online Booking System</h2>
                        <p className="mt-2 text-gray-600 text-sm">Σελίδα με σύστημα online κρατήσεων που μειώνει τις ακυρώσεις κατά 87% για την επιχείρησή σας.</p>
                    </BentoItem>
                    <BentoItem className="lg:col-span-2">
                        <h2 className="text-xl font-bold text-black">Πλήρης Έλεγχος Γηπέδου</h2>
                        <p className="mt-2 text-gray-600 text-sm">Διαχειριστείτε όλες τις πτυχές του γηπέδου σας από ένα κεντρικό ταμπλό.</p>
                    </BentoItem>
                    <BentoItem>
                        <h2 className="text-xl font-bold text-black">Πρόσβαση στο FSE</h2>
                        <p className="mt-2 text-gray-600 text-sm">Το FSE είναι το Football Search Engine που βοηθά τους πελάτες να βρουν γήπεδα και να κάνουν κρατήσεις μέσω του Yabalitsa App.</p>
                    </BentoItem>
                </div>
            </div>
        </div>
    );
};
