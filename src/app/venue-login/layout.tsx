import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Σύνδεση Γηπέδου - Yabalitsa',
  description: 'Συνδεθείτε στο σύστημα διαχείρισης του γηπέδου σας. Διαχειριστείτε κρατήσεις, πελάτες και στατιστικά.',
  openGraph: {
    title: 'Σύνδεση Γηπέδου - Yabalitsa',
    description: 'Συνδεθείτε στο σύστημα διαχείρισης του γηπέδου σας.',
    images: ['/prev.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Σύνδεση Γηπέδου - Yabalitsa',
    description: 'Συνδεθείτε στο σύστημα διαχείρισης του γηπέδου σας.',
    images: ['/prev.png'],
  },
};

export default function VenueLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
