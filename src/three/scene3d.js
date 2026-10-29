import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { DW, DH } from '../world.js';

export const PALETTE = {
  purple: '#9b4dff', green: '#6fdc3a', black: '#2a2a30', yellow: '#ffd23a',
  red: '#ff3b4a', blue: '#3a7cff', orange: '#ff8a2a', pink: '#ff6ad0',
  white: '#f2f4f8', cyan: '#3ad8e8', brown: '#8b5a2b', tan: '#d4a574', cream: '#f5e6c8',
};
export const colorHex = (S, n) => S['col_' + n] || PALETTE[n] || '#888888';
const IS3D_RE = /^(shooter|cannon|ball|debris|slot|inv|num)/;
export const IS3D = a => IS3D_RE.test(a || '');

let shared = null;
export function geos(S) {
  if (shared && shared.key === S.voxRound + '|' + S.voxGap) return shared;
  const g = Math.max(0.5, 1 - S.voxGap), r = Math.min(0.42 * g, Math.max(0, S.voxRound));
  shared = {
    key: S.voxRound + '|' + S.voxGap,
    vox: new RoundedBoxGeometry(g, g, g, 4, r),
    ball: new THREE.SphereGeometry(1, 24, 18),
    debris: new RoundedBoxGeometry(1, 1, 1, 2, 0.22),
    slot: new RoundedBoxGeometry(1.7, 0.22, 1.55, 2, 0.18),
    inv: new RoundedBoxGeometry(1, 1, 1, 3, 0.22),
  };
  return shared;
}
const matCache = new Map();
export function mat(S, hex, o = {}) {
  const key = hex + JSON.stringify(o) + S.mat3dRough + '|g' + (o.glow || 0);
  if (!matCache.has(key)) {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: o.rough ?? S.mat3dRough, metalness: 0, ...o.extra });
    if (o.glow) { m.emissive = new THREE.Color(hex); m.emissiveIntensity = o.glow; }
    m.name = o.name || ('mat_' + hex.slice(1)); matCache.set(key, m);
  }
  return matCache.get(key);
}
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x101018, side: THREE.BackSide }); outlineMat.name = 'mat_outline';
function withOutline(mesh, S) {
  if (!S.outline3d) return mesh;
  const o = new THREE.Mesh(mesh.geometry, outlineMat);
  o.name = mesh.name + '_outline';
  o.scale.setScalar(1 + S.outline3d * 0.08);
  mesh.add(o); return mesh;
}
const shade = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };
const numTex = new Map();
export function numberCanvas(n) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 48px "Arial Black","Microsoft YaHei",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = 10;
  g.strokeStyle = '#151318'; g.strokeText(String(n), 64, 34); g.fillStyle = '#ffffff'; g.fillText(String(n), 64, 34);
  return c;
}
export function numberTexture(n) {
  if (!numTex.has(n)) { const t = new THREE.CanvasTexture(numberCanvas(n)); t.colorSpace = THREE.SRGBColorSpace; t.name = 'num_' + n; numTex.set(n, t); }
  return numTex.get(n);
}

// 广告风玩具炮台：圆角方块 + 顶部短炮管 + 正面数字（匹配参考）
export function makeShooter(S, color, Wd) {
  const hex = colorHex(S, color), dark = shade(hex, 0.82);
  const { w, d, h } = Wd.SH;
  const G = new THREE.Group(); G.name = 'shooter_' + color;
  const body = new THREE.Group(); body.name = 'body';
  const upper = new THREE.Group(); upper.name = 'upper';
  const tankR = S.tankRough ?? 0.55;
  const rb = (W2, H2, D2, r) => new RoundedBoxGeometry(W2, H2, D2, 3, r);
  const hull = new THREE.Mesh(rb(w, h * 0.78, d, 0.28), mat(S, hex, { rough: tankR }));
  hull.name = 'hull'; hull.position.set(0, h * 0.4, 0); body.add(withOutline(hull, S));
  // 底座暗一点
  const base = new THREE.Mesh(rb(w * 1.05, h * 0.22, d * 1.05, 0.2), mat(S, dark, { rough: tankR }));
  base.name = 'track_L'; base.position.set(0, h * 0.1, 0); body.add(withOutline(base, S));
  // 短炮管朝上偏前
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, d * 0.55, 14), mat(S, hex, { rough: tankR }));
  bar.name = 'barrel'; bar.rotation.x = -Math.PI / 2 + 0.35; bar.position.set(0, h * 0.85, -d * 0.15);
  upper.add(withOutline(bar, S));
  const tur = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), mat(S, hex, { rough: tankR }));
  tur.name = 'turret'; tur.position.set(0, h * 0.78, 0.05); upper.add(withOutline(tur, S));
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.7), new THREE.MeshBasicMaterial({ map: numberTexture(0), transparent: true, depthWrite: false, depthTest: false }));
  lab.name = 'label'; lab.renderOrder = 5; lab.position.set(0, h * 0.55, d * 0.52); upper.add(lab);
  G.add(body, upper); G.userData.body = body; G.userData.upper = upper; G.userData.label = lab; G.userData.color = color;
  return G;
}

