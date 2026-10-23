// Devpost gallery (1500x1000, 3:2), cover/thumbnail, and a YouTube thumbnail (1280x720).
const { chromium } = require('playwright');
const fs = require('fs');
const ST = '/tmp/claude-0/video2/stills';
const OUT = '/tmp/claude-0/gallery';
fs.mkdirSync(OUT, { recursive: true });
const img = (n) => `data:image/png;base64,${fs.readFileSync(`${ST}/${n}.png`).toString('base64')}`;

const FONT = `<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&display=block" rel="stylesheet">`;
const CSS = `*{margin:0;box-sizing:border-box}
body{font-family:'Instrument Sans',sans-serif;color:#1D1A2B;-webkit-font-smoothing:antialiased;overflow:hidden;
 background:radial-gradient(900px 640px at 76% 46%, #E9E2FA 0%, #F4F3F8 64%), #F4F3F8}
.d{font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-0.025em}
.mark{display:inline-flex;align-items:center;gap:10px;font-weight:600;font-size:20px;color:#6F42C1}
.mk{position:relative;width:40px;height:27px}.mk i{position:absolute;top:0;width:27px;height:27px;border-radius:50%}
.mk .a{left:0;background:#D6336C}.mk .b{left:13px;background:#2B63D9;mix-blend-mode:multiply}
.phone{position:absolute;border:13px solid #121019;border-radius:62px;overflow:hidden;background:#fff;box-shadow:0 30px 70px rgba(29,26,43,.22),0 6px 16px rgba(29,26,43,.10)}
.phone img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.copy{position:absolute;left:90px;top:0;bottom:0;width:560px;display:flex;flex-direction:column;justify-content:center}
h1{font-size:68px;line-height:1.02;font-weight:700}
.sub{margin-top:22px;font-size:24px;line-height:1.4;color:#5F5B72;max-width:520px}
.chip{display:inline-block;margin-top:26px;padding:8px 14px;border-radius:999px;background:#fff;border:1px solid #E2DFEA;font-size:16px;color:#5F5B72}`;
const mark = `<span class="mark"><span class="mk"><i class="a"></i><i class="b"></i></span>Common Ground</span>`;
// A phone at screen width w (CSS px), showing a 390x844 screen.
const phone = (src, x, y, w = 390, rot = 0, z = 1) =>
  `<div class="phone" style="left:${x}px;top:${y}px;width:${w + 26}px;height:${Math.round((w * 844) / 390) + 26}px;transform:rotate(${rot}deg);z-index:${z}"><img src="${img(src)}"></div>`;
const copy = (title, sub, chip = '') =>
  `<div class="copy"><div style="margin-bottom:18px">${mark}</div><h1 class="d">${title}</h1><p class="sub">${sub}</p>${chip ? `<div><span class="chip">${chip}</span></div>` : ''}</div>`;

const slides = [
  ['02-setup', copy('Add what you<br>each love.', 'A film, an artist and a series each. Every one is checked with Qloo as you type, so the agent starts from the right thing.', 'No sign-up · any phone'),
    phone('setup_23', 930, 70)],
  ['03-fair', copy('Fair to both.<br>And it shows why.', 'Every pick shows where it ranks for each person on their own. If it only suits one of you, the agent swaps it out.', 'Ranks from Qloo’s taste graph'),
    phone('proof_7', 930, 70)],
  ['04-mzansi-comedy', copy('Mzansi flavour.<br>Comedy too.', 'South African artists when Qloo finds a South African thread in your shared taste, and stand-up comedians ranked for both of you.'),
    phone('tabs_2', 720, 115, 340, -4) + phone('tabs_6', 1100, 95, 340, 3, 2)],
  ['05-apart', copy('Apart? Plan it<br>together.', 'Send the other person a link. They add their favourites on their own phone. The plan opens on both phones, with a chat beside it.'),
    phone('apartA_5', 720, 115, 340, 0) + phone('apartB_7', 1100, 95, 340, 0, 2)],
  ['06-swipe', copy('Swipe. Match.<br>Press play.', 'Can’t decide? Swipe on tonight’s picks together. When you both say yes it’s a match, then you start at the same moment.'),
    phone('swipeA_2', 720, 115, 340, 0) + phone('swipeB_3', 1100, 95, 340, 0, 2)],
  ['07-date-spots', copy('Going out<br>instead?', 'Date spots within 30 km: food, coffee, drinks, outdoors, live music, comedy and theatre, ordered for both tastes.'),
    phone('spots_7', 930, 70)],
  ['08-story', copy('Share<br>your night.', 'Story cards with your shared taste, your bridge film and your Mzansi match, ready for WhatsApp or Instagram.'),
    phone('story_3', 720, 115, 340, -3) + phone('story_5', 1100, 95, 340, 3, 2)],
  ['09-learns', copy('It learns from<br>both of you.', 'After the night, tap who liked what. The next plan starts from what you both liked and drops what neither of you did.'),
    phone('rate_3', 720, 115, 340, 0) + phone('rate_7', 1100, 95, 340, 0, 2)],
];

