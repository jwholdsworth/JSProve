/* eslint-disable no-undef */
'use strict';

const MAX_STAGE = 12;
const ROUNDS = '1234567890ETABCD';

const createComposition = (userInput) => {
  const selectedMethods = {};
  const comp = new Composition();
  const callsBySymbol = {};
  let hasPendingLead = false;
  let pendingMethod;

  userInput.methods.forEach((method) => {
    const validatedMethod = createMethod(method.shorthand, method.notation, userInput.stage);
    selectedMethods[method.shorthand] = validatedMethod;
  });

  userInput.calls.forEach((call) => {
    callsBySymbol[call.symbol] = parsePlaces(userInput.stage, 0, call.notation);
  });

  for (let i = 0; i < userInput.composition.length; i++) {
    const c = userInput.composition.charAt(i);
    if (c in selectedMethods) {
      if (hasPendingLead) {
        comp.appendLead(pendingMethod, -1);
      }
      pendingMethod = selectedMethods[c];
      hasPendingLead = true;
    } else if (c in callsBySymbol) {
      comp.appendLead(pendingMethod, callsBySymbol[c].mask);
      hasPendingLead = false;
    }
  }

  if (hasPendingLead) {
    comp.appendLead(pendingMethod, -1);
  }

  return {
    comp: comp,
    calls: callsBySymbol,
  };
};

const createMethod = (shortcut, notation, stage) => {
  const parsedNotation = notation.replace(/x/gi, '-');
  if (!Number.isInteger(stage)) {
    return false;
  }
  if (stage <= 0 || stage > MAX_STAGE) {
    return false;
  }

  const rows = parseMethod(stage, parsedNotation);

  return {
    stage,
    name: shortcut,
    rows: rows.slice(0, -1),
    leadEnd: rows.at(-1),
  };
};

/**
 * @param {object} composition The parsed composition and calls
 * @param {string} compositionText The original composition text
 * @param {string} userInputPatterns User-defined music patterns
 */
function doProve(composition, compositionText, userInputPatterns) {
  const prover = new Prover();
  let changes = 0;

  let roundsAt = null;
  let falseAt = null;

  const music = new MusicBox();
  const result = {
    trueTouch: false,
    falseness: null,
    complete: false,
    length: 0,
    status: 'No touch entered',
    courses: '',
    music: [],
    atw: '',
    com: 0,
  };

  const comp = composition.comp;
  const callsBySymbol = composition.calls;

  function processRow(change) {
    changes++;

    if (roundsAt !== null || falseAt !== null) {
      return;
    }

    music.matchRow(change);

    const rowStatus = prover.checkRow(change);

    if (rowStatus === -1) {
      falseAt = changes;
      result.falseness = prover.falseness;
    } else if (rowStatus === 1) {
      roundsAt = changes;
    }
  }

  // add 4-bell run patterns whatever the stage
  addFourBellRuns(comp.stage, music);

  // add user specific music patterns
  if (userInputPatterns.length != 0) {
    const userPatterns = readUserMusicPatterns(userInputPatterns);
    for (let i = 0; i < userPatterns.length; i++) {
      // ignore empty values (ie line feeds)
      if (userPatterns[i].length != 0) {
        music.addPattern(userPatterns[i]);
      }
    }
  }

  music.setup(comp.stage);
  comp.run(processRow);

  if (result.falseness) {
    const describeChange = (changeNumber) => {
      let offset = 0;
      for (const [index, method] of comp.methods.entries()) {
        const length = method.rows.length + 1;
        if (changeNumber <= offset + length) {
          return {
            method: method.name,
            lead: index + 1,
            leadHead: index === 0 ? ROUNDS.slice(0, comp.stage) : comp.leadHeads[index - 1].join(''),
            changeInLead: changeNumber - offset,
          };
        }
        offset += length;
      }
    };
    result.falseness = {
      ...result.falseness,
      first: describeChange(result.falseness.firstChange),
      second: describeChange(result.falseness.secondChange),
    };
  }

  // display course ends
  let compositionLines = compositionText;

  // now remove the calls from the comp text (look up from call list)
  // split the composition up at the carriage returns.
  for (const i in callsBySymbol) {
    const regex = new RegExp('[' + i + ']', 'g');
    compositionLines = compositionLines.replace(regex, '');
  }
  compositionLines = compositionLines.split('\n');

  const leadHeads = comp.leadHeads.map((row) => row.join(''));

  // get the course ends for displaying
  let leadNo = 0;
  for (let c = 0; c < compositionLines.length; c++) {
    if (compositionLines[c].length > 0) {
      leadNo = compositionLines[c].length + leadNo;
      result.courses += leadHeads[leadNo - 1];
    }
    result.courses += '\n';
  }

  if (roundsAt !== null) {
    result.trueTouch = true;
    result.length = changes - roundsAt;
    result.complete = true;

    if (roundsAt !== changes) {
      result.status =
        'Touch is true: ' +
        roundsAt +
        ' changes (' +
        (changes - roundsAt) +
        ' before last course end)';
    } else {
      result.status = 'Touch is true: ' + roundsAt + ' changes';
    }
  } else if (falseAt !== null) {
    result.complete = true;
    result.trueTouch = false;
    result.length = falseAt;
    result.status = 'Touch is false after ' + falseAt + ' changes';
  } else {
    result.complete = false;
    result.trueTouch = true;
    result.length = changes;
    result.status = 'Incomplete touch (' + changes + ' changes)';
  }

  result.music = music.patterns
    .map((pattern, index) => ({ count: music.counts[index], pattern: pattern.join('') }))
    .filter(({ count }) => count !== 0);

  const atw = new AtwChecker(comp);
  atw.getAtw();
  result.atw = formatAtw(atw);
  result.com = atw.com;

  return result;
}

