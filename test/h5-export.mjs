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
    const ct = (u === '/' || u.endsWith('.html')) ? 'text/html' : u.endsWith('.js') ? 'text/javascript' : u.endsWith('.png') ? 'image/png' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(d);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__game);
await p.waitForTimeout(400);

const dl = await p.evaluate(async () => {
  __game.set('level', 'icecream');
  __game.set('startSlots', 2);
  __game.newGame();
  // Avoid download() clicking <a> — call export and return bytes
  const { exportH5PlayableFromPage } = await import('/src/h5/index.js').catch(() => ({}));
  // Use in-page API but intercept download by monkeypatching
  const orig = HTMLAnchorElement.prototype.click;
  let captured = null;
  HTMLAnchorElement.prototype.click = function () {
    if (this.href && this.href.startsWith('blob:')) {
      captured = { href: this.href, name: this.download };
      return;
    }
    return orig.apply(this, arguments);
  };
  const out = await __game.doExportH5();
  HTMLAnchorElement.prototype.click = orig;
  const blob = out?.blob;
  if (!blob) return { ok: false, why: 'no blob' };
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) s += String.fromCharCode.apply(null, buf.subarray(i, i + chunk));
  return { ok: true, name: out.name || captured?.name, size: buf.length, b64: btoa(s) };
});
console.log('h5', { ok: dl.ok, name: dl.name, size: dl.size });
if (!dl.ok) { console.log('FAIL'); process.exit(1); }
const zipPath = path.join(root, 'screenshots/h5_smoke.zip');
fs.writeFileSync(zipPath, Buffer.from(dl.b64, 'base64'));
const listing = execSync(`unzip -l ${zipPath}`, { encoding: 'utf8' });
const channels = ['applovin', 'facebook', 'google', 'mintegral', 'moloco', 'tiktok', 'unity', 'generic'];
const missing = channels.filter(c => !listing.includes(c + '/'));
console.log(missing.length ? 'FAIL missing ' + missing : 'PASS 8 channels');
console.log(listing.split('\n').filter(l => /index\.html|config\.json|README/.test(l)).join('\n'));

fs.mkdirSync('screenshots/h5_extract', { recursive: true });
execSync(`unzip -o -q ${zipPath} -d screenshots/h5_extract`);
const p3 = await b.newPage();
const errs = [];
p3.on('pageerror', e => errs.push(e.message));
await p3.goto('file://' + path.resolve('screenshots/h5_extract/generic/index.html'));
await p3.waitForTimeout(1500);
const st = await p3.evaluate(() => ({
  hasGame: !!window.__game,
  playable: !!window.__PLAYABLE__,
  noHand: !!(window.__PLAYABLE__ && (window.__PLAYABLE__.noHand || window.__H5_NO_HAND || true)),
}));
console.log('generic', st, 'errs', errs.slice(0, 3));
const ok = missing.length === 0 && st.hasGame;
console.log(ok ? 'PASS h5' : 'FAIL h5');
await b.close(); server.close();
process.exit(ok ? 0 : 1);
