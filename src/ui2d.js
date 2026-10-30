// 平面 UI：槽位 + 炮台 + 库存（对齐参考广告的「扁平 UI」透视）
// 画布 720×1280 分区（实测 detail_02s）：
//   title 0–70 | target 70–700 | slots ~700–850 | inv ~860–1260
import { colorHex, PALETTE } from './three/scene3d.js';
import { SLOTS } from './level.js';

export const UI = {
  titleY: 52,
  titleSize: 46,
  // 5 槽横条（对齐 detail_02s）
  slotY: 728,
  slotH: 118,
  slotW: 114,
  slotGap: 12,
  // 库存 4×4 — 贴紧参考的大方块
  invTop: 855,
  invCell: 96,
  invGap: 10,
};

export function slotRects() {
  const total = SLOTS * UI.slotW + (SLOTS - 1) * UI.slotGap;
  const x0 = (720 - total) / 2;
  return Array.from({ length: SLOTS }, (_, i) => ({
    i,
    x: x0 + i * (UI.slotW + UI.slotGap),
    y: UI.slotY,
    w: UI.slotW,
    h: UI.slotH,
  }));
}

export function invRects(cols, rows) {
  const cell = UI.invCell, gap = UI.invGap;
  const tw = cols * cell + (cols - 1) * gap;
  const x0 = (720 - tw) / 2;
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    out.push({
      vi: r * cols + c, col: c, row: r,
      x: x0 + c * (cell + gap),
      y: UI.invTop + r * (cell + gap),
      w: cell, h: cell,
    });
  }
  return out;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  let g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  let b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

function drawToyBlock(ctx, x, y, w, h, hex, num, opts = {}) {
  const r = opts.radius ?? Math.min(22, w * 0.22);
  // 槽底阴影
  if (opts.shadow !== false) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    roundRect(ctx, x + 3, y + 6, w, h, r); ctx.fill();
  }
  // 主体渐变（顶亮底暗，塑料感）
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, shade(hex, 1.18));
  g.addColorStop(0.45, hex);
  g.addColorStop(1, shade(hex, 0.72));
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, r); ctx.fill();
  // 描边
  ctx.strokeStyle = 'rgba(10,12,20,0.55)';
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, w, h, r); ctx.stroke();
  // 顶高光
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  roundRect(ctx, x + w * 0.12, y + h * 0.08, w * 0.76, h * 0.22, r * 0.6); ctx.fill();
  // 双柱炮口（对齐参考 LEGO 感）
  if (opts.barrel) {
    const by = y + 4;
    ctx.fillStyle = shade(hex, 0.82);
    for (const dx of [-18, 18]) {
      const bx = x + w / 2 + dx * 0.35;
      roundRect(ctx, bx - 9, by - 16, 18, 20, 5); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(bx, by - 16, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shade(hex, 0.82);
    }
  }
  // 数字 — 大白字黑描边，贴在正面中央（对齐参考）
  if (num != null) {
    const fs = Math.floor(h * (opts.numScale || 0.42));
    ctx.font = `900 ${fs}px "Arial Black","Helvetica Neue",Arial,"Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tx = x + w / 2, ty = y + h * (opts.barrel ? 0.58 : 0.55);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(6, fs * 0.16);
    ctx.strokeStyle = '#101018';
    ctx.strokeText(String(num), tx, ty);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(num), tx, ty);
  }
}


/** 仅画空槽凹槽（炮台本身走 3D） */
export function drawEmptySlots(ctx, S, slotsState) {
  const rects = slotRects();
  for (const r of rects) {
    ctx.fillStyle = S.slotColor || '#15263E';
    roundRect(ctx, r.x, r.y, r.w, r.h, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 2;
    roundRect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 16); ctx.stroke();
  }
  return rects;
}

export function drawSlotsBar(ctx, S, slotsState, nowMs = 0) {
  const rects = slotRects();
  for (const r of rects) {
    ctx.fillStyle = S.slotColor || '#15263E';
    roundRect(ctx, r.x, r.y, r.w, r.h, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    roundRect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 16); ctx.stroke();
    const sh = slotsState[r.i];
    if (!sh) continue;
    const hex = colorHex(S, sh.name || 'green');
    const pad = 8;
    let op = 1, dy = 0;
    if (sh.state === 'leaving') {
      const u = Math.min(1, (nowMs - (sh.leaveT0 || 0)) / (S.leaveDur || 280));
      op = 1 - u; dy = u * 30;
    }
    ctx.globalAlpha = op;
    drawToyBlock(ctx, r.x + pad, r.y + pad + dy, r.w - pad * 2, r.h - pad * 2, hex, Math.max(0, sh.left|0), { barrel: true, numScale: 0.38 });
    ctx.globalAlpha = 1;
  }
  return rects;
}

export function drawInventory(ctx, S, invBlocks, cols, rows) {
  const rects = invRects(cols, rows);
  const vis = invBlocks.filter(b => b.state === 'inv').slice(0, cols * rows);
  rects.forEach((r, i) => {
    const b = vis[i];
    if (!b) return;
    const hex = colorHex(S, b.name || PALETTE.green && 'green');
    drawToyBlock(ctx, r.x, r.y, r.w, r.h, hex, b.left, { barrel: false, numScale: 0.4 });
  });
  return { rects, vis };
}

export function drawTitle(ctx, S) {
  const text = S.titleText || '这游戏太上头了';
  const size = S.titleSize || UI.titleSize;
  ctx.save();
  ctx.font = `900 ${size}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const y = S.titleY || UI.titleY;
  // 参考：顶部白底横幅 + 黑字
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 36, y - size * 0.72, 720 - 72, size * 1.45, 8); ctx.fill();
  ctx.fillStyle = S.titleColor || '#0a0a0a';
  ctx.fillText(text, 360, y);
  ctx.restore();
}

export function hitInvAt(x, y, cols, rows, invBlocks) {
  const { rects, vis } = { rects: invRects(cols, rows), vis: invBlocks.filter(b => b.state === 'inv').slice(0, cols * rows) };
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i], b = vis[i];
    if (!b) continue;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return { gi: b.gi, rect: r, block: b };
  }
  return null;
}

export function muzzleOfSlot(si) {
  const r = slotRects()[si];
  return { x: r.x + r.w / 2, y: r.y + 10 };
}

export function invCellCenter(vi, cols, rows) {
  const r = invRects(cols, rows)[vi];
  if (!r) return { x: 360, y: 1000 };
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
