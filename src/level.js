// 关卡：体素形状（匹配参考广告 montage）+ 库存块规划 + 可解性
export const COLORS = ['green', 'orange', 'yellow', 'red', 'blue', 'purple', 'white', 'pink', 'black', 'cyan', 'brown', 'tan', 'cream'];
export const SLOTS = 5;
export const idx = (L, i, j, k) => i + j * L.W + k * L.W * L.H;
export const coords = (L, n) => { const i = n % L.W, j = Math.floor(n / L.W) % L.H, k = Math.floor(n / (L.W * L.H)); return [i, j, k]; };
export function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function empty(W, H, D, palette) {
  return { W, H, D, vox: new Uint8Array(W * H * D), palette: palette.slice() };
}
function set(L, i, j, k, c) {
  if (i < 0 || j < 0 || k < 0 || i >= L.W || j >= L.H || k >= L.D) return;
  L.vox[idx(L, i, j, k)] = c;
}
function palIndex(L, name) {
  let i = L.palette.indexOf(name);
  if (i < 0) { L.palette.push(name); i = L.palette.length - 1; }
  return i + 1;
}
function trimUnused(L) {
  const used = new Set(L.vox); const map = new Map(); const pal2 = [];
  L.palette.forEach((p, c) => { if (used.has(c + 1)) { map.set(c + 1, pal2.length + 1); pal2.push(p); } });
  for (let n = 0; n < L.vox.length; n++) if (L.vox[n]) L.vox[n] = map.get(L.vox[n]);
  L.palette = pal2; return L;
}
function countColor(L) {
  const c = L.palette.map(() => 0);
  for (const v of L.vox) if (v) c[v - 1]++;
  return c;
}

// —— 形状生成（体素艺术，匹配广告目标）——
export function shapeSphereCage(o = {}) {
  const R = o.R || 8, W = R * 2 + 1, H = R * 2 + 1, D = R * 2 + 1;
  const L = empty(W, H, D, ['white', 'green', 'red', 'yellow', 'blue', 'orange']);
  const cx = R, cy = R, cz = R;
  const white = palIndex(L, 'white'), green = palIndex(L, 'green'), red = palIndex(L, 'red');
  const yellow = palIndex(L, 'yellow'), blue = palIndex(L, 'blue'), orange = palIndex(L, 'orange');
  // 白色网格笼（经纬肋）
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
    const x = i - cx, y = j - cy, z = k - cz, r2 = x * x + y * y + z * z;
    if (r2 > (R + 0.35) ** 2 || r2 < (R - 1.15) ** 2) continue;
    const lat = Math.abs(y);
    const lonStep = Math.atan2(z, x);
    const onLat = Math.abs(lat % 3) < 0.6 || lat < 0.6;
    const onLon = Math.abs(((lonStep / (Math.PI / 4)) % 1 + 1) % 1) < 0.18 || Math.abs(x) < 0.6 || Math.abs(z) < 0.6;
    // 简化：赤道/经线附近填白壳
    const ang = Math.atan2(Math.hypot(x, z), y);
    const lon = Math.atan2(z, x);
    const rib = (Math.abs(Math.sin(lon * 4)) < 0.22) || (Math.abs(Math.cos(ang * 3)) > 0.92);
    if (rib && r2 >= (R - 0.9) ** 2) set(L, i, j, k, white);
  }
  // 彩色团块塞进球内
  const blobs = [
    [green, -4, 2, 3, 4.2], [green, 3, -2, -4, 3.8], [green, 0, 5, 0, 3.2],
    [red, 5, 1, 2, 3.0], [yellow, -2, -4, 2, 3.2], [blue, 2, 3, -5, 2.8],
    [orange, -5, -1, -2, 2.6], [red, -1, 0, 6, 2.4], [yellow, 4, -3, 1, 2.5],
  ];
  for (const [c, bx, by, bz, br] of blobs) {
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
      const x = i - cx - bx, y = j - cy - by, z = k - cz - bz;
      if (x * x + y * y + z * z > br * br) continue;
      const dx = i - cx, dy = j - cy, dz = k - cz;
      if (dx * dx + dy * dy + dz * dz > (R - 0.2) ** 2) continue;
      if (!L.vox[idx(L, i, j, k)]) set(L, i, j, k, c);
    }
  }
  L.id = 'sphere_cage'; L.title = '笼球'; return trimUnused(L);
}

