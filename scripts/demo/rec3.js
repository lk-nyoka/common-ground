// Slow, deliberate recordings of the live app, with a log of what is in focus and when,
// so the editor can zoom the "camera" onto it.
const { chromium } = require('playwright');
const fs = require('fs');
const { execFileSync } = require('child_process');
const OUT = '/tmp/claude-0/video2/clips';
const SITE = 'https://common-ground-pho7.onrender.com';
const TAP_CSS = `(() => { const add = () => { const st = document.createElement('style'); st.textContent = '.cg-tap{position:fixed;z-index:2147483647;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(111,66,193,.28);border:2px solid rgba(111,66,193,.8);pointer-events:none;animation:cgt .6s ease-out forwards}@keyframes cgt{from{transform:scale(.4);opacity:1}to{transform:scale(1.5);opacity:0}}'; document.documentElement.appendChild(st);
  window.addEventListener('pointerdown', (e) => { const d = document.createElement('div'); d.className = 'cg-tap'; d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; document.documentElement.appendChild(d); setTimeout(() => d.remove(), 700); }, true); };
  if (document.documentElement) add(); else document.addEventListener('DOMContentLoaded', add); })();`;

function clip(page, name, phone = 0) {
  const dir = `${OUT}/${name}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const frames = []; const focus = []; let cdp; let t0 = null;
  return {
    async start() {
      cdp = await page.context().newCDPSession(page);
      cdp.on('Page.screencastFrame', async (f) => { if (t0 === null) t0 = f.metadata.timestamp; const file = `${dir}/f${String(frames.length).padStart(5, '0')}.jpg`; fs.writeFileSync(file, Buffer.from(f.data, 'base64')); frames.push({ file, t: f.metadata.timestamp }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {} });
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1688 });
      await page.waitForTimeout(300);
    },
    /** Note what the camera should look at from now on (a locator, a box, or null for the whole screen). */
    async look(target, pad = 0) {
      let box = null;
      if (target && typeof target.boundingBox === 'function') box = await target.boundingBox().catch(() => null);
      else if (target) box = target;
      if (box) box = { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad };
      focus.push({ t: Date.now() / 1000, phone, box });
    },
    async stop() {
      await page.waitForTimeout(500); await cdp.send('Page.stopScreencast');
      const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.01, ((frames[i + 1]?.t ?? f.t + 0.6) - f.t)).toFixed(3)}`).join('\n') + `\nfile '${frames[frames.length - 1].file}'\n`;
      fs.writeFileSync(`${dir}/list.txt`, list);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`, '-vf', 'scale=780:1688:force_original_aspect_ratio=decrease,pad=780:1688:(ow-iw)/2:(oh-ih)/2:color=0xF4F3F8,fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '16', `${OUT}/${name}.mp4`]);
      fs.writeFileSync(`${OUT}/${name}.focus.json`, JSON.stringify({ start: t0, focus: focus.map((f) => ({ ...f, t: +(f.t - t0).toFixed(3) })) }, null, 1));
      console.log(name, frames.length, 'frames', focus.length, 'focus points');
    }
  };
}
const center = async (p, loc) => { await loc.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' })).catch(() => {}); await p.waitForTimeout(900); };
const typeSlow = async (loc, text) => { await loc.click(); await loc.pressSequentially(text, { delay: 95 }); };

module.exports = { clip, center, typeSlow, TAP_CSS, SITE };

if (require.main === module) (async () => {
  const which = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const phone = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await ctx.addInitScript(TAP_CSS); await ctx.addInitScript(() => { try { localStorage.setItem('cg-app-feedback-done-v1', '1'); } catch {} }); await ctx.route('https://wa.me/**', (r) => r.abort()); await ctx.route('https://api.whatsapp.com/**', (r) => r.abort()); return ctx.newPage(); };
  const p = await phone();
  await p.goto(SITE + '/'); await p.waitForTimeout(2000);

  // 1. Landing: what it is, the picture, how it works.
  let c = clip(p, 'landing'); await c.start();
  await c.look(null); await p.waitForTimeout(1500);
  await c.look(p.locator('#intro-title').locator('..'), 8); await p.waitForTimeout(3200);
  const pic = p.locator('[aria-hidden="true"].overflow-hidden').first();
  await center(p, pic); await c.look(pic, 8); await p.waitForTimeout(3000);
  const how = p.getByRole('list', { name: 'How it works' });
  await center(p, how); await c.look(how, 8); await p.waitForTimeout(4200);
  await c.stop();

  // 2. Setup: the same three questions for both of you, checked as you type.
  c = clip(p, 'setup'); await c.start();
  const you = p.getByRole('group', { name: 'You' });
  await center(p, you); await c.look(you, 6); await p.waitForTimeout(900);
  await typeSlow(p.getByPlaceholder('Your first name'), 'Gogo');
  const fFilm = p.getByLabel('Your favourite film'), fMusic = p.getByLabel('Your favourite music');
  await c.look(fFilm.locator('xpath=ancestor::div[1]/..'), 10);
  await typeSlow(fFilm, 'Sarafina'); await p.waitForTimeout(2400);
  await typeSlow(fMusic, 'Miriam Makeba'); await p.waitForTimeout(2600);
  await c.look(you, 6); await p.waitForTimeout(1400);
  const them = p.getByRole('group', { name: 'The other person' });
  await center(p, them); await c.look(them, 6); await p.waitForTimeout(900);
  await typeSlow(p.getByPlaceholder('Their first name'), 'Lwazi');
  const tFilm = p.getByLabel('Their favourite film'), tMusic = p.getByLabel('Their favourite music');
  await c.look(tFilm.locator('xpath=ancestor::div[1]/..'), 10);
  await typeSlow(tFilm, 'Black Panther'); await p.waitForTimeout(2600);
  await typeSlow(tMusic, 'Tyla'); await p.waitForTimeout(2600);
  await c.look(them, 6); await p.waitForTimeout(1800);
  await c.stop();

  // 3. The agent plans: live steps, then the plan.
  c = clip(p, 'plan'); await c.start();
  const go = p.getByRole('button', { name: 'Plan our night' }).last();
  await center(p, go); await c.look(go, 30); await p.waitForTimeout(800);
  await go.click(); await p.waitForTimeout(1200);
  await c.look(null); await p.waitForTimeout(1500);
  await c.look(p.locator('main ol, main ul').first(), 12);
  await p.waitForSelector('#watch-title', { timeout: 90000 }); await p.waitForTimeout(700);
  await c.look(null); await p.waitForTimeout(1800);
  const hero = p.locator('#watch-title').locator('..');
  await c.look(p.getByText('Where your tastes meet').locator('xpath=ancestor::button[1]'), 8); await p.waitForTimeout(2200);
  await c.stop();

  // 4. The proof.
  c = clip(p, 'proof'); await c.start();
  await center(p, hero.locator('h3').first()); await c.look(hero.locator('article').first(), 6); await p.waitForTimeout(3000);
  const bars = hero.locator('[aria-label*=" of "]').first();
  await center(p, bars); await c.look(bars.locator('..'), 14); await p.waitForTimeout(2600);
  await hero.getByRole('button', { name: 'Why this pick?' }).first().click(); await p.waitForTimeout(700);
  const proof = hero.locator('.rounded-2xl.bg-paper').first();
  await center(p, proof); await c.look(proof, 8); await p.waitForTimeout(4500);
  await c.stop();

  // 5. Tabs: music, Mzansi, comedy.
  c = clip(p, 'tabs'); await c.start();
  const panel = p.getByRole('tablist').locator('..');
  await center(p, panel); await c.look(panel, 6); await p.waitForTimeout(2200);
  for (const name of [/Mzansi/, /Comedy/]) {
    const t = p.getByRole('tab', { name }); if (!(await t.count())) continue;
    await t.click(); await p.waitForTimeout(600); await center(p, panel); await c.look(panel, 6); await p.waitForTimeout(2800);
  }
  const more = panel.getByRole('button', { name: 'More' }).first();
  if (await more.count()) { await more.click(); await p.waitForTimeout(600); const row = more.locator('xpath=ancestor::li[1]'); await center(p, row); await c.look(row, 8); await p.waitForTimeout(3200); }
  await c.stop();

  // 6. Date spots.
  c = clip(p, 'spots'); await c.start();
  const go2 = p.getByRole('button', { name: /Going out instead/ });
  await center(p, go2); await c.look(go2, 10); await p.waitForTimeout(1200);
  await go2.click(); await p.waitForTimeout(600);
  const sec = p.locator('#spots-title').locator('xpath=ancestor::section[1]');
  await center(p, sec); await c.look(sec, 6);
  await typeSlow(p.getByLabel('Your area or address'), 'Braamfontein'); await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'Find' }).click();
  await p.waitForSelector('text=Directions', { timeout: 40000 }); await p.waitForTimeout(800);
  await c.look(sec.locator('ul').first(), 6); await p.waitForTimeout(3000);
  await p.getByRole('radio', { name: /Comedy & shows/ }).click(); await p.waitForTimeout(4500);
  await center(p, sec.locator('ul').first()); await c.look(sec.locator('ul').first(), 6); await p.waitForTimeout(3000);
  await c.stop();

  // 7. Story cards.
  c = clip(p, 'story'); await c.start();
  const sc = p.getByRole('button', { name: /Story cards/ });
  await center(p, sc); await c.look(sc.locator('..'), 12); await p.waitForTimeout(1200);
  await sc.click(); await p.waitForTimeout(800); await c.look(null); await p.waitForTimeout(2600);
  for (let i = 0; i < 3; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(2400); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  await c.stop();

  // 8. Rating and night 2.
  c = clip(p, 'rate'); await c.start();
  const rb = p.getByRole('button', { name: /Rate tonight’s picks/ });
  await c.look(rb.locator('xpath=ancestor::div[1]'), 10); await p.waitForTimeout(1200);
  await rb.click(); await p.waitForTimeout(900);
  const sheet = p.getByRole('dialog', { name: 'Rate tonight' });
  await c.look(sheet, 0); await p.waitForTimeout(1200);
  const items = sheet.locator('li');
  await items.nth(0).getByRole('button', { name: 'We both liked it' }).click(); await p.waitForTimeout(900);
  await items.nth(3).getByRole('button', { name: /Only Gogo liked it/ }).click().catch(() => {}); await p.waitForTimeout(900);
  await items.nth(4).getByRole('button', { name: /Neither/ }).click().catch(() => {}); await p.waitForTimeout(1100);
  await sheet.getByRole('button', { name: /Plan our next night/ }).click();
  await p.waitForSelector('text=What night 1 taught us', { timeout: 90000 }); await p.waitForTimeout(600);
  const learned = p.getByText('What night 1 taught us').locator('xpath=ancestor::section[1]');
  await center(p, learned); await c.look(learned, 8); await p.waitForTimeout(4500);
  await c.stop();
  await b.close();
})().catch((e) => { console.error('FAIL', e.message.split('\n')[0]); process.exit(1); });
