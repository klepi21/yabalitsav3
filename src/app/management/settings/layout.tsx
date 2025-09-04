import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ρυθμίσεις - Διαχείριση Γηπέδου',
  description: 'Ρυθμίσεις και παραμέτρους για το γήπεδό σας. Διαχείριση συνδρομής, πληροφοριών γηπέδου και προσωπικών στοιχείων.',
  openGraph: {
    title: 'Ρυθμίσεις - Διαχείριση Γηπέδου',
    description: 'Ρυθμίσεις και παραμέτρους για το γήπεδό σας. Διαχείριση συνδρομής και πληροφοριών.',
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
