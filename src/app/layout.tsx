import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { AuthProvider } from '@/contexts/AuthContext';
import SidebarWrapper from '@/components/SidebarWrapper';
import ConditionalWrapper from '@/components/ConditionalWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Yabalitsa - Βρες και Κλείσε Γήπεδο Ποδοσφαίρου',
    template: '%s | Yabalitsa'
  },
  description: 'Βρες και κλείσε γήπεδο ποδοσφαίρου στην Ελλάδα. Εύκολη κράτηση γηπέδων 5x5, 6x6, 7x7, 8x8. Διαχείριση γηπέδων για ιδιοκτήτες.',
  keywords: [
    'γήπεδο ποδοσφαίρου',
    'κράτηση γηπέδου',
    '5x5',
    '6x6', 
    '7x7',
    '8x8',
    'ποδόσφαιρο',
    'γήπεδα Αθήνα',
    'γήπεδα Θεσσαλονίκη',
    'διαχείριση γηπέδων',
    'booking γηπέδου',
    'football pitch',
    'soccer field'
  ],
  authors: [{ name: 'Yabalitsa Team' }],
  creator: 'Yabalitsa',
  publisher: 'Yabalitsa',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://yabalitsa.com'),
  alternates: {
    canonical: '/',
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  openGraph: {
    type: 'website',
    locale: 'el_GR',
    url: 'https://yabalitsa.com',
    siteName: 'Yabalitsa',
    title: 'Yabalitsa - Βρες και Κλείσε Γήπεδο Ποδοσφαίρου',
    description: 'Βρες και κλείσε γήπεδο ποδοσφαίρου στην Ελλάδα. Εύκολη κράτηση γηπέδων 5x5, 6x6, 7x7, 8x8.',
    images: [
      {
        url: '/prev.png',
        width: 1200,
        height: 630,
        alt: 'Yabalitsa - Γήπεδα Ποδοσφαίρου',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yabalitsa - Βρες και Κλείσε Γήπεδο Ποδοσφαίρου',
    description: 'Βρες και κλείσε γήπεδο ποδοσφαίρου στην Ελλάδα. Εύκολη κράτηση γηπέδων.',
    images: ['/prev.png'],
    creator: '@yabalitsa',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics 4 */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-GWX4K2ZM6J"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-GWX4K2ZM6J', {
                page_title: document.title,
                page_location: window.location.href,
              });
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <ConditionalWrapper>
          {children}
        </ConditionalWrapper>
      </body>
    </html>
  );
}
