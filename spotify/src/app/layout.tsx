import './globals.css';
import Template from './template';

export const metadata = {
  title: 'Spotify Rate Your Playlist',
  description: 'Rate your Spotify playlist songs',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <Template>{children}</Template>
      </body>
    </html>
  );
}