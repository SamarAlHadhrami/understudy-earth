// app/score.js must reproduce the Python distances and tiers stored in app/data/results.json
const fs = require('fs'), path = require('path');
const d = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app', 'data', f)));
const meta = d('meta.json'), earth = d('earth.json'), targets = d('targets.json'), res = d('results.json');
const S = require('../app/score.js')(meta);
let bad = 0;
for (const g of res.gap) {
  const t = targets.find(x => x.id === g.target);
  let bo = 1e9, ba = 1e9;
  for (const e of earth) { const x = S.distance(e, t); ba = Math.min(ba, x); if (e.group.startsWith('oman')) bo = Math.min(bo, x); }
  if (Math.abs(bo - g.best_oman_dist) > 0.002 || Math.abs(ba - g.best_any_dist) > 0.002 || S.gapTier(bo) !== g.tier_oman || S.gapTier(ba) !== g.tier_any) { bad++; console.log('MISMATCH', g.name, bo, g.best_oman_dist); }
}
console.log(bad ? 'FAIL ' + bad : 'JS matches Python for all ' + res.gap.length + ' targets');
process.exit(bad ? 1 : 0);