/**
 * Add some basic music (four bell runs)
 */
function addFourBellRuns(stage, music) {
  const spareBells = Array(Math.max(0, stage - 4)).fill('*');
  for (let i = 0; i <= stage - 4; i++) {
    const forwardRun = ROUNDS.slice(i, i + 4).split('');
    const backwardRun = [...forwardRun].reverse();

    // forward run off the front (ie 1234.... etc)
    music.addPattern([...forwardRun, ...spareBells]);

    // backward run off the front (ie 4321....)
    music.addPattern([...backwardRun, ...spareBells]);

    // forward run at the back (ie ....1234)
    music.addPattern([...spareBells, ...forwardRun]);

    // backward run at the back (ie ....4321)
    music.addPattern([...spareBells, ...backwardRun]);
  }
}

/**
 * Create a human-friendly all-the-work table by bell numbers
 */
function formatAtw(atw) {
  let output = '';
  for (const i in atw.positionsRung) {
    // output the method key
    output += i + ':\n';
    // output the bell number
    for (let j = 0; j < atw.comp.stage; j++) {
      output += '  ' + ROUNDS.charAt(j) + ': ';
      // find which positions it rings
      for (let k = 0; k < atw.comp.stage; k++) {
        if (atw.positionsRung[i][ROUNDS.charAt(j)][ROUNDS.charAt(k)] == true) {
          output += ROUNDS.charAt(k);
        } else {
          output += ' ';
        }
      }
      output += '\n';
    }
  }
  return output;
}

/**
 * Convert the user's music preferences into JSProve format
 */
function readUserMusicPatterns(patternList) {
  return patternList
    .split('\n')
    .map((pattern) => pattern.split('').map((bell) => (ROUNDS.includes(bell) ? bell : '*')));
}

/**
 * Convert the user's shorthand into JSProve input format
 */
function generateShorthand(shorthand, method, bob, single) {
  const expansion = new Shorthand(shorthand, method);
  expansion.run(bob, single);
  return expansion.expandedComposition;
}

/**
 * Change Object - represents a row and advances to the next row or next lead
 * @author Paul Brook
 */
class Change {
  constructor(stage) {
    this.stage = stage;
    this.row = ROUNDS.slice(0, stage).split('');
  }

  advance(mask) {
    let position = 0;
    while (position < this.stage) {
      if ((mask & 1) === 0) {
        const bell = this.row[position];
        this.row[position] = this.row[position + 1];
        this.row[position + 1] = bell;
        mask >>= 2;
        position += 2;
      } else {
        mask >>= 1;
        position++;
      }
    }
  }

  advanceLead(method, call, onRow) {
    for (const mask of method.rows) {
      this.advance(mask);
      onRow?.(this);
    }
    this.advance(call === -1 ? method.leadEnd : call);
    onRow?.(this);
  }

