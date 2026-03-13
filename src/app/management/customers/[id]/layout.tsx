import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Πελάτης - Διαχείριση Γηπέδου`,
    description: `Προβολή λεπτομερειών πελάτη. Ιστορικό κρατήσεων, πληροφορίες επικοινωνίας και διαχείριση στοιχείων.`,
    openGraph: {
      title: `Πελάτης - Διαχείριση Γηπέδου`,
      description: `Προβολή λεπτομερειών πελάτη. Ιστορικό κρατήσεων και πληροφορίες επικοινωνίας.`,
      images: ['/prev.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Πελάτης - Διαχείριση Γηπέδου`,
      description: `Προβολή λεπτομερειών πελάτη.`,
      images: ['/prev.png'],
    },
  };
}

export default function CustomerDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
