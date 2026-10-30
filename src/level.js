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
  const R = o.R || 10, W = R * 2 + 1, H = R * 2 + 1, D = R * 2 + 1;
  const L = empty(W, H, D, ['white', 'green', 'red', 'yellow', 'blue', 'orange']);
  const cx = R, cy = R, cz = R;
  const wh = palIndex(L, 'white'), gr = palIndex(L, 'green'), rd = palIndex(L, 'red');
  const yl = palIndex(L, 'yellow'), bl = palIndex(L, 'blue'), or = palIndex(L, 'orange');
  const shell = R - 2.4;
  const blobs = [
    [gr, -2.5, 3.5, 1.5, 4.8], [gr, 3, -1, -3, 4.2], [gr, 0, 0, 0, 3.5],
    [rd, 5, 1.5, 2, 3.4], [yl, -4, -2, 2.5, 3.2], [bl, 2.5, 2, -5, 3.0],
    [or, -1, -4.5, -1, 2.8], [rd, -3, 1, 5, 2.6], [yl, 4, -3.5, 1, 2.7],
  ];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
    const x = i - cx, y = j - cy, z = k - cz;
    const r2 = x * x + y * y + z * z;
    if (r2 > (R + 0.12) ** 2) continue;
    const onShell = r2 >= shell * shell;
    let place = onShell;
    let c = gr;
    if (!onShell) {
      for (const [bc, bx, by, bz, br] of blobs) {
        const dx = x - bx, dy = y - by, dz = z - bz;
        if (dx * dx + dy * dy + dz * dz <= br * br) { place = true; c = bc; break; }
      }
      if (!place) continue;
    } else {
      const lon = Math.atan2(z, x);
      const lat = Math.asin(Math.max(-1, Math.min(1, y / Math.max(0.01, Math.sqrt(r2)))));
      if (lat > 0.5) c = gr;
      else if (lat < -0.4) c = or;
      else if (lon > 1.1 && lon < 2.3) c = rd;
      else if (lon < -1.4) c = yl;
      else if (lon > 0.25 && lon < 1.0) c = bl;
      else if (lon > -0.5 && lon < 0.25) c = yl;
      else c = gr;
      // 白经纬肋（表面）
      const onLon = Math.abs(((lon / (Math.PI / 4)) % 1 + 1) % 1) < 0.11 || Math.abs(((lon / (Math.PI / 4)) % 1 + 1) % 1 - 1) < 0.11;
      const onLat = Math.abs(lat) < 0.09 || Math.abs(Math.abs(lat) - 0.52) < 0.08 || Math.abs(Math.abs(lat) - 1.0) < 0.07;
      if (onLon || onLat) c = wh;
    }
    set(L, i, j, k, c);
  }
  L.id = 'sphere_cage'; L.title = '笼球'; L.gridPref = { cols: 4, rows: 4 }; L.startAmmo = [69, null, null, null, 48];
  return trimUnused(L);
}

