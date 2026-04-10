/**
 * Canvas 2D renderer for SachNetra branded story share cards.
 * Pixel-perfect match of sachnetra_share_card_v3.html.
 *
 * Key design decisions:
 * - Dynamic canvas height: fits snugly around content, no whitespace
 * - Scale factor: HTML card is 400px wide, canvas is 1080px → scale ~2.7×
 * - Logo: drawn inline via Canvas API (eye icon from the HTML SVG), no external image load
 * - 4 themes: general (purple), conflict (red), econ (green), govt (gold)
 *
 * Share flow: canvas → blob → Web Share API (url field) → clipboard → download
 */

// ── Scale & Layout Constants ─────────────────────────────────────
// Everything is expressed in "HTML px" (400px card) then multiplied by SCALE.

const SCALE = 2.7;               // 400px HTML → 1080px canvas
const CARD_W = Math.round(400 * SCALE);  // 1080
const CARD_R = Math.round(22 * SCALE);  // border-radius: 22px

// Padding values matching the HTML
const HEAD_PAD_X = Math.round(20 * SCALE); // card-head padding: 18px 20px
const HEAD_PAD_TOP = Math.round(18 * SCALE);
const TITLE_PAD_X = Math.round(18 * SCALE); // card-title padding: 0 18px 22px
const TITLE_PAD_BOTTOM = Math.round(22 * SCALE);
const SEC_MARGIN = Math.round(14 * SCALE);  // card-section margin: 0 14px 14px
const SEC_PAD_X = Math.round(16 * SCALE);  // card-section padding: 14px 16px
const SEC_PAD_Y = Math.round(14 * SCALE);
const SEC_R = Math.round(14 * SCALE);
const FOOTER_PAD_X = Math.round(18 * SCALE); // card-footer padding: 0 18px 18px
const FOOTER_PAD_BOTTOM = Math.round(18 * SCALE);
const DIVIDER_MARGIN_V = Math.round(8 * SCALE); // card-divider margin: 2px 0 14px → use 8 total

// Font sizes (matching HTML, scaled)
const FS_PILL = Math.round(10.5 * SCALE);   // cat-pill font-size: 10.5px
const FS_META = Math.round(11 * SCALE);     // card-source/time: 11px
const FS_TITLE = Math.round(18 * SCALE);    // card-title: 18px
const FS_LABEL = Math.round(9.5 * SCALE);   // cs-lbl-text: 9.5px
const FS_BODY = Math.round(15 * SCALE);     // cs-body: increased for readability
const FS_BRAND = Math.round(14 * SCALE);    // brand-name: 14px
const FS_SUB = Math.round(10 * SCALE);      // brand-sub/url: 10px

const TOPLINE_H = Math.round(2.5 * SCALE);  // card-topline height: 2.5px

// ── Theme Definitions ────────────────────────────────────────────

type CardTheme = 'general' | 'conflict' | 'econ' | 'govt';

interface ThemeConfig {
  pillLabel: string;
  pillBg: string;
  pillColor: string;
  pillBorder: string;
  toplineStops: Array<{ offset: number; color: string }>;
  meshColor: string;
  sectionBg: string;
  sectionBorder: string;
  dotColor1: string;  // gradient start or solid
  dotColor2: string;  // gradient end (same as start → solid)
  dotGlow: string;
  labelColor: string;
  labelShadow: string;
}

