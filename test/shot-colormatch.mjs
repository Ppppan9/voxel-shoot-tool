import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd();
const server = http.createServer((q, r) => { let u = q.url.split('?')[0]; fs.readFile(path.join(root, u === '/' ? '/index.html' : decodeURIComponent(u)), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200); r.end(d); }); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 1000 } });
await p.goto(`http://127.0.0.1:${server.address().port}/`); await p.waitForFunction(() => window.__game);
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForFunction(() => window.__game);
await p.evaluate(() => { for (const [k, v] of [['level', 'sphere_cage'], ['startSlots', 0], ['handShow', false]]) __game.set(k, v); __game.newGame(); const W = __game.L.palette.indexOf('white'); /* 演示：只留白色发射器，展示白打白 */ __game.G.inv.forEach(b => { if (b.color !== W) b.state = 'demo_hidden'; }); __game.autoSolve(); });
const cond = () => p.evaluate(() => { const g = __game, L = g.L, W = L.palette.indexOf('white');
  const w = g.G.balls.filter(x => x.sh && x.sh.color === W && g.st.vox[x.m] - 1 === W).length;
  const o = g.G.balls.filter(x => x.sh && x.sh.color !== W).length;
  const ws = g.G.slots.filter(s => s && s.color === W && s.state === 'slot').length;
  return w >= 2 && o === 0 && ws >= 1; });
const c = await p.$('canvas'); let ok = false;
for (let i = 0; i < 4000 && !ok; i++) { if (await cond()) { const buf = await c.screenshot(); if (await cond()) { fs.writeFileSync('screenshots/side_colormatch.png', buf); ok = true; } } }
console.log(ok ? 'SHOT OK' : 'NO SHOT');
await b.close(); server.close();
