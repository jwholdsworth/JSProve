import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bellIndex, bellName, parse_bell_list, parse_method, validateMethod, Change, createComposition, Prover, MusicBox, Shorthand, AtwChecker, addFourBellRuns, readUserMusicPatterns, doProve, generateShorthand} from '../js/pealprover.js';

test('bell names round-trip from 1 to T', () => {
  for (const [index, name] of [...'1234567890ET'].entries()) {
    assert.equal(bellIndex(name), index);
    assert.equal(bellName(index), name);
  }
  assert.equal(bellIndex('*'), -1);
  assert.equal(bellName(-1), '*');
});

test('place notation includes implicit external places', () => {
  assert.equal(parse_bell_list(6, 0, '4').mask, 9); // 14
  assert.equal(parse_bell_list(6, 0, '3').mask, 36); // 36
  assert.equal(parse_bell_list(6, 0, '12').mask, 3);
});

test('cross and 16 advance a Minor row correctly', () => {
  const change = Change(6);
  assert.equal(change.pp(), '123456');
  change.advance(0);
  assert.equal(change.pp(), '214365');
  change.advance(33);
  assert.equal(change.pp(), '241635');
});

test('symmetric and MicroSIRIL Plain Bob Minor notation agree', () => {
  const expected = [0, 33, 0, 33, 0, 33, 0, 33, 0, 33, 0, 3];
  assert.deepEqual(Array.from(parse_method(6, '-16-16-16,12')), expected);
  assert.deepEqual(Array.from(parse_method(6, 'a &-16-16-16')), expected);
});

test('Plain Bob Minor plain lead, bob and single have known lead heads', () => {
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
  const change = Change(6);
  const prover = new Prover();
  change.advance(0);
  assert.equal(prover.checkRow(change), 0);
  assert.equal(prover.checkRow(change), -1);
});

test('music matches exact and wildcard patterns', () => {
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
  assert.deepEqual(Array.from(parse_method(6, 'a +-16-')), [0, 33, 0, 3]);
});

test('invalid notation and invalid stage are rejected', () => {
  assert.throws(() => validateMethod('P', '-Z', 6), /Bad place notation/);
  assert.equal(validateMethod('P', '-16,12', 0), false);
  assert.equal(validateMethod('P', '-16,12', 6.5), false);
});

test('composition parser associates calls with the preceding method', () => {
  const {comp} = createComposition({
    stage: 6, methods: [plainBob(6), {shorthand: 'L', notation: '-16-16-16,16'}],
    calls, composition: 'P/L;\nP',
  });
  assert.deepEqual(Array.from(comp.methods, (method) => method.name), ['P', 'L', 'P']);
  assert.deepEqual(Array.from(comp.calls), [9, 15, -1]);
});

test('shorthand expands a bob at Home in Plain Bob Minor', () => {
  const method = validateMethod('P', plainBob(6).notation, 6);
  const shorthand = Shorthand('h', method);
  shorthand.run(() => {}, ['/', '14'], [';', '1234']);
  assert.equal(shorthand.compText, 'PPPPP/\n');
});

test('four-bell runs match at both ends of a row', () => {
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
  const patterns = readUserMusicPatterns('13572468\n15263748\n****5678');
  assert.deepEqual(Array.from(patterns, (p) => Array.from(p)), [
    [0, 2, 4, 6, 1, 3, 5, 7], [0, 4, 1, 5, 2, 6, 3, 7], [-1, -1, -1, -1, 4, 5, 6, 7],
  ]);
});

test('Plain Bob Minor plain course covers every working lead-head position', () => {
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
  const {comp} = createComposition({stage: 6, methods: [plainBob(6), {shorthand: 'L', notation: '-16-16-16,16'}], calls: [], composition: 'PPLLP'});
  comp.run(() => {});
  const atw = AtwChecker(comp);
  atw.getAtw();
  assert.equal(atw.com, 2);
});

function proveTouch(stage, methods, composition, music = '') {
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
  const method = validateMethod('P', plainBob(6).notation, 6);
  assert.equal(generateShorthand('h', method, ['/', '14'], [';', '1234']), 'PPPPP/\n');
});

