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
  return vm.runInContext('({bellIndex, bellName, parse_bell_list, parse_method, validateMethod, Change, createComposition, Prover, MusicBox, Shorthand, AtwChecker, addFourBellRuns, readUserMusicPatterns, doProve, generateShorthand})', context);
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

const plainBob = (stage) => ({shorthand: 'P', notation: ('-1' + '1234567890ET'[stage - 1]).repeat(stage / 2) + ',12'});
const calls = [{symbol: '/', notation: '14'}, {symbol: ';', notation: '1234'}];

for (const stage of [8, 10, 12]) {
  test('Plain Bob plain course on ' + stage + ' bells', () => {
    const {createComposition, Prover} = engine();
    const {comp} = createComposition({stage, methods: [plainBob(stage)], calls: [], composition: 'P'.repeat(stage - 1)});
    const prover = new Prover();
    const rows = [];
    const truth = [];
    comp.run((change) => {
      rows.push(change.pp());
      truth.push(prover.checkRow(change));
    });
    const length = 2 * stage * (stage - 1);
    assert.equal(rows.length, length);
    assert.equal(new Set(rows).size, length);
    assert.equal(rows.at(-1), '1234567890ET'.slice(0, stage));
    assert.deepEqual(truth, [...Array(length - 1).fill(0), 1]);
  });
}

test('Cambridge and Bristol Surprise Major have 32-change leads', () => {
  const {validateMethod, Change} = engine();
  for (const [notation, expected] of [
    ['b &-3-4-25-36-4-5-6-7', '15738264'],
    ['m &-5-4.5-5.36.4-4.5-4-1', '14263857'],
  ]) {
    const method = validateMethod('M', notation, 8);
    const change = Change(8);
    let count = 0;
    change.advance_lead(method, -1, () => count++);
    assert.equal(count, 32);
    assert.equal(change.pp(), expected);
  }
});

test('asymmetric notation preserves the supplied sequence', () => {
  const {parse_method} = engine();
  assert.deepEqual(Array.from(parse_method(6, 'a +-16-')), [0, 33, 0, 3]);
});

test('invalid notation and invalid stage are rejected', () => {
  const {validateMethod} = engine();
  assert.throws(() => validateMethod('P', '-Z', 6), /Bad place notation/);
  assert.equal(validateMethod('P', '-16,12', 0), false);
  assert.equal(validateMethod('P', '-16,12', 6.5), false);
});

test('composition parser associates calls with the preceding method', () => {
  const {createComposition} = engine();
  const {comp} = createComposition({
    stage: 6, methods: [plainBob(6), {shorthand: 'L', notation: '-16-16-16,16'}],
    calls, composition: 'P/L;\nP',
  });
  assert.deepEqual(Array.from(comp.methods, (method) => method.name), ['P', 'L', 'P']);
  assert.deepEqual(Array.from(comp.calls), [9, 15, -1]);
});

test('shorthand expands a bob at Home in Plain Bob Minor', () => {
  const {Shorthand, validateMethod} = engine();
  const method = validateMethod('P', plainBob(6).notation, 6);
  const shorthand = Shorthand('h', method);
  shorthand.run(() => {}, ['/', '14'], [';', '1234']);
  assert.equal(shorthand.compText, 'PPPPP/\n');
});

test('four-bell runs match at both ends of a row', () => {
  const {MusicBox, Change, addFourBellRuns} = engine();
  const music = MusicBox();
  addFourBellRuns(8, music);
  music.setup(8);
  music.match_row(Change(8));
  assert.equal(music.patterns.length, 20);
  assert.equal(music.counts[0], 1);
  assert.equal(music.counts[18], 1);
  assert.equal(music.counts.reduce((a, b) => a + b, 0), 2);
});

test('user music parses queens, tittums and wildcards', () => {
  const {readUserMusicPatterns} = engine();
  const patterns = readUserMusicPatterns('13572468\n15263748\n****5678');
  assert.deepEqual(Array.from(patterns, (p) => Array.from(p)), [
    [0, 2, 4, 6, 1, 3, 5, 7], [0, 4, 1, 5, 2, 6, 3, 7], [-1, -1, -1, -1, 4, 5, 6, 7],
  ]);
});

