// v1.4.4: 单次命中逐帧序列 + 球/拖尾特写（与 ref 同时间偏移）
import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root=process.cwd();
const server=http.createServer((q,r)=>{let u=q.url.split('?')[0];fs.readFile(path.join(root,u==='/'?'/index.html':decodeURIComponent(u)),(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200);r.end(d);});});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1100,height:1000}});
await p.goto(`http://127.0.0.1:${server.address().port}/`);await p.waitForFunction(()=>window.__game);
await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForFunction(()=>window.__game);
fs.mkdirSync('/tmp/g144',{recursive:true});
const snap=async n=>{fs.writeFileSync('/tmp/g144/'+n,Buffer.from((await p.evaluate(()=>document.getElementById('stage').toDataURL())).split(',')[1],'base64'));};
// 推进到稳定射击（多球在途）
const info=await p.evaluate(async()=>{const g=__game;g.newGame();let t=performance.now();window.__vclock=t;
 for(const gi of g.G.inv.filter(b=>b.state==='inv').slice(0,3).map(b=>b.gi))g.tapInv(gi);
 for(let i=0;i<70;i++){t+=1000/30;g.renderAt(t);await new Promise(r=>setTimeout(r,0));}
 window.__t=t;
 // 选一颗刚出膛的球，预测命中时刻
 const bl=g.G.balls.slice().sort((a,b)=>b.t0-a.t0)[0];
 const hit=bl.path(1);const P=g.world.proj(...hit);
 return {t,hitT:bl.t0+bl.dur,P,cv:[document.getElementById('stage').width,document.getElementById('stage').height]};});
console.log(JSON.stringify(info));
const bp=await p.evaluate(async()=>{const g=__game;for(let i=0;i<40;i++){const t=window.__vclock;const c=g.G.balls.map(b=>({b,u:(t-b.t0)/b.dur})).filter(o=>o.u>0.45&&o.u<0.7);if(c.length){return g.world.proj(...c[0].b.pos).map(v=>+v.toFixed(1));}window.__t+=1000/30;g.renderAt(window.__t);}return null;});
console.log('BALL',JSON.stringify(bp));fs.writeFileSync('/tmp/g144/ballpos.json',JSON.stringify(bp));
await snap('ball.png');
// 从命中前 2 帧开始，30fps 逐帧
await p.evaluate(async(h)=>{const g=__game;let t=window.__t;while(t+1000/30<h-2000/30){t+=1000/30;g.renderAt(t);await new Promise(r=>setTimeout(r,0));}window.__t=t;},info.hitT);
for(let k=0;k<12;k++){await snap(`h_${String(k).padStart(2,'0')}.png`);await p.evaluate(async()=>{window.__t+=1000/30;__game.renderAt(window.__t);});}
await b.close();server.close();
