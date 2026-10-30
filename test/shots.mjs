import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
const root = process.cwd();
const server = http.createServer((req, res) => {
  let u = req.url.split('?')[0];
  let f = path.join(root, u === '/' ? '/index.html' : decodeURIComponent(u));
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    const ct = (u === '/' || u.endsWith('.html')) ? 'text/html' : u.endsWith('.png') ? 'image/png' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct }); res.end(d);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 1000 } });
await p.goto(`http://127.0.0.1:${server.address().port}/`);
await p.waitForFunction(() => window.__game);
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.waitForFunction(() => window.__game);
const pairs = [
  ['sphere_cage', 'f_0001.png'],
  ['diamond_cage', 'detail_08s.png'],
  ['cat', 'f_0030.png'],
  ['house', 'f_0040.png'],
  ['icecream', 'detail_22s.png'],
  ['watermelon', 'detail_27s.png'],
];
for (const [lv, refName] of pairs) {
  await p.evaluate(lv => {
    __game.set('level', lv);
    __game.set('startSlots', 2);
    __game.set('fireRate', 22); // 对比图要有密集细白拖尾+碎屑
    __game.set('ballSpeed', 24);
    __game.set('targetRotSpeed', 6);
    __game.set('handShow', true);
    __game.set('handRest', false);
    __game.set('manualHand', true);
    __game.set('debrisCount', 14);
    __game.newGame();
  }, lv);
  await p.evaluate(async () => {
    try {
      const vis = __game.G.inv.filter(b => b.state === 'inv');
      if (vis.length) {
        const c = __game.invScreen(vis[0].gi);
        __game.hand.visible = true;
        __game.hand.x = c[0]; __game.hand.y = c[1];
        __game.S.handShow = true; __game.S.handRest = false;
      }
    } catch (e) {}
    let t = performance.now();
    // ~1.2s 开火，确保球与碎屑可见
    for (let i = 0; i < 28; i++) { t += 28; __game.renderAt(t); await new Promise(r => setTimeout(r, 0)); }
    window.__vclock = null;
  });
  await p.waitForTimeout(80);
  const gameB64 = await p.evaluate(() => document.getElementById('stage').toDataURL('image/png'));
  fs.writeFileSync(`screenshots/game_${lv}.png`, Buffer.from(gameB64.split(',')[1], 'base64'));
  const ref = path.join(root, 'ref/frames', refName);
  if (fs.existsSync(ref)) {
    const side = await p.evaluate(async ([refUrl, name]) => {
      const stage = document.getElementById('stage');
      const gameUrl = stage.toDataURL('image/png');
      const load = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
      const gIm = await load(gameUrl), rIm = await load(refUrl);
      const h = 640, gw = Math.round(h * gIm.width / gIm.height), rw = Math.round(h * rIm.width / rIm.height);
      const c = document.createElement('canvas'); c.width = gw + rw + 8; c.height = h;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#111'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(rIm, 0, 0, rw, h); ctx.drawImage(gIm, rw + 8, 0, gw, h);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif';
      ctx.fillText('REF', 10, 24); ctx.fillText('GAME ' + name, rw + 18, 24);
      return c.toDataURL('image/png');
    }, ['/ref/frames/' + refName, lv]);
    fs.writeFileSync(`screenshots/side_${lv}.png`, Buffer.from(side.split(',')[1], 'base64'));
  }
  console.log('shot', lv);
}
await b.close(); server.close();
