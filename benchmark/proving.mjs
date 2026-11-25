import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createContext, runInContext} from 'node:vm';
import assert from 'node:assert/strict';

const ref = process.argv[2];
const source = ref
  ? execFileSync('git', ['show', ref + ':js/pealprover.js'], {encoding: 'utf8'})
  : readFileSync(new URL('../js/pealprover.js', import.meta.url), 'utf8');
let values = {};
const context = createContext({
  $: (selector) => ({val: () => values[selector.slice(1)]}),
  document: {getElementById: (id) => ({value: values[id]})},
});
// Both revisions run in the same VM environment; remove only the export list.
runInContext(source.replace(/^export \{[^}]*\};?\s*$/m, ''), context);
const engine = runInContext('({createComposition, doProve, Prover, Change, AtwChecker})', context);
const calls = [{symbol: '/', notation: '14'}, {symbol: ';', notation: '1234'}];
  const methods = [
    {shorthand: 'B', notation: 'm &-5-4.5-5.36.4-4.5-4-1'},
    {shorthand: 'C', notation: 'b &-3-4-25-36-4-5-6-7'},
    {shorthand: 'L', notation: 'f &3-3.4-2-3.4-4.5.6-6.5'},
    {shorthand: 'S', notation: 'b &-36-4-5-36-4-5-36-7'},
  ];
  const composition = 'LSL/\nL/B/B/S/CSC/\nLSCSC/\nL/B/B/S/CSC/\nLCL/\nL/BBBBBBB/\nCS/CS\nSSS/B/S/CSC/\nLS/L\nL/B/LLLLL/B/L\nL/SL/\nCSC/S/B/SSS\nSC/SC/\nBBBBBBB/L/\nLCL/\nCSC/S/B/B/L/\nCSCSL/\nCSC/S/B/B/L/\nLS/L/B/B/\nLC/SSS\nLC/L/\nLC/B/B/L/\nCSC/CL\nCSC/SL/\nCS/BBBB/\nBBBB/SC/\nLS/CSC\nLC/CSC/\nL/B/B/CL/';

const cases = [];
for (const stage of [6, 8, 10, 12]) {
  const notation = ('-1' + '1234567890ET'[stage - 1]).repeat(stage / 2) + ',12';
  cases.push({name: 'Plain Bob ' + stage, stage, methods: [{shorthand: 'P', notation}],
    composition: 'P'.repeat(stage - 1), expected: 'Touch is true: ' + 2 * stage * (stage - 1) + ' changes'});
}
cases.push({name: 'Pitman 5024', stage: 8, methods, composition, expected: 'Touch is true: 5024 changes'});

function measure(name, run, check, work) {
  check(run());
  for (let i = 0; i < 10; i++) run();
  const samples = [];
  for (let i = 0; i < 25; i++) {
    const start = performance.now();
    const result = run();
    samples.push(performance.now() - start);
    check(result);
  }
  samples.sort((a, b) => a - b);
  const median = samples[12];
  return {benchmark: name, 'median ms': median.toFixed(3),
    'p95 ms': samples[23].toFixed(3), 'rows/sec': Math.round(work / median * 1000)};
}

console.log('Node', process.version, process.platform, process.arch, '|', ref || 'working tree');
const results = [];
for (const fixture of cases) {
  const input = {...fixture, calls};
  values = {composition: input.composition, userMusicList: ''};
  const parsed = engine.createComposition(input);
  const length = parsed.comp.methods.reduce((sum, method) => sum + method.rows.length + 1, 0);
  results.push(measure(fixture.name + ' full prove',
    () => engine.doProve(engine.createComposition(input), input.composition, ''),
    (result) => assert.equal(result.status, fixture.expected), length));
}

// Synthetic distinct rows, generated outside the timed section.
// Lexicographic permutations ensure the truth checker cannot stop early.
function distinctRows(stage, count) {
  const row = Array.from({length: stage}, (_, i) => i);
  const rows = [];
  for (let n = 0; n < count; n++) {
    rows.push(row.slice());
    let i = stage - 2;
    while (i >= 0 && row[i] >= row[i + 1]) i--;
    if (i < 0) break;
    let j = stage - 1;
    while (row[j] <= row[i]) j--;
    [row[i], row[j]] = [row[j], row[i]];
    for (let a = i + 1, b = stage - 1; a < b; a++, b--) {
      [row[a], row[b]] = [row[b], row[a]];
    }
  }
  return rows;
}
for (const stage of [8, 12]) {
  const rows = distinctRows(stage, stage === 8 ? 40000 : 100000);
  const change = engine.Change(stage);
  results.push(measure('Truth only ' + stage + ' (' + rows.length + ' rows)', () => {
    const prover = new engine.Prover();
    let repeats = 0;
    for (const row of rows) {
      change.setRow(row);
      if (prover.checkRow(change) < 0) repeats++;
    }
    return repeats;
  }, (repeats) => assert.equal(repeats, 0), rows.length));
}
console.table(results);
