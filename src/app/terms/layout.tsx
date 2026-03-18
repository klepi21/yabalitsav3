import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Όροι Χρήσης - Yabalitsa',
  description: 'Όροι χρήσης και προϋποθέσεις για τη χρήση της πλατφόρμας Yabalitsa. Διαβάστε τους κανόνες και τις υποχρεώσεις σας.',
  openGraph: {
    title: 'Όροι Χρήσης - Yabalitsa',
    description: 'Όροι χρήσης και προϋποθέσεις για  τη χρήση της πλατφόρμας Yabalitsa.',
    images: ['/prev.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Όροι Χρήσης - Yabalitsa',
    description: 'Όροι χρήσης και προϋποθέσεις για τη χρήση της πλατφόρμας Yabalitsa .',
    images: ['/prev.png'],
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
