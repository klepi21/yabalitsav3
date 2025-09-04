import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Νέος Πελάτης - Διαχείριση Γηπέδου',
  description: 'Προσθήκη νέου πελάτη στο σύστημα διαχείρισης γηπέδου. Εισαγωγή στοιχείων επικοινωνίας και προσωπικών πληροφοριών.',
  openGraph: {
    title: 'Νέος Πελάτης - Διαχείριση Γηπέδου',
    description: 'Προσθήκη νέου πελάτη στο σύστημα διαχείρισης γηπέδου.',
    images: ['/prev.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Νέος Πελάτης - Διαχείριση Γηπέδου',
    description: 'Προσθήκη νέου πελάτη στο σύστημα διαχείρισης γηπέδου.',
    images: ['/prev.png'],
  },
};

export default function NewCustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
