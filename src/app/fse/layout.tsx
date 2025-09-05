import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FSE - Yabalitsa',
  description: 'Βρες και κλείσε γήπεδο ποδοσφαίρου με την προηγμένη μηχανή αναζήτησης FSE',
};

export default function FSELayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
