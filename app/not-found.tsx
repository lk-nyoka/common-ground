import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center text-ink">
      <p className="text-sm text-muted">404</p>
      <h1 className="mt-2 font-display text-3xl">Nothing in common here.</h1>
      <p className="mt-2 text-muted">This page doesn’t exist.</p>
      <Link href="/" className="mt-6 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white">
        Back to Common Ground
      </Link>
    </main>
  );
}
