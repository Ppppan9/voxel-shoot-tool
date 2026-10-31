// v1.4.2: 只消除镜头可见面；背面等旋转露出。验证：①每次命中都是可见面 ②旋转下所有关卡最终清空 ③背面体素从不被选中
import * as THREE from 'three';
import { makeLevel, PRESET_ORDER, initState, removeVoxel, isShootable, visibleFace, coords } from '../src/level.js';
import { createWorld } from '../src/world.js';
const S = { cam3dFov: 30, cam3dX: 0, cam3dY: 11.6, cam3dZ: 35, cam3dTX: 0, cam3dTY: 7.7, cam3dTZ: 0, targetY: 10.0, voxScale: 0.46 };
let fail = 0;
for (const id of PRESET_ORDER) {
  const L = makeLevel(id, { seed: 7, startSlots: 2, maxAmmo: 80 });
  const Wd = createWorld(S, L);
  const tilt = id === 'watermelon' ? 1.12 : id === 'sphere_cage' ? 0.88 : 0.28;
  const st = initState(L);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  const camGrid = rotY => {
    Q.setFromEuler(E.set(tilt, rotY, 0)); M.compose(new THREE.Vector3(0, Wd.targetY, 0), Q, new THREE.Vector3(1, 1, 1)).invert();
    const c = Wd.cam.position.clone().applyMatrix4(M);
    return [c.x / Wd.vs + (L.W - 1) / 2, c.y / Wd.vs + (L.H - 1) / 2, -c.z / Wd.vs + (L.D - 1) / 2];
  };
  let rotY = 0, hits = 0, bad = 0, idle = 0;
  const total0 = st.total;
  // 每步旋转 10°/s × 1/18 s，每步最多打 6 发（任意色，验证可见约束+可清空）
  while (st.total > 0 && rotY < Math.PI * 2 * 40) {
    const cam = camGrid(rotY);
    let shot = 0;
    for (let c = 0; c < L.palette.length && shot < 6; c++) for (const m of [...st.exp[c]]) {
      if (shot >= 6) break;
      if (!isShootable(L, st, m)) continue;
      const f = visibleFace(L, st.vox, m, cam);
      if (!f) continue;
      // 独立校验：面法线朝相机
      const [i, j, k] = coords(L, m);
      const d = [cam[0] - (i + f[0] / 2), cam[1] - (j + f[1] / 2), cam[2] - (k + f[2] / 2)];
      if (d[0] * f[0] + d[1] * f[1] + d[2] * f[2] <= 0) bad++;
      removeVoxel(L, st, m); hits++; shot++;
    }
    if (!shot) idle++;
    rotY += (10 * Math.PI / 180) / 18;
  }
  // 背面检查：随机取一个起始帧，确认相机背面外露体素不可见
  const st2 = initState(L), cam0 = camGrid(0);
  let backVisible = 0, backCount = 0;
  // 背面体素：所有外露面法线都背向相机（严格背面）→ 必须不可见；以及被前排完全挡住的内层（非外露）→ 不可打
  const D6 = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  for (let c = 0; c < L.palette.length; c++) for (const m of st2.exp[c]) {
    const [i, j, k] = coords(L, m);
    let anyFront = false;
    for (const [a, b, cc] of D6) {
      const x = i + a, y = j + b, z = k + cc;
      const inb = x >= 0 && y >= 0 && z >= 0 && x < L.W && y < L.H && z < L.D;
      if (inb && st2.vox[x + y * L.W + z * L.W * L.H]) continue;
      const d = [cam0[0] - (i + a / 2), cam0[1] - (j + b / 2), cam0[2] - (k + cc / 2)];
      if (d[0] * a + d[1] * b + d[2] * cc > 0) anyFront = true;
    }
    if (!anyFront) { backCount++; if (visibleFace(L, st2.vox, m, cam0)) backVisible++; }
  }
  // 遮挡：可见集合应明显小于「朝向相机」集合（说明射线遮挡生效）
  const ok = st.total === 0 && bad === 0 && backVisible === 0;
  if (!ok) fail++;
  console.log(ok ? 'PASS' : 'FAIL', id, JSON.stringify({ total0, left: st.total, hits, badFaces: bad, backCount, backVisible, turns: +(rotY / (2 * Math.PI)).toFixed(2), idleSteps: idle }));
}
console.log(fail ? 'SOME FAIL' : 'ALL PASS'); process.exit(fail ? 1 : 0);
