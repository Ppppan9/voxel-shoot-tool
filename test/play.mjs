// Playwright：点库存→入槽→开火；小目标清空；截图
import { chromium } from 'playwright-core';
import fs from 'fs';
import http from 'http';
import path from 'path';

const root = process.cwd();
const server = http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('missing'); }
    const ext = path.extname(f);
    const ct = ext === '.html' || req.url.split('?')[0] === '/' ? 'text/html' : ext === '.js' ? 'text/javascript' : ext === '.png' ? 'image/png' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(d);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 920 } });
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/i.test(m.text())) errs.push(m.text()); });
await p.goto(`http://127.0.0.1:${port}/index.html`);
await p.waitForTimeout(1200);

const boot = await p.evaluate(() => ({ hasGame: !!window.__game, total: window.__game?.st?.total, inv: window.__game?.G?.inv?.length, slots: window.__game?.G?.slots?.filter(Boolean).length }));
console.log('boot', boot);
if (!boot.hasGame) { console.log('FAIL no __game', errs); process.exit(1); }

// tap inventory → slot → fire
const tapResult = await p.evaluate(async () => {
  const beforeEmpty = __game.G.slots.filter(s => !s).length;
  const inv = __game.G.inv.find(b => b.state === 'inv');
  if (!inv) return { ok: false, why: 'no inv' };
  const [sx, sy] = __game.invScreen(inv.gi);
  __game.tapAt(sx, sy);
  // advance time for fly-in
  let t = performance.now();
  for (let i = 0; i < 40; i++) { t += 40; __game.renderAt(t); await new Promise(r => setTimeout(r, 0)); }
  const afterEmpty = __game.G.slots.filter(s => !s).length;
  const balls = __game.G.balls.length;
  const firing = __game.G.slots.some(s => s && s.left > 0 && s.state === 'slot');
  return { ok: afterEmpty < beforeEmpty || firing, beforeEmpty, afterEmpty, balls, firing, left: inv.left };
});
console.log((tapResult.ok ? 'PASS' : 'FAIL'), 'tap→slot→fire', tapResult);

// clear a small target (watermelon or icecream with high ammo / auto)
const clearResult = await p.evaluate(async () => {
  __game.set('level', 'watermelon');
  __game.set('startSlots', 5);
  __game.set('maxAmmo', 120);
  __game.set('autoSpeed', 5);
  __game.set('autoStartDelay', 0);
  __game.set('fireRate', 30);
  __game.set('ballSpeed', 80);
  __game.set('flyDur', 120);
  __game.set('leaveDur', 100);
  __game.newGame();
  let t = 200000;
  __game.renderAt(t);
  __game.autoSolve();
  const t0 = t;
  while (!window.__finished && !window.__failed && t - t0 < 90000) {
    t += 33;
    __game.renderAt(t);
    await new Promise(r => setTimeout(r, 0));
  }
  return { finished: !!window.__finished, failed: !!window.__failed, left: __game.st.total, sim: Math.round((t - t0) / 100) / 10 };
});
console.log((clearResult.finished && clearResult.left === 0 ? 'PASS' : 'FAIL'), 'clear-small', clearResult);

// screenshot current
await p.evaluate(() => { window.__vclock = null; window.__no3d = false; });
__game_shot: {
  await p.evaluate(() => { __game.set('level', 'sphere_cage'); __game.set('startSlots', 2); __game.newGame(); });
  await p.waitForTimeout(800);
  const shot = await p.locator('#stage').screenshot();
  fs.writeFileSync('screenshots/play_sphere.png', shot);
}

// side-by-side vs ref for a few levels
for (const [lv, refName] of [['sphere_cage', 'detail_02s.png'], ['diamond_cage', 'detail_08s.png'], ['cat', 'f_0030.png'], ['house', 'f_0040.png'], ['icecream', 'detail_22s.png'], ['watermelon', 'detail_27s.png']]) {
  await p.evaluate(lv => { __game.set('level', lv); __game.set('startSlots', 2); __game.newGame(); }, lv);
  await p.waitForTimeout(600);
  // advance a bit so cannons fire
  await p.evaluate(async () => {
    let t = performance.now();
    for (let i = 0; i < 45; i++) { t += 33; __game.renderAt(t); await new Promise(r => setTimeout(r, 0)); }
    window.__vclock = null;
  });
  await p.waitForTimeout(200);
  const shot = await p.locator('#stage').screenshot();
  fs.writeFileSync(`screenshots/game_${lv}.png`, shot);
  // compose side-by-side if ref exists
  const ref = path.join(root, 'ref/frames', refName);
  if (fs.existsSync(ref)) {
    // use sharp? or ffmpeg. Use canvas via page.
    const side = await p.evaluate(async ([refUrl, name]) => {
      const stage = document.getElementById('stage');
      const gameUrl = stage.toDataURL('image/png');
      const load = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
      const gIm = await load(gameUrl);
      const rIm = await load(refUrl);
      const c = document.createElement('canvas');
      const h = 640, gw = Math.round(h * (gIm.width / gIm.height)), rw = Math.round(h * (rIm.width / rIm.height));
      c.width = gw + rw + 8; c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(rIm, 0, 0, rw, h);
      ctx.drawImage(gIm, rw + 8, 0, gw, h);
      ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
      ctx.fillText('REF', 8, 20); ctx.fillText('GAME ' + name, rw + 16, 20);
      return c.toDataURL('image/png');
    }, ['/ref/frames/' + refName, lv]);
    fs.writeFileSync(`screenshots/side_${lv}.png`, Buffer.from(side.split(',')[1], 'base64'));
  }
}

console.log('page errors:', errs.slice(0, 5));
const ok = tapResult.ok && clearResult.finished && clearResult.left === 0;
if (errs.length) console.log('non-fatal errs', errs);
console.log(ok ? 'ALL PASS' : 'SOME FAIL');
await b.close(); server.close();
process.exit(ok ? 0 : 1);
