import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Διαχείριση Γηπέδου - Yabalitsa',
  description: 'Σύστημα διαχείρισης γηπέδου ποδοσφαίρου. Διαχειριστείτε κρατήσεις, πελάτες, γήπεδα και στατιστικά.',
  openGraph: {
    title: 'Διαχείριση Γηπέδου - Yabalitsa',
    description: 'Σύστημα διαχείρισης γηπέδου ποδοσφαίρου. Διαχείριση κρατήσεων, πελατών και στατιστικών.',
    images: ['/prev.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Διαχείριση Γηπέδου - Yabalitsa',
    description: 'Σύστημα διαχείρισης γηπέδου ποδοσφαίρου.',
    images: ['/prev.png'],
  },
};

export default function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
