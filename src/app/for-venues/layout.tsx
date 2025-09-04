import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Για Γήπεδα - Yabalitsa',
  description: 'Μάθετε πώς το Yabalitsa μπορεί να βοηθήσει το γήπεδό σας να αυτοματοποιήσει τις κρατήσεις και να αυξήσει τα έσοδα.',
  openGraph: {
    title: 'Για Γήπεδα - Yabalitsa',
    description: 'Μάθετε πώς το Yabalitsa μπορεί να βοηθήσει το γήπεδό σας να αυτοματοποιήσει τις κρατήσεις και να αυξήσει τα έσοδα.',
    images: ['/prev.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Για Γήπεδα - Yabalitsa',
    description: 'Μάθετε πώς το Yabalitsa μπορεί να βοηθήσει το γήπεδό σας να αυτοματοποιήσει τις κρατήσεις και να αυξήσει τα έσοδα.',
    images: ['/prev.png'],
  },
};

export default function ForVenuesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