export function shapeDiamondCage(o = {}) {
  const R = o.R || 8, W = R * 2 + 1, H = R * 2 + 1, D = R * 2 + 1;
  const L = empty(W, H, D, ['white', 'red', 'yellow', 'blue', 'orange', 'green']);
  const cx = R, cy = R, cz = R;
  const wh = palIndex(L, 'white');
  const cols = ['red', 'yellow', 'blue', 'orange', 'green'].map(n => palIndex(L, n));
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
    const x = Math.abs(i - cx), y = Math.abs(j - cy), z = Math.abs(k - cz);
    // 超椭圆圆角立方
    const m = Math.pow(x / R, 2.6) + Math.pow(y / R, 2.6) + Math.pow(z / R, 2.6);
    if (m > 1.05) continue;
    const cell = Math.floor(i / 3) + Math.floor(j / 3) * 3 + Math.floor(k / 3) * 9;
    set(L, i, j, k, cols[Math.abs(cell) % cols.length]);
  }
  // 白框：每 3 格一条肋（表面）
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
    if (!get(L, i, j, k)) continue;
    const x = Math.abs(i - cx), y = Math.abs(j - cy), z = Math.abs(k - cz);
    const m = Math.pow(x / R, 2.6) + Math.pow(y / R, 2.6) + Math.pow(z / R, 2.6);
    if (m < 0.78) continue;
    if (i % 3 === 0 || j % 3 === 0 || k % 3 === 0) set(L, i, j, k, wh);
  }
  L.id = 'diamond_cage'; L.title = '笼方'; L.gridPref = { cols: 4, rows: 4 };
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
  const W = 21, H = 17, D = 16;
  const L = empty(W, H, D, ['red', 'blue', 'yellow', 'orange', 'cyan', 'white']);
  const rd = palIndex(L, 'red'), bl = palIndex(L, 'blue'), yl = palIndex(L, 'yellow');
  const or = palIndex(L, 'orange'), cy = palIndex(L, 'cyan'), wh = palIndex(L, 'white');
  // 底座平台
  for (let j = 0; j < 2; j++) for (let i = 1; i < W - 1; i++) for (let k = 1; k < D - 1; k++) set(L, i, j, k, or);
  // 墙体实心
  for (let j = 2; j < 9; j++) for (let i = 3; i < W - 3; i++) for (let k = 3; k < D - 3; k++) {
    const front = k <= 4, side = i <= 4 || i >= W - 5;
    if (front && i >= 7 && i <= 13) set(L, i, j, k, yl);
    else if (side) set(L, i, j, k, bl);
    else if ((i + j) % 6 === 0) set(L, i, j, k, cy);
    else set(L, i, j, k, bl);
  }
  // 屋顶三角/金字塔
  for (let j = 9; j < 16; j++) {
    const inset = j - 9;
    for (let i = 3 + inset; i < W - 3 - inset; i++) for (let k = 3 + inset; k < D - 3 - inset; k++) set(L, i, j, k, rd);
  }
  // 门窗
  for (let j = 2; j < 6; j++) for (let i = 9; i < 12; i++) set(L, i, j, 3, or);
  for (let j = 5; j < 8; j++) for (let i = 5; i < 7; i++) set(L, i, j, 3, wh);
  for (let j = 5; j < 8; j++) for (let i = 14; i < 16; i++) set(L, i, j, 3, wh);
  L.id = 'house'; L.title = '小房子'; L.gridPref = { cols: 3, rows: 3 };
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
  const W = 20, H = 13, D = 15;
  const L = empty(W, H, D, ['green', 'cream', 'red', 'black']);
  const gr = palIndex(L, 'green'), cr = palIndex(L, 'cream'), rd = palIndex(L, 'red'), bk = palIndex(L, 'black');
  const cx = 10, cy = 2.2, cz = 7;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) for (let k = 0; k < D; k++) {
    const x = (i - cx) / 9.0, y = (j - cy) / 6.0, z = (k - cz) / 7.0;
    if (y < -0.02) continue;
    const r2 = x * x + y * y + z * z;
    if (r2 > 1.02) continue;
    if (r2 > 0.86) set(L, i, j, k, gr);
    else if (r2 > 0.76) set(L, i, j, k, cr);
    else {
      set(L, i, j, k, rd);
      if (j > 3 && r2 < 0.62 && ((i * 3 + k * 5) % 7 === 0)) set(L, i, j, k, bk);
    }
  }
  L.id = 'watermelon'; L.title = '西瓜'; L.gridPref = { cols: 3, rows: 3 };
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
export function pickTarget(L, st, c, wx, wy, wz, worldOf) {
  // 优先同色；其次白色笼肋（广告中白肋可被任意色打掉）
  const white = L.palette.indexOf('white');
  const pools = [st.exp[c]];
  if (white >= 0 && white !== c) pools.push(st.exp[white]);
  let best = -1, bd = 1e18, prefer = true;
  for (const pool of pools) {
    let localBest = -1, localBd = 1e18;
    for (const m of pool) {
      if (!isShootable(L, st, m)) continue;
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
  const prefer = [80, 60, 50, 40, 65, 44, 88, 75, 70, 48, 69];
  const targetBlocks = o.targetBlocks || 16; // 广告一屏约 3×3~4×4
  const blocks = []; let id = 0;
  // 先按色切块，再合并到约 targetBlocks
  counts.forEach((need, c) => {
    let left = need;
    while (left > 0) {
      let ammo = prefer[Math.floor(r() * prefer.length)];
      ammo = Math.min(maxAmmo, Math.max(step, Math.min(ammo, left + Math.floor(r() * 12))));
      if (ammo > left && left >= step) ammo = Math.max(step, Math.floor(left / step) * step) || left;
      if (ammo > left) ammo = left;
      blocks.push({ color: c, ammo, id: id++, name: L.palette[c] });
      left -= ammo;
    }
  });
  // 合并同色直到数量接近 targetBlocks（保证总和弹药不变 → 仍可解）
  while (blocks.length > targetBlocks) {
    // 找两个同色合并
    let merged = false;
    for (let i = 0; i < blocks.length && !merged; i++) for (let j = i + 1; j < blocks.length; j++) {
      if (blocks[i].color !== blocks[j].color) continue;
      const sum = blocks[i].ammo + blocks[j].ammo;
      if (sum > maxAmmo * 1.5) continue;
      blocks[i].ammo = sum; // 保留总弹药（可超过 maxAmmo 显示）
      blocks.splice(j, 1); merged = true; break;
    }
    if (!merged) break;
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
    vol.startAmmo.forEach((ammo, i) => {
      if (ammo == null || i >= SLOTS) return;
      let bi = inv.findIndex(b => b.name === 'green');
      if (bi < 0) bi = 0;
      if (!inv.length) return;
      const b = inv[bi];
      // 从该块扣减弹药放到槽位；块耗尽则移除
      const take = Math.min(b.ammo, ammo);
      pre[i] = { color: b.color, ammo: ammo, name: b.name, id: 'pre' + i };
      b.ammo -= take;
      // 槽位显示广告数字，实际可打数用 ammo；库存侧扣 take 以保持总量近似
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
