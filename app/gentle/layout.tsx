import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gentle visit',
  description: 'Plan a calm visit to someone living with dementia, from a few things their family knows they loved.'
};

export default function GentleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
