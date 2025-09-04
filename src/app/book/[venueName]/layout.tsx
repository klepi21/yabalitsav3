import { Metadata } from 'next';

interface VenueLayoutProps {
  children: React.ReactNode;
  params: Promise<{ venueName: string }>;
}

export async function generateMetadata({ params }: VenueLayoutProps): Promise<Metadata> {
  const { venueName } = await params;
  const decodedVenueName = decodeURIComponent(venueName);
  
  return {
    title: `Κράτηση - ${decodedVenueName} | Yabalitsa`,
    description: `Κράτηση γηπέδου στο ${decodedVenueName}. Επιλέξτε ημερομηνία, ώρα και γήπεδο για την επόμενη κράτησή σας.`,
    openGraph: {
      title: `Κράτηση - ${decodedVenueName} | Yabalitsa`,
      description: `Κράτηση γηπέδου στο ${decodedVenueName}. Επιλέξτε ημερομηνία, ώρα και γήπεδο.`,
      images: ['/prev.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Κράτηση - ${decodedVenueName} | Yabalitsa`,
      description: `Κράτηση γηπέδου στο ${decodedVenueName}.`,
      images: ['/prev.png'],
    },
  };
}

export default function VenueBookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
