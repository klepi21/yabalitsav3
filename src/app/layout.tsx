import type { Metadata } from 'next';
import { Roboto_Flex } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

import ConditionalWrapper from '@/components/ConditionalWrapper';
import CookieConsent from '@/components/CookieConsent';

const roboto = Roboto_Flex({ 
  subsets: ['latin', 'greek'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Yabalitsa | Λογισμικό Διαχείρισης Γηπέδων 5x5 & Ακαδημιών',
    template: '%s | Yabalitsa'
  },
  description: 'Η Νο.1 πλατφόρμα (SaaS) για διαχείριση αθλητικών κέντρων, γηπέδων 5x5 και ακαδημιών ποδοσφαίρου στην Ελλάδα. Online κρατήσεις, player passport και οικονομικά reports.',
  keywords: [
    'διαχείριση ακαδημιών ποδοσφαίρου',
    'λογισμικό γηπέδων 5x5',
    'online κρατήσεις γηπέδων 5x5',
    'πρόγραμμα ακαδημιών',
    'management αθλητικών κέντρων',
    'εφαρμογή για γήπεδα 5x5',
    'έλεγχος συνδρομών ακαδημίας',
    'booking γηπέδων Ελλάδα',
    'κράτηση 5x5',
    'ποδόσφαιρο SaaS',
    'sports facility management software',
    'football academy software'
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
  openGraph: {
    type: 'website',
    locale: 'el_GR',
    url: 'https://yabalitsa.com',
    siteName: 'Yabalitsa',
    title: 'Yabalitsa | Λογισμικό Διαχείρισης Γηπέδων 5x5 & Ακαδημιών',
    description: 'Εκσυγχρονίστε το αθλητικό σας κέντρο. Αυτόματο ημερολόγιο κρατήσεων 5x5 και ψηφιακό Player Passport για ακαδημίες.',
    images: [
      {
        url: '/ogpreview.png',
        width: 1200,
        height: 630,
        alt: 'Yabalitsa SaaS - Διαχείριση Γηπέδων & Ακαδημιών',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yabalitsa | Λογισμικό Διαχείρισης Γηπέδων 5x5',
    description: 'Εκσυγχρονίστε το αθλητικό σας κέντρο με το Yabalitsa. Αυτόματο ημερολόγιο κρατήσεων και Player Passport για ακαδημίες.',
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
      <body className={roboto.className} suppressHydrationWarning={true}>
        <ConditionalWrapper>
          {children}
        </ConditionalWrapper>
        <CookieConsent />
        <GoogleAnalytics gaId="G-GWX4K2ZM6J" />
      </body>
    </html>
  );
}
