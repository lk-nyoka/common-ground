import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Back Then — Taste-Detective Agent for Dementia Visits',
  description: 'You remember three songs. Back Then finds what comes next, and learns which ones still reach them.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