  toString() {
    return this.row.join('');
  }

  setRow(row) {
    this.row = row;
  }
}

/**
 * Maps human names to bell indeces
 * @param {string} name The bell name
 * @return {string} The bell index
 */
const bellIndex = (name) => ROUNDS.slice(0, MAX_STAGE).indexOf(name);

/**
 * Generate a row
 * @author Paul Brook
 */
function parsePlaces(stage, n, notation) {
  let mask = 0;
  let lastPlaceIndex = -1;
  let c;
  let bell;

  while (n < notation.length) {
    c = notation.charAt(n);
    if (c === '.') {
      n++;
      break;
    }
    bell = bellIndex(c);
    if (bell === -1) {
      break;
    }
    if (mask === 0 && (bell & 1) === 1) {
      mask = 1;
    }
    mask |= 1 << bell;
    lastPlaceIndex = bell;
    n++;
  }
  if ((lastPlaceIndex & 1) === 0) {
    mask |= 1 << (stage - 1);
  }

  return {
    n: n,
    mask: mask,
  };
}

// function to decide which parsing method to use
function parseMethod(stage, notation) {
  if (notation.indexOf('&') === -1 && notation.indexOf('+') === -1) {
    return parseCentralCouncilNotation(stage, notation);
  } else {
    return parseMicroSirilNotation(stage, notation.split(' ')[0], notation.split(' ')[1]);
  }
}

/**
 * Parse method notation as used by MicroSIRIL libraries
 * @author Paul Brook
 */
function parseChangeMask(stage, n, notation) {
  if (notation.charAt(n) === '-') {
    return { n: n + 1, mask: 0 };
  }
  return parsePlaces(stage, n, notation);
}

function expandSymmetricNotation(rows) {
  for (let index = rows.length - 2; index >= 0; index--) {
    rows.push(rows[index]);
  }
}

function parseMicroSirilNotation(stage, group, notation) {
  let symmetric;
  let c;
  c = notation.charAt(0);
  if (c === '&') {
    symmetric = true;
  } else if (c === '+') {
    symmetric = false;
  } else {
    throw 'Unexpected notation (expected + or &):' + notation;
  }
  let res;
  let n = 1;
  const rows = [];
  let leadEnd;

  while (n < notation.length) {
    res = parseChangeMask(stage, n, notation);
    if (res.n === n) {
      throw 'Bad place notation ' + notation;
    }
    n = res.n;
    rows.push(res.mask);
  }
  if (symmetric) {
    expandSymmetricNotation(rows);
  }

  c = group.charAt(0);
  if (group.charAt(group.length - 1) === 'z') {
    res = parsePlaces(stage, 0, group);
    if (res.n !== res.length) {
      throw 'Bad method group: ' + group;
    }
    leadEnd = res.mask;
  } else if ((c >= 'a' && c <= 'f') || c === 'p' || c === 'q') {
    leadEnd = 3;
  } else if ((c >= 'g' && c <= 'm') || c === 'r' || c === 's') {
    leadEnd = 1 | (1 << (stage - 1));
  } else {
    throw 'Bad method group: ' + group;
  }
  rows.push(leadEnd);
  return rows;
}

/**
 * Parse method notation as used in Central Council XML files
 * @author Paul Brook
 */
function parseCentralCouncilNotation(stage, notation) {
  let res;
  let n = 0;
  let sep;
  let leadEnd;
  const rows = [];

  sep = notation.indexOf(',');
  if (sep === -1) {
    sep = notation.length;
  }
  while (n < sep) {
    res = parseChangeMask(stage, n, notation);
    if (res.n === n) {
      throw 'Bad place notation ' + notation;
    }
    n = res.n;
    rows.push(res.mask);
  }
  if (sep !== notation.length) {
    expandSymmetricNotation(rows);
    res = parsePlaces(stage, sep + 1, notation);
    rows.push(res.mask);
  }
  return rows;
}

/**
 * Composition Object
 * @author Paul Brook, modified by James Holdsworth to allow spliced
 */
class Composition {
  /**
   * Initialise
   */
  constructor() {
    this.methods = [];
    this.calls = [];
    this.leadHeads = [];
    this.stage = 0;
  }

