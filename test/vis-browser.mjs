// 浏览器：真实自动通关 + 命中日志 → 每发命中面都朝镜头且可见；导出调试叠加图
import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd();
const server = http.createServer((q, r) => { let u = q.url.split('?')[0]; fs.readFile(path.join(root, u === '/' ? '/index.html' : decodeURIComponent(u)), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200); r.end(d); }); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 1000 } });
await p.goto(`http://127.0.0.1:${server.address().port}/`); await p.waitForFunction(() => window.__game);
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForFunction(() => window.__game);
let fail = 0;
// 1) 调试叠加：当前帧所有「可打外露」体素，绿=可见面，红=朝背/被挡（不会被打）
await p.evaluate(() => { for (const [k, v] of [['level', 'sphere_cage'], ['handShow', false], ['startSlots', 5], ['fireRate', 16], ['targetRotSpeed', 10]]) __game.set(k, v); __game.newGame(); window.__hitLog = []; });
await p.evaluate(async () => { let t = performance.now(); for (let i = 0; i < 70; i++) { t += 22; __game.renderAt(t); await new Promise(r => setTimeout(r, 0)); } });
const dbg = await p.evaluate(async () => {
  const g = __game, L = g.L, st = g.st, rotY = g.G.rotY, cam = g.camGrid(rotY), W = g.world;
  const stage = document.getElementById('stage');
  const c = document.createElement('canvas'); c.width = stage.width; c.height = stage.height;
  const ctx = c.getContext('2d'); ctx.drawImage(stage, 0, 0);
  const k = stage.width / 720; const oy = 0; window.__dbgInfo = { sw: stage.width, sh: stage.height };
  let vis = 0, hid = 0;
  const pts = [];
  for (let ci = 0; ci < L.palette.length; ci++) for (const m of st.exp[ci]) {
    const w = g.worldOfVox(m, rotY), s = W.proj(w[0], w[1], w[2]);
    const f = g.visibleFace(L, st.vox, m, cam);
    if (f) vis++; else hid++;
    pts.push([s, !!f]);
  }
  // 先画红（背面/被挡，投影会透到前面），再画绿（可见前面）
  for (const pass of [false, true]) for (const [s, f] of pts) if (f === pass) {
    ctx.fillStyle = f ? 'rgba(0,255,90,0.95)' : 'rgba(255,40,40,0.35)';
    ctx.beginPath(); ctx.arc(s[0] * k, (s[1] + oy) * k, f ? 4.5 * k : 2.5 * k, 0, 7); ctx.fill();
  }
  // 最近命中点（黄圈）
  ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 2 * k;
  for (const h of (window.__hitLog || []).slice(-40)) { const w = g.worldOfVox(h.m, rotY); const s = W.proj(...w); ctx.beginPath(); ctx.arc(s[0] * k, (s[1] + oy) * k, 8 * k, 0, 7); ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.font = `bold ${16 * k}px sans-serif`;
  ctx.fillText(`green=visible front face (${vis})  red=back/occluded (${hid}, never targeted)`, 12 * k, 1250 * k);
  ctx.fillText('yellow rings = recent hits', 12 * k, 1272 * k);
  return { url: c.toDataURL('image/png'), vis, hid, info: window.__dbgInfo, s0: (()=>{const m=[...st.exp[1]][0]; return W.proj(...g.worldOfVox(m, rotY));})() };
});
fs.writeFileSync('screenshots/debug_visible_hits.png', Buffer.from(dbg.url.split(',')[1], 'base64'));
console.log('overlay vis/hidden', dbg.vis, dbg.hid, JSON.stringify(dbg.info), JSON.stringify(dbg.s0)); if (process.env.ONLY_OVERLAY) { await b.close(); server.close(); process.exit(0); }
// 2) 命中日志校验：每发 face 法线朝相机（在其命中时刻的相机）
const chk = await p.evaluate(() => {
  const g = __game, L = g.L; let bad = 0;
  for (const h of window.__hitLog) {
    const [i, j, k] = [h.m % L.W, Math.floor(h.m / L.W) % L.H, Math.floor(h.m / (L.W * L.H))];
    const d = [h.camGrid[0] - (i + h.face[0] / 2), h.camGrid[1] - (j + h.face[1] / 2), h.camGrid[2] - (k + h.face[2] / 2)];
    if (d[0] * h.face[0] + d[1] * h.face[1] + d[2] * h.face[2] <= 0) bad++;
  }
  return { n: window.__hitLog.length, bad };
});
console.log('hitlog', chk); if (!chk.n || chk.bad) fail++;
// 3) 真实自动通关（小关 icecream + sphere），确保仍能通关、不误判失败
for (const lv of ['icecream', 'sphere_cage']) {
  const r = await p.evaluate(async lv => {
    for (const [k, v] of [['level', lv], ['handShow', false], ['fireRate', 40], ['ballSpeed', 120], ['targetRotSpeed', 30], ['flyDur', 80]]) __game.set(k, v);
    __game.newGame(); window.__hitLog = [];
    window.__vclock = null; __game.autoSolve();
    const t0 = performance.now();
    while (!window.__finished && !window.__failed && performance.now() - t0 < 150000) await new Promise(r => setTimeout(r, 250));
    return { finished: window.__finished, failed: window.__failed, left: __game.st.total, hits: window.__hitLog.length, sec: Math.round((performance.now() - t0) / 1000) };
  }, lv);
  console.log('auto', lv, r); if (!r.finished) fail++;
}
await b.close(); server.close();
console.log(fail ? 'SOME FAIL' : 'ALL PASS'); process.exit(fail ? 1 : 0);
