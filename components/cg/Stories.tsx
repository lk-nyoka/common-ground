'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Share2, X } from 'lucide-react';
import type { Pick, Plan, Session } from '../../lib/cg/types';

/**
 * Wrapped-style story cards: drawn on a canvas at 1080x1920 (Instagram/WhatsApp story size), so
 * what you see is exactly the image you save or share. Every fact on a card comes from the plan.
 */

const W = 1080;
const H = 1920;
const C = { paper: '#F4F3F8', ink: '#1D1A2B', muted: '#5F5B72', a: '#D6336C', b: '#2B63D9', shared: '#6F42C1', sharedSoft: '#EEE7FA', white: '#FFFFFF' };
const DISPLAY = '"Bricolage Grotesque", "Instrument Sans", system-ui, sans-serif';
const BODY = '"Instrument Sans", system-ui, sans-serif';

type Card =
  | { kind: 'cover' }
  | { kind: 'tags' }
  | { kind: 'watch'; pick: Pick }
  | { kind: 'local'; picks: Pick[] }
  | { kind: 'swap'; forA?: Pick; forB?: Pick }
  | { kind: 'outro' };

export function buildCards(plan: Plan): Card[] {
  const cards: Card[] = [{ kind: 'cover' }];
  if (plan.commonGround.length) cards.push({ kind: 'tags' });
  if (plan.watch) cards.push({ kind: 'watch', pick: plan.watch });
  if (plan.local?.length) cards.push({ kind: 'local', picks: plan.local.slice(0, 3) });
  if (plan.swap.forA || plan.swap.forB) cards.push({ kind: 'swap', forA: plan.swap.forA, forB: plan.swap.forB });
  cards.push({ kind: 'outro' });
  return cards;
}

const proxied = (url?: string) => (url && url.startsWith('https://images.qloo.com/') ? `/api/img?u=${encodeURIComponent(url)}` : undefined);

function loadImage(src?: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, opts: { font?: string; weight?: number; color?: string; align?: CanvasTextAlign; max?: number; lh?: number } = {}) {
  ctx.font = `${opts.weight || 600} ${size}px ${opts.font || DISPLAY}`;
  ctx.fillStyle = opts.color || C.ink;
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = 'alphabetic';
  const lines = opts.max ? wrap(ctx, s, opts.max) : [s];
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * (opts.lh || 1.12)));
  return y + lines.length * size * (opts.lh || 1.12);
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s;
  const ih = img.height * s;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
}

function circleImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, cy: number, r: number, ring: string, fallback: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = fallback;
  ctx.fill();
  if (img) {
    ctx.clip();
    const s = Math.max((2 * r) / img.width, (2 * r) / img.height);
    ctx.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = ring;
  ctx.stroke();
}

