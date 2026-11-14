// Checks that app/score.js reproduces the Python results in app/data/results.json
const fs = require('fs'), path = require('path');
const d = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app', 'data', f)));
const meta = d('meta.json'), earth = d('earth.json'), targets = d('targets.json'), res = d('results.json');
const S = require('../app/score.js')(meta);
let bad = 0;
for (const g of res.gap) {
  const t = targets.find(x => x.id === g.target);
  let best = 0;
  for (const e of earth) if (e.group.startsWith('oman')) best = Math.max(best, S.score(e, t, res.limit_deg).score);
  if (Math.abs(best - g.best_oman) > 0.06) { bad++; console.log('MISMATCH', g.name, best, g.best_oman); }
}
console.log(bad ? 'FAIL ' + bad : 'JS matches Python for all ' + res.gap.length + ' targets');
process.exit(bad ? 1 : 0);
