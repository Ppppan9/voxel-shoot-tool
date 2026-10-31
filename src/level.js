// 关卡：按参考广告 montage 重建体素形状 + 库存规划
export const COLORS = ['green', 'orange', 'yellow', 'red', 'blue', 'purple', 'white', 'pink', 'black', 'cyan', 'brown', 'tan', 'cream'];
export const SLOTS = 5;
export const idx = (L, i, j, k) => i + j * L.W + k * L.W * L.H;
export const coords = (L, n) => { const i = n % L.W, j = Math.floor(n / L.W) % L.H, k = Math.floor(n / (L.W * L.H)); return [i, j, k]; };
export function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function empty(W, H, D, palette) { return { W, H, D, vox: new Uint8Array(W * H * D), palette: palette.slice() }; }
function set(L, i, j, k, c) { if (i < 0 || j < 0 || k < 0 || i >= L.W || j >= L.H || k >= L.D) return; L.vox[idx(L, i, j, k)] = c; }
function get(L, i, j, k) { if (i < 0 || j < 0 || k < 0 || i >= L.W || j >= L.H || k >= L.D) return 0; return L.vox[idx(L, i, j, k)]; }
function palIndex(L, name) { let i = L.palette.indexOf(name); if (i < 0) { L.palette.push(name); i = L.palette.length - 1; } return i + 1; }
function trimUnused(L) {
  const used = new Set(L.vox); const map = new Map(); const pal2 = [];
  L.palette.forEach((p, c) => { if (used.has(c + 1)) { map.set(c + 1, pal2.length + 1); pal2.push(p); } });
  for (let n = 0; n < L.vox.length; n++) if (L.vox[n]) L.vox[n] = map.get(L.vox[n]);
  L.palette = pal2; return L;
}
function countColor(L) { const c = L.palette.map(() => 0); for (const v of L.vox) if (v) c[v - 1]++; return c; }
function fillEllipsoid(L, cx, cy, cz, rx, ry, rz, c, solid = true) {
  const rx2 = rx * rx, ry2 = ry * ry, rz2 = rz * rz;
  for (let j = Math.floor(cy - ry - 1); j <= Math.ceil(cy + ry + 1); j++)
    for (let i = Math.floor(cx - rx - 1); i <= Math.ceil(cx + rx + 1); i++)
      for (let k = Math.floor(cz - rz - 1); k <= Math.ceil(cz + rz + 1); k++) {
        const dx = (i - cx) / rx, dy = (j - cy) / ry, dz = (k - cz) / rz;
        const d = dx * dx + dy * dy + dz * dz;
        if (solid ? d <= 1.02 : (d <= 1.02 && d >= 0.72)) set(L, i, j, k, c);
      }
}

