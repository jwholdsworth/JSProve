/* eslint-disable no-undef */
'use strict';

const MAX_STAGE = 12;
const ROUNDS = '1234567890ETABCD';

const createComposition = (userInput) => {
  const selectedMethods = {};
  const comp = new Composition();
  const txtCalls = {};
  let doneCall = true;
  let lastMethod;

  userInput.methods.forEach((method) => {
    const validatedMethod = validateMethod(method.shorthand, method.notation, userInput.stage);
    selectedMethods[method.shorthand] = validatedMethod;
  });

  userInput.calls.forEach((call) => {
    txtCalls[call.symbol] = parse_bell_list(userInput.stage, 0, call.notation);
  });

  for (let i = 0; i < userInput.composition.length; i++) {
    const c = userInput.composition.charAt(i);
    if (c in selectedMethods) {
      if (!doneCall) {
        comp.appendLead(lastMethod, -1);
      }
      lastMethod = selectedMethods[c];
      doneCall = false;
    } else if (c in txtCalls) {
      comp.appendLead(lastMethod, txtCalls[c].mask);
      doneCall = true;
    }
  }

  if (!doneCall) {
    comp.appendLead(lastMethod, -1);
  }

  return {
    comp: comp,
    calls: txtCalls,
  };
};

const validateMethod = (shortcut, notation, stage) => {
  const parsedNotation = notation.replace(/x/gi, '-');
  if (!Number.isInteger(stage)) {
    return false;
  }
  if (stage <= 0 || stage > MAX_STAGE) {
    return false;
  }

  const rows = parse_method(stage, parsedNotation);

  return Method(stage, shortcut, rows);
};

/**
 * @param {object} composition The parsed composition and calls
 * @param {string} compositionText The original composition text
 * @param {string} userInputPatterns User-defined music patterns
 */
