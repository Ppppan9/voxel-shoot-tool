// v1.4.5：严格同色——所有关卡：库存每色弹药 == 该色体素数；自动通关中每次命中体素色 == 发射器色
import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd();
const server = http.createServer((q, r) => { let u = q.url.split('?')[0]; fs.readFile(path.join(root, u === '/' ? '/index.html' : decodeURIComponent(u)), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200); r.end(d); }); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 1000 } });
await p.goto(`http://127.0.0.1:${server.address().port}/`); await p.waitForFunction(() => window.__game);
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForFunction(() => window.__game);
const levels = (process.env.LEVELS || 'sphere_cage,diamond_cage,cat,house,icecream,watermelon').split(',');
let fail = 0;
for (const lv of levels) {
  for (const ss of [0, 2]) {
    const r = await p.evaluate(async ([lv, ss]) => {
      for (const [k, v] of [['level', lv], ['startSlots', ss], ['handShow', false], ['fireRate', 40], ['ballSpeed', 120], ['targetRotSpeed', 30], ['flyDur', 80]]) __game.set(k, v);
      __game.newGame();
      const g = __game, L = g.L, st = g.st;
      const vox = new Array(L.palette.length).fill(0); for (const v of st.vox) if (v) vox[v - 1]++;
      const ammo = new Array(L.palette.length).fill(0);
      for (const bl of g.G.inv) if (bl.state === 'inv') ammo[bl.color] += bl.left ?? bl.ammo;
      for (const s of g.G.slots) if (s) ammo[s.color] += s.left;
      const ammoBad = L.palette.map((n, c) => [n, vox[c], ammo[c]]).filter(x => x[1] !== x[2]);
      window.__colorLog = []; window.__buriedLog = []; window.__vclock = null; g.autoSolve();
      const t0 = performance.now();
      while (!window.__finished && !window.__failed && performance.now() - t0 < 600000) await new Promise(r => setTimeout(r, 250));
      const log = window.__colorLog; window.__colorLog = null;
      const bad = log.filter(h => h.vc !== h.sc).map(h => [L.palette[h.sc], L.palette[h.vc]]);
      return { finished: !!window.__finished, failed: !!window.__failed, left: st.total, hits: log.length, colorMismatch: bad.length, ex: bad.slice(0, 3), ammoBad, whiteVox: vox[L.palette.indexOf('white')] ?? 0, buried: window.__buriedLog.length, sec: Math.round((performance.now() - t0) / 1000) };
    }, [lv, ss]);
    const ok = r.finished && !r.failed && r.colorMismatch === 0 && !r.ammoBad.length && r.hits > 0;
    console.log(ok ? 'PASS' : 'FAIL', lv, 'startSlots=' + ss, JSON.stringify(r)); if (!ok) fail++;
  }
}
await b.close(); server.close();
console.log(fail ? 'SOME FAIL' : 'ALL PASS'); process.exit(fail ? 1 : 0);
