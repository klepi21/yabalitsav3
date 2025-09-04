import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Αναφορές - Διαχείριση Γηπέδου',
  description: 'Αναφορές και στατιστικά για το γήπεδό σας. Ανάλυση κρατήσεων, έσοδων, δημοτικότητας γηπέδων και απόδοσης επιχείρησης.',
  openGraph: {
    title: 'Αναφορές - Διαχείριση Γηπέδου',
    description: 'Αναφορές και στατιστικά για το γήπεδό σας. Ανάλυση κρατήσεων, έσοδων και απόδοσης.',
    images: ['/prev.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Αναφορές - Διαχείριση Γηπέδου',
    description: 'Αναφορές και στατιστικά για το γήπεδό σας.',
    images: ['/prev.png'],
  },
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
