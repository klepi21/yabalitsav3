import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ρυθμίσεις - Διαχείριση Γηπέδου',
  description: 'Ρυθμίσεις για το γήπεδό σας: στοιχεία γηπέδου, επικοινωνία και PIN διαχείρισης.',
  openGraph: {
    title: 'Ρυθμίσεις - Διαχείριση Γηπέδου',
    description: 'Ρυθμίσεις για το γήπεδό σας: στοιχεία γηπέδου και επικοινωνία.',
    images: ['/prev.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ρυθμίσεις - Διαχείριση Γηπέδου',
    description: 'Ρυθμίσεις και παραμέτρους για το γήπεδό σας.',
    images: ['/prev.png'],
  },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
