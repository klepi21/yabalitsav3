import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Κρατήσεις - Διαχείριση Γηπέδου',
  description: 'Διαχείριση κρατήσεων γηπέδου. Προβολή, επιβεβαίωση και ακύρωση κρατήσεων. Φιλτράρισμα κατά ημερομηνία, γήπεδο και κατάσταση.',
  openGraph: {
    title: 'Κρατήσεις - Διαχείριση Γηπέδου',
    description: 'Διαχείριση κρατήσεων γηπέδου. Προβολή, επιβεβαίωση και ακύρωση κρατήσεων.',
    images: ['/prev.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Κρατήσεις - Διαχείριση Γηπέδου',
    description: 'Διαχείριση κρατήσεων γηπέδου.',
    images: ['/prev.png'],
  },
};

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
