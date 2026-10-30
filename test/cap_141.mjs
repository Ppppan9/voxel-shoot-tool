import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root=process.cwd();
const server=http.createServer((q,r)=>{let u=q.url.split('?')[0];fs.readFile(path.join(root,u==='/'?'/index.html':decodeURIComponent(u)),(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200);r.end(d);});});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1100,height:1000}});
await p.goto(`http://127.0.0.1:${server.address().port}/`);await p.waitForFunction(()=>window.__game);
await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForFunction(()=>window.__game);
const snap=async n=>{fs.writeFileSync('screenshots/'+n,Buffer.from((await p.evaluate(()=>document.getElementById('stage').toDataURL())).split(',')[1],'base64'));console.log('w',n);};

// Empty slots cleared: start with slots that deplete quickly
await p.evaluate(()=>{
  for(const[k,v]of[['level','sphere_cage'],['startSlots',5],['handShow',false],['fireRate',30],['maxAmmo',3],['ammoStep',1]])__game.set(k,v);
  __game.newGame();
  // force tiny ammo so they leave fast
  for(const sh of __game.G.slots){ if(sh){ sh.left=1; sh.ammo0=1; } }
});
await p.evaluate(async()=>{
  let t=performance.now();
  for(let i=0;i<90;i++){ t+=30; __game.renderAt(t); await new Promise(r=>setTimeout(r,0)); }
});
await snap('game_empty_cleared.png');
console.log(await p.evaluate(()=>__game.G.slots.map(s=>s?{left:s.left,state:s.state}:null)));

// FX firing still
await p.evaluate(()=>{
  for(const[k,v]of[['level','sphere_cage'],['startSlots',5],['handShow',false],['fireRate',16],['maxAmmo',88],['ammoStep',5]])__game.set(k,v);
  __game.newGame();
});
await p.evaluate(async()=>{
  let t=performance.now(), best=t, bestScore=-1;
  for(let i=0;i<70;i++){
    t+=22; __game.renderAt(t); await new Promise(r=>setTimeout(r,0));
    const mid=(__game.G.balls||[]).filter(b=>{const u=(t-b.t0)/Math.max(1,b.dur);return u>0.2&&u<0.85;}).length;
    const score=mid*100+(__game.G.debris||[]).length+(__game.G.sparks||[]).length;
    if(score>bestScore){bestScore=score;best=t;}
  }
  __game.renderAt(best);
});
await snap('game_fx.png');

await b.close();server.close();
