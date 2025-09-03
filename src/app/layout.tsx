import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { AuthProvider } from '@/contexts/AuthContext';
import SidebarWrapper from '@/components/SidebarWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Yabalitsa Management',
  description: 'Football pitch management system',
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
      <body className={inter.className} suppressHydrationWarning={true}>
        <AuthProvider>
          <SidebarWrapper>
            {children}
          </SidebarWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
