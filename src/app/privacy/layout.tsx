import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Πολιτική Απορρήτου - Yabalitsa',
  description: 'Πολιτική απορρήτου και προστασίας προσωπικών δεδομένων. Μάθετε πώς το Yabalitsa προστατεύει τις πληροφορίες σας.',
  openGraph: {
    title: 'Πολιτική Απορρήτου - Yabalitsa',
    description: 'Πολιτική απορρήτου και προστασίας προσωπικών δεδομένων.',
    images: ['/prev.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Πολιτική Απορρήτου - Yabalitsa',
    description: 'Πολιτική απορρήτου και προστασίας προσωπικών δεδομένων.',
    images: ['/prev.png'],
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
