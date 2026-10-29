// Node 逻辑：关卡生成 + 模拟可解
import { makeLevel, PRESET_ORDER, simulate, initState } from '../src/level.js';
let fail = 0;
for (const id of PRESET_ORDER) {
  const L = makeLevel(id, { seed: 7, startSlots: 2, maxAmmo: 80 });
  const r = simulate(L, {});
  const ok = r.ok;
  if (!ok) fail++;
  console.log((ok ? 'PASS' : 'FAIL'), id, 'voxels=' + L.voxels, 'inv=' + L.inventory.length, JSON.stringify(r));
}
// 小关：清空
{
  const L = makeLevel('icecream', { seed: 1, startSlots: 5, maxAmmo: 200 });
  // 强制大弹药预填确保可解
  const r = simulate(L);
  console.log((r.ok ? 'PASS' : 'FAIL'), 'icecream-sim', r);
  if (!r.ok) fail++;
}
console.log(fail ? 'SOME FAIL' : 'ALL PASS');
process.exit(fail ? 1 : 0);
