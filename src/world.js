import * as THREE from 'three';
import { coords, SLOTS } from './level.js';
export const DW = 720, DH = 1280;
export const SH = { w: 1.48, d: 1.42, h: 1.38 }; // 广告发射区：圆墩玩具块

export function createWorld(S, L) {
  const W = L.W, H = L.H, D = L.D;
  // 目标占画面上半更大：略放大体素
  const vs = Math.min(1.35, 16 / Math.max(W, H, D)) * (S.voxScale || 1);
  const cam = new THREE.PerspectiveCamera(S.cam3dFov, DW / DH, 0.5, 500);
  cam.position.set(S.cam3dX, S.cam3dY, S.cam3dZ);
  cam.lookAt(S.cam3dTX, S.cam3dTY, S.cam3dTZ);
  cam.updateMatrixWorld(); cam.updateProjectionMatrix();

  const targetY = S.targetY ?? 9.5;
  const vox = n => {
    const [i, j, k] = coords(L, n);
    return [(i - (W - 1) / 2) * vs, targetY + (j - (H - 1) / 2) * vs, -(k - (D - 1) / 2) * vs];
  };
  const vec = new THREE.Vector3();
  const proj = (x, y, z) => { vec.set(x, y, z).project(cam); return [(vec.x + 1) / 2 * DW, (1 - vec.y) / 2 * DH, vec.z]; };
  const un = (sx, sy, y = 0) => {
    const v = new THREE.Vector3(sx / DW * 2 - 1, 1 - sy / DH * 2, 0.5).unproject(cam);
    const d = v.sub(cam.position).normalize();
    const t = (y - cam.position.y) / d.y;
    return cam.position.clone().add(d.multiplyScalar(t));
  };

  const slotY = S.slotY ?? 0.85;
  const slotZ = S.slotZ ?? 7.6;
  const slotSpan = S.slotSpan ?? 10.8;
  const slots = Array.from({ length: SLOTS }, (_, i) => {
    const x = -slotSpan / 2 + (slotSpan / (SLOTS - 1)) * i;
    return [x, slotZ];
  });

  const invY = S.invY ?? 0.35;
  const invZ = S.invZ ?? 11.0;
  const invCell = S.invCell ?? 1.7;
  const gridPos = (col, row, cols, rows) => {
    const x = (col - (cols - 1) / 2) * invCell;
    const z = invZ + row * invCell * 0.95;
    return [x, invY, z];
  };

  const muzzleOf = (x, z) => [x, slotY + SH.h * 1.05, z - SH.d * 0.05];
  return { W, H, D, vs, cam, vox, proj, un, slots, slotY, gridPos, muzzleOf, SH, targetY, invY, invZ, invCell };
}
