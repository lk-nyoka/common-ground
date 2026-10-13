import './globals.css';
import type { Metadata, Viewport } from 'next';

const description = 'Two people, a few favourites each. Qloo finds where your tastes meet, and an agent plans a night in you will both enjoy.';
const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: 'Common Ground', template: '%s · Common Ground' },
  description,
  applicationName: 'Common Ground',
  openGraph: { title: 'Common Ground', description, type: 'website', siteName: 'Common Ground' },
  twitter: { card: 'summary_large_image', title: 'Common Ground', description }
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
