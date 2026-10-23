// Still layers for the long demo: 4K backgrounds and bezels (the camera zooms into these),
// and 1080p captions (laid on after the camera, so they stay put).
const { chromium } = require('playwright');
const fs = require('fs');
const V = '/tmp/claude-0/video2';
const S = JSON.parse(fs.readFileSync(`${V}/script.json`, 'utf8'));
const G = JSON.parse(fs.readFileSync(`${V}/geometry.json`, 'utf8'));
const OUT = `${V}/layers`;
fs.mkdirSync(OUT, { recursive: true });
const FONT = `<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Instrument+Sans:wght@400;500;600&display=block" rel="stylesheet">`;
const CSS = `*{margin:0;box-sizing:border-box}html,body{width:1920px;height:1080px;overflow:hidden}
body{font-family:'Instrument Sans','Inter',sans-serif;color:#1D1A2B;-webkit-font-smoothing:antialiased}
.paper{background:radial-gradient(1200px 700px at 78% 40%, #ECE6FA 0%, #F4F3F8 62%), #F4F3F8}
.d{font-family:'Bricolage Grotesque','Inter Display','Inter',sans-serif;letter-spacing:-0.02em}
.mark{display:inline-flex;align-items:center;gap:14px;font-weight:600;font-size:28px;color:#6F42C1}
.mk{position:relative;width:56px;height:38px}.mk i{position:absolute;top:0;width:38px;height:38px;border-radius:50%}
.mk .a{left:0;background:#D6336C}.mk .b{left:18px;background:#2B63D9;mix-blend-mode:multiply}`;
const mark = `<span class="mark"><span class="mk"><i class="a"></i><i class="b"></i></span>Common Ground</span>`;
const half = (v) => v / 2; // geometry is in 4K pixels; pages are laid out at 1080p and rendered at 2x

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p4k = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const p1k = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const shot = async (page, html, file, transparent = false) => {
    await page.setContent(`<!doctype html><html><head>${FONT}<style>${CSS}</style></head><body${transparent ? ' style="background:transparent"' : ' class="paper"'}>${html}</body></html>`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${OUT}/${file}`, omitBackground: transparent });
  };
  const bezel = (x, y, w, h) =>
    `<div style="position:absolute;left:${half(x - G.border)}px;top:${half(y - G.border)}px;width:${half(w + 2 * G.border)}px;height:${half(h + 2 * G.border)}px;border:${half(G.border)}px solid #121019;border-radius:${half(G.radius)}px;box-shadow:0 40px 90px rgba(29,26,43,.22)"></div>`;
  await shot(p4k, bezel(G.one.x, G.one.y, G.one.w, G.one.h), 'bezel1.png', true);
  await shot(p4k, G.two.list.map((q) => bezel(q.x, q.y, G.two.w, G.two.h)).join(''), 'bezel2.png', true);

  for (const s of S) {
    if (s.kind === 'phone') {
      await shot(p4k, `<div style="position:absolute;left:150px;top:0;height:1080px;width:980px;display:flex;flex-direction:column;justify-content:center">
        <div style="margin-bottom:22px">${mark}</div>
        <h1 class="d" style="font-size:104px;line-height:1.0;font-weight:700">${s.title.join('<br>')}</h1>
        <p style="margin-top:28px;font-size:34px;line-height:1.35;color:#5F5B72;max-width:800px">${s.sub}</p></div>`, `bg_${s.id}.png`);
    } else if (s.kind === 'two') {
      await shot(p4k, `<div style="position:absolute;left:0;right:0;top:64px;text-align:center">
        <h1 class="d" style="font-size:80px;font-weight:700;line-height:1.05">${s.title.join(' ')}</h1>
        <p style="margin-top:12px;font-size:30px;color:#5F5B72">${s.sub}</p></div>`, `bg_${s.id}.png`);
    } else if (s.kind === 'hook') {
      const line = (t, c) => `<div class="d" style="font-size:112px;font-weight:700;line-height:1.08;color:${c}">${t}</div>`;
      const wrap = (inner) => `<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding-left:180px">${inner}</div>`;
      await shot(p4k, wrap(line(s.title[0], '#D6336C')), `bg_${s.id}.png`);
      await shot(p4k, wrap(line(s.title[0], '#D6336C') + line(s.title[1], '#2B63D9')), `bg_${s.id}_b.png`);
    } else {
      await shot(p4k, `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:1080px;text-align:center">
        <div style="position:relative;width:260px;height:180px;margin-bottom:40px"><i style="position:absolute;left:0;top:0;width:180px;height:180px;border-radius:50%;background:#D6336C"></i><i style="position:absolute;left:80px;top:0;width:180px;height:180px;border-radius:50%;background:#2B63D9;mix-blend-mode:multiply"></i></div>
        <h1 class="d" style="font-size:132px;font-weight:700;line-height:1">${s.title[0]}</h1>
        <p class="d" style="margin-top:26px;font-size:52px;font-weight:600;color:#6F42C1">${s.sub}</p>
        ${s.url ? `<p style="margin-top:46px;font-size:36px">${s.url}</p><p style="margin-top:14px;font-size:26px;color:#5F5B72">Built on Qloo’s taste graph · Free · No sign-up</p>` : ''}</div>`, `bg_${s.id}.png`);
    }
    if (s.vo) {
      await shot(p1k, `<div style="position:absolute;left:0;right:0;bottom:46px;display:flex;justify-content:center">
        <p style="max-width:1440px;background:rgba(29,26,43,.86);color:#fff;font-size:34px;line-height:1.3;font-weight:500;padding:14px 28px;border-radius:18px;text-align:center">${s.vo}</p></div>`, `cap_${s.id}.png`, true);
    }
  }
  await b.close();
  console.log('layers done');
})();