const flow = (n, t, s) => `<div style="flex:1;background:#fff;border:1px solid #E2DFEA;border-radius:22px;padding:22px 22px 24px">
  <div class="d" style="font-size:15px;font-weight:700;color:#6F42C1;letter-spacing:.06em">STEP ${n}</div>
  <div class="d" style="margin-top:8px;font-size:31px;font-weight:700;line-height:1.1">${t}</div>
  <div style="margin-top:10px;font-size:20px;line-height:1.4;color:#5F5B72">${s}</div></div>`;
const stat = (v, l) => `<div style="flex:1"><div class="d" style="font-size:66px;font-weight:700;color:#1D1A2B">${v}</div><div style="margin-top:4px;font-size:20px;line-height:1.35;color:#5F5B72">${l}</div></div>`;
slides.push(['10-how-it-works', `<div style="position:absolute;inset:0 80px;display:flex;flex-direction:column;justify-content:center">
  <div>${mark}</div>
  <h1 class="d" style="margin-top:14px;font-size:66px">How the agent works</h1>
  <div style="display:flex;gap:16px;margin-top:34px">
   ${flow(1, 'Match', 'Each favourite is matched to a Qloo entity as you type.')}
   ${flow(2, 'Find', 'Qloo’s taste graph finds what fans of <b>both</b> tastes love, plus the tags you share.')}
   ${flow(3, 'Rank', 'Every candidate is scored for each person separately. The person it suits least decides.')}
   ${flow(4, 'Plan', 'Gemini plans the night, but only from Qloo’s results.')}
   ${flow(5, 'Check', 'A critic swaps out one-sided picks and fixes AI notes that overclaim.')}
  </div>
  <div style="margin-top:50px;font-size:20px;font-weight:600;color:#5F5B72">On 15 mismatched pairs, compared with the same AI model working alone:</div>
  <div style="display:flex;gap:30px;margin-top:14px">
   ${stat('15 / 15', 'pairs where the person each pick suits least did better (Qloo affinity 0.843 vs 0.771)')}
   ${stat('0.056', 'gap between the two people, against 0.090 for the AI alone')}
   ${stat('35 / 35', 'film runtimes checked against the time you have, against none')}
  </div>
  <div style="margin-top:22px;font-size:18px;color:#8A8699">Where it lost: the AI alone suggested more films outside both people’s top 30 (92% vs 77%).</div>
 </div>`]);

const cover = `<div class="copy" style="width:620px">
   <div style="position:relative;width:150px;height:96px;margin-bottom:30px"><i style="position:absolute;left:0;top:0;width:96px;height:96px;border-radius:50%;background:#D6336C"></i><i style="position:absolute;left:54px;top:0;width:96px;height:96px;border-radius:50%;background:#2B63D9;mix-blend-mode:multiply"></i></div>
   <h1 class="d" style="font-size:92px">Common Ground</h1>
   <p class="d" style="margin-top:18px;font-size:36px;font-weight:600;line-height:1.15;color:#6F42C1">Two tastes. One night<br>you’ll both enjoy.</p>
   <p class="sub" style="margin-top:22px">An AI agent on Qloo’s taste graph that plans one night for two people, and shows it’s fair to both.</p></div>`
  + phone('plan_7', 790, 100, 360, -5) + phone('proof_7', 1100, 95, 340, 4, 2);

const yt = `<div style="position:absolute;left:64px;top:0;bottom:0;width:700px;display:flex;flex-direction:column;justify-content:center">
   <div class="d" style="font-size:76px;font-weight:800;line-height:1.0;color:#D6336C">Gogo loves<br>Makeba.</div>
   <div class="d" style="margin-top:10px;font-size:76px;font-weight:800;line-height:1.0;color:#2B63D9">I love Tyla.</div>
   <div class="d" style="margin-top:28px;display:inline-block;align-self:flex-start;background:#1D1A2B;color:#fff;font-size:40px;font-weight:700;padding:12px 22px;border-radius:18px">One night for both?</div>
   <div style="margin-top:26px">${mark}</div></div>`
  + phone('proof_7', 820, 40, 330, 5);

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const shoot = async (html, file, w, h, scale) => {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
    await p.setContent(`<!doctype html><html><head>${FONT}<style>${CSS}</style></head><body style="width:${w}px;height:${h}px;position:relative">${html}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: `${OUT}/${file}.jpg`, type: 'jpeg', quality: 90 });
    await p.close();
  };
  await shoot(cover, '01-cover', 1500, 1000, 2);
  for (const [name, html, extra = ''] of slides) await shoot(html + extra, name, 1500, 1000, 2);
  await shoot(yt, 'youtube-thumbnail', 1280, 720, 1);
  await b.close();
  console.log('done');
})();
