const N = require('../app/needs.js'); const assert = require('assert');
// synthetic climate: Jan mild, Jul too hot
const c = { tmax: Array(12).fill(30), tmin: Array(12).fill(15), wind: Array(12).fill(3), rh: Array(12).fill(40), srad: Array(12).fill(6) };
c.tmax[6] = 45;
const n = { tlo: 5, thi: 35, wmin: 0, wmax: 12, rhmax: 100, smin: 0 };
assert.strictEqual(N.monthFit(c, 0, n), 100);                        // inside the window
assert.strictEqual(N.monthFit(c, 6, n), 0);                          // 10 C over, margin 5 -> 0
assert.strictEqual(Math.round(N.monthFit(c, 0, { ...n, thi: 28 })), 60); // 2 C over of 5 margin
assert.deepStrictEqual(N.bestMonths(N.allFits(c, n)), [0, 1, 2]);   // first 3 of 11 equally good months
assert.strictEqual(N.monthsText([0, 1]), 'Jan to Feb'); assert.strictEqual(N.monthsText([11, 0]), 'Dec to Jan'); assert.strictEqual(N.monthsText([2, 5]), 'Mar, Jun');
assert.strictEqual(N.monthsText([]), 'no month fits');
const p = N.parseSentence('rover test, slopes 10 to 20 degrees, dry, 5 to 30 degrees', N.DEFAULT);
assert.strictEqual(p.needs.limit, 20); assert.strictEqual(p.needs.tlo, 5); assert.strictEqual(p.needs.thi, 30); assert.strictEqual(p.needs.rhmax, 40);
assert.ok(p.said.length >= 4);
assert.strictEqual(N.parseSentence('windy sunny', N.DEFAULT).needs.wmin, 4);
assert.strictEqual(N.worse('match', 'gap'), 'gap');
console.log('needs.js tests pass');
