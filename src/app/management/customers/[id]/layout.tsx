import { Metadata } from 'next';

interface CustomerLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CustomerLayoutProps): Promise<Metadata> {
  const { id } = await params;
  
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