function venn(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, gap: number) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.a;
  ctx.beginPath();
  ctx.arc(cx - gap, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.b;
  ctx.beginPath();
  ctx.arc(cx + gap, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - gap, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = C.shared;
  ctx.beginPath();
  ctx.arc(cx + gap, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function footer(ctx: CanvasRenderingContext2D, dark: boolean) {
  venn(ctx, 112, H - 112, 26, 16);
  text(ctx, 'Common Ground', 160, H - 100, 38, { color: dark ? C.white : C.ink });
  text(ctx, 'Powered by Qloo’s taste graph', W - 80, H - 100, 30, { font: BODY, weight: 500, color: dark ? 'rgba(255,255,255,0.7)' : C.muted, align: 'right' });
}

async function draw(card: Card, session: Session, plan: Plan): Promise<string> {
  const [A, B] = session.people;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  try {
    await Promise.all([document.fonts.load(`700 80px "Bricolage Grotesque"`), document.fonts.load(`500 40px "Instrument Sans"`)]);
  } catch {
    /* system fonts are fine */
  }
  const bg = (c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, W, H);
  };

  if (card.kind === 'cover') {
    bg(C.paper);
    text(ctx, 'Tonight’s common ground', 80, 200, 44, { font: BODY, weight: 500, color: C.muted });
    venn(ctx, W / 2, 760, 300, 170);
    text(ctx, A.name, W / 2 - 300, 780, 64, { color: C.white, align: 'center' });
    text(ctx, B.name, W / 2 + 300, 780, 64, { color: C.white, align: 'center' });
    text(ctx, `${A.name} and ${B.name}`, 80, 1300, 104, { weight: 700, max: W - 160, lh: 1.02 });
    text(ctx, 'found where their tastes meet.', 80, 1520, 64, { weight: 600, color: C.shared, max: W - 160 });
    footer(ctx, false);
  }

  if (card.kind === 'tags') {
    bg(C.shared);
    text(ctx, 'You two click on', 80, 260, 88, { weight: 700, color: C.white });
    const tags = (plan.commonGround.some((t) => t.confirmed) ? plan.commonGround.filter((t) => t.confirmed) : plan.commonGround).slice(0, 6);
    let y = 480;
    for (const t of tags) {
      ctx.font = `700 92px ${DISPLAY}`;
      const w = Math.min(W - 160, ctx.measureText(t.name).width + 110);
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.roundRect(80, y - 92, w, 140, 70);
      ctx.fill();
      text(ctx, t.name, 135, y + 8, 92, { weight: 700, color: C.shared });
      y += 190;
    }
    text(ctx, 'Taste tags Qloo found in both of your favourites.', 80, H - 260, 38, { font: BODY, weight: 500, color: 'rgba(255,255,255,0.85)', max: W - 160 });
    footer(ctx, true);
  }

  if (card.kind === 'watch') {
    bg(C.ink);
    text(ctx, 'Our bridge film', 80, 200, 52, { font: BODY, weight: 500, color: 'rgba(255,255,255,0.7)' });
    const img = await loadImage(proxied(card.pick.image));
    if (img) cover(ctx, img, 190, 280, 700, 1000, 36);
    else {
      ctx.fillStyle = '#2C2840';
      ctx.beginPath();
      ctx.roundRect(190, 280, 700, 1000, 36);
      ctx.fill();
    }
    let y = text(ctx, card.pick.name, 80, 1420, 84, { weight: 700, color: C.white, max: W - 160, lh: 1.04 });
    const f = card.pick.fit;
    if (f?.a && f?.b) {
      y += 30;
      const bar = (label: string, rank: number, color: string, yy: number) => {
        text(ctx, label, 80, yy, 40, { font: BODY, weight: 600, color });
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.roundRect(380, yy - 26, 480, 24, 12);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(380, yy - 26, Math.max(30, 480 * (f.of <= 1 ? 1 : (f.of - rank) / (f.of - 1))), 24, 12);
        ctx.fill();
        text(ctx, `#${rank} of ${f.of}`, W - 80, yy, 40, { font: BODY, weight: 600, color: C.white, align: 'right' });
      };
      bar(A.name, f.a.rank, '#F06A95', y);
      bar(B.name, f.b.rank, '#6E97F2', y + 80);
    }
    footer(ctx, true);
  }

  if (card.kind === 'local') {
    bg(C.b);
    text(ctx, 'Our Mzansi match', 80, 260, 96, { weight: 700, color: C.white });
    text(ctx, 'South African artists for both of our tastes', 80, 350, 40, { font: BODY, weight: 500, color: 'rgba(255,255,255,0.85)', max: W - 160 });
    const imgs = await Promise.all(card.picks.map((p) => loadImage(proxied(p.image))));
    card.picks.forEach((p, i) => {
      const y = 620 + i * 390;
      circleImage(ctx, imgs[i], 230, y, 150, C.white, '#1C4AAE');
      text(ctx, p.name, 430, y + 10, 72, { weight: 700, color: C.white, max: W - 510 });
      if (p.fit?.a && p.fit?.b) text(ctx, `${A.name} #${p.fit.a.rank}, ${B.name} #${p.fit.b.rank}`, 430, y + 80, 36, { font: BODY, weight: 500, color: 'rgba(255,255,255,0.8)' });
    });
    footer(ctx, true);
  }

  if (card.kind === 'swap') {
    bg(C.paper);
    text(ctx, 'Swap a favourite', 80, 220, 92, { weight: 700 });
    const half = async (p: Pick | undefined, to: string, from: string, color: string, y0: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(60, y0, W - 120, 640, 48);
      ctx.fill();
      if (!p) return;
      const img = await loadImage(proxied(p.image));
      circleImage(ctx, img, 230, y0 + 320, 140, C.white, 'rgba(255,255,255,0.2)');
      text(ctx, `${to}, try`, 420, y0 + 250, 44, { font: BODY, weight: 600, color: 'rgba(255,255,255,0.85)' });
      text(ctx, p.name, 420, y0 + 340, 76, { weight: 700, color: C.white, max: W - 520 });
      text(ctx, `from ${from}’s world`, 420, y0 + 500, 36, { font: BODY, weight: 500, color: 'rgba(255,255,255,0.85)' });
    };
    await half(card.forA, A.name, B.name, C.a, 330);
    await half(card.forB, B.name, A.name, C.b, 1020);
    footer(ctx, false);
  }

  if (card.kind === 'outro') {
    bg(C.paper);
    venn(ctx, W / 2, 620, 220, 120);
    text(ctx, 'Find your', W / 2, 1060, 96, { weight: 700, align: 'center' });
    text(ctx, 'common ground', W / 2, 1170, 96, { weight: 700, color: C.shared, align: 'center' });
    const host = typeof window !== 'undefined' ? window.location.host : '';
    text(ctx, host, W / 2, 1320, 44, { font: BODY, weight: 600, color: C.muted, align: 'center' });
    text(ctx, 'Every pick comes from Qloo’s taste graph and shows why it suits you both.', W / 2, 1460, 36, { font: BODY, weight: 500, color: C.muted, align: 'center', max: W - 240 });
    footer(ctx, false);
  }

  return canvas.toDataURL('image/png');
}

async function dataUrlToFile(url: string, name: string): Promise<File> {
  const blob = await (await fetch(url)).blob();
  return new File([blob], name, { type: 'image/png' });
}

export function StoryViewer({ session, plan, onClose }: { session: Session; plan: Plan; onClose: () => void }) {
  const cards = buildCards(plan);
  const [i, setI] = useState(0);
  const [images, setImages] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      for (const idx of [i, i + 1]) {
        if (idx >= cards.length || images[idx]) continue;
        const url = await draw(cards[idx], session, plan);
        if (alive) setImages((cur) => ({ ...cur, [idx]: url }));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const go = useCallback((d: number) => setI((cur) => Math.min(cards.length - 1, Math.max(0, cur + d))), [cards.length]);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  const fileName = `common-ground-${i + 1}.png`;
  const share = async () => {
    const url = images[i];
    if (!url) return;
    try {
      const file = await dataUrlToFile(url, fileName);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${session.people[0].name} and ${session.people[1].name}: our common ground` });
        return;
      }
    } catch {
      /* fall through to download */
    }
    save();
  };
  const save = () => {
    const url = images[i];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setStatus('Saved');
    setTimeout(() => setStatus(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-3" role="dialog" aria-modal="true" aria-label="Your story">
      <div className="flex w-full max-w-[420px] gap-1 pb-2" aria-hidden>
        {cards.map((_, k) => (
          <span key={k} className={`h-1 flex-1 rounded-full ${k <= i ? 'bg-white' : 'bg-white/30'}`} />
        ))}
      </div>
      <div className="relative aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-2xl bg-ink">
        {images[i] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[i]} alt={`Story card ${i + 1} of ${cards.length}`} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/70">Drawing your card…</div>
        )}
        <button type="button" aria-label="Previous card" onClick={() => go(-1)} className="absolute inset-y-0 left-0 w-1/3" />
        <button type="button" aria-label="Next card" onClick={() => go(1)} className="absolute inset-y-0 right-0 w-1/3" />
      </div>
      <div className="mt-3 flex w-full max-w-[420px] items-center justify-between gap-2">
        <button type="button" onClick={() => go(-1)} disabled={i === 0} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30" aria-label="Previous">
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={share} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink">
            <Share2 className="h-4 w-4" aria-hidden /> Share
          </button>
          <button type="button" onClick={save} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white">
            <Download className="h-4 w-4" aria-hidden /> {status || 'Save'}
          </button>
        </div>
        <button type="button" onClick={() => go(1)} disabled={i === cards.length - 1} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30" aria-label="Next">
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <button ref={closeRef} type="button" onClick={onClose} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Close story">
        <X className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
