import { spawnSync } from 'child_process';
const runs = [
  ['logic', 'test/logic-test.mjs'],
  ['play', 'test/play.mjs'],
  ['h5', 'test/h5-export.mjs'],
  ['ae', 'test/ae-export.mjs'],
];
let fail = 0;
for (const [name, file] of runs) {
  console.log('\n===', name, '===');
  const r = spawnSync(process.execPath, [file], { stdio: 'inherit', cwd: process.cwd() });
  if (r.status !== 0) { fail++; console.log(name, 'FAILED'); }
}
process.exit(fail ? 1 : 0);
