import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Study',
  description: 'Help test Common Ground: rate a mixed list from Common Ground and an AI on its own, without knowing which is which.',
  robots: { index: false }
};

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