const THEMES: Record<CardTheme, ThemeConfig> = {
  general: {
    pillLabel: 'GENERAL',
    pillBg: 'rgba(124,92,252,0.15)',
    pillColor: '#c4b0ff',
    pillBorder: 'rgba(124,92,252,0.35)',
    toplineStops: [
      { offset: 0, color: '#7c5cfc' },
      { offset: 1, color: '#ff9a3c' },
    ],
    meshColor: '#7c5cfc',
    sectionBg: 'rgba(124,92,252,0.07)',
    sectionBorder: 'rgba(124,92,252,0.14)',
    dotColor1: '#7c5cfc', dotColor2: '#ff9a3c',
    dotGlow: 'rgba(124,92,252,0.7)',
    labelColor: '#b8aaff',
    labelShadow: 'rgba(124,92,252,0.6)',
  },
  conflict: {
    pillLabel: 'CONFLICT',
    pillBg: 'rgba(200,40,40,0.15)',
    pillColor: '#ff9090',
    pillBorder: 'rgba(200,40,40,0.35)',
    toplineStops: [
      { offset: 0, color: '#cc2222' },
      { offset: 0.6, color: '#7c5cfc' },
      { offset: 1, color: '#ff9a3c' },
    ],
    meshColor: '#cc2222',
    sectionBg: 'rgba(180,30,30,0.07)',
    sectionBorder: 'rgba(180,30,30,0.18)',
    dotColor1: '#ff6060', dotColor2: '#ff6060',
    dotGlow: 'rgba(255,80,80,0.65)',
    labelColor: '#ff9090',
    labelShadow: 'rgba(255,80,80,0.55)',
  },
  econ: {
    pillLabel: 'ECONOMY',
    pillBg: 'rgba(30,160,80,0.13)',
    pillColor: '#80dd99',
    pillBorder: 'rgba(30,160,80,0.3)',
    toplineStops: [
      { offset: 0, color: '#22bb55' },
      { offset: 0.7, color: '#7c5cfc' },
      { offset: 1, color: '#ff9a3c' },
    ],
    meshColor: '#22bb55',
    sectionBg: 'rgba(30,160,80,0.07)',
    sectionBorder: 'rgba(30,160,80,0.16)',
    dotColor1: '#44cc77', dotColor2: '#44cc77',
    dotGlow: 'rgba(50,200,100,0.6)',
    labelColor: '#80dd99',
    labelShadow: 'rgba(50,200,100,0.55)',
  },
  govt: {
    pillLabel: 'GOVERNMENT',
    pillBg: 'rgba(220,160,0,0.13)',
    pillColor: '#f0c84a',
    pillBorder: 'rgba(220,160,0,0.3)',
    toplineStops: [
      { offset: 0, color: '#d49500' },
      { offset: 0.7, color: '#7c5cfc' },
      { offset: 1, color: '#ff9a3c' },
    ],
    meshColor: '#d49500',
    sectionBg: 'rgba(220,160,0,0.07)',
    sectionBorder: 'rgba(220,160,0,0.18)',
    dotColor1: '#f0c84a', dotColor2: '#f0c84a',
    dotGlow: 'rgba(240,180,40,0.6)',
    labelColor: '#f0c84a',
    labelShadow: 'rgba(240,180,40,0.55)',
  },
};

/** Specific category → pill label overrides */
const CATEGORY_PILL_LABELS: Record<string, string> = {
  conflict: 'CONFLICT', military: 'CONFLICT', terrorism: 'CONFLICT',
  protest: 'PROTEST', crime: 'CRIME',
  economic: 'ECONOMY', trade: 'ECONOMY', tech: 'TECHNOLOGY',
  diplomatic: 'GOVERNMENT',
  disaster: 'DISASTER', health: 'HEALTH', environmental: 'ENVIRONMENT',
  cyber: 'CYBER', infrastructure: 'INFRASTRUCTURE',
};

function resolveCardTheme(category: string): CardTheme {
  const cat = category.toLowerCase();
  if (['conflict', 'military', 'terrorism', 'protest', 'crime'].includes(cat)) return 'conflict';
  if (['economic', 'trade', 'tech'].includes(cat)) return 'econ';
  if (['diplomatic'].includes(cat)) return 'govt';
  return 'general';
}

function getPillLabel(category: string, theme: CardTheme): string {
  return CATEGORY_PILL_LABELS[category.toLowerCase()] ?? THEMES[theme].pillLabel;
}

// ── Data Input ───────────────────────────────────────────────────

export interface ShareCardData {
  title: string;
  category: string;
  source: string;
  timeAgo: string;
  summary?: string;
  storyUrl?: string;
}

// ── Canvas Utilities ─────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ── Font Loading ─────────────────────────────────────────────────

const SYNE_URL = 'https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBZRjr0FKM_04uQ6OzSC3.woff2';
const DM_SANS_URL = 'https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZOIHQ.woff2';
let _fontsLoaded = false;

async function ensureFonts(): Promise<void> {
  if (_fontsLoaded) return;
  try {
    const [s, d] = await Promise.all([
      new FontFace('Syne', `url(${SYNE_URL})`, { weight: '700' }).load(),
      new FontFace('DM Sans', `url(${DM_SANS_URL})`, { weight: '400' }).load(),
    ]);
    document.fonts.add(s);
    document.fonts.add(d);
    _fontsLoaded = true;
  } catch { /* system font fallback */ }
}

