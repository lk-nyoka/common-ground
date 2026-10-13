import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Common Ground',
  description: 'Two people, a few favourites each. Qloo finds where your tastes meet, and an agent plans a night in you will both enjoy.'
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#F6F4EF' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
