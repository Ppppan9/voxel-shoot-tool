import { GROUPS, DEFS, loadSettings, saveSettings, migrate, exportJSON, APP_ID } from './settings.js';
import { Sfx } from './audio.js';
import { DEFAULT_HAND } from './default_hand.js';
import { createWorld, DW, DH, SH } from './world.js';
import { create3D, makeShooter, geos, colorHex } from './three/scene3d.js';
import {
  makeLevel, PRESETS, PRESET_ORDER, initState, removeVoxel, pickTarget, isShootable,
  coords, idx, SLOTS, shapeSphereCage, simulate,
} from './level.js';
import { createAERecorder } from './ae/recorder.js';
import { buildSprites } from './ae/sprites3d.js';
import { export3D } from './export3d/export3d.js';
import { exportH5PlayableFromPage, applyPlayableMode, isPlayableNoHand, applyH5DevicePresetToSettings, markH5DeviceCustomIfSizeEdited, bindEditorDevicePreview } from './h5/index.js';

const H5_NO_HAND = isPlayableNoHand();
let S = loadSettings();
const cv = document.getElementById('stage'); let ctx = cv.getContext('2d');
const sfx = new Sfx();
const now = () => window.__vclock != null ? window.__vclock : performance.now();
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
const easeIO = t => { t = clamp01(t); return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
const easeOut = t => 1 - Math.pow(1 - clamp01(t), 3);
const status = t => { document.getElementById('status').textContent = t; };
const hand = { x: 360, y: 1100, press: 0, pressT0: null, img: null, visible: false, follow: null };
const ripples = [];
const view = () => { const k = cv.width / DW; return { k, oy: (cv.height - DH * k) / 2 }; };

let L = null, st = null, Wd = null, G = null, r3d = null;
let finishedAt = 0, failedAt = 0, lastT = 0, ballSeq = 0, shotSfxT = [];
let autoRunning = false, autoToken = 0;
let rec = null, aeLastRec = null, recClosed = false;

function makeLevelFromSettings() {
  const id = S.level === 'random' ? PRESET_ORDER[S.seed % PRESET_ORDER.length] : S.level;
  const o = { seed: S.seed, maxAmmo: S.maxAmmo, ammoStep: S.ammoStep, startSlots: S.startSlots };
  if (S.level === 'random') {
    const base = (PRESETS[id] || shapeSphereCage)({ seed: S.seed });
    // 轻扰动：把部分体素换色
    const L0 = makeLevel(id, o);
    return L0;
  }
  return makeLevel(id, o);
}

function newGame() {
  autoToken++; autoRunning = false; updAutoBtn();
  startLevel(makeLevelFromSettings());
  status(`关卡 ${L.title || L.shapeId} · ${L.voxels} 体素 · 库存 ${L.inventory.length + (L.preSlots||[]).length} 块`);
}

function startLevel(Lnew) {
  L = Lnew; st = initState(L); finishedAt = 0; failedAt = 0;
  window.__finished = false; window.__failed = false; lastT = now(); ballSeq = 0;
  G = {
    slots: new Array(SLOTS).fill(null),
    inv: L.inventory.map((b, i) => ({ ...b, left: b.ammo, gi: i, state: 'inv' })),
    balls: [], pops: [], debris: [], flyers: [],
    rotY: 0, t0: now(),
  };
  // 预填槽位
  (L.preSlots || []).forEach((b, i) => {
    if (i >= SLOTS) return;
    G.slots[i] = { id: 'pre_' + i, color: b.color, name: L.palette[b.color], left: b.ammo, ammo0: b.ammo, state: 'slot', si: i, t0: now(), fireNext: now() + 200, yaw: 0, recoil: 0 };
  });
  rebuild();
}

function rebuild() {
  Wd = createWorld(S, L);
  if (!r3d) r3d = create3D();
  r3d.setup(S, L, Wd);
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const w = Math.round(S.canvasW * dpr), h = Math.round(S.canvasH * dpr);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  cv.style.aspectRatio = S.canvasW + '/' + S.canvasH;
}

function bobY(id, t) {
  const ph = (id.toString().charCodeAt(0) || 0) * 0.7;
  return Math.sin(t / S.bobPeriod * Math.PI * 2 + ph) * S.bobAmp;
}

function slotWorld(si, t, sh) {
  const [x, z] = Wd.slots[si];
  const y = Wd.slotY + (sh ? bobY(sh.id, t) : 0) - (sh?.recoil || 0);
  return { x, y, z };
}

function invWorld(gi) {
  const { cols, rows } = L.grid;
  const col = gi % cols, row = Math.floor(gi / cols);
  return Wd.gridPos(col, row, cols, rows);
}

function rotatePoint(p, rotY) {
  const c = Math.cos(rotY), s = Math.sin(rotY);
  return [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c];
}

function worldOfVox(n, rotY) {
  const p = Wd.vox(n);
  return rotatePoint(p, rotY);
}

function sphereHitsVox(p, r, skip, rotY) {
  // 粗略：遍历外露，检查距离
  const rr = (r + Wd.vs * 0.55) ** 2;
  let best = null, bd = 1e18;
  for (let c = 0; c < L.palette.length; c++) {
    for (const m of st.exp[c]) {
      if (m === skip || !st.vox[m]) continue;
      const w = worldOfVox(m, rotY);
      const d = (w[0] - p[0]) ** 2 + (w[1] - p[1]) ** 2 + (w[2] - p[2]) ** 2;
      if (d < rr && d < bd) { bd = d; best = { n: m, p: w }; }
    }
  }
  return best;
}

function ballPath(p0, p1, arc) {
  const mx = (p0[0] + p1[0]) / 2, my = Math.max(p0[1], p1[1]) + arc, mz = (p0[2] + p1[2]) / 2;
  return u => {
    const a = 1 - u, b = u;
    return [
      a * a * p0[0] + 2 * a * b * mx + b * b * p1[0],
      a * a * p0[1] + 2 * a * b * my + b * b * p1[1],
      a * a * p0[2] + 2 * a * b * mz + b * b * p1[2],
    ];
  };
}

function playShot(t) {
  shotSfxT = shotSfxT.filter(x => t - x < 1000);
  if (shotSfxT.length < S.sfxShootMax) { shotSfxT.push(t); sfx.play('shoot', S); }
}

function tapInv(gi) {
  if (finishedAt || failedAt) return false;
  const b = G.inv.find(x => x.gi === gi && x.state === 'inv');
  if (!b) return false;
  const si = G.slots.findIndex(s => !s);
  if (si < 0) { sfx.play('error', S); status('没有空槽'); return false; }
  b.state = 'flying';
  const from = invWorld(gi);
  const to = slotWorld(si, now(), null);
  G.flyers.push({
    id: 'fly_' + b.id, color: b.color, name: b.name, ammo: b.left, gi, si,
    t0: now(), dur: S.flyDur, from, to: [to.x, to.y, to.z],
  });
  G.inv = G.inv.filter(x => x.gi !== gi);
  // 后面的库存前移（视觉上留下空位也行——保持原位置更贴近广告）
  sfx.play('pop', S);
  return true;
}

function hitInv(x, y) {
  // 屏幕点 → 最近库存块
  let best = -1, bd = 40 * 40;
  for (const b of G.inv) {
    if (b.state !== 'inv') continue;
    const w = invWorld(b.gi);
    const p = Wd.proj(w[0], w[1] + 0.4, w[2]);
    const d = (p[0] - x) ** 2 + (p[1] - y) ** 2;
    if (d < bd) { bd = d; best = b.gi; }
  }
  return best;
}

function tapAt(x, y) {
  sfx.resume();
  if (S.tapRipple) ripples.push({ x, y, t0: now() });
  if (finishedAt || failedAt) return false;
  const gi = hitInv(x, y);
  if (gi >= 0) return tapInv(gi);
  return false;
}

function pickTargetLOS(sh, muz, rotY) {
  const m = pickTarget(L, st, sh.color, muz[0], muz[1], muz[2], n => worldOfVox(n, rotY));
  if (m < 0) return null;
  const p1 = worldOfVox(m, rotY);
  // 瞄准外表面法线近似：从球心指向外
  const nrm = [p1[0], p1[1] - Wd.targetY, p1[2]];
  const nl = Math.hypot(...nrm) || 1;
  nrm[0] /= nl; nrm[1] /= nl; nrm[2] /= nl;
  const hit = [p1[0] + nrm[0] * Wd.vs * 0.4, p1[1] + nrm[1] * Wd.vs * 0.4, p1[2] + nrm[2] * Wd.vs * 0.4];
  return { m, p: hit, nrm, path: ballPath(muz, hit, S.ballArc) };
}

function step(t) {
  const dt = Math.min(50, t - lastT); lastT = t;
  G.rotY += (S.targetRotSpeed * Math.PI / 180) * (dt / 1000);

  // 飞入完成 → 入槽
  for (let i = G.flyers.length - 1; i >= 0; i--) {
    const f = G.flyers[i];
    if (t - f.t0 < f.dur) continue;
    G.slots[f.si] = {
      id: 'sh_' + f.id, color: f.color, name: f.name, left: f.ammo, ammo0: f.ammo,
      state: 'slot', si: f.si, t0: t, fireNext: t + 80, yaw: 0, recoil: 0,
    };
    G.flyers.splice(i, 1);
  }

  // 射击
  for (const sh of G.slots) {
    if (!sh || sh.state !== 'slot' || sh.left <= 0) continue;
    if (t < sh.fireNext) continue;
    // 该色是否还有可打
    let can = false;
    for (const m of st.exp[sh.color]) if (isShootable(L, st, m)) { can = true; break; }
    if (!can) continue;
    const sw = slotWorld(sh.si, t, sh);
    const muz = Wd.muzzleOf(sw.x, sw.z);
    const tg = pickTargetLOS(sh, muz, G.rotY);
    if (!tg) continue;
    st.claimed[tg.m] = 1;
    const len = Math.hypot(tg.p[0] - muz[0], tg.p[1] - muz[1], tg.p[2] - muz[2]);
    G.balls.push({
      id: 'ball_' + (++ballSeq), ph: 'fly', t0: t,
      dur: Math.max(80, len / S.ballSpeed * 1000),
      path: tg.path, m: tg.m, nrm: tg.nrm, sh, pos: muz.slice(),
    });
    sh.left--; sh.fireNext = t + 1000 / S.fireRate; sh.recoil = S.recoil;
    // 转向
    sh.yaw = Math.atan2(tg.p[0] - muz[0], -(tg.p[2] - muz[2]));
    playShot(t);
    if (sh.left <= 0) {
      sh.state = 'leaving'; sh.leaveT0 = t;
    }
  }

  // 球飞行 / 命中
  for (let i = G.balls.length - 1; i >= 0; i--) {
    const b = G.balls[i];
    const u = clamp01((t - b.t0) / b.dur);
    b.pos = b.path(u);
    if (u < 1) continue;
    // 命中
    if (st.vox[b.m]) {
      const col = st.vox[b.m] - 1;
      const name = L.palette[col];
      const wp = worldOfVox(b.m, G.rotY);
      removeVoxel(L, st, b.m);
      G.pops.push({ n: b.m, t0: t, color: name, w: wp });
      for (let k = 0; k < S.debrisCount; k++) {
        const ang = Math.random() * Math.PI * 2, elev = Math.random() * Math.PI * 0.6;
        const sp = (0.6 + Math.random()) * S.debrisSpread * 8;
        G.debris.push({
          id: 'd_' + ballSeq + '_' + k, color: name, t0: t,
          p: wp.slice(),
          v: [Math.cos(ang) * Math.cos(elev) * sp, Math.sin(elev) * sp + 4, Math.sin(ang) * Math.cos(elev) * sp],
        });
      }
      sfx.play('hit', S);
    } else st.claimed[b.m] = 0;
    G.balls.splice(i, 1);
  }

  // 离场
  for (let i = 0; i < SLOTS; i++) {
    const sh = G.slots[i];
    if (!sh || sh.state !== 'leaving') continue;
    if (t - sh.leaveT0 >= S.leaveDur) {
      G.slots[i] = null;
      sfx.play('whoosh', S);
    }
  }

  // 碎屑
  for (let i = G.debris.length - 1; i >= 0; i--) {
    const d = G.debris[i];
    const age = t - d.t0;
    if (age > S.debrisLife) { G.debris.splice(i, 1); continue; }
    const dt2 = dt / 1000;
    d.v[1] -= S.gravity * dt2;
    d.p[0] += d.v[0] * dt2; d.p[1] += d.v[1] * dt2; d.p[2] += d.v[2] * dt2;
  }
  G.pops = G.pops.filter(p => t - p.t0 < S.popDur + 50);

  // 后坐衰减
  for (const sh of G.slots) if (sh && sh.recoil) sh.recoil *= 0.85;

  // 通关 / 失败
  if (!finishedAt && !failedAt && S.winEnabled && st.total === 0 && !G.balls.length) {
    finishedAt = t; window.__finished = true; sfx.play('chime', S); status(S.winText || '通关！');
    if (rec && S.autoStop) setTimeout(stopRec, S.tailSec * 1000 + (S.endCard ? S.endDelay : 0));
  }
  if (!finishedAt && !failedAt && S.loseRule === 'on') {
    const emptySlot = G.slots.some(s => !s);
    const flying = G.flyers.length || G.balls.length;
    const canFire = G.slots.some(sh => {
      if (!sh || sh.left <= 0 || sh.state !== 'slot') return false;
      for (const m of st.exp[sh.color]) if (isShootable(L, st, m)) return true;
      return false;
    });
    const canPlace = emptySlot && G.inv.some(b => b.state === 'inv');
    if (!flying && !canFire && !canPlace && st.total > 0) {
      // 还有库存但槽满且都不能打 → 失败
      const full = G.slots.every(s => s);
      if (full || (!emptySlot && !canFire)) {
        failedAt = t; window.__failed = true; sfx.play('error', S);
        status(S.loseText || '没有空位了');
      }
    }
  }
}

function voxGroups(t) {
  const groups = L.palette.map(() => []);
  const popping = new Map(G.pops.map(p => [p.n, p]));
  for (let c = 0; c < L.palette.length; c++) {
    for (const m of st.exp[c]) {
      if (!st.vox[m]) continue;
      const pop = popping.get(m);
      if (pop) {
        const u = clamp01((t - pop.t0) / S.popDur);
        const jelly = 1 + S.jellyPop * Math.sin(u * Math.PI) * (1 - u);
        const s = Math.max(0.01, (1 - easeOut(u)) * jelly);
        groups[c].push([m, s, s * (1 + 0.3 * Math.sin(u * Math.PI)), s]);
      } else groups[c].push([m, 1]);
    }
  }
  // 正在消除但已从 exp 移除的
  for (const p of G.pops) {
    if (st.vox[p.n]) continue;
    const c = L.palette.indexOf(p.color);
    if (c < 0) continue;
    const u = clamp01((t - p.t0) / S.popDur);
    const s = Math.max(0.01, 1 - easeOut(u));
    groups[c].push([p.n, s, s * 1.2, s * 0.7]);
  }
  return groups;
}

function scene(t) {
  const items = [];
  // 背景（2D）
  items.push({ id: 'background', asset: 'background', x: 0, y: 0, sx: 1, sy: 1, rot: 0, op: 1, z: -100 });

  // 槽位炮台
  G.slots.forEach((sh, si) => {
    if (!sh) return;
    const sw = slotWorld(si, t, sh);
    let op = 1, ws = 1, wy = sw.y;
    if (sh.state === 'leaving') {
      const u = clamp01((t - sh.leaveT0) / S.leaveDur);
      op = 1 - easeOut(u); ws = 1 - 0.3 * u; wy -= u * 2;
    }
    const p = Wd.proj(sw.x, wy + SH.h * 0.5, sw.z);
    items.push({
      id: sh.id, asset: 'shooter_' + sh.name, x: p[0], y: p[1], sx: 1, sy: 1, rot: 0, op,
      z: 20 + si, w: [sw.x, wy, sw.z], ws, num: sh.left, numOp: op,
      bodyYaw: sh.yaw || 0, turretYaw: sh.yaw || 0, ry: 0,
    });
  });

  // 飞入中
  for (const f of G.flyers) {
    const u = easeIO(clamp01((t - f.t0) / f.dur));
    const x = f.from[0] + (f.to[0] - f.from[0]) * u;
    const z = f.from[2] + (f.to[2] - f.from[2]) * u;
    const y = f.from[1] + (f.to[1] - f.from[1]) * u + Math.sin(u * Math.PI) * S.flyArc;
    const p = Wd.proj(x, y, z);
    items.push({
      id: f.id, asset: 'inv_' + f.name, x: p[0], y: p[1], sx: 1, sy: 1, rot: 0, op: 1, z: 30,
      w: [x, y, z], ws: 1, num: f.ammo, numOp: 1,
    });
  }

  // 库存
  for (const b of G.inv) {
    if (b.state !== 'inv') continue;
    const w = invWorld(b.gi);
    const p = Wd.proj(w[0], w[1], w[2]);
    items.push({
      id: 'inv_' + b.id, asset: 'inv_' + b.name, x: p[0], y: p[1], sx: 1, sy: 1, rot: 0, op: 1, z: 10 + b.gi,
      w: [w[0], w[1], w[2]], ws: 1, num: b.left, numOp: 1,
    });
  }

  // 球
  for (const b of G.balls) {
    const p = Wd.proj(...b.pos);
    items.push({ id: b.id, asset: 'ball', x: p[0], y: p[1], sx: 1, sy: 1, rot: 0, op: 1, z: 50, w: b.pos.slice(), ws: 1 });
  }
  // 碎屑
  for (const d of G.debris) {
    const u = clamp01((t - d.t0) / S.debrisLife);
    const p = Wd.proj(...d.p);
    items.push({
      id: d.id, asset: 'debris_' + d.color, x: p[0], y: p[1], sx: 1, sy: 1, rot: u * 4, op: 1 - u, z: 40,
      w: d.p.slice(), ws: S.debrisSize * (1 - u * 0.4),
    });
  }
  return items;
}

function endAlpha(t) {
  const e = finishedAt || failedAt;
  return e && S.endCard && t - e > S.endDelay ? Math.min(1, (t - e - S.endDelay) / 400) : 0;
}

function draw(t) {
  const v = view();
  const items = scene(t);
  draw.items = items;
  // 清背景
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = S.bgColor || '#1a2744';
  ctx.fillRect(0, 0, cv.width, cv.height);

  // 3D
  if (r3d && !window.__no3d) {
    const img = r3d.render({ items, vox: voxGroups(t), rotY: G.rotY }, S, Math.round(DW * v.k), Math.round(DH * v.k));
    ctx.drawImage(img, 0, v.oy, DW * v.k, DH * v.k);
  }

  // 2D 叠加：标题
  ctx.save();
  ctx.setTransform(v.k, 0, 0, v.k, 0, v.oy);
  ctx.fillStyle = S.titleColor || '#0a0a0a';
  ctx.font = `900 ${S.titleSize}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(S.titleText || '这游戏太上头了', DW / 2, S.titleY);

  // 波纹
  for (const r of ripples) {
    const u = (t - r.t0) / 400; if (u > 1) continue;
    ctx.beginPath(); ctx.arc(r.x, r.y, 20 + u * 40, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${1 - u})`; ctx.lineWidth = 3; ctx.stroke();
  }
  // 过滤过期 ripple
  for (let i = ripples.length - 1; i >= 0; i--) if (t - ripples[i].t0 > 400) ripples.splice(i, 1);

  if (S.discShow) {
    ctx.globalAlpha = 0.7; ctx.fillStyle = '#fff';
    ctx.font = `${S.discSize}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(S.discText, DW / 2, DH - S.discY);
    ctx.globalAlpha = 1;
  }

  // 通关/失败字
  if (finishedAt || failedAt) {
    const e = finishedAt || failedAt;
    const a = Math.min(1, (t - e) / 300);
    ctx.globalAlpha = a;
    ctx.fillStyle = finishedAt ? '#ffe66d' : '#ff6b6b';
    ctx.font = '900 64px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(finishedAt ? (S.winText || '通关！') : (S.loseText || '没有空位了'), DW / 2, DH * 0.42);
    ctx.globalAlpha = 1;
  }

  const ea = endAlpha(t);
  if (ea > 0) {
    ctx.globalAlpha = ea;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, DW, DH);
    ctx.fillStyle = '#fff'; ctx.font = '900 48px "PingFang SC",sans-serif';
    ctx.fillText(S.endTitle || '立即下载', DW / 2, DH * 0.45);
    ctx.fillStyle = '#3ecf5a';
    roundRect(ctx, DW / 2 - 160, DH * 0.55, 320, 90, 45); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '900 40px sans-serif';
    ctx.fillText(S.h5CtaText || '立即下载', DW / 2, DH * 0.55 + 48);
    ctx.globalAlpha = 1;
  }

  // 手指
  const hs = handState();
  if (hs && hand.img) drawHand(ctx, hs);
  ctx.restore();
  updateCursor();
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function handScaleOf() { return hand.img ? S.handSize * DW / hand.img.width : 1; }
const handHiddenByEnd = () => !S.endCardHand && endAlpha(now()) > 0;
function handState() {
  if (H5_NO_HAND || !S.handShow || !hand.img || !hand.visible || handHiddenByEnd()) return null;
  if (!autoRunning && !S.manualHand) return null;
  return { x: hand.x, y: hand.y, s: handScaleOf() * (1 - S.pressDepth * hand.press) };
}
function drawHand(g, h) {
  const im = hand.img, w = im.width * h.s, hh = im.height * h.s;
  g.save(); g.translate(h.x, h.y); g.rotate(S.handRotation * Math.PI / 180);
  if (S.handFlip) g.scale(-1, 1);
  g.drawImage(im, -S.handAnchorX * w, -S.handAnchorY * hh, w, hh); g.restore();
}
function handCursorHidden() {
  return !H5_NO_HAND && !!(S.hideCursor && S.handShow && hand.img && !handHiddenByEnd() && (autoRunning ? hand.visible : S.manualHand && hand.visible));
}
function updateCursor() { const c = handCursorHidden() ? 'none' : 'pointer'; if (cv.style.cursor !== c) cv.style.cursor = c; }
function updPress(t) {
  if (!S.pressEnabled || hand.pressT0 == null) { hand.press = 0; return; }
  const p = (t - hand.pressT0) / 180;
  hand.press = p < 0 || p > 1 ? (hand.follow ? 1 : 0) : (hand.follow && p > 0.5 ? 1 : Math.sin(Math.PI * p));
}

function evtPos(e) {
  const r = cv.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width * cv.width, py = (e.clientY - r.top) / r.height * cv.height;
  const v = view();
  return { x: px / v.k, y: (py - v.oy) / v.k };
}
cv.addEventListener('pointerdown', e => {
  const p = evtPos(e); hand.x = p.x; hand.y = p.y;
  if (S.manualHand) { hand.visible = true; hand.pressT0 = now(); }
  tapAt(p.x, p.y);
});
cv.addEventListener('pointermove', e => {
  if (!S.manualHand && !autoRunning) return;
  const p = evtPos(e); hand.x = p.x; hand.y = p.y; if (S.manualHand) hand.visible = true;
});

const wait = (ms, tok) => new Promise((res, rej) => {
  const t0 = now(), f = () => { if (tok !== autoToken) return rej('stop'); if (now() - t0 >= ms / S.autoSpeed) return res(); requestAnimationFrame(f); }; f();
});
const rr = (a, b) => a + Math.random() * Math.max(0, b - a);
async function moveHand(tx, ty, tok) {
  hand.visible = true; hand.follow = true;
  const x0 = hand.x, y0 = hand.y, dur = rr(S.moveMin, S.moveMax);
  const t0 = now();
  await new Promise((res, rej) => {
    const f = () => {
      if (tok !== autoToken) return rej('stop');
      const u = easeIO(clamp01((now() - t0) / (dur / S.autoSpeed)));
      hand.x = x0 + (tx - x0) * u; hand.y = y0 + (ty - y0) * u;
      if (u >= 1) return res();
      requestAnimationFrame(f);
    }; f();
  });
  hand.follow = null;
}
function nextAuto() {
  // 选「外露可打最多」的库存色 → 点它
  if (G.slots.every(s => s) || !G.inv.length) return null;
  let best = null, ba = -1;
  for (const b of G.inv) {
    if (b.state !== 'inv') continue;
    let a = 0; for (const m of st.exp[b.color]) if (isShootable(L, st, m)) a++;
    // 偏好与已有槽不同色也行，优先能打的
    if (a > ba) { ba = a; best = b; }
  }
  if (!best) best = G.inv.find(b => b.state === 'inv');
  if (!best) return null;
  const w = invWorld(best.gi);
  const p = Wd.proj(w[0], w[1] + 0.3, w[2]);
  return { gi: best.gi, x: p[0] + rr(-S.jitter, S.jitter), y: p[1] + rr(-S.jitter, S.jitter) };
}
async function autoSolve() {
  if (autoRunning) { autoToken++; autoRunning = false; updAutoBtn(); return; }
  autoRunning = true; autoToken++; const tok = autoToken; updAutoBtn();
  sfx.resume();
  if (S.autoRec && !rec) startRec();
  hand.visible = true; hand.x = DW * 0.75; hand.y = DH * 0.85;
  try {
    await wait(S.autoStartDelay, tok);
    while (tok === autoToken && !finishedAt && !failedAt) {
      // 等飞入/射击消化一点
      if (G.flyers.length) { await wait(80, tok); continue; }
      if (G.slots.some(s => !s) && G.inv.some(b => b.state === 'inv')) {
        if (Math.random() < S.thinkChance) await wait(rr(0, S.thinkMax), tok);
        const n = nextAuto();
        if (!n) { await wait(200, tok); continue; }
        await moveHand(n.x, n.y, tok);
        hand.pressT0 = now();
        tapInv(n.gi);
        await wait(rr(S.delayMin, S.delayMax), tok);
      } else {
        // 等待射击清空或离场腾槽
        if (S.handRest) { hand.x = DW * 0.82; hand.y = DH * 0.78; }
        await wait(180, tok);
        // 死局
        if (!G.balls.length && !G.flyers.length && G.slots.every(s => s && (s.left <= 0 || s.state === 'leaving' || ![...st.exp[s.color]].some(m => isShootable(L, st, m)))) && !G.inv.length) break;
      }
    }
  } catch (e) { if (e !== 'stop') console.warn(e); }
  if (tok === autoToken) { autoRunning = false; updAutoBtn(); if (!S.manualHand) hand.visible = false; }
}
function updAutoBtn() {
  const b = document.getElementById('btnAuto');
  if (b) { b.textContent = autoRunning ? '■ 停止' : '▶ 自动通关'; b.classList.toggle('on', autoRunning); }
}

function pickMime() {
  const prefer = S.recFormat === 'mp4' ? ['video/mp4;codecs=avc1', 'video/mp4']
    : S.recFormat === 'webm' ? ['video/webm;codecs=vp9', 'video/webm']
      : ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  return prefer.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}
function startRec() {
  if (!window.MediaRecorder) { status('浏览器不支持录制'); return; }
  const mime = pickMime(); const chunks = [];
  const stream = cv.captureStream(S.recFps);
  try { sfx.ensure(); if (sfx.recDest) stream.addTrack(sfx.recDest.stream.getAudioTracks()[0]); } catch (e) { }
  rec = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: S.recBitrate * 1e6 });
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: mime || 'video/webm' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `voxel-shoot_${Date.now()}.${(mime || '').includes('mp4') ? 'mp4' : 'webm'}`;
    a.textContent = `⬇ ${a.download} (${(blob.size / 1e6).toFixed(1)}MB)`;
    document.getElementById('recList').prepend(a); window.__lastRec = { size: blob.size, type: mime }; rec = null; updRecBtn();
    if (S.aeWithRec) { const r = aeStop(); if (r) doExportAE(true, r); }
  };
  rec.start(200); updRecBtn();
  if (S.aeWithRec) recStart();
}
function stopRec() { if (rec && rec.state !== 'inactive') rec.stop(); }
function updRecBtn() { const b = document.getElementById('btnRec'); if (!b) return; b.textContent = rec ? '■ 停止录制' : '⏺ 开始录制'; b.classList.toggle('on', !!rec); }

const aeRec = createAERecorder({
  sfx, now,
  sprites: r => buildSprites(r.S, r.L, r.Wd),
  env: () => ({ L, st, S, A: {}, Wd, G, items: draw.items || [], voxBase: voxGroups(now()), canvas: cv, handImg: hand.img, r3d }),
});
function recStart() { aeRec.start(); recClosed = false; updateAEButtons(); toast('开始记录 AE 时间轴'); }
function aeActive() { return !!aeRec.rec && !recClosed; }
function aeStop() { const r = aeRec.rec; recClosed = true; updateAEButtons(); if (r && r.frames > 1) aeLastRec = r; return r && r.frames > 1 ? r : null; }
async function aeStopAndExport() { const r = aeStop(); if (!r) { toast('没有记录到内容'); return null; } return doExportAE(true, r); }
const curRec = () => aeActive() ? aeRec.rec : aeLastRec && aeLastRec.L === L ? aeLastRec : null;
function updateAEButtons() {
  const b = document.getElementById('btn_aeToggle'); if (!b) return;
  b.textContent = aeActive() ? `■ 停止并导出（${((now() - (aeRec.rec.t0 || now())) / 1000).toFixed(1)}s）` : '● 开始记录';
  b.classList.toggle('on', aeActive());
}
async function doExportH5() {
  try { return await exportH5PlayableFromPage({ toolId: APP_ID, S, stripDataUrls: [DEFAULT_HAND], status, toast }); }
  catch (e) { status('H5 导出失败：' + e.message); console.error(e); return null; }
}
const PANEL_ACTIONS = { aeToggle: () => aeActive() ? aeStopAndExport() : recStart(), aeExport: () => doExportAE(), export3d: () => doExport3D(), exportH5: () => doExportH5() };
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  a.textContent = `⬇ ${name} (${(blob.size / 1e6).toFixed(1)}MB)`; document.getElementById('recList').prepend(a); a.click();
}
async function doExportAE(save = true, r0 = curRec()) {
  if (!r0) { toast('没有记录到内容'); return null; }
  status('正在生成 AE 工程…');
  const r = await aeRec.exportZip(r0); window.__aeLast = r;
  if (save) download(r.blob, r.name); status(`AE：${r.stats?.layers || '?'} 图层`); return r;
}
async function doExport3D(save = true, r0 = curRec()) {
  if (!r0) { toast('请先记录 AE 时间轴'); return null; }
  status('正在生成 3D 动画…');
  const ae = await aeRec.exportZip(r0);
  const r = await export3D({ S, ae, rec: r0, A: buildSprites(S, L, Wd), Wd });
  window.__e3dLast = r; if (save) download(r.blob, r.name); status(`3D：${r.stats.nodes} 节点`); return r;
}

function loop(t) {
  if (window.__vclock != null) { requestAnimationFrame(loop); return; }
  step(t); updPress(t); draw(t);
  if (aeActive()) aeRec.sample(t);
  if (aeActive()) updateAEButtons();
  requestAnimationFrame(loop);
}

const NEWGAME_KEYS = /^(level|seed|maxAmmo|ammoStep|startSlots|voxScale)/;
function applyChange(k) {
  saveSettings(S);
  markH5DeviceCustomIfSizeEdited(S, k);
  if (k === 'h5Device' || k === 'h5DeviceW' || k === 'h5DeviceH') { try { if (window.__h5EditorDeviceFit) window.__h5EditorDeviceFit(); } catch (e) { } }
  if (k === 'handImage' || k === 'handAnchorX' || k === 'handAnchorY') loadHand();
  if (NEWGAME_KEYS.test(k)) newGame();
  else if (L && /^(canvas|bg|col_|slot|vox|outline|cam3d|light3d|mat3d|tank|ball|inv|title|target|disc)/.test(k)) rebuild();
}
function loadHand() {
  const done2 = im => { hand.img = im; };
  const im = new Image(); im.onload = () => done2(im); im.onerror = () => done2(null);
  im.src = S.handImage || DEFAULT_HAND;
}
function buildPanel() {
  const body = document.getElementById('panelBody');
  const openTitles = new Set([...body.querySelectorAll('details[open] summary')].map(s => s.textContent));
  body.innerHTML = '';
  GROUPS.forEach(([title, items], gi) => {
    const det = document.createElement('details');
    if (gi < 1 || openTitles.has(title) || title.startsWith('导出 H5')) det.open = true;
    det.innerHTML = `<summary>${title}</summary>`;
    items.forEach(([k, label, type, def, a, b, step2]) => {
      const row = document.createElement('div'); row.className = 'row'; row.innerHTML = `<label title="${k}">${label}</label>`;
      if (type === 'range') {
        const r = document.createElement('input'); r.type = 'range'; r.min = a; r.max = b; r.step = step2; r.value = S[k];
        const n = document.createElement('input'); n.type = 'number'; n.className = 'val'; n.step = step2; n.value = S[k];
        r.oninput = () => { S[k] = +r.value; n.value = r.value; applyChange(k); };
        n.onchange = () => { S[k] = +n.value; r.value = n.value; applyChange(k); };
        row.append(r, n);
      } else if (type === 'color') { const c = document.createElement('input'); c.type = 'color'; c.value = S[k]; c.oninput = () => { S[k] = c.value; applyChange(k); }; row.append(c); }
      else if (type === 'bool') {
        row.classList.add('t-switch');
        const l = document.createElement('label'); l.className = 'switch';
        l.innerHTML = `<input type="checkbox" class="switch-input" ${S[k] ? 'checked' : ''}><span class="slider"></span>`;
        l.querySelector('input').onchange = e => { S[k] = e.target.checked; applyChange(k); }; row.append(l);
      } else if (type === 'select') {
        const s = document.createElement('select');
        a.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.append(o); });
        s.value = S[k];
        s.onchange = () => { S[k] = s.value; if (k === 'h5Device') { applyH5DevicePresetToSettings(S); buildPanel(); } applyChange(k); };
        row.append(s);
      } else if (type === 'text') { const t = document.createElement('input'); t.type = 'text'; t.value = S[k]; t.oninput = () => { S[k] = t.value; applyChange(k); }; row.append(t); }
      else if (type === 'button') {
        const bt = document.createElement('button'); bt.id = 'btn' + k; bt.textContent = a;
        bt.onclick = () => Promise.resolve(PANEL_ACTIONS[def] && PANEL_ACTIONS[def]()).catch(e => { status('导出失败：' + e.message); console.error(e); });
        row.append(bt);
      } else if (type === 'file') {
        const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/png,image/webp,image/*';
        f.onchange = () => { const file = f.files[0]; if (!file) return; const fr = new FileReader(); fr.onload = () => { S[k] = fr.result; applyChange(k); }; fr.readAsDataURL(file); };
        const x = document.createElement('button'); x.textContent = '清除'; x.onclick = () => { S[k] = k === 'handImage' ? DEFAULT_HAND : ''; f.value = ''; applyChange(k); };
        row.append(f, x);
      }
      det.append(row);
    });
    if (title.startsWith('手指')) det.insertAdjacentHTML('beforeend', '<div class="tip">默认手指 = 麻将工具同款（锚点 0.2204 / 0.0367）。可上传透明 PNG 覆盖。</div>');
    if (title.startsWith('导出 H5')) det.insertAdjacentHTML('beforeend', '<div class="tip">H5 无手指；autoplay 默认关。自适应 = contain/letterbox。</div>');
    body.append(det);
  });
}
let toastT = 0;
function toast(t, dur = 1600) {
  const el = document.getElementById('toast'); el.textContent = t; el.classList.add('show');
  clearTimeout(toastT); if (dur > 0) toastT = setTimeout(() => el.classList.remove('show'), dur);
}

document.getElementById('btnAuto').onclick = autoSolve;
document.getElementById('btnNew').onclick = newGame;
document.getElementById('btnSeed').onclick = () => { S.seed = 1 + Math.floor(Math.random() * 9999); saveSettings(S); buildPanel(); newGame(); };
document.getElementById('btnRec').onclick = () => rec ? stopRec() : startRec();
document.getElementById('btnShot').onclick = () => { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'voxel_shoot_shot.png'; a.click(); };
document.getElementById('btnExport').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportJSON(S)], { type: 'application/json' })); a.download = 'voxel-shoot-tool-settings.json'; a.click(); };
document.getElementById('btnImport').onclick = () => document.getElementById('importFile').click();
document.getElementById('importFile').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  f.text().then(t => { const j = JSON.parse(t); S = migrate(j); saveSettings(S); buildPanel(); loadHand(); newGame(); toast('已导入设置'); }).catch(() => toast('导入失败'));
};
document.getElementById('btnReset').onclick = () => { if (!confirm('恢复全部默认设置？')) return; S = { ...DEFS }; saveSettings(S); buildPanel(); loadHand(); newGame(); };

const __h5 = applyPlayableMode({
  applySettings: (ps) => { Object.assign(S, ps); },
  autoPlay: () => { try { autoSolve(); } catch (e) { } },
  state: () => { try { return JSON.stringify({ total: st?.total, slots: G?.slots?.map(s => s && s.left) }); } catch (e) { return ''; } },
  isEnded: () => { try { return !!(finishedAt || failedAt); } catch (e) { return false; } },
  onResize: () => { },
});
if (__h5) { try { const panel = document.getElementById('panel'); if (panel) panel.style.display = 'none'; } catch (e) { } }
if (!__h5) bindEditorDevicePreview(() => S);

window.__game = {
  renderAt: t => { window.__vclock = t; step(t); updPress(t); draw(t); if (aeActive()) aeRec.sample(t); },
  get items() { return draw.items || []; }, get world() { return Wd; }, get G() { return G; },
  create3D, autoSolve, newGame, tapAt, tapInv, hitInv,
  scene: () => scene(now()), voxGroups: () => voxGroups(now()),
  doExportAE, doExport3D, doExportH5, aeRec,
  aeStart: () => recStart(), aeStop: () => aeStop(), aeActive: () => aeActive(),
  get aeLastRec() { return aeLastRec; }, get mediaRec() { return rec; },
  startRec, stopRec, get S() { return S; }, get r3d() { return r3d; },
  set(k, v) { S[k] = v; applyChange(k); buildPanel(); },
  get st() { return st; }, get L() { return L; }, get hand() { return hand; },
  view: () => view(), migrate, APP_ID, simulate,
  get autoRunning() { return autoRunning; }, nextAuto,
  loadLevel: Lx => { autoToken++; autoRunning = false; startLevel(Lx); },
  invScreen: gi => { const w = invWorld(gi); return Wd.proj(w[0], w[1], w[2]); },
};

buildPanel(); loadHand(); newGame();
requestAnimationFrame(loop);