// ── Draw the SachNetra Eye Logo (inline SVG path on canvas) ──────
// Matches the SVG in sachnetra_share_card_v3.html exactly.
function drawLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  // s = size in canvas px (equivalent to 18px SVG → scale accordingly)
  const r = s / 18; // ratio: 1 HTML px = r canvas px

  ctx.save();
  ctx.translate(cx - s / 2, cy - s / 2);

  // Gradient for strokes
  const lg = ctx.createLinearGradient(1.5 * r, 4 * r, 16.5 * r, 14 * r);
  lg.addColorStop(0, '#7c5cfc');
  lg.addColorStop(1, '#ff9a3c');

  ctx.strokeStyle = lg;
  ctx.lineWidth = 1.3 * r;

  // Outer ellipse: cx=9 cy=9 rx=7.5 ry=5
  ctx.beginPath();
  ctx.ellipse(9 * r, 9 * r, 7.5 * r, 5 * r, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner circle: cx=9 cy=9 r=2.8
  ctx.lineWidth = 1.1 * r;
  ctx.beginPath();
  ctx.arc(9 * r, 9 * r, 2.8 * r, 0, Math.PI * 2);
  ctx.stroke();

  // Centre dot: cx=9 cy=9 r=1.1 fill #ff9a3c
  ctx.fillStyle = '#ff9a3c';
  ctx.beginPath();
  ctx.arc(9 * r, 9 * r, 1.1 * r, 0, Math.PI * 2);
  ctx.fill();

  // Top tick
  ctx.strokeStyle = '#7c5cfc';
  ctx.lineWidth = 1.2 * r;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(9 * r, 3.5 * r);
  ctx.lineTo(9 * r, 2 * r);
  ctx.stroke();

  // Left tick (opacity .6)
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1 * r;
  ctx.beginPath();
  ctx.moveTo(6 * r, 4.5 * r);
  ctx.lineTo(5.3 * r, 3.2 * r);
  ctx.stroke();

  // Right tick (opacity .6)
  ctx.beginPath();
  ctx.moveTo(12 * r, 4.5 * r);
  ctx.lineTo(12.7 * r, 3.2 * r);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Main Renderer ────────────────────────────────────────────────

/**
 * Render a branded SachNetra share card to a canvas.
 * Canvas height is dynamic — fits the content exactly.
 */
export async function renderSachNetraShareCard(data: ShareCardData): Promise<HTMLCanvasElement> {
  await ensureFonts();

  const theme = resolveCardTheme(data.category);
  const t = THEMES[theme];
  const pillLabel = getPillLabel(data.category, theme);

  // ── Step 1: Measure all text to compute total height ───────────
  // We use a temporary offscreen canvas to measure before drawing.
  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = CARD_W;
  measureCanvas.height = 4000; // large enough to measure
  const mc = measureCanvas.getContext('2d')!;

  // Pill row height
  const metaRowH = Math.round(28 * SCALE); // cs-meta row incl margin-bottom: 16px

  // Title lines
  mc.font = `700 ${FS_TITLE}px Syne, system-ui, sans-serif`;
  const titleInnerW = CARD_W - TITLE_PAD_X * 2;
  const titleLines = wrapText(mc, data.title, titleInnerW);
  const titleLineH = Math.round(FS_TITLE * 1.35);
  const titleBlockH = titleLines.length * titleLineH + TITLE_PAD_BOTTOM;

  // WHAT HAPPENED section
  let sectionBlockH = 0;
  let sectionLines: string[] = [];
  const SEC_W = CARD_W - SEC_MARGIN * 2;
  const SEC_BODY_W = SEC_W - SEC_PAD_X * 2;

  if (data.summary) {
    mc.font = `400 ${FS_BODY}px "DM Sans", system-ui, sans-serif`;
    sectionLines = wrapText(mc, data.summary, SEC_BODY_W);
    // Layout: SEC_PAD_Y + label_row(FS_LABEL) + LABEL_BODY_GAP + body_lines + SEC_PAD_Y
    const LABEL_BODY_GAP = Math.round(16 * SCALE); // constant gap between label and body
    const bodyLineH = Math.round(FS_BODY * 1.7);
    sectionBlockH = SEC_PAD_Y + Math.round(FS_LABEL * 1.2) + LABEL_BODY_GAP + sectionLines.length * bodyLineH + SEC_PAD_Y + SEC_MARGIN;
  }

  // Divider + footer
  const dividerH = DIVIDER_MARGIN_V + 1;
  // Footer: icon 34px, brand text stacked, padding
  const ICON_SIZE = Math.round(34 * SCALE);
  const footerInnerH = ICON_SIZE; // icon drives the height
  const footerBlockH = footerInnerH + FOOTER_PAD_BOTTOM;

  // Total card height
  const CARD_H =
    TOPLINE_H +
    HEAD_PAD_TOP +
    metaRowH +
    titleBlockH +
    sectionBlockH +
    dividerH +
    footerBlockH;

  // ── Step 2: Create the real canvas ────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;

  // ── Background (page bg behind card) ──
  ctx.fillStyle = '#0a0812';
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // ── Card with rounded clip ──
  ctx.save();
  roundRect(ctx, 0, 0, CARD_W, CARD_H, CARD_R);
  ctx.clip();

  // Card background
  ctx.fillStyle = '#0f0b1e';
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Subtle border (drawn inside clip)
  ctx.strokeStyle = 'rgba(124,92,252,0.18)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 0, 0, CARD_W, CARD_H, CARD_R);
  ctx.stroke();

  // ── Topline gradient bar ──
  const tg = ctx.createLinearGradient(0, 0, CARD_W, 0);
  for (const stop of t.toplineStops) tg.addColorStop(stop.offset, stop.color);
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0, CARD_W, TOPLINE_H);

  // ── Mesh glow (top-right ambient) ──
  // position: absolute; top: -80px; right: -60px; width: 220px; height: 220px
  const meshCx = CARD_W + Math.round(60 * SCALE);
  const meshCy = -Math.round(80 * SCALE);
  const meshR = Math.round(110 * SCALE);
  const mg = ctx.createRadialGradient(meshCx, meshCy, 0, meshCx, meshCy, meshR);
  mg.addColorStop(0, t.meshColor);
  mg.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = mg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.globalAlpha = 1;

  // ── Pill + Meta row ──
  let y = TOPLINE_H + HEAD_PAD_TOP;

  // Category pill
  ctx.font = `600 ${FS_PILL}px "DM Sans", system-ui, sans-serif`;
  const pillPadX = Math.round(10 * SCALE);
  const pillPadY = Math.round(3 * SCALE);
  const pillTW = ctx.measureText(pillLabel).width;
  const pillW = pillTW + pillPadX * 2;
  const pillH = Math.round(FS_PILL * 1.6);
  const pillY = y;

  ctx.fillStyle = t.pillBg;
  roundRect(ctx, HEAD_PAD_X, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = t.pillBorder;
  ctx.lineWidth = Math.round(0.5 * SCALE);
  roundRect(ctx, HEAD_PAD_X, pillY, pillW, pillH, pillH / 2);
  ctx.stroke();

  // Pill text — vertically centred
  ctx.fillStyle = t.pillColor;
  ctx.font = `600 ${FS_PILL}px "DM Sans", system-ui, sans-serif`;
  ctx.letterSpacing = `${Math.round(0.05 * FS_PILL)}px`;
  ctx.fillText(pillLabel, HEAD_PAD_X + pillPadX, pillY + pillH - pillPadY - 1);
  ctx.letterSpacing = '0px';

  // Dot · Source · Dot · Time (right of pill)
  const dotR = Math.round(1.5 * SCALE); // 3×3px dots from HTML
  const metaY = pillY + pillH / 2;
  let metaX = HEAD_PAD_X + pillW + Math.round(6 * SCALE);

  ctx.font = `400 ${FS_META}px "DM Sans", system-ui, sans-serif`;
  ctx.fillStyle = '#4a4270'; // --text-dim

  // Dot
  ctx.beginPath();
  ctx.arc(metaX + dotR, metaY, dotR, 0, Math.PI * 2);
  ctx.fill();
  metaX += dotR * 2 + Math.round(6 * SCALE);

  // Source
  ctx.fillText(data.source, metaX, pillY + pillH - pillPadY - 1);
  metaX += ctx.measureText(data.source).width + Math.round(6 * SCALE);

  // Dot
  ctx.beginPath();
  ctx.arc(metaX + dotR, metaY, dotR, 0, Math.PI * 2);
  ctx.fill();
  metaX += dotR * 2 + Math.round(6 * SCALE);

  // Time
  ctx.fillText(data.timeAgo, metaX, pillY + pillH - pillPadY - 1);

  y += metaRowH;

  // ── Headline Title ──
  ctx.font = `700 ${FS_TITLE}px Syne, system-ui, sans-serif`;
  ctx.fillStyle = '#f0eaff'; // --text-bright
  ctx.textAlign = 'center';

  const displayTitleLines = titleLines.slice(0, 6);
  if (titleLines.length > 6) {
    let last = displayTitleLines[5] ?? '';
    while (ctx.measureText(last + '…').width > titleInnerW && last.length > 0) last = last.slice(0, -1);
    displayTitleLines[5] = last + '…';
  }

  for (const line of displayTitleLines) {
    y += titleLineH;
    ctx.fillText(line, CARD_W / 2, y);
  }
  ctx.textAlign = 'left';
  y += TITLE_PAD_BOTTOM;

  // ── WHAT HAPPENED Section ──
  if (data.summary && sectionLines.length > 0) {
    const SEC_X = SEC_MARGIN;

    // Explicit layout constants — no ambiguous midpoint math
    const LABEL_BODY_GAP = Math.round(16 * SCALE); // fixed gap between label baseline and body top
    const bodyLineH = Math.round(FS_BODY * 1.7);

    // The label row occupies: FS_LABEL height (text) drawn at SEC_PAD_Y from section top
    const labelBaselineY = y + SEC_PAD_Y + Math.round(FS_LABEL * 1.0); // baseline of label text
    // Body first line baseline = labelBaselineY + fixed gap
    const bodyStartY = labelBaselineY + LABEL_BODY_GAP + Math.round(FS_BODY * 0.85);
    const bodyEndY = bodyStartY + (sectionLines.length - 1) * bodyLineH;
    const SEC_H = (bodyEndY - y) + SEC_PAD_Y; // relative height, not absolute Y

    // Section background
    ctx.fillStyle = t.sectionBg;
    roundRect(ctx, SEC_X, y, SEC_W, SEC_H, SEC_R);
    ctx.fill();
    ctx.strokeStyle = t.sectionBorder;
    ctx.lineWidth = Math.round(0.5 * SCALE);
    roundRect(ctx, SEC_X, y, SEC_W, SEC_H, SEC_R);
    ctx.stroke();

    // Glowing dot — vertically centred on the label baseline
    const dotSx = SEC_X + SEC_PAD_X + Math.round(3 * SCALE);
    const dotSy = labelBaselineY - Math.round(FS_LABEL * 0.3); // vertically centred on label cap
    const DOT_R = Math.round(3 * SCALE);

    ctx.save();
    ctx.shadowColor = t.dotGlow;
    ctx.shadowBlur = Math.round(6 * SCALE);
    if (t.dotColor1 !== t.dotColor2) {
      const dg = ctx.createLinearGradient(dotSx - DOT_R, dotSy, dotSx + DOT_R, dotSy);
      dg.addColorStop(0, t.dotColor1);
      dg.addColorStop(1, t.dotColor2);
      ctx.fillStyle = dg;
    } else {
      ctx.fillStyle = t.dotColor1;
    }
    ctx.beginPath();
    ctx.arc(dotSx, dotSy, DOT_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // "WHAT HAPPENED" label — baseline at labelBaselineY
    const lblX = dotSx + DOT_R + Math.round(7 * SCALE);
    ctx.font = `700 ${FS_LABEL}px "DM Sans", system-ui, sans-serif`;
    ctx.letterSpacing = `${Math.round(0.13 * FS_LABEL)}px`;
    ctx.fillStyle = t.labelColor;
    ctx.shadowColor = t.labelShadow;
    ctx.shadowBlur = Math.round(8 * SCALE);
    ctx.fillText('WHAT HAPPENED', lblX, labelBaselineY);
    ctx.shadowBlur = 0;
    ctx.letterSpacing = '0px';

    // Body text — starts at bodyStartY, fixed gap below label
    ctx.font = `400 ${FS_BODY}px "DM Sans", system-ui, sans-serif`;
    ctx.fillStyle = '#d0c8f0'; // brighter than #9085c0 for readability
    let bodyY = bodyStartY;
    for (const line of sectionLines) {
      ctx.fillText(line, SEC_X + SEC_PAD_X, bodyY);
      bodyY += bodyLineH;
    }

    y += SEC_H + SEC_MARGIN;
  }

  // ── Divider ──
  // background: linear-gradient(90deg, transparent, var(--border), transparent)
  y += Math.round(2 * SCALE); // margin-top: 2px
  const dg2 = ctx.createLinearGradient(0, 0, CARD_W, 0);
  dg2.addColorStop(0, 'transparent');
  dg2.addColorStop(0.3, 'rgba(124,92,252,0.18)');
  dg2.addColorStop(0.7, 'rgba(124,92,252,0.18)');
  dg2.addColorStop(1, 'transparent');
  ctx.fillStyle = dg2;
  ctx.fillRect(0, y, CARD_W, 1);
  y += Math.round(14 * SCALE); // margin-bottom: 14px

  // ── Footer ──
  // card-footer: display flex; align-items center; justify-content space-between
  // padding: 0 18px 18px
  const ICON_SZ = ICON_SIZE;            // 34px scaled
  const ICON_R2 = Math.round(10 * SCALE);
  const iconX = FOOTER_PAD_X;
  const iconY_pos = y;

  // Brand icon box: gradient bg + border
  const ibg = ctx.createLinearGradient(iconX, iconY_pos, iconX + ICON_SZ, iconY_pos + ICON_SZ);
  ibg.addColorStop(0, 'rgba(124,92,252,0.25)');
  ibg.addColorStop(1, 'rgba(255,154,60,0.15)');
  ctx.fillStyle = ibg;
  roundRect(ctx, iconX, iconY_pos, ICON_SZ, ICON_SZ, ICON_R2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(124,92,252,0.3)';
  ctx.lineWidth = Math.round(0.5 * SCALE);
  roundRect(ctx, iconX, iconY_pos, ICON_SZ, ICON_SZ, ICON_R2);
  ctx.stroke();

  // Eye logo centred in the icon box
  const logoCx = iconX + ICON_SZ / 2;
  const logoCy = iconY_pos + ICON_SZ / 2;
  drawLogo(ctx, logoCx, logoCy, Math.round(18 * SCALE));

  // Brand name + sub-text
  const brandTxtX = iconX + ICON_SZ + Math.round(9 * SCALE);
  ctx.font = `700 ${FS_BRAND}px Syne, system-ui, sans-serif`;
  ctx.fillStyle = '#f0eaff';
  ctx.letterSpacing = `${Math.round(0.03 * FS_BRAND)}px`;
  ctx.fillText('SachNetra', brandTxtX, iconY_pos + Math.round(FS_BRAND * 0.85));
  ctx.letterSpacing = '0px';

  ctx.font = `400 ${FS_SUB}px "DM Sans", system-ui, sans-serif`;
  ctx.fillStyle = '#4a4270';
  ctx.fillText('सच्चनेत्र · See clearly', brandTxtX, iconY_pos + Math.round(FS_BRAND * 0.85) + Math.round(FS_SUB * 1.5));

  // sachnetra.com right-aligned
  const urlLabel = 'sachnetra.com';
  ctx.font = `400 ${FS_SUB}px "DM Sans", system-ui, sans-serif`;
  ctx.letterSpacing = `${Math.round(0.04 * FS_SUB)}px`;
  ctx.fillStyle = '#4a4270';
  const urlW = ctx.measureText(urlLabel).width;
  ctx.fillText(urlLabel, CARD_W - FOOTER_PAD_X - urlW, iconY_pos + Math.round(ICON_SZ / 2 + FS_SUB * 0.4));
  ctx.letterSpacing = '0px';

  ctx.restore(); // end card clip

  return canvas;
}

// ── Share Function ───────────────────────────────────────────────

/**
 * Generate and share a branded SachNetra story card as a PNG image.
 * Fallback chain: Web Share API → clipboard → download.
 */
export async function shareStoryCard(data: ShareCardData): Promise<void> {
  const canvas = await renderSachNetraShareCard(data);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas toBlob returned null'));
    }, 'image/png');
  });

  const file = new File([blob], `sachnetra-story-${Date.now()}.png`, { type: 'image/png' });

  // Use `url` field so WhatsApp attaches the link below the card image
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      const payload: ShareData = { files: [file] };
      if (data.storyUrl) payload.url = data.storyUrl;
      await navigator.share(payload);
      return;
    } catch { /* user cancelled — fall through */ }
  }

  // Clipboard fallback
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return;
  } catch { /* fall through to download */ }

  // Download fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sachnetra-story-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
