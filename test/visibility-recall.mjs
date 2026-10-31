// 独立精确 DDA（Amanatides-Woo）校验：屏幕像素射线第一个命中的体素 = 肉眼可见体素；
// visibleFace 应把它们判为可见（召回率），且被判可见的体素其面中心到相机的精确 DDA 无遮挡（精确率）。
import * as THREE from 'three';
import { makeLevel, initState, visibleFace, coords, idx } from '../src/level.js';
import { createWorld, DW, DH } from '../src/world.js';
const S = { cam3dFov: 30, cam3dX: 0, cam3dY: 11.6, cam3dZ: 35, cam3dTX: 0, cam3dTY: 7.7, cam3dTZ: 0, targetY: 10.0, voxScale: 0.46 };
function dda(L, vox, o, d, maxT = 400) { // grid coords: voxel n occupies [i-0.5,i+0.5]
  let x = Math.round(o[0]), y = Math.round(o[1]), z = Math.round(o[2]);
  const st = d.map(v => (v > 0 ? 1 : v < 0 ? -1 : 0));
  const next = (p, c, s, v) => s > 0 ? (c + 0.5 - p) / v : s < 0 ? (c - 0.5 - p) / v : Infinity;
  let tx = next(o[0], x, st[0], d[0]), ty = next(o[1], y, st[1], d[1]), tz = next(o[2], z, st[2], d[2]);
  const dx = st[0] ? Math.abs(1 / d[0]) : Infinity, dy = st[1] ? Math.abs(1 / d[1]) : Infinity, dz = st[2] ? Math.abs(1 / d[2]) : Infinity;
  let t = 0;
  while (t < maxT) {
    if (x >= 0 && y >= 0 && z >= 0 && x < L.W && y < L.H && z < L.D && vox[idx(L, x, y, z)]) return idx(L, x, y, z);
    if (tx < ty && tx < tz) { x += st[0]; t = tx; tx += dx; } else if (ty < tz) { y += st[1]; t = ty; ty += dy; } else { z += st[2]; t = tz; tz += dz; }
  }
  return -1;
}
let fail = 0;
for (const [id, tilt] of [['sphere_cage', 0.88], ['house', 0.28], ['cat', 0.28], ['watermelon', 1.12]]) {
  const L = makeLevel(id, { seed: 7, startSlots: 2, maxAmmo: 80 });
  const Wd = createWorld(S, L), st = initState(L);
  for (const rotY of [0, 1.3, 2.9]) {
    const Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, rotY, 0));
    const M = new THREE.Matrix4().compose(new THREE.Vector3(0, Wd.targetY, 0), Q, new THREE.Vector3(1, 1, 1)), Mi = M.clone().invert();
    const toGrid = v => [v.x / Wd.vs + (L.W - 1) / 2, v.y / Wd.vs + (L.H - 1) / 2, -v.z / Wd.vs + (L.D - 1) / 2];
    const camW = Wd.cam.position.clone(), cam = toGrid(camW.clone().applyMatrix4(Mi));
    // 召回：屏幕网格射线首个命中体素
    const seen = new Set();
    for (let py = 0; py < DH; py += 4) for (let px = 0; px < DW; px += 4) {
      const pW = new THREE.Vector3(px / DW * 2 - 1, 1 - py / DH * 2, 0.5).unproject(Wd.cam);
      const g1 = toGrid(pW.applyMatrix4(Mi));
      let d = [g1[0] - cam[0], g1[1] - cam[1], g1[2] - cam[2]]; const l = Math.hypot(...d); d = d.map(v => v / l);
      const n = dda(L, st.vox, cam, d); if (n >= 0) seen.add(n);
    }
    let miss = 0; for (const n of seen) if (!visibleFace(L, st.vox, n, cam)) miss++;
    // 精确率：判可见的体素，其可见面中心→相机精确 DDA 首个命中应为自身
    let vis = 0, falsePos = 0;
    for (let n = 0; n < st.vox.length; n++) {
      if (!st.vox[n]) continue; const f = visibleFace(L, st.vox, n, cam); if (!f) continue; vis++;
      // 面上 9 个采样点，至少一个从相机精确 DDA 首个命中为自身 → 真可见
      const [i, j, k] = coords(L, n);
      const u = f[0] ? [0, 1, 0] : [1, 0, 0], v = f[2] ? [0, 1, 0] : [0, 0, 1];
      let okAny = false;
      for (const su of [-0.4, 0, 0.4]) for (const sv of [-0.4, 0, 0.4]) {
        const fc = [i + f[0] * 0.499 + u[0] * su + v[0] * sv, j + f[1] * 0.499 + u[1] * su + v[1] * sv, k + f[2] * 0.499 + u[2] * su + v[2] * sv];
        let d = [fc[0] - cam[0], fc[1] - cam[1], fc[2] - cam[2]]; const l = Math.hypot(...d); d = d.map(x => x / l);
        if (dda(L, st.vox, cam, d) === n) { okAny = true; break; }
      }
      if (!okAny) falsePos++;
    }
    const recall = 1 - miss / Math.max(1, seen.size), prec = 1 - falsePos / Math.max(1, vis);
    const ok = recall >= 0.9 && prec >= 0.9;
    if (!ok) fail++;
    console.log(ok ? 'PASS' : 'FAIL', id, 'rotY=' + rotY, JSON.stringify({ onScreen: seen.size, judgedVisible: vis, recall: +recall.toFixed(3), precision: +prec.toFixed(3) }));
  }
}
console.log(fail ? 'SOME FAIL' : 'ALL PASS'); process.exit(fail ? 1 : 0);