// —— 笼球：实心球 + 白经纬肋（参考 Rubik 风格分区）——
export function shapeSphereCage(o = {}) {
  // 参考 f_0001 / detail_02s：魔方格多色壳 + 绿底 + 细白经纬笼
  const R = o.R || 9, W = R * 2 + 1, H = R * 2 + 1, D = R * 2 + 1;
  const L = empty(W, H, D, ['white', 'green', 'yellow', 'orange', 'red', 'blue']);
  const cx = R, cy = R, cz = R;
  const wh = palIndex(L, 'white'), gr = palIndex(L, 'green'), yl = palIndex(L, 'yellow');
  const or = palIndex(L, 'orange'), rd = palIndex(L, 'red'), bl = palIndex(L, 'blue');
  const shellIn = R - 1.55;
  // 8×6 经纬格 → 固定色表（正面 +Z 为中心列）
  const TABLE = [
    [gr, gr, yl, or, rd, gr, yl, gr],
    [gr, yl, yl, or, rd, bl, gr, gr],
    [yl, or, or, rd, rd, bl, gr, yl],
    [gr, or, rd, rd, bl, gr, yl, or],
    [gr, gr, yl, or, gr, yl, or, gr],
    [or, or, gr, yl, gr, or, gr, or],
  ];
  const cellColor = (lon, lat) => {
    const f = ((lon - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const gi = Math.floor(((f + Math.PI) / (Math.PI * 2)) * 8) % 8;
    const gj = Math.min(5, Math.max(0, Math.floor(((lat + Math.PI / 2) / Math.PI) * 6)));
    return TABLE[gj][gi];
  };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
    const x = i - cx, y = j - cy, z = k - cz;
    const r2 = x * x + y * y + z * z;
    if (r2 > (R + 0.2) ** 2 || r2 < shellIn * shellIn) continue;
    const r = Math.sqrt(r2) || 0.001;
    const lon = Math.atan2(z, x), lat = Math.asin(Math.max(-1, Math.min(1, y / r)));
    let c = cellColor(lon, lat);
    // 白笼肋：90° 经线（4 面 Rubik）+ 赤道/±45° 纬线；细锐缝（非糊白壳）
    const lonBand = Math.abs(((lon / (Math.PI / 2)) % 1 + 1) % 1);
    const onLon = lonBand < 0.085 || lonBand > 0.915;
    const onLat = Math.abs(lat) < 0.075
      || Math.abs(Math.abs(lat) - Math.PI / 4) < 0.075
      || Math.abs(Math.abs(lat) - Math.PI / 2) < 0.09;
    if ((onLon || onLat) && r2 > (R - 1.85) ** 2) c = wh;
    set(L, i, j, k, c);
  }
  L.id = 'sphere_cage'; L.title = '笼球'; L.gridPref = { cols: 4, rows: 4 };
  // f_0001：五绿玩具炮同排
  L.startAmmo = [{name:'green',ammo:18},{name:'green',ammo:19},{name:'green',ammo:22},{name:'green',ammo:16},{name:'green',ammo:20}];
  return trimUnused(L);
}

export function shapeDiamondCage(o = {}) {
  // 参考 detail_08s：圆角彩块立方 + 稀疏白笼肋（非白壳）
  const R = o.R || 7, W = R * 2 + 1, H = R * 2 + 1, D = R * 2 + 1;
  const L = empty(W, H, D, ['white', 'red', 'yellow', 'blue', 'orange', 'green']);
  const cx = R, cy = R, cz = R;
  const wh = palIndex(L, 'white');
  const cols = ['red', 'yellow', 'blue', 'orange', 'green'].map(n => palIndex(L, n));
  const shellIn = 0.72;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
    const x = Math.abs(i - cx), y = Math.abs(j - cy), z = Math.abs(k - cz);
    const m = Math.pow(x / R, 2.4) + Math.pow(y / R, 2.4) + Math.pow(z / R, 2.4);
    if (m > 1.02 || m < shellIn) continue; // 空心薄壳
    // 大色块分区（每边约 2~3 格）
    const cell = Math.floor(i / 4) + Math.floor(j / 4) * 3 + Math.floor(k / 4) * 7;
    set(L, i, j, k, cols[Math.abs(cell) % cols.length]);
  }
  // 白肋：仅表面、每 4 格一条，且只画「边线」避免吞掉彩块
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
    if (!get(L, i, j, k)) continue;
    const x = Math.abs(i - cx), y = Math.abs(j - cy), z = Math.abs(k - cz);
    const m = Math.pow(x / R, 2.4) + Math.pow(y / R, 2.4) + Math.pow(z / R, 2.4);
    if (m < 0.88) continue;
    const onRib = (i % 4 === 0) + (j % 4 === 0) + (k % 4 === 0);
    if (onRib === 1) set(L, i, j, k, wh); // 单轴肋，避免交叉面全白
  }
  L.id = 'diamond_cage'; L.title = '笼方'; L.gridPref = { cols: 4, rows: 4 };
  L.startAmmo = [55, null, 40, null, 48];
  return trimUnused(L);
}

export function shapeCat(o = {}) {
  const W = 19, H = 18, D = 15;
  const L = empty(W, H, D, ['brown', 'tan', 'white', 'black']);
  const br = palIndex(L, 'brown'), tn = palIndex(L, 'tan'), wh = palIndex(L, 'white'), bk = palIndex(L, 'black');
  const box = (x0, x1, y0, y1, z0, z1, c) => { for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) for (let k = z0; k <= z1; k++) set(L, i, j, k, c); };
  // 身体（坐姿）
  box(4, 14, 0, 8, 3, 11, br);
  box(5, 13, 1, 7, 4, 10, tn);
  box(6, 12, 2, 6, 5, 9, wh);
  // 头
  box(5, 13, 8, 14, 4, 11, tn);
  box(6, 12, 9, 13, 5, 10, wh);
  box(7, 11, 10, 12, 6, 9, tn);
  // 耳朵
  box(5, 7, 14, 17, 5, 8, br); box(6, 7, 15, 16, 6, 7, tn);
  box(11, 13, 14, 17, 5, 8, br); box(11, 12, 15, 16, 6, 7, tn);
  // 腿
  box(4, 7, 0, 3, 3, 5, br); box(11, 14, 0, 3, 3, 5, br);
  box(4, 7, 0, 3, 9, 11, br); box(11, 14, 0, 3, 9, 11, br);
  // 脸
  set(L, 8, 12, 11, bk); set(L, 10, 12, 11, bk); set(L, 9, 11, 11, br);
  // 尾巴
  box(14, 17, 4, 6, 8, 11, br); box(16, 18, 6, 10, 9, 12, br);
  L.id = 'cat'; L.title = '小猫'; L.gridPref = { cols: 3, rows: 3 };
  return trimUnused(L);
}

