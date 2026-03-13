import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Επεξεργασία Πελάτη - Διαχείριση Γηπέδου`,
    description: `Επεξεργασία πληροφοριών πελάτη. Ενημέρωση στοιχείων επικοινωνίας, ονόματος και άλλων λεπτομερειών.`,
    openGraph: {
      title: `Επεξεργασία Πελάτη - Διαχείριση Γηπέδου`,
      description: `Επεξεργασία πληροφοριών πελάτη. Ενημέρωση στοιχείων επικοινωνίας και ονόματος.`,
      images: ['/prev.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Επεξεργασία Πελάτη - Διαχείριση Γηπέδου`,
      description: `Επεξεργασία πληροφοριών πελάτη.`,
      images: ['/prev.png'],
    },
  };
}

export default function CustomerEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
