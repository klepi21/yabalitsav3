import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

import ConditionalWrapper from '@/components/ConditionalWrapper';
import CookieConsent from '@/components/CookieConsent';

const inter = Inter({ subsets: ['latin', 'greek'] });

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
        url: '/ogpreview.png',
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
    images: ['/ogpreview.png'],
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
    icon: [
      { url: '/fav.png', sizes: '32x32', type: 'image/png' },
      { url: '/fav.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/fav.png',
    apple: '/fav.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el" className="scroll-smooth">
      <head>
        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/fav.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/fav.png" />
        <link rel="shortcut icon" href="/fav.png" />
        <link rel="apple-touch-icon" href="/fav.png" />
        
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <ConditionalWrapper>
          {children}
        </ConditionalWrapper>
        <CookieConsent />
        <GoogleAnalytics gaId="G-GWX4K2ZM6J" />
      </body>
    </html>
  );
}