export function shapeHouse(o = {}) {
  // 参考 f_0040：斜透视小房 — 红屋顶+橙烟囱、蓝墙、黄门脸、米色底座
  const W = 23, H = 18, D = 18;
  const L = empty(W, H, D, ['red', 'blue', 'yellow', 'orange', 'cyan', 'white', 'tan', 'cream']);
  const rd = palIndex(L, 'red'), bl = palIndex(L, 'blue'), yl = palIndex(L, 'yellow');
  const or = palIndex(L, 'orange'), cy = palIndex(L, 'cyan'), wh = palIndex(L, 'white');
  const tn = palIndex(L, 'tan'), cr = palIndex(L, 'cream');
  const box = (x0, x1, y0, y1, z0, z1, c) => {
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) for (let k = z0; k <= z1; k++)
      if (i >= 0 && j >= 0 && k >= 0 && i < W && j < H && k < D) set(L, i, j, k, c);
  };
  // 底座平台（米色/橙）
  box(1, W - 2, 0, 1, 1, D - 2, tn);
  box(2, W - 3, 1, 1, 2, D - 3, or);
  // 墙体外壳（空心，避免困死体素）
  for (let j = 2; j <= 8; j++) for (let i = 4; i <= W - 5; i++) for (let k = 4; k <= D - 5; k++) {
    const wall = (i === 4 || i === W - 5 || k === 4 || k === D - 5 || j === 2);
    if (!wall) continue;
    if (k === 4 && i >= 5 && i <= W - 6) set(L, i, j, k, yl); // 正面黄
    else set(L, i, j, k, bl);
  }
  // 侧墙青点缀
  for (let j = 3; j <= 7; j++) for (let i of [4, W - 5]) for (let k = 6; k <= D - 7; k++)
    if ((j + k) % 4 === 0) set(L, i, j, k, cy);
  // 门窗
  box(10, 12, 2, 5, 4, 4, or);
  box(6, 7, 5, 7, 4, 4, wh);
  box(15, 16, 5, 7, 4, 4, wh);
  // 红屋顶金字塔
  for (let j = 9; j < 16; j++) {
    const inset = j - 9;
    box(4 + inset, W - 5 - inset, j, j, 4 + inset, D - 5 - inset, rd);
  }
  // 橙烟囱
  box(15, 17, 12, 16, 8, 10, or);
  box(15, 17, 16, 16, 8, 10, tn);
  L.id = 'house'; L.title = '小房子'; L.gridPref = { cols: 3, rows: 3 };
  L.startAmmo = [{name:'cyan',ammo:39},{name:'orange',ammo:72},{name:'yellow',ammo:78},null,{name:'blue',ammo:23}];
  return trimUnused(L);
}

export function shapeIceCream(o = {}) {
  const W = 15, H = 22, D = 15;
  const L = empty(W, H, D, ['pink', 'cyan', 'black', 'orange', 'yellow']);
  const pk = palIndex(L, 'pink'), cy = palIndex(L, 'cyan'), bk = palIndex(L, 'black');
  const or = palIndex(L, 'orange'), yl = palIndex(L, 'yellow');
  const cx = 7, cz = 7;
  // 甜筒：下窄上宽、菱格纹
  for (let j = 0; j < 10; j++) {
    const r = 1.0 + j * 0.42;
    for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
      const dx = i - cx, dz = k - cz;
      if (dx * dx + dz * dz <= r * r) set(L, i, j, k, ((i + k + j) % 2) ? or : yl);
    }
  }
  // 三球：粉 / 青 / 黑顶樱桃
  [[pk, 11.2, 4.0], [cy, 14.5, 3.6], [bk, 17.6, 2.2]].forEach(([c, cy0, r]) => {
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
      const dx = i - cx, dy = j - cy0, dz = k - cz;
      if (dx * dx + dy * dy + dz * dz <= r * r) set(L, i, j, k, c);
    }
  });
  L.id = 'icecream'; L.title = '冰淇淋'; L.gridPref = { cols: 3, rows: 3 };
  return trimUnused(L);
}

