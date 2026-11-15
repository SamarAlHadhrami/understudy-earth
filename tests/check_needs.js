const N = require('../app/needs.js'); const assert = require('assert');
// synthetic climate: Jan mild, Jul too hot
const c = { tmax: Array(12).fill(30), tmin: Array(12).fill(15), wind: Array(12).fill(3), rh: Array(12).fill(40), srad: Array(12).fill(6) };
c.tmax[6] = 45;
const n = { tlo: 5, thi: 35, wmin: 0, wmax: 12, rhmax: 100, smin: 0, swmax: 60 };
assert.strictEqual(N.monthFit(c, 0, n), 100);                        // inside the window
assert.strictEqual(N.monthFit(c, 6, n), 0);                          // 10 C over, margin 5 -> 0
assert.strictEqual(Math.round(N.monthFit(c, 0, { ...n, thi: 28 })), 60); // 2 C over of 5 margin
assert.deepStrictEqual(N.bestMonths(N.allFits(c, n)), [0, 1, 2]);   // first 3 of 11 equally good months
assert.strictEqual(N.monthsText([0, 1]), 'Jan to Feb'); assert.strictEqual(N.monthsText([11, 0]), 'Dec to Jan'); assert.strictEqual(N.monthsText([2, 5]), 'Mar, Jun');
assert.strictEqual(N.monthsText([]), 'no month fits');
const p = N.parseSentence('rover test, slopes 10 to 20 degrees, dry, 5 to 30 degrees', N.DEFAULT);
assert.strictEqual(p.needs.limit, 20); assert.strictEqual(p.needs.tlo, 5); assert.strictEqual(p.needs.thi, 30); assert.strictEqual(p.needs.rhmax, 40);
assert.ok(p.said.length >= 3); assert.strictEqual(p.refused, false);
assert.strictEqual(N.parseSentence('windy sunny', N.DEFAULT).needs.wmin, 4);
const r1 = N.parseSentence('build me a spaceship', N.DEFAULT); assert.strictEqual(r1.refused, true); assert.deepStrictEqual(r1.needs, N.DEFAULT);
const r2 = N.parseSentence('wind below 5 m/s, humidity below 30%, sun at least 5, between 10 and 25 degrees, banana', N.DEFAULT); assert.strictEqual(r2.needs.wmax, 5); assert.strictEqual(r2.needs.rhmax, 30); assert.strictEqual(r2.needs.smin, 5); assert.strictEqual(r2.needs.tlo, 10); assert.strictEqual(r2.needs.thi, 25); assert.ok(r2.unknown.indexOf('banana') >= 0);
assert.strictEqual(N.worse('match', 'gap'), 'gap');
const mf = N.monthFactors(c, 6, n); assert.strictEqual(mf.temp, 0); assert.strictEqual(mf.sun, 100);
assert.strictEqual(mf.swing, 100); // tmax-tmin = 15 C, well under swmax 60
assert.strictEqual(N.monthFactors(c, 0, { ...n, swmax: 10 }).swing, 0); // tmax-tmin = 15 C, 5 C over a 10 C limit, margin 5 -> 0
assert.strictEqual(N.terrainFit(0.05, 0.081, 0.245), 100); assert.strictEqual(N.terrainFit(0.49, 0.081, 0.245), 0);
const v = N.fitVerdict({ terrain: 100, temp: 100, wind: 100, sun: 40 }, null); assert.strictEqual(v.overall, 85); assert.strictEqual(v.label, 'Strong fit'); assert.strictEqual(v.worst, 'sun');
assert.strictEqual(N.fitVerdict({ terrain: 100, sun: 0 }, { terrain: 3, sun: 1 }).overall, 75);
assert.strictEqual(N.fitVerdict({ terrain: 20, temp: 30 }, null).label, 'Poor fit');
assert.strictEqual(N.fitVerdict({ terrain: 80, temp: 30, sun: 0 }, { sun: 0 }).overall, 55);
assert.strictEqual(N.confidenceLevel(true, false), 'Medium'); assert.strictEqual(N.confidenceLevel(false, false), 'Low');
console.log('needs.js tests pass');