  appendLead(method, call) {
    this.methods.push(method);
    this.calls.push(call);
    if (method.stage > this.stage) {
      this.stage = method.stage;
    }
  }

  run(onRow) {
    const change = new Change(this.stage);
    let method;
    let call;
    for (let a = 0; a < this.methods.length; a++) {
      method = this.methods[a];
      call = this.calls[a];
      change.advanceLead(method, call, onRow);
      this.leadHeads[a] = change.row.slice(0);
    }
  }
}

/**
 * Shorthand Object
 * @author James Holdsworth
 * @todo Remove hard coding of symbols
 */
class Shorthand {
  constructor(shorthand, method) {
    this.shorthandCalls = shorthand;
    this.stage = method.stage;
    this.expandedComposition = '';
    this.method = method;
    this.bob = null;
    this.single = null;
  }

  run(bob, single) {
    this.bob = bob;
    this.single = single;
    const bobMask = parsePlaces(this.stage, 0, bob[1]);
    const singleMask = parsePlaces(this.stage, 0, single[1]);
    const c = new Change(this.stage);
    // loop through the calls and for each one, work out its meaning
    for (let i = 0; i < this.shorthandCalls.length; i++) {
      if (this.shorthandCalls.charAt(i) === 's') {
        // it's a single
        i++;
        this.ringToNextCall(this.shorthandCalls[i], singleMask, true, c);
      } else {
        this.ringToNextCall(this.shorthandCalls[i], bobMask, false, c);
      }
    }
  }

  ringToNextCall(call, callType, isSingle, change) {
    let moreLeads = true;
    let tenorPosition = bellIndex(call);
    // couldn't find index
    if (tenorPosition < 1) {
      call = call.toLowerCase();
      switch (call) {
        case 'h':
          tenorPosition = this.stage - 1;
          break;
        case 'w':
          tenorPosition = this.stage - 2;
          break;
        case 'm':
          tenorPosition = this.stage - 3;
          break;
        case 'i':
          // won't this break if using n-2 place calls?
          if (isSingle) {
            // single 3rds
            tenorPosition = 2;
          } else {
            // run in
            tenorPosition = 1;
          }
          break;
        case 'b':
        case 'o':
          if (isSingle) {
            tenorPosition = 1;
          } else {
            tenorPosition = 2;
          }
          break;
        case 't':
          tenorPosition = 2;
          break;
        case 'f':
          tenorPosition = 3;
          break;
        case 'v':
          tenorPosition = 4;
          break;
        default:
          throw 'Calling Position ' + call + ' not found';
      }
    }

    if (tenorPosition >= this.stage) {
      throw "Tenor doesn't get to this position in a " + this.stage + '-bell method';
    }
    const visitedPositions = new Set();
    while (moreLeads === true) {
      const position = change.row.indexOf(ROUNDS[this.stage - 1]);
      if (visitedPositions.has(position)) {
        throw new Error(
          'Calling position ' + call + ' cannot be reached with this method and call',
        );
      }
      visitedPositions.add(position);
      const previousLeadHead = change.row.slice(0);
      change.advanceLead(this.method, callType.mask);
      const thisLeadhead = change.row.slice(0);
      this.expandedComposition += this.method.name;
      // if tenor's in that position with a call
      if (thisLeadhead[tenorPosition] === ROUNDS[this.stage - 1]) {
        moreLeads = false;
        if (isSingle === false) {
          this.expandedComposition += this.bob[0];
        } else {
          this.expandedComposition += this.single[0];
        }
      } else {
        // tenor's not in specified position, undo the call and move on a lead
        change.setRow(previousLeadHead);
        change.advanceLead(this.method, this.method.leadEnd);
      }
      // if the tenor's home, put a line break in
      if (change.row.indexOf(ROUNDS[this.stage - 1]) === this.stage - 1) {
        this.expandedComposition += '\n';
      }
    }
  }
}

/**
 * ATW checker object
 * @param {Composition} comp The composition
 */
class AtwChecker {
  constructor(comp) {
    this.comp = comp;
    this.positionsRung = [];
    this.methodList = '';
    this.com = 0;
  }