export function shapeWatermelon(o = {}) {
  // detail_27s：厚碗状切片 — 红切面朝相机，强 melonTiltX 时绿皮+奶油环立体可见
  const W = 27, H = 27, D = 16;
  const L = empty(W, H, D, ['green', 'cream', 'red', 'black']);
  const gr = palIndex(L, 'green'), cr = palIndex(L, 'cream'), rd = palIndex(L, 'red'), bk = palIndex(L, 'black');
  const cx = (W - 1) / 2, cy = (H - 1) / 2, cz = (D - 1) / 2;
  const Rx = 12.0, Ry = 12.0, Rz = 6.4; // 更厚 → 大俯仰时绿皮厚度/碗口明显
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
    const x = (i - cx) / Rx, y = (j - cy) / Ry, z = (k - cz) / Rz;
    const r2 = x * x + y * y;
    if (r2 > 1.02 || Math.abs(z) > 1.08) continue;
    const edge = Math.sqrt(r2);
    // 小 z 朝相机 = 红切面；大 z = 绿背
    if (z > 0.38 || edge > 0.9) { set(L, i, j, k, gr); continue; }
    if (edge > 0.76 || (z > 0.15 && edge > 0.62)) { set(L, i, j, k, cr); continue; }
    // 侧面绿皮厚度带（倾斜时读成碗边）
    if (edge > 0.7 && z > -0.25) { set(L, i, j, k, gr); continue; }
    set(L, i, j, k, rd);
    if (z < 0.22 && edge < 0.7) {
      const s = (i * 5 + j * 7 + k * 3) % 7;
      if (s === 0 || s === 3) set(L, i, j, k, bk);
    }
  }
  L.id = 'watermelon'; L.title = '西瓜'; L.gridPref = { cols: 3, rows: 3 };
  L.startAmmo = [{name:'red',ammo:28},{name:'red',ammo:29},{name:'red',ammo:33},{name:'black',ammo:26},{name:'cream',ammo:40}];
  return trimUnused(L);
}

export const PRESETS = { sphere_cage: shapeSphereCage, diamond_cage: shapeDiamondCage, cat: shapeCat, house: shapeHouse, icecream: shapeIceCream, watermelon: shapeWatermelon };
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
export function pickTarget(L, st, c, wx, wy, wz, worldOf, ok) {
  // 优先同色；其次白色笼肋（广告中白肋可被任意色打掉）
  const white = L.palette.indexOf('white');
  const pools = [st.exp[c]];
  if (white >= 0 && white !== c) pools.push(st.exp[white]);
  let best = -1, bd = 1e18, prefer = true;
  for (const pool of pools) {
    let localBest = -1, localBd = 1e18;
    for (const m of pool) {
      if (!isShootable(L, st, m)) continue;
      if (ok && !ok(m)) continue;
      const p = worldOf(m);
      const d = (p[0] - wx) ** 2 + (p[1] - wy) ** 2 * 0.45 + (p[2] - wz) ** 2;
      if (d < localBd) { localBd = d; localBest = m; }
    }
    if (localBest >= 0) return localBest; // 同色有则立刻返回；否则试白色
  }
  return -1;
}

