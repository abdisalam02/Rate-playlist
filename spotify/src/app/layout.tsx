import './globals.css';
import { Inter, Manrope, Figtree } from 'next/font/google';
import { Providers } from './providers';
import { Metadata } from 'next';
import AuthProvider from './components/AuthProvider';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import '@fontsource/henny-penny';
import Notifications from './components/Notifications';

const figtree = Figtree({ subsets: ['latin'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

const fonts = {
  inter,
  manrope
};

export const metadata: Metadata = {
  title: '🎵 Musicboxd | Rate and Share Music',
  description: 'Discover, rate, and share your favorite music',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions);
  
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#121212" />
      </head>
      <body className={`${fonts.inter.variable} ${fonts.manrope.variable} bg-gradient-to-b from-zinc-900 to-black min-h-screen text-white`}>
        <AuthProvider session={session}>
          <Notifications />
          <Providers>
            {children}
          </Providers>
        </AuthProvider>
      </body>
    </html>
  )
}