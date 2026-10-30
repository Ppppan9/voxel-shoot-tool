import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { DW, DH } from '../world.js';

// 参考广告色（更饱和、玩具塑料）
export const PALETTE = {
  purple: '#a855f7', green: '#7CFC00', black: '#2c2c32', yellow: '#FFD400',
  red: '#FF3B4A', blue: '#3B82F6', orange: '#FF8A1F', pink: '#FF6AD5',
  white: '#F5F7FA', cyan: '#22D3EE', brown: '#8B5A2B', tan: '#E0B07A', cream: '#FFE8C8',
};
export const colorHex = (S, n) => S['col_' + n] || PALETTE[n] || '#888888';
const IS3D_RE = /^(shooter|cannon|ball|debris|slot|inv|trail|num)/;
export const IS3D = a => IS3D_RE.test(a || '');

let shared = null;
export function geos(S) {
  if (shared && shared.key === S.voxRound + '|' + S.voxGap) return shared;
  const g = Math.max(0.55, 1 - S.voxGap), r = Math.min(0.38 * g, Math.max(0, S.voxRound));
  shared = {
    key: S.voxRound + '|' + S.voxGap,
    vox: new RoundedBoxGeometry(g, g, g, 3, r),
    ball: new THREE.SphereGeometry(1, 28, 20),
    debris: new RoundedBoxGeometry(1, 1, 1, 2, 0.2),
    slot: new RoundedBoxGeometry(1.85, 0.28, 1.7, 2, 0.22),
    inv: new RoundedBoxGeometry(1, 1, 1, 4, 0.26),
  };
  return shared;
}
const matCache = new Map();
export function mat(S, hex, o = {}) {
  const key = hex + JSON.stringify(o) + S.mat3dRough + '|g' + (o.glow || 0);
  if (!matCache.has(key)) {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: o.rough ?? S.mat3dRough, metalness: o.metal ?? 0, ...o.extra });
    if (o.glow) { m.emissive = new THREE.Color(hex); m.emissiveIntensity = o.glow; }
    m.name = o.name || ('mat_' + hex.slice(1)); matCache.set(key, m);
  }
  return matCache.get(key);
}
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0e1018, side: THREE.BackSide }); outlineMat.name = 'mat_outline';
function withOutline(mesh, S) {
  if (!S.outline3d) return mesh;
  const o = new THREE.Mesh(mesh.geometry, outlineMat);
  o.name = mesh.name + '_outline';
  o.scale.setScalar(1 + S.outline3d * 0.07);
  mesh.add(o); return mesh;
}
const shade = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };

const numTex = new Map();
export function numberCanvas(n) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 160);
  g.font = '900 110px "Arial Black","Helvetica Neue",Arial,sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 18; g.strokeStyle = '#101018'; g.strokeText(String(n), 128, 88);
  g.lineWidth = 8; g.strokeStyle = '#000'; g.strokeText(String(n), 128, 88);
  g.fillStyle = '#ffffff'; g.fillText(String(n), 128, 88);
  return c;
}
export function numberTexture(n) {
  if (!numTex.has(n)) {
    const t = new THREE.CanvasTexture(numberCanvas(n));
    t.colorSpace = THREE.SRGBColorSpace; t.name = 'num_' + n; t.anisotropy = 8;
    numTex.set(n, t);
  }
  return numTex.get(n);
}

