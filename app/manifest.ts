import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Common Ground',
    short_name: 'Common Ground',
    description: 'Two tastes, one plan. Qloo finds where you meet; taste drops nudge you to try something new.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F3F8',
    theme_color: '#6F42C1',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
