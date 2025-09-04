import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Πίνακας Ελέγχου - Διαχείριση Γηπέδου',
  description: 'Πίνακας ελέγχου για τη διαχείριση του γηπέδου σας. Προβολή κρατήσεων, στατιστικών και γενικής απόδοσης.',
  openGraph: {
    title: 'Πίνακας Ελέγχου - Διαχείριση Γηπέδου',
    description: 'Πίνακας ελέγχου για τη διαχείριση του γηπέδου σας. Προβολή κρατήσεων, στατιστικών και γενικής απόδοσης.',
    images: ['/prev.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Πίνακας Ελέγχου - Διαχείριση Γηπέδου',
    description: 'Πίνακας ελέγχου για τη διαχείριση του γηπέδου σας.',
    images: ['/prev.png'],
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