export function planInventory(L, o = {}) {
  const counts = countColor(L);
  const r = rng(o.seed || 1);
  const maxAmmo = o.maxAmmo || 88, step = o.ammoStep || 5;
  const prefer = [60, 50, 40, 65, 44, 75, 70, 48, 69, 80, 55, 88];
  const targetBlocks = o.targetBlocks || 16;
  const whiteIdx = L.palette.indexOf('white');
  // 白色笼肋可被任意色击破 → 弹药并入彩色块，不占库存格
  const colorNeeds = [];
  let whiteBonus = 0;
  counts.forEach((need, c) => {
    if (c === whiteIdx) whiteBonus += need;
    else if (need > 0) colorNeeds.push({ c, need, name: L.palette[c] });
  });
  const blocks = []; let id = 0;
  for (const { c, need, name } of colorNeeds) {
    let left = need;
    while (left > 0) {
      let ammo = prefer[Math.floor(r() * prefer.length)];
      ammo = Math.min(maxAmmo, Math.max(step, Math.min(ammo, left)));
      if (ammo > left) ammo = left;
      // 取整到 step（末块除外）
      if (left - ammo >= step) ammo = Math.max(step, Math.floor(ammo / step) * step);
      blocks.push({ color: c, ammo, id: id++, name });
      left -= ammo;
    }
  }
  // 白色加成均摊，但单块不超过 maxAmmo；放不下则新开同色块
  if (whiteBonus > 0 && blocks.length) {
    let i = 0;
    while (whiteBonus > 0) {
      const b = blocks[i % blocks.length];
      const room = maxAmmo - b.ammo;
      if (room >= step) {
        const add = Math.min(room, whiteBonus, step * (1 + (r() * 3 | 0)));
        b.ammo += add; whiteBonus -= add;
      } else {
        // 开新块
        blocks.push({ color: b.color, ammo: Math.min(maxAmmo, whiteBonus), id: id++, name: b.name });
        whiteBonus -= Math.min(maxAmmo, whiteBonus);
      }
      i++;
      if (i > 10000) break;
    }
  }
  // 合并同色且 sum≤maxAmmo，逼近 targetBlocks
  while (blocks.length > targetBlocks) {
    let merged = false;
    for (let i = 0; i < blocks.length && !merged; i++) for (let j = i + 1; j < blocks.length; j++) {
      if (blocks[i].color !== blocks[j].color) continue;
      const sum = blocks[i].ammo + blocks[j].ammo;
      if (sum > maxAmmo) continue;
      blocks[i].ammo = sum;
      blocks.splice(j, 1); merged = true; break;
    }
    if (!merged) break; // 无法再合也不强行超 cap
  }
  for (let i = blocks.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [blocks[i], blocks[j]] = [blocks[j], blocks[i]]; }
  return blocks;
}

export function layoutGrid(n, o = {}) {
  if (o.cols && o.rows) return { cols: o.cols, rows: o.rows };
  if (n <= 9) return { cols: 3, rows: 3 };
  if (n <= 12) return { cols: 4, rows: 3 };
  if (n <= 16) return { cols: 4, rows: 4 };
  const cols = 4;
  return { cols, rows: Math.ceil(n / cols) };
}

export function makeLevel(shapeId, o = {}) {
  const gen = PRESETS[shapeId] || shapeSphereCage;
  const vol = gen(o);
  const inv = planInventory(vol, o);
  const grid = layoutGrid(inv.length, vol.gridPref || o);
  // 开局预填：可用 startAmmo 指定每槽弹药（null=空），否则 startSlots 个
  const pre = [];
  if (vol.startAmmo) {
    vol.startAmmo.forEach((spec, i) => {
      if (spec == null || i >= SLOTS) return;
      const ammo = typeof spec === 'object' ? spec.ammo : spec;
      const want = typeof spec === 'object' ? spec.name : null;
      let bi = want ? inv.findIndex(b => b.name === want) : -1;
      if (bi < 0) bi = inv.findIndex(b => b.ammo >= (ammo || 1) / 2);
      if (bi < 0) bi = 0;
      if (!inv.length) return;
      const b = inv[bi];
      const take = Math.min(b.ammo, ammo);
      pre[i] = { color: b.color, ammo: ammo, name: b.name, id: 'pre' + i };
      b.ammo -= take;
      if (b.ammo <= 0) inv.splice(bi, 1);
    });
  } else {
    const startSlots = o.startSlots ?? 2;
    for (let i = 0; i < Math.min(startSlots, SLOTS) && inv.length; i++) pre.push(inv.shift());
  }
  // 裁切可见库存到 grid 容量（其余仍可滚动？广告只显示一屏——保留全部但布局按 pref）
  return { ...vol, inventory: inv, preSlots: pre, grid, voxels: vol.vox.reduce((a, v) => a + (v ? 1 : 0), 0), shapeId: vol.id };
}
export function makePresetLevel(id, o = {}) { return makeLevel(id, o); }

export function simulate(L, o = {}) {
  const st = initState(L), slots = new Array(SLOTS).fill(null);
  const inv = L.inventory.map(b => ({ ...b, left: b.ammo }));
  const worldOf = o.worldOf || (m => { const [i, j, k] = coords(L, m); return [i, j, -k]; });
  let taps = 0, shots = 0, guard = 0;
  (L.preSlots || []).forEach((b, i) => { if (b && i < SLOTS) slots[i] = { color: b.color, left: b.ammo, si: i }; });
  const place = () => {
    const si = slots.findIndex(s => !s); if (si < 0 || !inv.length) return false;
    let bi = -1, ba = -1;
    inv.forEach((b, i) => { let a = 0; for (const m of st.exp[b.color]) if (isShootable(L, st, m)) a++; if (a > ba) { ba = a; bi = i; } });
    if (bi < 0) bi = 0;
    const b = inv.splice(bi, 1)[0]; slots[si] = { color: b.color, left: b.ammo, si }; taps++; return true;
  };
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
        for (let i = 0; i < SLOTS; i++) if (slots[i] && slots[i].left <= 0) slots[i] = null;
        if (!place()) return { ok: false, reason: 'stuck', left: st.total, taps, shots };
      }
    }
  }
  return { ok: st.total === 0, taps, shots };
}

