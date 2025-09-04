import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Πελάτες - Διαχείριση Γηπέδου',
  description: 'Διαχείριση πελατών του γηπέδου σας. Προβολή, επεξεργασία και προσθήκη νέων πελατών. Ιστορικό κρατήσεων και επικοινωνίας.',
  openGraph: {
    title: 'Πελάτες - Διαχείριση Γηπέδου',
    description: 'Διαχείριση πελατών του γηπέδου σας. Προβολή, επεξεργασία και προσθήκη νέων πελατών.',
    images: ['/prev.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Πελάτες - Διαχείριση Γηπέδου',
    description: 'Διαχείριση πελατών του γηπέδου σας.',
    images: ['/prev.png'],
  },
};

export default function CustomersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