test('Plain Bob Minor plain course covers every working lead-head position', () => {
  const {createComposition, AtwChecker} = engine();
  const {comp} = createComposition({stage: 6, methods: [plainBob(6)], calls: [], composition: 'PPPPP'});
  comp.run(() => {});
  const atw = AtwChecker(comp);
  atw.getAtw();
  for (const bell of '23456') {
    for (const position of '23456') assert.equal(atw.positionsRung.P[bell][position], true);
  }
  assert.equal(atw.com, 0);
});

test('changes of method count transitions between successive leads', () => {
  const {createComposition, AtwChecker} = engine();
  const {comp} = createComposition({stage: 6, methods: [plainBob(6), {shorthand: 'L', notation: '-16-16-16,16'}], calls: [], composition: 'PPLLP'});
  comp.run(() => {});
  const atw = AtwChecker(comp);
  atw.getAtw();
  assert.equal(atw.com, 2);
});

function proveTouch(stage, methods, composition, music = '') {
  const {createComposition, doProve} = engine();
  return doProve(createComposition({stage, methods, calls, composition}), composition, music);
}

test('complete and incomplete Plain Bob Minor touches report their status', () => {
  const complete = proveTouch(6, [plainBob(6)], 'PPPPP');
  assert.equal(complete.trueTouch, true);
  assert.equal(complete.complete, true);
  assert.equal(complete.status, 'Touch is true: 60 changes');
  assert.equal(complete.courses, '123456\n');
  const incomplete = proveTouch(6, [plainBob(6)], 'P');
  assert.equal(incomplete.trueTouch, true);
  assert.equal(incomplete.complete, false);
  assert.equal(incomplete.length, 12);
  assert.equal(incomplete.status, 'Incomplete touch (12 changes)');
});

test('existing 5024 of Pitman’s four proves true with 109 changes of method', () => {
  const methods = [
    {shorthand: 'B', notation: 'm &-5-4.5-5.36.4-4.5-4-1'},
    {shorthand: 'C', notation: 'b &-3-4-25-36-4-5-6-7'},
    {shorthand: 'L', notation: 'f &3-3.4-2-3.4-4.5.6-6.5'},
    {shorthand: 'S', notation: 'b &-36-4-5-36-4-5-36-7'},
  ];
  const composition = 'LSL/\nL/B/B/S/CSC/\nLSCSC/\nL/B/B/S/CSC/\nLCL/\nL/BBBBBBB/\nCS/CS\nSSS/B/S/CSC/\nLS/L\nL/B/LLLLL/B/L\nL/SL/\nCSC/S/B/SSS\nSC/SC/\nBBBBBBB/L/\nLCL/\nCSC/S/B/B/L/\nCSCSL/\nCSC/S/B/B/L/\nLS/L/B/B/\nLC/SSS\nLC/L/\nLC/B/B/L/\nCSC/CL\nCSC/SL/\nCS/BBBB/\nBBBB/SC/\nLS/CSC\nLC/CSC/\nL/B/B/CL/';
  const result = proveTouch(8, methods, composition);
  assert.equal(result.trueTouch, true);
  assert.equal(result.complete, true);
  assert.equal(result.status, 'Touch is true: 5024 changes');
  assert.equal(result.com, 109);
});

test('repeated Home calls from the existing false-touch fixture prove false', () => {
  const method = {shorthand: 'A', notation: 'c &-5-4-56-36-4-5.36-36.1'};
  const composition = 'AAAAAAA/\nAAAAAAA/\nAAAAAAA;\nAAAAAAA/\nAAAAAAA/\nAAAAAAA;\n';
  const result = proveTouch(8, [method], composition);
  assert.equal(result.trueTouch, false);
  assert.equal(result.complete, true);
  assert.match(result.status, /^Touch is false after /);
});

test('proving uses supplied composition lines and custom music without a DOM', () => {
  const result = proveTouch(6, [plainBob(6)], 'P\nPPPP', '123456');
  assert.equal(result.courses, '135264\n123456\n');
  assert.equal(result.music.find(({pattern}) => pattern === '123456').count, 1);
});

test('generateShorthand accepts a validated method without a DOM', () => {
  const {generateShorthand, validateMethod} = engine();
  const method = validateMethod('P', plainBob(6).notation, 6);
  assert.equal(generateShorthand('h', method, ['/', '14'], [';', '1234']), 'PPPPP/\n');
});