// 广告风玩具炮台：敦实圆角块 + 半球炮塔 + 短上仰炮管 + 正面大白数字（借 block-shooter 分体结构）
export function makeShooter(S, color, Wd) {
  const hex = colorHex(S, color), dark = shade(hex, 0.72), lite = shade(hex, 1.12);
  const { w, d, h } = Wd.SH;
  const G = new THREE.Group(); G.name = 'shooter_' + color;
  const body = new THREE.Group(); body.name = 'body';
  const upper = new THREE.Group(); upper.name = 'upper';
  const tankR = S.tankRough ?? 0.42;
  const rb = (W2, H2, D2, r) => new RoundedBoxGeometry(W2, H2, D2, 3, r);

  // 左右履带感（敦实）
  const trackG = rb(w * 0.28, h * 0.42, d * 1.02, 0.18);
  for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(trackG, mat(S, dark, { rough: tankR + 0.08 }));
    t.name = sx < 0 ? 'track_L' : 'track_R';
    t.position.set(sx * w * 0.4, h * 0.22, 0);
    body.add(withOutline(t, S));
  }
  // 车身
  const hull = new THREE.Mesh(rb(w * 0.78, h * 0.58, d * 0.9, 0.26), mat(S, hex, { rough: tankR }));
  hull.name = 'hull'; hull.position.set(0, h * 0.48, 0.02); body.add(withOutline(hull, S));
  // 顶盖亮面
  const cap = new THREE.Mesh(rb(w * 0.62, h * 0.16, d * 0.7, 0.14), mat(S, lite, { rough: tankR - 0.05 }));
  cap.name = 'cap'; cap.position.set(0, h * 0.82, 0.02); body.add(cap);

  // 半球炮塔
  const tur = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(S, hex, { rough: tankR }));
  tur.name = 'turret'; tur.scale.set(w * 0.34, h * 0.42, d * 0.36); tur.position.set(0, h * 0.78, 0.05);
  upper.add(withOutline(tur, S));
  // 短炮管上仰
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, d * 0.5, 14), mat(S, hex, { rough: tankR }));
  bar.name = 'barrel'; bar.rotation.x = -Math.PI / 2 + 0.55; bar.position.set(0, h * 0.98, -d * 0.18);
  upper.add(withOutline(bar, S));

  // 数字：贴在车身正面（大号）
  const lab = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.95, h * 0.55),
    new THREE.MeshBasicMaterial({ map: numberTexture(0), transparent: true, depthWrite: false, depthTest: true })
  );
  lab.name = 'label'; lab.renderOrder = 6;
  lab.position.set(0, h * 0.5, d * 0.48);
  upper.add(lab);

  G.add(body, upper);
  G.userData.body = body; G.userData.upper = upper; G.userData.label = lab; G.userData.color = color;
  return G;
}

// 库存块：敦实圆角立方 + 正面大白数字（与广告一致）
export function makeInvBlock(S, color) {
  const hex = colorHex(S, color), lite = shade(hex, 1.1);
  const G = new THREE.Group(); G.name = 'inv_' + color;
  const rough = S.voxRough ?? 0.4;
  const m = new THREE.Mesh(geos(S).inv, mat(S, hex, { rough }));
  m.name = 'hull'; G.add(withOutline(m, S));
  // 顶面高光条
  const top = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.12, 0.72, 2, 0.1), mat(S, lite, { rough: rough - 0.05 }));
  top.position.set(0, 0.42, 0); G.add(top);
  const lab = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.55),
    new THREE.MeshBasicMaterial({ map: numberTexture(0), transparent: true, depthWrite: false, depthTest: true })
  );
  lab.name = 'label'; lab.renderOrder = 6; lab.position.set(0, 0.02, 0.52); G.add(lab);
  G.userData.label = lab; G.userData.color = color;
  return G;
}