export function makeInvBlock(S, color) {
  const hex = colorHex(S, color);
  const G = new THREE.Group(); G.name = 'inv_' + color;
  const m = new THREE.Mesh(geos(S).inv, mat(S, hex, { rough: S.voxRough ?? 0.45 }));
  m.name = 'hull'; G.add(withOutline(m, S));
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.45), new THREE.MeshBasicMaterial({ map: numberTexture(0), transparent: true, depthWrite: false, depthTest: false }));
  lab.name = 'label'; lab.renderOrder = 5; lab.position.set(0, 0.05, 0.52); G.add(lab);
  G.userData.label = lab; G.userData.color = color;
  return G;
}

export function makeBall(S) {
  const g = new THREE.Group(); g.name = 'ball';
  const glow = S.ballGlow || 0;
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.12, metalness: 0.1,
    emissive: new THREE.Color(0xfff6ff), emissiveIntensity: 0.2 + glow * 0.5,
  }); coreMat.name = 'mat_ball';
  const core = new THREE.Mesh(geos(S).ball, coreMat); core.name = 'ball_core'; g.add(core);
  const rim = new THREE.Mesh(geos(S).ball, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
  rim.scale.setScalar(1.08); rim.renderOrder = 1; g.add(rim);
  if (S.ballHalo > 1 && S.ballHaloOp > 0) {
    const halo = new THREE.Mesh(geos(S).ball, new THREE.MeshBasicMaterial({ color: 0xfff4ff, transparent: true, opacity: S.ballHaloOp, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(S.ballHalo); g.add(halo);
  }
  return g;
}

export function create3D(opt = {}) {
  let renderer = null, scene, camera, sun, hemi, Wd, S0, L0, voxMesh, targetPivot;
  const pool = new Map(); const statics = new THREE.Group();
  function setup(S, L, W2) {
    S0 = S; L0 = L; Wd = W2; scene = new THREE.Scene(); camera = Wd.cam; pool.clear();
    hemi = new THREE.HemisphereLight(0xffffff, 0x1a2030, S.light3dAmbient); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, S.light3dSun);
    const a = S.light3dAzim * Math.PI / 180, e = S.light3dElev * Math.PI / 180;
    sun.position.set(Math.sin(a) * Math.cos(e) * 80, Math.sin(e) * 80, Math.cos(a) * Math.cos(e) * 80);
    sun.target.position.set(0, Wd.targetY, 0); scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0xa8c0ff, S.light3dSun * 0.28); fill.position.set(-30, 40, 50); scene.add(fill);
    statics.clear(); scene.add(statics);
    // 槽位凹槽
    Wd.slots.forEach(([x, z], i) => {
      const m = new THREE.Mesh(geos(S).slot, mat(S, S.slotColor || '#1a2438', { name: 'mat_slot', rough: 0.7 }));
      m.name = 'slot_' + (i + 1); m.position.set(x, Wd.slotY - 0.12, z); statics.add(m);
    });
    // 目标旋转枢轴
    targetPivot = new THREE.Group(); targetPivot.name = 'targetPivot'; scene.add(targetPivot);
    voxMesh = L.palette.map((p) => {
      const m = new THREE.InstancedMesh(geos(S).vox, mat(S, colorHex(S, p), { name: 'mat_vox_' + p, rough: S.voxRough ?? 0.45 }), 32);
      m.name = 'voxels_' + p; m.count = 0; m.frustumCulled = false; targetPivot.add(m); return m;
    });
    if (opt.exportMode) voxMesh.forEach(m => targetPivot.remove(m));
  }
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), SC = new THREE.Vector3();
  function setVoxels(groups) {
    groups.forEach((list, c) => {
      let m = voxMesh[c];
      if (list.length > m.instanceMatrix.count) {
        const nm = new THREE.InstancedMesh(m.geometry, m.material, Math.ceil(list.length * 1.3) + 16);
        nm.name = m.name; nm.frustumCulled = false; targetPivot.remove(m); m.dispose(); targetPivot.add(nm); voxMesh[c] = m = nm;
      }
      for (let q = 0; q < list.length; q++) {
        const row = list[q], n = row[0], sx = row[1] ?? 1, sy = row[2] ?? sx, sz = row[3] ?? sx;
        const ox = row[4] || 0, oy = row[5] || 0, oz = row[6] || 0, p = Wd.vox(n);
        // 相对枢轴：vox() 已含 targetY，枢轴在原点旋转时需减去 targetY 再加回
        V3.set(p[0] + ox, p[1] - Wd.targetY + oy, p[2] + oz);
        SC.set(Wd.vs * sx, Wd.vs * sy, Wd.vs * sz);
        M4.compose(V3, Q.identity(), SC); m.setMatrixAt(q, M4);
      }
      m.count = list.length; m.instanceMatrix.needsUpdate = true;
    });
  }
  function setTargetRot(ry) { if (targetPivot) targetPivot.rotation.y = ry; }
  function getObj(it) {
    let o = pool.get(it.id);
    if (o && o.asset !== it.asset) { scene.remove(o.obj); pool.delete(it.id); o = null; }
    if (!o) {
      let obj; const k = it.asset;
      if (k.startsWith('shooter_') || k.startsWith('cannon_')) obj = makeShooter(S0, k.split('_')[1], Wd);
      else if (k.startsWith('inv_')) obj = makeInvBlock(S0, k.slice(4));
      else if (k === 'ball') obj = makeBall(S0);
      else if (k.startsWith('debris_')) { obj = new THREE.Mesh(geos(S0).debris, mat(S0, colorHex(S0, k.slice(7)), { name: 'mat_debris_' + k.slice(7) })); obj.name = 'debris'; }
      else return null;
      o = { obj, asset: k, used: false }; pool.set(it.id, o); scene.add(obj);
    }
    return o;
  }
  function apply(items, S) {
    for (const o of pool.values()) o.used = false;
    for (const it of items) {
      if (!IS3D(it.asset) || !it.w) continue;
      const o = getObj(it); if (!o) continue; o.used = true; const ob = o.obj;
      ob.position.set(it.w[0], it.w[1], it.w[2]);
      ob.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
      if (ob.userData.body) ob.userData.body.rotation.y = it.bodyYaw ?? 0;
      if (ob.userData.upper) ob.userData.upper.rotation.y = it.turretYaw ?? it.bodyYaw ?? 0;
      const s = it.ws ?? 1;
      if (it.asset === 'ball') ob.scale.setScalar(S.ballR * s);
      else if (it.asset.startsWith('debris')) ob.scale.setScalar(s);
      else if (it.asset.startsWith('inv_')) ob.scale.setScalar(s * (S.invScale || 1.15));
      else ob.scale.set(s * (it.wsx ?? 1), s * (it.wsy ?? 1), s * (it.wsz ?? 1));
      if (ob.userData.label) {
        const lab = ob.userData.label, n = it.num;
        if (lab.userData.n !== n) { lab.material.map = numberTexture(n); lab.material.needsUpdate = true; lab.userData.n = n; }
        lab.material.opacity = it.numOp ?? 1;
        lab.visible = n != null && (it.numOp ?? 1) > 0.01;
        lab.quaternion.copy(camera.quaternion);
        ob.updateMatrixWorld();
        const pq = new THREE.Quaternion(); ob.getWorldQuaternion(pq); lab.quaternion.premultiply(pq.invert());
      }
      ob.visible = (it.op ?? 1) > 0.01;
    }
    for (const [id, o] of pool) { o.obj.visible = o.used && o.obj.visible; if (!o.used && !opt.exportMode) { scene.remove(o.obj); pool.delete(id); } }
  }
  function render(frame, S, w, h) {
    if (!renderer) { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0); }
    if (renderer.domElement.width !== w || renderer.domElement.height !== h) renderer.setSize(w, h, false);
    if (frame.rotY != null) setTargetRot(frame.rotY);
    if (frame.vox) setVoxels(frame.vox);
    apply(frame.items, S);
    renderer.render(scene, camera); return renderer.domElement;
  }
  return { setup, render, apply, setVoxels, setTargetRot, pool, statics, get scene() { return scene; }, get camera() { return camera; }, get sun() { return sun; }, get voxMesh() { return voxMesh; }, get renderer() { return renderer; }, get targetPivot() { return targetPivot; } };
}
