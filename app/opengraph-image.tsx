import { ImageResponse } from 'next/og';

export const alt = 'Common Ground: find what you’ll both love tonight';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The preview shown when the link is shared. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 90, background: '#F6F4EF', color: '#1A1714' }}>
        <div style={{ display: 'flex', position: 'relative', width: 150, height: 96, marginBottom: 48 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 96, height: 96, borderRadius: 96, background: '#5B5BD6', opacity: 0.9 }} />
          <div style={{ position: 'absolute', left: 54, top: 0, width: 96, height: 96, borderRadius: 96, background: '#0E9384', opacity: 0.85 }} />
        </div>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 600, letterSpacing: -2 }}>Find what you’ll both</div>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 600, letterSpacing: -2, marginTop: 4 }}>love tonight.</div>
        <div style={{ display: 'flex', fontSize: 32, color: '#6E6860', marginTop: 30 }}>Two people. A few favourites. One plan, powered by Qloo.</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 44 }}>
          {['Drama', 'Melodic', 'Passionate', 'Energetic'].map((t) => (
            <div key={t} style={{ fontSize: 28, padding: '10px 26px', borderRadius: 40, background: '#1A1714', color: '#fff' }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
