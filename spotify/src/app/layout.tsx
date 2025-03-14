import './globals.css';
import { Figtree } from 'next/font/google';

const figtree = Figtree({ subsets: ['latin'] });

export const metadata = {
  title: 'Spotify Rate Your Playlist',
  description: 'Rate your Spotify playlist songs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body className={`${figtree.className} min-h-screen bg-[#121212] text-white`}>
        {children}
      </body>
    </html>
  );
}