function doProve(composition, compositionText, userInputPatterns) {
  const p = new Prover();
  let changes = 0;
  let rounds = 0;
  const music = MusicBox();
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
  const txtCalls = composition.calls;

  function test_row(c, le) {
    let r;

    changes++;
    if (rounds !== 0) {
      return;
    }
    music.match_row(c);
    r = p.checkRow(c);

    if (r < 0) {
      rounds = -changes;
      result.falseness = p.falseness;
    } else if (r == 1) {
      rounds = changes;
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
  comp.run(test_row);

  if (result.falseness) {
    const describeChange = (changeNumber) => {
      let offset = 0;
      for (const [index, method] of comp.methods.entries()) {
        const length = method.rows.length + 1;
        if (changeNumber <= offset + length) {
          return {
            method: method.name,
            lead: index + 1,
            leadHead: index === 0
              ? ROUNDS.slice(0, comp.stage)
              : comp.leadends[index - 1].join(''),
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
  let comptext = compositionText;

  // now remove the calls from the comp text (look up from call list)
  // split the composition up at the carriage returns.
  for (const i in txtCalls) {
    const regex = new RegExp('['+i+']', 'g');
    comptext = comptext.replace(regex, '');
  }
  comptext = comptext.split('\n');

  const leads = [];
  for (let i=0; i<comp.leadends.length; i++) {
    let lead = '';
    for (let j=0; j<comp.leadends[i].length; j++) {
      lead += comp.leadends[i][j];
    }
    leads[i] = lead;
  }

  // get the course ends for displaying
  let leadNo = 0;
  for (let c = 0; c < comptext.length; c++) {
    if (comptext[c].length > 0) {
      leadNo = comptext[c].length + leadNo;
      result.courses += leads[leadNo-1];
    }
    result.courses += '\n';
  }

  if (rounds > 0) {
    result.trueTouch = true;
    result.length = (changes - rounds);
    result.complete = true;

    if (rounds != changes) {
      result.status = 'Touch is true: ' + rounds + ' changes (' + (changes - rounds) + ' before last course end)';
    } else {
      result.status = 'Touch is true: ' + rounds + ' changes';
    }
  } else if (rounds < 0) {
    result.complete = true;
    result.trueTouch = false;
    result.length = (-rounds);
    result.status = 'Touch is false after ' + (-rounds) + ' changes';
  } else {
    result.complete = false;
    result.trueTouch = true;
    result.length = changes;
    result.status = 'Incomplete touch (' + changes + ' changes)';
  }

  for (let i = 0; i < music.counts.length; i++) {
    let pattern = '';
    // add run count to music output array only if those runs exist
    if (music.counts[i] != 0 ) {
      for (let j=0; j < music.patterns[i].length; j++) {
        pattern += music.patterns[i][j];
      }
      result.music.push({count: music.counts[i], pattern});
    }
  }

  const atw = AtwChecker(comp);
  atw.getAtw();
  result.atw = formatAtw(atw);
  result.com = atw.com;

  return result;
}

/**
 * Add some basic music (four bell runs)
 */
function addFourBellRuns(stage, music) {
  for (let i = 0; i <= stage - 4; i++) {
    // fill up the rest of the music array with the correct number of wildcards
    const spareBells = Array.from({length: stage - 4}, () => '*');
    const forwardRun = ROUNDS.slice(i, i + 4).split('');
    const backwardRun = [...forwardRun].reverse();

    // forward run off the front (ie 1234.... etc)
    music.addPattern([].concat(forwardRun, spareBells));

    // backward run off the front (ie 4321....)
    music.addPattern([].concat(backwardRun, spareBells));

    // forward run at the back (ie ....1234)
    music.addPattern([].concat(spareBells, forwardRun));

    // backward run at the back (ie ....4321)
    music.addPattern([].concat(spareBells, backwardRun));
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
    for (let j=0; j < atw.comp.stage; j++) {
      output += '  ' + ROUNDS.charAt(j) + ': ';
      // find which positions it rings
      for (let k=0; k < atw.comp.stage; k++) {
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
  patternList = patternList.split('\n');

  for (let j=0; j < patternList.length; j++) {
    const pattern = patternList[j].split('');
    for (let i=0; i < pattern.length; i++) {
      // do the opposite of what we do in do_prove() - retain printable bell symbols and wildcards
      pattern[i] = ROUNDS.includes(pattern[i]) ? pattern[i] : '*';
    }
    patternList[j] = pattern;
  }
  return patternList;
}

/**
 * Convert the user's shorthand into JSProve input format
 */
function generateShorthand(shorthand, method, bob, single) {
  const s = Shorthand(shorthand, method);

  s.run(nothing, bob, single);

  // empty function required here by the Shorthand class
  function nothing() {}

  return s.compText;
}


/**
 * Method Object
 * @author Paul Brook
 */
function Method(stage, name, rows) {
  const lead_end = rows.pop();
  const that = {
    stage: stage,
    name: name,
    rows: rows,
    lead_end: lead_end,
  };
  return that;
}

/**
 * Change Object - represents a row and advances to the next row or next lead
 * @author Paul Brook
 */
function Change(stage) {
  const that = {
    stage: stage,
    row: ROUNDS.slice(0, stage).split(''),
  };

  that.advance = function(mask) {
    let i = 0;
    let tmp;
    while (i < stage) {
      // if the notation is 'x', swap the pair of bells over
      if ((mask & 1) === 0) {
        tmp = this.row[i];
        this.row[i] = this.row[i + 1];
        this.row[i + 1] = tmp;
        mask >>= 2;
        // jump forward 2 bells to do the next pair
        i += 2;
      } else {
        mask >>= 1;
        i++;
      }
    }
  };

  that.advance_lead = function(method, call, fn) {
    let mask;
    let n;

    if (call === -1) {
      call = method.lead_end;
    }
    for (n = 0; n < method.rows.length; n++) {
      mask = method.rows[n];
      this.advance(mask, false);
      fn(this);
    }
    this.advance(call, true);
    fn(this);
  };

  that.toString = () => that.row.join('');

  that.setRow = (newRow) => that.row = newRow;

  return that;
}

/**
 * Maps human names to bell indeces
 * @param {string} name The bell name
 * @return {string} The bell index
 */
const bellIndex = (name) => ROUNDS.indexOf(name);

/**
 * Generate a row
 * @author Paul Brook
 */
function parse_bell_list(stage, n, notation) {
  let mask = 0;
  let last_bell = -1;
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
    last_bell = bell;
    n++;
  }
  if ((last_bell & 1) === 0) {
    mask |= 1 << (stage - 1);
  }

  return {
    n: n,
    mask: mask,
  };
}

// function to decide which parsing method to use
function parse_method(stage, notation) {
  if ((notation.indexOf('&') === -1) && (notation.indexOf('+') === -1)) {
    return parse_method_cc(stage, notation);
  } else {
    return parse_method_microsiril(stage, notation.split(' ')[0], notation.split(' ')[1]);
  }
}

/**
 * Parse method notation as used by MicroSIRIL libraries
 * @author Paul Brook
 */
function parse_method_microsiril(stage, group, notation) {
  function get_mask(stage, n, notation) {
    if (notation.charAt(n) === '-') {
      return {
        n: n+1,
        mask: 0,
      };
    }
    return parse_bell_list(stage, n, notation);
  }
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
  let lead_end;

  while (n < notation.length) {
    res = get_mask(stage, n, notation);
    if (res.n === n) {
      throw 'Bad place notation ' + notation;
    }
    n = res.n;
    rows.push(res.mask);
  }
  if (symmetric) {
    for (n = rows.length - 2; n >= 0; n--) {
      rows.push(rows[n]);
    }
  }

  c = group.charAt(0);
  if (group.charAt(group.length - 1) === 'z') {
    res = parse_bell_list(stage, 0, group);
    if (res.n !== res.length) {
      throw 'Bad method group: ' + group;
    }
    lead_end = res.mask;
  } else if ((c >= 'a' && c <= 'f')
        || c === 'p' || c === 'q') {
    lead_end = 3;
  } else if ((c >= 'g' && c <= 'm')
        || c === 'r' || c === 's') {
    lead_end = 1 | (1 << (stage - 1));
  } else {
    throw 'Bad method group: ' + group;
  }
  rows.push(lead_end);
  return rows;
}

/**
 * Parse method notation as used in Central Council XML files
 * @author Paul Brook
 */
function parse_method_cc(stage, notation) {
  function get_mask(stage, n, notation) {
    if (notation.charAt(n) === '-') {
      return {
        n: n+1,
        mask: 0,
      };
    }
    return parse_bell_list(stage, n, notation);
  }
  let res;
  let n = 0;
  let sep;
  let lead_end;
  const rows = [];

  sep = notation.indexOf(',');
  if (sep === -1) {
    sep = notation.length;
  }
  while (n < sep) {
    res = get_mask(stage, n, notation);
    if (res.n === n) {
      throw 'Bad place notation ' + notation;
    }
    n = res.n;
    rows.push(res.mask);
  }
  if (sep !== notation.length) {
    for (n = rows.length - 2; n >= 0; n--) {
      rows.push(rows[n]);
    }
    res = parse_bell_list(stage, sep + 1, notation);
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
    this.leadends = [];
    this.stage = 0;
  }

  appendLead(method, call) {
    this.methods.push(method);
    this.calls.push(call);
    if (method.stage > this.stage) {
      this.stage = method.stage;
    }
  }

  run(fn) {
    const ch = Change(this.stage);
    let method;
    let call;
    for (let a = 0; a < this.methods.length; a++) {
      method = this.methods[a];
      call = this.calls[a];
      ch.advance_lead(method, call, fn);
      this.leadends[a] = ch.row.slice(0);
    }
  }
}

/**
 * Shorthand Object
 * @author James Holdsworth
 * @todo Remove hard coding of symbols
 */
function Shorthand(shorthand, method) {
  const that = {
    shorthandCalls: shorthand,
    stage: method.stage,
    compText: '',
    method: method,
    bob: null,
    single: null,
  };

  that.run = function(fn, b, s) {
    this.bob = b;
    this.single = s;
    const bob = parse_bell_list(this.stage, 0, b[1]);
    const single = parse_bell_list(this.stage, 0, s[1]);
    const c = Change(this.stage);
    // loop through the calls and for each one, work out its meaning
    for (let i=0; i<this.shorthandCalls.length; i++) {
      if (this.shorthandCalls.charAt(i) === 's') {
        // it's a single
        i++;
        this.ringToNextCall(this.shorthandCalls[i], single, fn, true, c);
      } else {
        this.ringToNextCall(this.shorthandCalls[i], bob, fn, false, c);
      }
    }
  };

  // returns number of leads until you insert the next call
  that.ringToNextCall = function(call, callType, fn, isSingle, c) {
    let moreLeads = true;
    let tenorPosition = bellIndex(call);
    // couldn't find index
    if (tenorPosition < 1) {
      call = call.toLowerCase();
      switch (call) {
        case 'h':
          tenorPosition = this.stage-1;
          break;
        case 'w':
          tenorPosition = this.stage-2;
          break;
        case 'm':
          tenorPosition = this.stage-3;
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
      throw 'Tenor doesn\'t get to this position in a '+this.stage+'-bell method';
    }
    const visitedPositions = new Set();
    while (moreLeads === true) {
      const position = c.row.indexOf(ROUNDS[this.stage - 1]);
      if (visitedPositions.has(position)) {
        throw new Error('Calling position ' + call + ' cannot be reached with this method and call');
      }
      visitedPositions.add(position);
      const previousLeadHead = c.row.slice(0);
      c.advance_lead(this.method, callType.mask, fn);
      const thisLeadhead = c.row.slice(0);
      this.compText += this.method.name;
      // if tenor's in that position with a call
      if (thisLeadhead[tenorPosition] === ROUNDS[this.stage - 1]) {
        moreLeads = false;
        if (isSingle === false) {
          this.compText += this.bob[0];
        } else {
          this.compText += this.single[0];
        }
      } else { // tenor's not in specified position, undo the call and move on a lead
        c.setRow(previousLeadHead);
        c.advance_lead(this.method, this.method.lead_end, fn);
      }
      // if the tenor's home, put a line break in
      if (c.row.indexOf(ROUNDS[this.stage - 1]) === (this.stage-1)) {
        this.compText += '\n';
      }
    }
  };
  return that;
}

/**
 * ATW checker object
 * @param {Composition} comp The composition
 */
function AtwChecker(comp) {
  // build an array like Method[bellNo][position] = true
  const that = {
    comp: comp,
    positionsRung: [],
    methodList: '',
    com: 0,
  };

  that.getAtw = function() {
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

      const leadHead = this.comp.leadends[i - 1] ?? rounds;
      for (let j = 0; j < this.comp.stage; j++) {
        this.positionsRung[name][leadHead[j]][ROUNDS[j]] = true;
      }
    }

    // count changes of method
    let previousLeadMethod = this.methodList[0];
    // ends up comparing the first lead against the first lead - probably OK
    for (let i=0; i < this.methodList.length; i++) {
      if (this.methodList[i] != previousLeadMethod) {
        this.com++;
      }
      previousLeadMethod = this.methodList[i];
    }
  };

  return that;
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
function MusicBox() {
  const that = {
    patterns: [],
    counts: [],
  };
  let nodeDone;
  let stack;
  let objtree;

  that.addPattern = function(pattern) {
    this.patterns.push(pattern);
    this.counts.push(0);
  };

  that.setup = function(stage) {
    let pattern;
    let node;
    let bell;

    nodeDone = new Array(stage);
    stack = new Array(stage);
    objtree = {};

    for (let n = 0; n < this.patterns.length; n++) {
      pattern = this.patterns[n];
      if (pattern.length != stage) {
        continue;
      }
      node = objtree;
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
  };

  that.match_row = function(c) {
    const stage = c.stage;
    let i;
    let node;

    i = 0;
    node = objtree;
    nodeDone[0] = !('*' in node);
    while (true) {
      // walk left along exact matches
      while (c.row[i] in node) {
        stack[i] = node;
        node = node[c.row[i]];
        i++;
        nodeDone[i] = !('*' in node);
      }
      // Check if this is an end node
      if (i == stage) {
        this.counts[node.pattern]++;
      }
      // Try right shuffle along wildcard
      if (!nodeDone[i]) {
        stack[i] = node;
        nodeDone[i] = true;
        node = node['*'];
        i++;
        nodeDone[i] = !('*' in node);
      } else {
        // backtrack until we find another right branch
        while (i > 0 && nodeDone[i]) {
          i--;
        }
        if (nodeDone[i]) {
          break;
        }
        nodeDone[i] = true;
        node = stack[i]['*'];
        i++;
        nodeDone[i] = !('*' in node);
      }
    }
  };

  return that;
}

export {bellIndex, parse_bell_list, parse_method, validateMethod, Change, createComposition, Prover, MusicBox, Shorthand, AtwChecker, addFourBellRuns, readUserMusicPatterns, doProve, generateShorthand};