  getAtw() {
    this.positionsRung = [];
    this.methodList = '';
    this.com = 0;
    const initialised = new Set();
    const rounds = ROUNDS.slice(0, this.comp.stage).split('');

    for (let i = 0; i < this.comp.methods.length; i++) {
      const name = this.comp.methods[i].name;
      this.methodList += name;
      if (!initialised.has(name)) {
        initialised.add(name);
        this.positionsRung[name] = [];
        for (let j = 0; j < this.comp.stage; j++) {
          this.positionsRung[name][ROUNDS[j]] = [];
          for (let k = 0; k < this.comp.stage; k++) {
            this.positionsRung[name][ROUNDS[j]][ROUNDS[k]] = false;
          }
        }
      }

      const leadHead = this.comp.leadHeads[i - 1] ?? rounds;
      for (let j = 0; j < this.comp.stage; j++) {
        this.positionsRung[name][leadHead[j]][ROUNDS[j]] = true;
      }
    }

    // count changes of method
    let previousLeadMethod = this.methodList[0];
    // ends up comparing the first lead against the first lead - probably OK
    for (let i = 0; i < this.methodList.length; i++) {
      if (this.methodList[i] != previousLeadMethod) {
        this.com++;
      }
      previousLeadMethod = this.methodList[i];
    }
  }
}

/**
 * Prover Object - prove the rows are unique
 * @author Paul Brook
 */
class Prover {
  constructor() {
    this.changes = new Map();
    this.changeNumber = 0;
    this.falseness = null;
  }

  /**
   * Check a row and retain the change number of its first occurrence.
   * @param {object} change The current change
   * @return {number} -1 for a repeat, 1 for rounds, 0 otherwise
   */
  checkRow(change) {
    this.changeNumber++;
    const key = change.toString();
    if (this.changes.has(key)) {
      this.falseness ??= {
        row: key,
        firstChange: this.changes.get(key),
        secondChange: this.changeNumber,
      };
      return -1;
    }
    this.changes.set(key, this.changeNumber);
    return key === ROUNDS.slice(0, change.stage) ? 1 : 0;
  }
}

/**
 * MusicBox object
 * @author Paul Brook
 */
class MusicBox {
  constructor() {
    this.patterns = [];
    this.counts = [];
  }

  addPattern(pattern) {
    this.patterns.push(pattern);
    this.counts.push(0);
  }

  setup(stage) {
    let pattern;
    let node;
    let bell;

    this.wildcardVisited = new Array(stage);
    this.stack = new Array(stage);
    this.patternTree = {};

    for (let n = 0; n < this.patterns.length; n++) {
      pattern = this.patterns[n];
      if (pattern.length != stage) {
        continue;
      }
      node = this.patternTree;
      for (let i = 0; i < stage; i++) {
        bell = pattern[i];
        let nextNode;
        if (bell in node) {
          nextNode = node[bell];
        } else {
          nextNode = {};
          node[bell] = nextNode;
        }
        node = nextNode;
      }
      node.pattern = n;
    }
  }

  matchRow(change) {
    const stage = change.stage;
    let i;
    let node;

    i = 0;
    node = this.patternTree;
    this.wildcardVisited[0] = !('*' in node);
    while (true) {
      // walk left along exact matches
      while (change.row[i] in node) {
        this.stack[i] = node;
        node = node[change.row[i]];
        i++;
        this.wildcardVisited[i] = !('*' in node);
      }
      // Check if this is an end node
      if (i == stage) {
        this.counts[node.pattern]++;
      }
      // Try right shuffle along wildcard
      if (!this.wildcardVisited[i]) {
        this.stack[i] = node;
        this.wildcardVisited[i] = true;
        node = node['*'];
        i++;
        this.wildcardVisited[i] = !('*' in node);
      } else {
        // backtrack until we find another right branch
        while (i > 0 && this.wildcardVisited[i]) {
          i--;
        }
        if (this.wildcardVisited[i]) {
          break;
        }
        this.wildcardVisited[i] = true;
        node = this.stack[i]['*'];
        i++;
        this.wildcardVisited[i] = !('*' in node);
      }
    }
  }
}

export {
  bellIndex,
  parsePlaces,
  parseMethod,
  createMethod,
  Change,
  createComposition,
  Prover,
  MusicBox,
  Shorthand,
  AtwChecker,
  addFourBellRuns,
  readUserMusicPatterns,
  doProve,
  generateShorthand,
};
