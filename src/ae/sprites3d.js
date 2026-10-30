import * as THREE from 'three';
import { makeShooter, makeBall, makeInvBlock, makeTrail, geos, mat, colorHex } from '../three/scene3d.js';
import { DW, DH } from '../world.js';
export const P_REF = [0, 1.2, 6];
export function buildSprites(S, L, Wd, K = 1.5) {
  const W = Math.round(DW * K), H = Math.round(DH * K);
  const rd = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  rd.setSize(W, H, false); rd.outputColorSpace = THREE.SRGBColorSpace; rd.setClearColor(0, 0);
  const sc = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x1a2030, S.light3dAmbient);
  const sun = new THREE.DirectionalLight(0xffffff, S.light3dSun);
  const a = S.light3dAzim * Math.PI / 180, e = S.light3dElev * Math.PI / 180;
  sun.position.set(Math.sin(a) * Math.cos(e) * 80, Math.sin(e) * 80, Math.cos(a) * Math.cos(e) * 80);
  sc.add(hemi, sun, sun.target);
  const out = {};
  const snap = (id, obj, anchorW, full) => {
    sc.add(obj); rd.render(sc, Wd.cam); sc.remove(obj);
    const src = rd.domElement, c0 = document.createElement('canvas'); c0.width = W; c0.height = H;
    const g0 = c0.getContext('2d'); g0.drawImage(src, 0, 0);
    if (full) { out[id] = { c: c0, w: DW, h: DH, ax: 0, ay: 0 }; return; }
    const d = g0.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 2) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 1; }
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(W - 1, x1 + 2); y1 = Math.min(H - 1, y1 + 2);
    const c = document.createElement('canvas'); c.width = x1 - x0 + 1; c.height = y1 - y0 + 1; c.getContext('2d').drawImage(c0, -x0, -y0);
    const p = Wd.proj(...anchorW); out[id] = { c, w: c.width / K, h: c.height / K, ax: p[0] - x0 / K, ay: p[1] - y0 / K };
  };
  const place = (o, p, s = 1) => { o.position.set(...p); o.scale.multiplyScalar(s); o.updateMatrixWorld(true); return o; };
  for (const col of L.palette) {
    const sh = makeShooter(S, col, Wd); if (sh.userData.label) sh.userData.label.visible = false;
    snap('shooter_' + col, place(sh, P_REF), P_REF);
    snap('inv_' + col, place(makeInvBlock(S, col), P_REF, 1.15), P_REF);
    snap('vox_' + col, place(new THREE.Mesh(geos(S).vox, mat(S, colorHex(S, col))), P_REF, Wd.vs), P_REF);
    snap('debris_' + col, place(new THREE.Mesh(geos(S).debris, mat(S, colorHex(S, col))), P_REF, 1), P_REF);
  }
  snap('ball', place(makeBall(S), P_REF, S.ballR), P_REF);
  snap('trail', place(makeTrail(S), P_REF, 1), P_REF);
  { const m = new THREE.Mesh(geos(S).slot, mat(S, S.slotColor || '#152038', { rough: 0.7 })); snap('slot', place(m, [P_REF[0], 0.04, P_REF[2]]), [P_REF[0], 0.04, P_REF[2]]); }
  // 全画布背景精灵（纯色）
  { const c = document.createElement('canvas'); c.width = 8; c.height = 8; const g = c.getContext('2d'); g.fillStyle = S.bgColor || '#1a2744'; g.fillRect(0, 0, 8, 8); out.background = { c, w: DW, h: DH, ax: 0, ay: 0 }; }
  rd.dispose(); rd.forceContextLoss && rd.forceContextLoss();
  return out;
}