export function shapeDiamondCage(o = {}) {
  const R = o.R || 7, W = R * 2 + 1, H = R * 2 + 1, D = R * 2 + 1;
  const L = empty(W, H, D, ['white', 'red', 'yellow', 'blue', 'orange', 'green']);
  const cx = R, cy = R, cz = R;
  const white = palIndex(L, 'white');
  const cols = ['red', 'yellow', 'blue', 'orange', 'green'].map(n => palIndex(L, n));
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
    const x = Math.abs(i - cx), y = Math.abs(j - cy), z = Math.abs(k - cz);
    const m = x + y * 0.85 + z; // 菱形/圆角立方
    if (m > R + 0.2 || m < R - 1.4) {
      if (m <= R - 0.2 && m > R * 0.35) {
        // 内部彩色簇
        const c = cols[Math.floor(((i * 3 + j * 5 + k * 7) % cols.length + cols.length) % cols.length)];
        if ((i + j + k) % 3 !== 0) set(L, i, j, k, c);
      }
      continue;
    }
    // 外壳白笼：格子肋
    if (i % 3 === 0 || j % 3 === 0 || k % 3 === 0) set(L, i, j, k, white);
  }
  // 填充分块
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) for (let k = 1; k < D - 1; k++) {
    const x = Math.abs(i - cx), y = Math.abs(j - cy), z = Math.abs(k - cz);
    if (x + y * 0.85 + z > R - 1.2) continue;
    if (L.vox[idx(L, i, j, k)]) continue;
    const c = cols[(Math.floor(i / 3) + Math.floor(j / 3) + Math.floor(k / 3)) % cols.length];
    set(L, i, j, k, c);
  }
  L.id = 'diamond_cage'; L.title = '笼方'; return trimUnused(L);
}

export function shapeCat(o = {}) {
  // 坐姿猫/动物：棕/米/白/黑
  const W = 17, H = 16, D = 14;
  const L = empty(W, H, D, ['brown', 'tan', 'white', 'black']);
  const br = palIndex(L, 'brown'), tn = palIndex(L, 'tan'), wh = palIndex(L, 'white'), bk = palIndex(L, 'black');
  const fillBox = (x0, x1, y0, y1, z0, z1, c) => {
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) for (let k = z0; k <= z1; k++) set(L, i, j, k, c);
  };
  // 身体
  fillBox(4, 12, 0, 7, 3, 10, br);
  fillBox(5, 11, 1, 6, 4, 9, tn);
  // 头
  fillBox(5, 11, 8, 13, 4, 10, tn);
  fillBox(6, 10, 9, 12, 5, 9, wh);
  // 耳朵
  fillBox(5, 6, 13, 15, 5, 7, br);
  fillBox(10, 11, 13, 15, 5, 7, br);
  // 腿
  fillBox(4, 6, 0, 2, 3, 5, br);
  fillBox(10, 12, 0, 2, 3, 5, br);
  fillBox(4, 6, 0, 2, 8, 10, br);
  fillBox(10, 12, 0, 2, 8, 10, br);
  // 眼睛/鼻子
  set(L, 7, 11, 10, bk); set(L, 9, 11, 10, bk); set(L, 8, 10, 10, br);
  // 尾巴
  fillBox(12, 15, 3, 5, 8, 10, br);
  fillBox(14, 16, 5, 8, 9, 11, br);
  L.id = 'cat'; L.title = '小猫'; return trimUnused(L);
}

export function shapeHouse(o = {}) {
  const W = 19, H = 16, D = 15;
  const L = empty(W, H, D, ['red', 'blue', 'yellow', 'orange', 'cyan', 'white']);
  const rd = palIndex(L, 'red'), bl = palIndex(L, 'blue'), yl = palIndex(L, 'yellow');
  const or = palIndex(L, 'orange'), cy = palIndex(L, 'cyan'), wh = palIndex(L, 'white');
  // 底座
  for (let j = 0; j < 2; j++) for (let i = 1; i < W - 1; i++) for (let k = 1; k < D - 1; k++) set(L, i, j, k, or);
  // 墙
  for (let j = 2; j < 9; j++) for (let i = 2; i < W - 2; i++) for (let k = 2; k < D - 2; k++) {
    const edge = i === 2 || i === W - 3 || k === 2 || k === D - 3;
    if (edge) set(L, i, j, k, bl);
    else if (k === 3 && i > 5 && i < 13) set(L, i, j, k, yl); // 正面黄墙
    else if ((i + j + k) % 5 === 0) set(L, i, j, k, cy);
    else set(L, i, j, k, bl);
  }
  // 屋顶
  for (let j = 9; j < 15; j++) {
    const inset = j - 9;
    for (let i = 2 + inset; i < W - 2 - inset; i++) for (let k = 2 + inset; k < D - 2 - inset; k++) set(L, i, j, k, rd);
  }
  // 门
  for (let j = 2; j < 6; j++) for (let i = 8; i < 11; i++) set(L, i, j, 2, or);
  L.id = 'house'; L.title = '小房子'; return trimUnused(L);
}

