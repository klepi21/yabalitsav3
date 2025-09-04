import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Κράτηση Γηπέδου - Yabalitsa',
  description: 'Κράτηση γηπέδου ποδοσφαίρου online. Επιλέξτε ημερομηνία, ώρα και γήπεδο για την επόμενη κράτησή σας.',
  openGraph: {
    title: 'Κράτηση Γηπέδου - Yabalitsa',
    description: 'Κράτηση γηπέδου ποδοσφαίρου online. Επιλέξτε ημερομηνία, ώρα και γήπεδο.',
    images: ['/prev.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Κράτηση Γηπέδου - Yabalitsa',
    description: 'Κράτηση γηπέδου ποδοσφαίρου online.',
    images: ['/prev.png'],
  },
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
