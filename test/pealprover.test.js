const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');

// Load the browser script unchanged, without a DOM. Lexical declarations
// (including classes and const functions) are accessible inside the context.
const source = readFileSync(join(__dirname, '../js/pealprover.js'), 'utf8');
function engine() {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  return vm.runInContext('({bellIndex, bellName, parse_bell_list, parse_method, validateMethod, Change, createComposition, Prover, MusicBox})', context);
}

test('bell names round-trip from 1 to T', () => {
  const {bellIndex, bellName} = engine();
  for (const [index, name] of [...'1234567890ET'].entries()) {
    assert.equal(bellIndex(name), index);
    assert.equal(bellName(index), name);
  }
  assert.equal(bellIndex('*'), -1);
  assert.equal(bellName(-1), '*');
});

test('place notation includes implicit external places', () => {
  const {parse_bell_list} = engine();
  assert.equal(parse_bell_list(6, 0, '4').mask, 9); // 14
  assert.equal(parse_bell_list(6, 0, '3').mask, 36); // 36
  assert.equal(parse_bell_list(6, 0, '12').mask, 3);
});

test('cross and 16 advance a Minor row correctly', () => {
  const {Change} = engine();
  const change = Change(6);
  assert.equal(change.pp(), '123456');
  change.advance(0);
  assert.equal(change.pp(), '214365');
  change.advance(33);
  assert.equal(change.pp(), '241635');
});

test('symmetric and MicroSIRIL Plain Bob Minor notation agree', () => {
  const {parse_method} = engine();
  const expected = [0, 33, 0, 33, 0, 33, 0, 33, 0, 33, 0, 3];
  assert.deepEqual(Array.from(parse_method(6, '-16-16-16,12')), expected);
  assert.deepEqual(Array.from(parse_method(6, 'a &-16-16-16')), expected);
});

test('Plain Bob Minor plain lead, bob and single have known lead heads', () => {
  const {Change, validateMethod, parse_bell_list} = engine();
  const method = validateMethod('P', 'x16x16x16,12', 6);
  for (const [call, expected] of [[-1, '135264'], [parse_bell_list(6, 0, '14').mask, '123564'], [parse_bell_list(6, 0, '1234').mask, '132564']]) {
    const change = Change(6);
    let count = 0;
    change.advance_lead(method, call, () => count++);
    assert.equal(count, 12);
    assert.equal(change.pp(), expected);
  }
});

test('Plain Bob Minor plain course has 60 distinct rows and comes round', () => {
  const {createComposition, Prover} = engine();
  const {comp} = createComposition({
    stage: 6,
    methods: [{shorthand: 'P', notation: '-16-16-16,12'}],
    calls: [],
    composition: 'PPPPP',
  });
  const prover = new Prover();
  const rows = [];
  const truth = [];
  comp.run((change) => {
    rows.push(change.pp());
    truth.push(prover.checkRow(change));
  });
  assert.equal(rows.length, 60);
  assert.equal(new Set(rows).size, 60);
  assert.equal(rows[59], '123456');
  assert.deepEqual(truth, [...Array(59).fill(0), 1]);
});

test('prover detects a repeated non-rounds row', () => {
  const {Change, Prover} = engine();
  const change = Change(6);
  const prover = new Prover();
  change.advance(0);
  assert.equal(prover.checkRow(change), 0);
  assert.equal(prover.checkRow(change), -1);
});

test('music matches exact and wildcard patterns', () => {
  const {Change, MusicBox} = engine();
  const music = MusicBox();
  music.addPattern([0, 1, 2, 3, 4, 5]);
  music.addPattern([0, 1, 2, 3, -1, -1]);
  music.setup(6);
  const change = Change(6);
  music.match_row(change);
  change.setRow([0, 1, 2, 3, 5, 4]);
  music.match_row(change);
  change.advance(0);
  music.match_row(change);
  assert.deepEqual(Array.from(music.counts), [1, 2]);
});