export function shapeIceCream(o = {}) {
  const W = 13, H = 20, D = 13;
  const L = empty(W, H, D, ['pink', 'cyan', 'black', 'orange', 'yellow']);
  const pk = palIndex(L, 'pink'), cy = palIndex(L, 'cyan'), bk = palIndex(L, 'black');
  const or = palIndex(L, 'orange'), yl = palIndex(L, 'yellow');
  const cx = 6, cz = 6;
  // 甜筒（下窄）
  for (let j = 0; j < 9; j++) {
    const r = 1.2 + j * 0.35;
    for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
      const dx = i - cx, dz = k - cz;
      if (dx * dx + dz * dz <= r * r) set(L, i, j, k, j % 2 ? or : yl);
    }
  }
  // 球：粉 / 青 / 黑顶
  const scoops = [[pk, 10, 3.6], [cy, 13, 3.2], [bk, 16, 2.4]];
  for (const [c, cy0, r] of scoops) {
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
      const dx = i - cx, dy = j - cy0, dz = k - cz;
      if (dx * dx + dy * dy + dz * dz <= r * r) set(L, i, j, k, c);
    }
  }
  L.id = 'icecream'; L.title = '冰淇淋'; return trimUnused(L);
}

export function shapeWatermelon(o = {}) {
  const W = 18, H = 12, D = 14;
  const L = empty(W, H, D, ['green', 'cream', 'red', 'black']);
  const gr = palIndex(L, 'green'), cr = palIndex(L, 'cream'), rd = palIndex(L, 'red'), bk = palIndex(L, 'black');
  const cx = 9, cy = 2, cz = 7;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
    const x = (i - cx) / 8.2, y = (j - cy) / 5.5, z = (k - cz) / 6.5;
    // 半圆西瓜片（y>=0 的椭圆）
    if (y < -0.05) continue;
    const r2 = x * x + y * y + z * z;
    if (r2 > 1.05) continue;
    if (r2 > 0.88) set(L, i, j, k, gr);
    else if (r2 > 0.78) set(L, i, j, k, cr);
    else {
      set(L, i, j, k, rd);
      // 籽
      if ((i + k * 2) % 5 === 0 && j > 2 && r2 < 0.65) set(L, i, j, k, bk);
    }
  }
  L.id = 'watermelon'; L.title = '西瓜'; return trimUnused(L);
}

export const PRESETS = {
  sphere_cage: shapeSphereCage,
  diamond_cage: shapeDiamondCage,
  cat: shapeCat,
  house: shapeHouse,
  icecream: shapeIceCream,
  watermelon: shapeWatermelon,
};
export const PRESET_ORDER = ['sphere_cage', 'diamond_cage', 'cat', 'house', 'icecream', 'watermelon'];

