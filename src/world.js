// 世界：浮动旋转目标 + 下方 5 槽 + 库存网格（统一世界坐标，2D = 同一相机投影）
import * as THREE from 'three';
import { coords, SLOTS } from './level.js';
export const DW = 720, DH = 1280;
export const SH = { w: 1.55, d: 1.45, h: 1.35 }; // 玩具方块炮台

export function createWorld(S, L) {
  const W = L.W, H = L.H, D = L.D;
  const vs = Math.min(1.15, 14 / Math.max(W, H, D)) * (S.voxScale || 1);
  const cam = new THREE.PerspectiveCamera(S.cam3dFov, DW / DH, 0.5, 500);
  cam.position.set(S.cam3dX, S.cam3dY, S.cam3dZ);
  cam.lookAt(S.cam3dTX, S.cam3dTY, S.cam3dTZ);
  cam.updateMatrixWorld(); cam.updateProjectionMatrix();

  // 目标中心抬高，给下方槽位/库存留空
  const targetY = S.targetY ?? 7.5;
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

  // 5 个槽位：水平一排，在目标下方
  const slotY = S.slotY ?? 1.1;
  const slotZ = S.slotZ ?? 6.2;
  const slotSpan = S.slotSpan ?? 9.2;
  const slots = Array.from({ length: SLOTS }, (_, i) => {
    const x = -slotSpan / 2 + (slotSpan / (SLOTS - 1)) * i;
    return [x, slotZ];
  });

  // 库存网格世界坐标（更靠前、更低）
  const invY = S.invY ?? 0.55;
  const invZ = S.invZ ?? 9.4;
  const invCell = S.invCell ?? 1.55;
  const gridPos = (col, row, cols, rows) => {
    const x = (col - (cols - 1) / 2) * invCell;
    const z = invZ + row * invCell * 0.92;
    return [x, invY, z];
  };

  const muzzleOf = (x, z) => [x, slotY + SH.h * 0.95, z - SH.d * 0.15];
  const cellOf = (x, y, z, rotY = 0) => {
    // 逆旋转到局部体素坐标
    const cy = Math.cos(-rotY), sy = Math.sin(-rotY);
    const lx = x * cy - z * sy, lz = x * sy + z * cy;
    const i = Math.round(lx / vs + (W - 1) / 2);
    const j = Math.round((y - targetY) / vs + (H - 1) / 2);
    const k = Math.round(-lz / vs + (D - 1) / 2);
    if (i < 0 || j < 0 || k < 0 || i >= W || j >= H || k >= D) return -1;
    return idxSafe(L, i, j, k);
  };
  return { W, H, D, vs, cam, vox, proj, un, slots, slotY, gridPos, muzzleOf, cellOf, SH, targetY, invY, invZ, invCell };
}
function idxSafe(L, i, j, k) { return i + j * L.W + k * L.W * L.H; }
