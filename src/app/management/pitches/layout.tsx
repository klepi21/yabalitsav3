import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Γήπεδα - Διαχείριση Γηπέδου',
  description: 'Διαχείριση γηπέδων και διαθεσιμότητας. Προσθήκη, επεξεργασία και διαγραφή γηπέδων. Διαχείριση ωρών λειτουργίας και τιμών.',
  openGraph: {
    title: 'Γήπεδα - Διαχείριση Γηπέδου',
    description: 'Διαχείριση γηπέδων και διαθεσιμότητας. Προσθήκη, επεξεργασία και διαγραφή γηπέδων.',
    images: ['/prev.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Γήπεδα - Διαχείριση Γηπέδου',
    description: 'Διαχείριση γηπέδων και διαθεσιμότητας.',
    images: ['/prev.png'],
  },
};

export default function PitchesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
