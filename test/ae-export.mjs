import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const server = http.createServer((req, res) => {
  let u = req.url.split('?')[0];
  let f = path.join(root, u === '/' ? '/index.html' : decodeURIComponent(u));
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    const ct = (u === '/' || u.endsWith('.html')) ? 'text/html' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct }); res.end(d);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1000, height: 880 } });
const pe = []; p.on('pageerror', e => pe.push(e.message));
await p.goto(`http://127.0.0.1:${server.address().port}/`);
await p.waitForFunction(() => window.__game);

const r = await p.evaluate(async () => {
  __game.set('level', 'icecream');
  __game.set('startSlots', 3);
  __game.set('fireRate', 22);
  __game.set('ballSpeed', 75);
  __game.set('flyDur', 90);
  __game.set('autoSpeed', 7);
  __game.set('autoStartDelay', 0);
  __game.newGame();
  __game.aeStart();
  let t = 300000; __game.renderAt(t); __game.autoSolve();
  const t0 = t;
  while (!window.__finished && !window.__failed && t - t0 < 55000) {
    t += 33; __game.renderAt(t); await new Promise(r => setTimeout(r, 0));
  }
  for (let i = 0; i < 25; i++) { t += 33; __game.renderAt(t); await new Promise(r => setTimeout(r, 0)); }
  try {
    const out = await __game.doExportAE(false);
    if (!out?.blob) return { ok: false, why: 'no blob', finished: !!window.__finished };
    const buf = new Uint8Array(await out.blob.arrayBuffer());
    let s = ''; const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) s += String.fromCharCode.apply(null, buf.subarray(i, i + chunk));
    return { ok: true, name: out.name, size: buf.length, b64: btoa(s), finished: !!window.__finished, stats: out.stats };
  } catch (e) { return { ok: false, err: String(e), finished: !!window.__finished }; }
});
console.log('ae', { ok: r.ok, name: r.name, size: r.size, finished: r.finished, stats: r.stats, err: r.err });
console.log('pageerrors', pe.slice(0, 3));
if (!r.ok) { await b.close(); server.close(); process.exit(1); }
fs.writeFileSync('screenshots/ae_smoke.zip', Buffer.from(r.b64, 'base64'));
const listing = execSync('unzip -l screenshots/ae_smoke.zip', { encoding: 'utf8' });
const need = ['build_ae_project.jsx', 'timeline.json', 'README_AE.md'];
const missing = need.filter(n => !listing.includes(n));
console.log(missing.length ? 'FAIL ' + missing : 'PASS ae files');
console.log(listing.split('\n').slice(0, 20).join('\n'));
await b.close(); server.close();
process.exit(missing.length ? 1 : 0);
