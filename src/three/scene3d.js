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
const IS3D_RE = /^(shooter|cannon|ball|spark|flash|debris|slot|inv|trail|num)/;
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
  // 广告：正面粗圆角白实心字 + 轻暗描边（非手绘空心描边）
  const c = document.createElement('canvas'); c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 160);
  const s = String(n);
  const fs = s.length >= 3 ? 100 : s.length === 2 ? 128 : 148;
  g.font = `900 ${fs}px "Arial Rounded MT Bold","Nunito","Helvetica Neue",Arial,sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineCap = 'round';
  const cx = 128, cy = 84;
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.fillText(s, cx + 2, cy + 3);
  g.lineWidth = Math.max(8, fs * 0.09);
  g.strokeStyle = 'rgba(10,12,18,0.75)';
  g.strokeText(s, cx, cy);
  g.fillStyle = '#ffffff';
  g.fillText(s, cx, cy);
  return c;
}
export function numberTexture(n) {
  if (!numTex.has(n)) {
    const tex = new THREE.CanvasTexture(numberCanvas(n));
    tex.colorSpace = THREE.SRGBColorSpace; tex.name = 'num_' + n; tex.anisotropy = 8;
    numTex.set(n, tex);
  }
  return numTex.get(n);
}

// 广告 chibi 玩具炮：敦实圆墩身体 + 小圆眼睛 + 短上仰白炮口 + 正面大白数字
export function makeShooter(S, color, Wd) {
  const hex = colorHex(S, color), lite = shade(hex, 1.14), dark = shade(hex, 0.82);
  const { w, d, h } = Wd.SH;
  const G = new THREE.Group(); G.name = 'shooter_' + color;
  const body = new THREE.Group(); body.name = 'body';
  const upper = new THREE.Group(); upper.name = 'upper';
  const tankR = Math.min(0.42, (S.tankRough ?? 0.22));
  const rb = (W2, H2, D2, r) => new RoundedBoxGeometry(W2, H2, D2, 5, r);

  // 敦实矮胖身体（chibi toy，非扁按钮）
  const hull = new THREE.Mesh(rb(w * 0.98, h * 0.78, d * 0.92, 0.38), mat(S, hex, { rough: tankR }));
  hull.name = 'hull'; hull.position.set(0, h * 0.4, 0); body.add(withOutline(hull, S));
  // 头顶圆帽
  const head = new THREE.Mesh(rb(w * 0.72, h * 0.28, d * 0.7, 0.28), mat(S, lite, { rough: Math.max(0.1, tankR - 0.08) }));
  head.name = 'head'; head.position.set(0, h * 0.82, 0.02); body.add(head);

  // 两只小黑圆眼睛（正面）
  const eyeMat = mat(S, '#1a1a22', { rough: 0.35 });
  const eyeR = Math.min(w, h) * 0.07;
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 12, 10), eyeMat);
    eye.name = sx < 0 ? 'eye_L' : 'eye_R';
    eye.position.set(sx * w * 0.18, h * 0.55, d * 0.48);
    body.add(eye);
    // 小白高光点
    const hi = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.35, 8, 6), mat(S, '#ffffff', { rough: 0.2 }));
    hi.position.set(sx * w * 0.18 + eyeR * 0.25, h * 0.55 + eyeR * 0.25, d * 0.48 + eyeR * 0.7);
    body.add(hi);
  }

  // 短白炮口（上仰，从头顶伸出）
  const muzzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.13, h * 0.28, 12),
    mat(S, '#f5f7fa', { rough: 0.18 })
  );
  muzzle.name = 'muzzle';
  muzzle.rotation.x = -0.55;
  muzzle.position.set(0, h * 1.02, -d * 0.08);
  upper.add(withOutline(muzzle, S));
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat(S, '#ffffff', { rough: 0.12 }));
  tip.name = 'tip';
  tip.position.set(0, h * 1.12, -d * 0.22);
  upper.add(tip);

  // 数字贴在正面（眼睛下方），随 faceCam 朝相机
  const lab = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.88, h * 0.42),
    new THREE.MeshBasicMaterial({ map: numberTexture(0), transparent: true, depthWrite: false, depthTest: true })
  );
  lab.name = 'label'; lab.renderOrder = 8;
  lab.position.set(0, h * 0.42, d * 0.5 + 0.02);
  upper.add(lab);

  G.add(body, upper);
  G.userData.body = body; G.userData.upper = upper; G.userData.label = lab; G.userData.color = color;
  return G;
}

// 库存块：敦实圆角立方 + 正面大白数字（广告待选区）
export function makeInvBlock(S, color) {
  const hex = colorHex(S, color), lite = shade(hex, 1.1);
  const G = new THREE.Group(); G.name = 'inv_' + color;
  const rough = S.voxRough ?? 0.4;
  const m = new THREE.Mesh(geos(S).inv, mat(S, hex, { rough }));
  m.name = 'hull'; G.add(withOutline(m, S));
  const top = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.1, 0.78, 2, 0.12), mat(S, lite, { rough: rough - 0.05 }));
  top.position.set(0, 0.44, 0); G.add(top);
  // 数字贴正面中央（朝相机）
  const lab = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.55),
    new THREE.MeshBasicMaterial({ map: numberTexture(0), transparent: true, depthWrite: false, depthTest: true })
  );
  lab.name = 'label'; lab.renderOrder = 8;
  lab.position.set(0, 0.02, 0.52);
  G.add(lab);
  G.userData.label = lab; G.userData.color = color;
  return G;
}

export function makeBall(S) {
  const g = new THREE.Group(); g.name = 'ball';
  const glow = S.ballGlow || 0;
  // 广告：小白珍珠球 + 软光晕
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.05, metalness: 0.08,
    emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.45 + glow * 0.7,
  }); coreMat.name = 'mat_ball';
  const core = new THREE.Mesh(geos(S).ball, coreMat); core.name = 'ball_core'; g.add(core);
  const rim = new THREE.Mesh(geos(S).ball, new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  rim.scale.setScalar(1.18); rim.renderOrder = 1; g.add(rim);
  if (S.ballHalo > 1 && S.ballHaloOp > 0) {
    const halo = new THREE.Mesh(geos(S).ball, new THREE.MeshBasicMaterial({
      color: 0xfff8ff, transparent: true, opacity: S.ballHaloOp, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    halo.scale.setScalar(S.ballHalo); g.add(halo);
  }
  return g;
}

// 软运动模糊拖尾：锥形圆柱 + 径向/轴向 alpha 贴图（无硬边、任意角度可见）
let _trailTex = null;
function trailTexture() {
  if (_trailTex) return _trailTex;
  const W = 64, H = 128;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1); // 0=尖(球) … 1=宽(后)
    const along = Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.08)), 0.7) * (1 - Math.pow(v, 1.45) * 0.5);
    for (let x = 0; x < W; x++) {
      // u around cylinder: 0..1 → treat as distance from silhouette center via cos
      const ang = (x / W) * Math.PI * 2;
      // soft limb darkening: brighter facing camera approx via |sin| falloff on edge
      const edge = Math.pow(Math.abs(Math.sin(ang)), 0.35);
      const radial = Math.exp(-Math.pow(1 - edge, 2) * 1.8) * 0.35 + edge * 0.65;
      const a = Math.max(0, Math.min(1, along * radial * 0.95));
      const i = (y * W + x) * 4;
      img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 220);
    }
  }
  g.putImageData(img, 0, 0);
  _trailTex = new THREE.CanvasTexture(c);
  _trailTex.colorSpace = THREE.SRGBColorSpace;
  _trailTex.needsUpdate = true;
  return _trailTex;
}
export function makeTrail(S) {
  const g = new THREE.Group(); g.name = 'trail';
  const tex = trailTexture();
  const mk = (rt, rb, op, name) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(rt, rb, 1, 16, 1, true),
      new THREE.MeshBasicMaterial({
        map: tex, color: 0xffffff, transparent: true, opacity: op, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      })
    );
    m.name = name; return m;
  };
  // 尖(+Y球) ← 宽(-Y后)：细软锥 + 外晕
  g.add(mk(0.0025, 0.032, 0.75, 'trail_core'));
  g.add(mk(0.006, 0.055, 0.28, 'trail_mid'));
  g.add(mk(0.012, 0.085, 0.12, 'trail_glow'));
  return g;
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
  function setTargetRot(ry, rx) {
    if (!targetPivot) return;
    targetPivot.rotation.y = ry;
    targetPivot.rotation.x = rx != null ? rx : (S0?.targetTiltX || 0);
  }
  function getObj(it) {
    let o = pool.get(it.id);
    if (o && o.asset !== it.asset) { scene.remove(o.obj); pool.delete(it.id); o = null; }
    if (!o) {
      let obj; const k = it.asset;
      if (k.startsWith('shooter_') || k.startsWith('cannon_')) obj = makeShooter(S0, k.split('_')[1], Wd);
      else if (k.startsWith('inv_')) obj = makeInvBlock(S0, k.slice(4));
      else if (k === 'ball' || k === 'spark' || k === 'flash') obj = makeBall(S0);
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
      if (it.faceCam && camera) {
        // 微仰对相机：顶面数字可见，块仍有立体厚度（广告发射/待选角度）
        ob.quaternion.copy(camera.quaternion);
        const e = new THREE.Euler().setFromQuaternion(ob.quaternion, 'YXZ');
        e.z = 0;
        // 更大俯仰 → 看见顶面数字；发射区略仰
        const isTank = it.asset.startsWith('shooter_') || it.asset.startsWith('cannon_');
        // 略仰即可：正面眼睛+数字可读，勿压成顶视
        e.x = isTank ? 0.22 : 0.28;
        ob.quaternion.setFromEuler(e);
      } else {
        ob.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
      }
      if (ob.userData.body) ob.userData.body.rotation.y = it.bodyYaw ?? 0;
      if (ob.userData.upper) ob.userData.upper.rotation.y = it.turretYaw ?? it.bodyYaw ?? 0;
      const s = it.ws ?? 1;
      if (it.asset === 'ball' || it.asset === 'spark' || it.asset === 'flash') {
        const mul = it.asset === 'flash' ? (S.ballR * 2.4) : it.asset === 'spark' ? (S.ballR * 0.7) : S.ballR;
        ob.scale.setScalar(mul * s);
        const bop = it.op ?? 1;
        ob.traverse(ch => {
          if (!ch.material) return;
          if (ch.userData._bop == null && ch.material.opacity != null) ch.userData._bop = ch.material.opacity;
          if (ch.material.transparent && ch.userData._bop != null) ch.material.opacity = ch.userData._bop * bop;
          if (ch.material.emissiveIntensity != null) ch.material.emissiveIntensity = (it.asset === 'flash' ? 2.2 : 0.8) * bop;
        });
      }
      else if (it.asset === 'trail') {
        const len = it.trailLen || 1.8;
        const thick = (it.trailThick ?? 0.55) * s;
        // PlaneGeometry 默认 XY；厚=X，长=Y，Z 忽略
        ob.scale.set(thick, len, thick);
        if (it.rx != null || it.ry != null) ob.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
        else if (it.trailQuat) ob.quaternion.copy(it.trailQuat);
        const op = it.op ?? 0.75;
        ob.traverse(ch => {
          if (ch.material && ch.material.transparent) {
            const base = ch.name === 'trail_core' ? 0.7 : ch.name === 'trail_mid' ? 0.32 : ch.name === 'trail_glow' ? 0.14 : 0.35;
            ch.material.opacity = base * op;
          }
        });
      }
      else if (it.asset.startsWith('debris')) ob.scale.setScalar(s);
      else if (it.asset.startsWith('inv_')) ob.scale.setScalar(s * (it.faceCam ? 1 : (S.invScale || 1.35)));
      else if (it.faceCam && (it.asset.startsWith('shooter_') || it.asset.startsWith('cannon_')))
        ob.scale.setScalar(s);
      else ob.scale.set(s * (it.wsx ?? 1), s * (it.wsy ?? 1), s * (it.wsz ?? 1));
      if (ob.userData.label) {
        const lab = ob.userData.label, n = it.num;
        if (lab.userData.n !== n) { lab.material.map = numberTexture(n); lab.material.needsUpdate = true; lab.userData.n = n; }
        lab.material.opacity = it.numOp ?? 1;
        lab.visible = n != null && (it.numOp ?? 1) > 0.01;
        // 正面数字：贴在朝前平面，随整块 faceCam，不再压到顶面
        lab.rotation.set(0, 0, 0);
      }
      ob.visible = (it.op ?? 1) > 0.01;
    }
    for (const [id, o] of pool) { o.obj.visible = o.used && o.obj.visible; if (!o.used && !opt.exportMode) { scene.remove(o.obj); pool.delete(id); } }
  }
  function render(frame, S, w, h) {
    if (!renderer) { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0); }
    if (renderer.domElement.width !== w || renderer.domElement.height !== h) renderer.setSize(w, h, false);
    if (frame.rotY != null) setTargetRot(frame.rotY, frame.rotX);
    if (frame.vox) setVoxels(frame.vox);
    apply(frame.items, S);
    renderer.render(scene, camera); return renderer.domElement;
  }
  return { setup, render, apply, setVoxels, setTargetRot, pool, statics, get scene() { return scene; }, get camera() { return camera; }, get sun() { return sun; }, get voxMesh() { return voxMesh; }, get renderer() { return renderer; }, get targetPivot() { return targetPivot; } };
}