export function makeBall(S) {
  const g = new THREE.Group(); g.name = 'ball';
  const glow = S.ballGlow || 0;
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.08, metalness: 0.15,
    emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.25 + glow * 0.55,
  }); coreMat.name = 'mat_ball';
  const core = new THREE.Mesh(geos(S).ball, coreMat); core.name = 'ball_core'; g.add(core);
  const rim = new THREE.Mesh(geos(S).ball, new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  rim.scale.setScalar(1.1); rim.renderOrder = 1; g.add(rim);
  if (S.ballHalo > 1 && S.ballHaloOp > 0) {
    const halo = new THREE.Mesh(geos(S).ball, new THREE.MeshBasicMaterial({
      color: 0xfff8ff, transparent: true, opacity: S.ballHaloOp, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    halo.scale.setScalar(S.ballHalo); g.add(halo);
  }
  return g;
}

// 运动拖尾：拉长半透明白胶囊
export function makeTrail(S) {
  const g = new THREE.Group(); g.name = 'trail';
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.35, 1, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  m.name = 'trail_core'; g.add(m); return g;
}

export function create3D(opt = {}) {
  let renderer = null, scene, camera, sun, hemi, Wd, S0, L0, voxMesh, targetPivot;
  const pool = new Map(); const statics = new THREE.Group();
  function setup(S, L, W2) {
    S0 = S; L0 = L; Wd = W2; scene = new THREE.Scene(); camera = Wd.cam; pool.clear();
    hemi = new THREE.HemisphereLight(0xffffff, 0x1a2848, S.light3dAmbient); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, S.light3dSun);
    const a = S.light3dAzim * Math.PI / 180, e = S.light3dElev * Math.PI / 180;
    sun.position.set(Math.sin(a) * Math.cos(e) * 80, Math.sin(e) * 80, Math.cos(a) * Math.cos(e) * 80);
    sun.target.position.set(0, Wd.targetY, 0); scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0xb0c8ff, S.light3dSun * 0.32); fill.position.set(-35, 45, 55); scene.add(fill);
    statics.clear(); scene.add(statics);
    // 槽位改由 2D UI 绘制（对齐参考扁平条），3D 不再放槽位盘
    targetPivot = new THREE.Group(); targetPivot.name = 'targetPivot';
    targetPivot.position.set(0, Wd.targetY, 0); scene.add(targetPivot);
    voxMesh = L.palette.map((p) => {
      const m = new THREE.InstancedMesh(geos(S).vox, mat(S, colorHex(S, p), { name: 'mat_vox_' + p, rough: S.voxRough ?? 0.4 }), 64);
      m.name = 'voxels_' + p; m.count = 0; m.frustumCulled = false; targetPivot.add(m); return m;
    });
    if (opt.exportMode) voxMesh.forEach(m => targetPivot.remove(m));
  }
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), SC = new THREE.Vector3();
  function setVoxels(groups) {
    groups.forEach((list, c) => {
      let m = voxMesh[c];
      if (list.length > m.instanceMatrix.count) {
        const nm = new THREE.InstancedMesh(m.geometry, m.material, Math.ceil(list.length * 1.3) + 32);
        nm.name = m.name; nm.frustumCulled = false; targetPivot.remove(m); m.dispose(); targetPivot.add(nm); voxMesh[c] = m = nm;
      }
      for (let q = 0; q < list.length; q++) {
        const row = list[q], n = row[0], sx = row[1] ?? 1, sy = row[2] ?? sx, sz = row[3] ?? sx;
        const ox = row[4] || 0, oy = row[5] || 0, oz = row[6] || 0, p = Wd.vox(n);
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
      else if (k === 'trail') obj = makeTrail(S0);
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
      else if (it.asset === 'trail') {
        ob.scale.set(s * 0.9, it.trailLen || 1.5, s * 0.9);
        if (it.trailQuat) ob.quaternion.copy(it.trailQuat);
      }
      else if (it.asset.startsWith('debris')) ob.scale.setScalar(s);
      else if (it.asset.startsWith('inv_')) ob.scale.setScalar(s * (S.invScale || 1.35));
      else ob.scale.set(s * (it.wsx ?? 1), s * (it.wsy ?? 1), s * (it.wsz ?? 1));
      if (ob.userData.label) {
        const lab = ob.userData.label, n = it.num;
        if (lab.userData.n !== n) { lab.material.map = numberTexture(n); lab.material.needsUpdate = true; lab.userData.n = n; }
        lab.material.opacity = it.numOp ?? 1;
        lab.visible = n != null && (it.numOp ?? 1) > 0.01;
        // 仅轻微朝向相机（保持贴在正面，不整面 billboard 导致「数字掉到块下方」）
        if (it.asset.startsWith('inv_')) {
          lab.quaternion.copy(camera.quaternion);
          ob.updateMatrixWorld();
          const pq = new THREE.Quaternion(); ob.getWorldQuaternion(pq); lab.quaternion.premultiply(pq.invert());
        } else {
          // 炮台：数字固定在正面，随 upper 转
          lab.rotation.set(0, 0, 0);
        }
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