// ── 可见性：只消除面朝镜头且未被遮挡的体素（v1.4.2）──
// cam: 相机在体素网格索引空间的位置 [ci, cj, ck]（连续坐标，体素 n 中心 = 整数 i,j,k）
const DIRS6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
// 精确体素 DDA（Amanatides–Woo）：从 o 沿 d 前进，返回首个占用体素索引（跳过 skip），无则 -1
function ddaFirst(L, vox, o, d, skip) {
  let x = Math.round(o[0]), y = Math.round(o[1]), z = Math.round(o[2]);
  const sx = Math.sign(d[0]), sy = Math.sign(d[1]), sz = Math.sign(d[2]);
  const nx = (p, c, s, v) => s > 0 ? (c + 0.5 - p) / v : s < 0 ? (c - 0.5 - p) / v : Infinity;
  let tx = nx(o[0], x, sx, d[0]), ty = nx(o[1], y, sy, d[1]), tz = nx(o[2], z, sz, d[2]);
  const dx = sx ? Math.abs(1 / d[0]) : Infinity, dy = sy ? Math.abs(1 / d[1]) : Infinity, dz = sz ? Math.abs(1 / d[2]) : Infinity;
  for (let it = 0; it < (L.W + L.H + L.D) * 3; it++) {
    const inb = x >= 0 && y >= 0 && z >= 0 && x < L.W && y < L.H && z < L.D;
    if (inb) { const n = idx(L, x, y, z); if (n !== skip && vox[n]) return n; }
    else if ((x < 0 && sx <= 0) || (y < 0 && sy <= 0) || (z < 0 && sz <= 0) || (x >= L.W && sx >= 0) || (y >= L.H && sy >= 0) || (z >= L.D && sz >= 0)) return -1;
    if (tx < ty && tx < tz) { x += sx; tx += dx; } else if (ty < tz) { y += sy; ty += dy; } else { z += sz; tz += dz; }
  }
  return -1;
}
const FACE_SAMPLES = [[0, 0], [0.38, 0.38], [-0.38, 0.38], [0.38, -0.38], [-0.38, -0.38]];
/** 返回体素 n 一个「朝相机且至少一处采样点视线无遮挡」的外露面法线 [a,b,c]（索引空间），否则 null */
export function visibleFace(L, vox, n, cam) {
  if (!vox[n]) return null;
  const [i, j, k] = coords(L, n);
  let best = null, bestDot = 0;
  for (const [a, b, c] of DIRS6) {
    const x = i + a, y = j + b, z = k + c;
    if (!(x < 0 || y < 0 || z < 0 || x >= L.W || y >= L.H || z >= L.D) && vox[idx(L, x, y, z)]) continue; // 面被邻块盖住
    // 面内两个切向轴
    const u = a ? [0, 1, 0] : [1, 0, 0], v = c ? [0, 1, 0] : (b ? [0, 0, 1] : [0, 0, 1]);
    for (const [su, sv] of FACE_SAMPLES) {
      const fx = i + a * 0.5 + u[0] * su + v[0] * sv, fy = j + b * 0.5 + u[1] * su + v[1] * sv, fz = k + c * 0.5 + u[2] * su + v[2] * sv;
      let dx = cam[0] - fx, dy = cam[1] - fy, dz = cam[2] - fz;
      const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
      const dot = dx * a + dy * b + dz * c;
      if (dot <= 0.02) break; // 背向/掠射面
      const o = [fx + a * 0.001, fy + b * 0.001, fz + c * 0.001];
      if (ddaFirst(L, vox, o, [dx, dy, dz], n) < 0) { if (dot > bestDot) { bestDot = dot; best = [a, b, c]; } break; }
    }
  }
  return best;
}
export function isVisibleShootable(L, st, m, cam) {
  return isShootable(L, st, m) && !!visibleFace(L, st.vox, m, cam);
}