test('prover retains the first occurrence of each row', () => {
  const change = Change(6);
  const prover = new Prover();
  change.advance(0);
  const first = change.row.join(',');
  assert.equal(prover.checkRow(change), 0);
  change.advance(33);
  assert.equal(prover.checkRow(change), 0);
  change.advance(33);
  assert.equal(prover.checkRow(change), -1);
  assert.equal(prover.changes.get(first), 1);
  assert.equal(prover.changeNumber, 3);
});

test('first return to rounds is true but repeated rounds are false', () => {
  const change = Change(6);
  const prover = new Prover();
  assert.equal(prover.checkRow(change), 1);
  assert.equal(prover.checkRow(change), -1);
  assert.equal(prover.changes.get(change.row.join(',')), 1);
});

test('distinct sixteen-bell rows do not collide through numerical rounding', () => {
  const change = Change(16);
  const prover = new Prover();
  const first = Array.from({length: 16}, (_, i) => 15 - i);
  const second = [...first];
  [second[14], second[15]] = [second[15], second[14]];
  change.setRow(first);
  assert.equal(prover.checkRow(change), 0);
  change.setRow(second);
  assert.equal(prover.checkRow(change), 0);
  change.setRow(first);
  assert.equal(prover.checkRow(change), -1);
  assert.equal(prover.changes.size, 2);
});

test('false touch reports the repeated row and both change numbers', () => {
  const change = Change(6);
  const prover = new Prover();
  change.advance(0);
  assert.equal(prover.checkRow(change), 0);
  change.advance(33);
  assert.equal(prover.checkRow(change), 0);
  change.advance(33);
  assert.equal(prover.checkRow(change), -1);
  assert.deepEqual(prover.falseness, {row: '214365', firstChange: 1, secondChange: 3});
});

test('proving reports falseness before rounds and clears it for true touches', () => {
  const result = proveTouch(6, [{shorthand: 'P', notation: '-16.16'}], 'P');
  assert.deepEqual(result.falseness, {
    row: '214365', firstChange: 1, secondChange: 3,
    first: {method: 'P', lead: 1, leadHead: '123456', changeInLead: 1},
    second: {method: 'P', lead: 1, leadHead: '123456', changeInLead: 3},
  });
  assert.equal(result.status, 'Touch is false after 3 changes');
  assert.equal(proveTouch(6, [plainBob(6)], 'PPPPP').falseness, null);
  assert.equal(proveTouch(6, [plainBob(6)], 'P').falseness, null);
});

test('falseness locates repeated rows across methods of different lead lengths', () => {
  const result = proveTouch(6, [
    {shorthand: 'A', notation: '-16'},
    {shorthand: 'B', notation: '16'},
  ], 'AB');
  assert.deepEqual(result.falseness, {
    row: '214365', firstChange: 1, secondChange: 3,
    first: {method: 'A', lead: 1, leadHead: '123456', changeInLead: 1},
    second: {method: 'B', lead: 2, leadHead: '241635', changeInLead: 1},
  });
});

test('ATW retains positions across repeated and interleaved methods', () => {
  const {comp} = createComposition({
    stage: 6,
    methods: [plainBob(6), {shorthand: 'L', notation: '-16-16-16,16'}],
    calls: [],
    composition: 'PLP',
  });
  comp.run(() => {});
  const atw = AtwChecker(comp);
  const bells = '123456';
  const heads = ['123456', ...comp.leadends.slice(0, -1).map((row) => row.map(bellName).join(''))];
  for (let run = 0; run < 2; run++) {
    atw.getAtw();
    assert.equal(atw.methodList, 'PLP');
    assert.equal(atw.com, 2);
    for (const name of ['P', 'L']) {
      for (const bell of bells) {
        for (const position of bells) {
          const expected = heads.some((head, i) =>
            comp.methods[i].name === name && head[Number(position) - 1] === bell);
          assert.equal(atw.positionsRung[name][bell][position], expected);
        }
      }
    }
  }
});

test('shorthand rejects an unreachable calling position', () => {
  // A complete plain hunt course returns the tenor to sixths every lead.
  const method = validateMethod('P', '-16'.repeat(6), 6);
  assert.throws(() => generateShorthand('2', method, ['/', '16'], [';', '1234']),
    /Calling position 2 cannot be reached/);
});

test('shorthand can reuse a calling position in successive calls', () => {
  const method = validateMethod('P', plainBob(6).notation, 6);
  assert.equal(generateShorthand('hh', method, ['/', '14'], [';', '1234']),
    'PPPPP/\nPPPPP/\n');
});