export function exposedAt(L, vox, i, j, k) {
  for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const x = i + a, y = j + b, z = k + c;
    if (x < 0 || y < 0 || z < 0 || x >= L.W || y >= L.H || z >= L.D || !vox[idx(L, x, y, z)]) return true;
  }
  return false;
}
export function isShootable(L, st, m) {
  if (!st.vox[m] || st.claimed[m]) return false;
  const [i, j, k] = coords(L, m);
  return exposedAt(L, st.vox, i, j, k);
}
export function initState(L) {
  const st = { vox: L.vox.slice(), exp: L.palette.map(() => new Set()), left: L.palette.map(() => 0), claimed: new Uint8Array(L.vox.length), total: 0, ver: 0 };
  for (let k = 0; k < L.D; k++) for (let j = 0; j < L.H; j++) for (let i = 0; i < L.W; i++) {
    const n = idx(L, i, j, k), v = st.vox[n]; if (!v) continue;
    st.left[v - 1]++; st.total++;
    if (exposedAt(L, st.vox, i, j, k)) st.exp[v - 1].add(n);
  }
  return st;
}
export function removeVoxel(L, st, n) {
  const v = st.vox[n]; if (!v) return false;
  st.vox[n] = 0; st.ver++; st.exp[v - 1].delete(n); st.left[v - 1]--; st.total--; st.claimed[n] = 0;
  const [i, j, k] = coords(L, n);
  for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const x = i + a, y = j + b, z = k + c;
    if (x < 0 || y < 0 || z < 0 || x >= L.W || y >= L.H || z >= L.D) continue;
    const m = idx(L, x, y, z), w = st.vox[m];
    if (w && !st.exp[w - 1].has(m) && exposedAt(L, st.vox, x, y, z)) st.exp[w - 1].add(m);
  }
  return true;
}
export function pickTarget(L, st, c, wx, wy, wz, worldOf) {
  let best = -1, bd = 1e18;
  for (const m of st.exp[c]) {
    if (!isShootable(L, st, m)) continue;
    const p = worldOf(m);
    // 优先外层、近炮口
    const [i, j, k] = coords(L, m);
    const d = ((p[0] - wx) ** 2 + (p[1] - wy) ** 2 * 0.5 + (p[2] - wz) ** 2) + j * 0.01;
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

// 库存：按颜色需求生成可解块（数量≈该色体素数，切成若干 ammo 块）
export function planInventory(L, o = {}) {
  const counts = countColor(L);
  const r = rng(o.seed || 1);
  const maxAmmo = o.maxAmmo || 80, step = o.ammoStep || 5;
  const blocks = [];
  let id = 0;
  counts.forEach((need, c) => {
    let left = need;
    // 轻微超量（广告里数字常大于剩余）——但保证总和 >= need
    while (left > 0) {
      const prefer = [80, 60, 50, 40, 65, 44, 88, 75, 70, 35];
      let ammo = prefer[Math.floor(r() * prefer.length)];
      ammo = Math.min(maxAmmo, Math.max(step, Math.min(ammo, left + Math.floor(r() * 20))));
      if (ammo > left && left >= step) ammo = Math.max(step, Math.floor(left / step) * step) || left;
      if (ammo > left) ammo = left;
      blocks.push({ color: c, ammo, id: id++, name: L.palette[c] });
      left -= ammo;
    }
  });
  // 打乱
  for (let i = blocks.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [blocks[i], blocks[j]] = [blocks[j], blocks[i]]; }
  return blocks;
}

export function layoutGrid(n, o = {}) {
  // 返回 {cols, rows}：优先接近方阵，广告里 3×3 ~ 4×4
  if (o.cols && o.rows) return { cols: o.cols, rows: o.rows };
  if (n <= 9) return { cols: 3, rows: 3 };
  if (n <= 12) return { cols: 4, rows: 3 };
  if (n <= 16) return { cols: 4, rows: 4 };
  const cols = Math.ceil(Math.sqrt(n));
  return { cols, rows: Math.ceil(n / cols) };
}

export function makeLevel(shapeId, o = {}) {
  const gen = PRESETS[shapeId] || shapeSphereCage;
  const vol = gen(o);
  const inv = planInventory(vol, o);
  const grid = layoutGrid(inv.length, o);
  // 开局已在槽位的炮台（可选，匹配广告开局有 2~3 个）
  const startSlots = o.startSlots || 0;
  const pre = [];
  if (startSlots > 0) {
    for (let i = 0; i < Math.min(startSlots, SLOTS) && inv.length; i++) pre.push(inv.shift());
  }
  return {
    ...vol,
    inventory: inv,
    preSlots: pre,
    grid,
    voxels: vol.vox.reduce((a, v) => a + (v ? 1 : 0), 0),
    shapeId: vol.id,
  };
}

export function makePresetLevel(id, o = {}) {
  return makeLevel(id, o);
}

// 逻辑模拟：库存→槽→射击，用于测试
export function simulate(L, o = {}) {
  const st = initState(L), slots = new Array(SLOTS).fill(null);
  const inv = L.inventory.map(b => ({ ...b, left: b.ammo }));
  const worldOf = o.worldOf || (m => { const [i, j, k] = coords(L, m); return [i, j, -k]; });
  let taps = 0, shots = 0, guard = 0;
  const place = () => {
    const si = slots.findIndex(s => !s);
    if (si < 0 || !inv.length) return false;
    // 选「当前外露可打最多」的颜色块
    let bi = -1, ba = -1;
    inv.forEach((b, i) => {
      let a = 0; for (const m of st.exp[b.color]) if (isShootable(L, st, m)) a++;
      if (a > ba) { ba = a; bi = i; }
    });
    if (bi < 0) bi = 0;
    const b = inv.splice(bi, 1)[0];
    slots[si] = { color: b.color, left: b.ammo, si }; taps++; return true;
  };
  // 预放
  (L.preSlots || []).forEach((b, i) => { if (i < SLOTS) slots[i] = { color: b.color, left: b.ammo, si: i }; });
  while (st.total > 0 && guard++ < 5e5) {
    let fired = 0;
    for (const sl of slots) {
      if (!sl || sl.left <= 0) continue;
      const m = pickTarget(L, st, sl.color, sl.si * 3 - 6, 4, 6, worldOf);
      if (m < 0) continue;
      removeVoxel(L, st, m); sl.left--; shots++; fired++;
      if (sl.left <= 0) slots[sl.si] = null;
    }
    if (!fired) {
      if (!place()) {
        // 清掉 0 弹药占位
        for (let i = 0; i < SLOTS; i++) if (slots[i] && slots[i].left <= 0) slots[i] = null;
        if (!place()) return { ok: false, reason: 'stuck', left: st.total, taps, shots };
      }
    }
  }
  return { ok: st.total === 0, taps, shots };
}
