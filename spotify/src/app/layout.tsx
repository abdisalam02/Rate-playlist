// app/layout.jsx
import './globals.css';

export const metadata = {
  title: 'Spotify Rate Your Playlist',
  description: 'Rate your Spotify playlist songs',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* Add our custom class to body */}
      <body className="bg-music-pattern">{children}</body>
    </html>
  );
}
