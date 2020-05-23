/* eslint-disable no-undef */
'use strict';

const MAX_STAGE = 24;
const BELL_NAMES = '1234567890ET';

const loadUserInput = () => {
  const input = {
    composition: '',
    methods: [],
    stage: 0,
    calls: [],
  };

  input.composition = document.getElementById('composition').value;
  input.stage = parseInt(document.getElementById('methodRank').value, 10);

  const htmlMethods = document.getElementsByClassName('js-method')
  for (let element of htmlMethods) {
    input.methods.push({
      shorthand: element.children[0].value,
      notation: element.children[1].value,
    });
  }

  const htmlCalls = Array.from(document.getElementsByClassName('callRow'));
  input.calls = htmlCalls.map((element) => {
    return {
      symbol: element.getElementsByClassName('callSymbol')[0].value,
      notation: element.getElementsByClassName('callNtn')[0].value,
    };
  });

  return input;
};

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

function get_composition() {
  const input = loadUserInput();
  return createComposition(input);
}

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

// eslint-disable-next-line require-jsdoc
function validate_method(id) {
  let shortcut;
  let rows;
  let stage;
  let method;
  let notation;

  shortcut = $('#shortcut' + id).val();
  if (shortcut == '') {
    return false;
  }
  notation = $('#notation' + id).val();
  notation = notation.replace(/x/gi, '-');
  if (notation == '') {
    return false;
  }
  stage = parseInt($('#methodRank').val(), 10);
  if (stage <= 0 || stage > MAX_STAGE) {
    return false;
  }
  rows = parse_method(stage, notation);
  method = Method(stage, shortcut, rows);

  return [shortcut, method];
}

/**
 * @param {Composition} composition The composition
 */
function doProve(composition) {
  const p = new Prover();
  let changes = 0;
  let rounds = 0;
  const music = MusicBox();
  const result = {
    trueTouch: false,
    complete: false,
    length: 0,
    status: 'No touch entered',
    courses: '',
    music: '',
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
    } else if (r == 1) {
      rounds = changes;
    }
  }

  // add 4-bell run patterns whatever the stage
  addFourBellRuns(comp.stage, music);

  // add user specific music patterns
  const userInputPatterns = $('#userMusicList').val();
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

  // display course ends
  let comptext = $('#composition').val();

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
      lead += bellName(comp.leadends[i][j]);
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

  result.music = '<pre>';
  for (let i = 0; i < music.counts.length; i++) {
    let pattern = '';
    // add run count to music output array only if those runs exist
    if (music.counts[i] != 0 ) {
      for (let j=0; j < music.patterns[i].length; j++) {
        pattern += bellName(music.patterns[i][j]);
      }
      result.music += '<strong>' + music.counts[i] + '</strong>\t' + pattern + '\n';
    }
  }
  result.music += '</pre>';

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
    // fill up the rest of the music array with the correct number of -1's
    const spareBells = Array.from({length: stage - 4}, () => -1);
    const forwardRun = [i, i+1, i+2, i+3];
    const backwardRun = [i+3, i+2, i+1, i];

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
      output += '  ' + BELL_NAMES.charAt(j) + ': ';
      // find which positions it rings
      for (let k=0; k < atw.comp.stage; k++) {
        if (atw.positionsRung[i][BELL_NAMES.charAt(j)][BELL_NAMES.charAt(k)] == true) {
          output += BELL_NAMES.charAt(k);
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
      // do the opposite of what we do in do_prove() - convert bell numbers into array items
      pattern[i] = bellIndex(pattern[i]);
    }
    patternList[j] = pattern;
  }
  return patternList;
}

/**
 * Convert the user's shorthand into JSProve input format, and update the text box
 */
function generateShorthand(methodID, bob, single) {
  const vm = validate_method(methodID);
  const s = Shorthand($('#shorthand').val(), vm[1]);

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
  let i;
  const that = {
    stage: stage,
  };
  that.row = new Array(stage);
  for (i = 0; i < stage; i++) {
    that.row[i] = i;
  }

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

  that.pp = function() {
    let s = '';
    for (i = 0; i < this.stage; i++) {
      s += BELL_NAMES[this.row[i]];
    }
    return s;
  };

  that.setRow = function(newRow) {
    this.row = newRow;
  };

  return that;
}

/**
 * Maps human names to bell indeces
 * @param {string} name The bell name
 * @return {string} The bell index
 */
function bellIndex(name) {
  if (name >= '1' && name <= '9') {
    return parseInt(name, 10) - 1;
  }
  if (name === '0') {
    return 9;
  }
  if (name === 'E') {
    return 10;
  }
  if (name === 'T') {
    return 11;
  }
  if (name === '*') {
    return -1;
  }
  return -1;
}

/**
 * Maps bell indeces to human names
 * @param {number} index The bell index
 * @return {string} The bell name
 */
function bellName(index) {
  if (index === -1) {
    return '*';
  }
  if (index > -1 && index < 9) {
    return (index+1).toString();
  }
  if (index === 9) {
    return '0';
  }
  if (index === 10) {
    return 'E';
  }
  if (index === 11) {
    return 'T';
  }
  return index;
}

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

  // eslint-disable-next-line require-jsdoc
  appendLead(method, call) {
    this.methods.push(method);
    this.calls.push(call);
    if (method.stage > this.stage) {
      this.stage = method.stage;
    }
  }

  // eslint-disable-next-line require-jsdoc
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
    while (moreLeads === true) {
      const previousLeadHead = c.row.slice(0);
      c.advance_lead(this.method, callType.mask, fn);
      const thisLeadhead = c.row.slice(0);
      this.compText += this.method.name;
      // if tenor's in that position with a call
      if (thisLeadhead[tenorPosition] === (this.stage-1)) {
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
      if (c.row.indexOf(this.stage-1) === (this.stage-1)) {
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
    for (let i=0; i < this.comp.methods.length; i++) {
      // add the method symbol to the list
      this.methodList += this.comp.methods[i].name;
      this.positionsRung[this.comp.methods[i].name] = [];
      // add the bell to the list
      for (let j=0; j < this.comp.stage; j++) {
        this.positionsRung[this.comp.methods[i].name][BELL_NAMES[j]] = [];
        // add the bell's position to the list
        for (let k=0; k < this.comp.stage; k++) {
          this.positionsRung[this.comp.methods[i].name][BELL_NAMES[j]][BELL_NAMES[k]] = false;
        }
      }
    }

    // for each lead
    for (let i=0; i < this.comp.methods.length; i++) {
      // loop through the number of bells
      for (let j=0; j < this.comp.stage; j++) {
        // bell at this position in the lead
        let leadend = this.comp.leadends[i-1];
        // note we can't use leadend-1 for the first lead, so generate a lead of rounds and use that
        if (leadend === undefined) {
          leadend = [];// this.comp.leadends[this.comp.methods.length - 1];
          for (let k=0; k < this.comp.stage; k++) {
            leadend.push(k);
          }
        }
        this.positionsRung[this.comp.methods[i].name][BELL_NAMES[leadend[j]]][BELL_NAMES[j]] = true;
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
  // eslint-disable-next-line require-jsdoc
  constructor() {
    this.changes = {};
  }

  /**
   * Checks the row
   * @param {Composition} c The composition
   * @return {number} Whether the row has been seen before or not
   */
  checkRow(c) {
    let val = 0;
    const row = new Array(c.stage);
    let i;
    let j;
    let bell;
    let seen = false;

    for (i = 0; i < c.stage; i++) {
      row[i] = c.row[i];
    }
    for (i = 0; i < c.stage; i++) {
      bell = row[i];
      for (j = i + 1; j < c.stage; j++) {
        if (row[j] > bell) {
          row[j]--;
        }
      }
      val = val * c.stage + bell;
    }
    seen = this.changes[val] === true;
    this.changes[val] = true;
    if (seen) {
      return -1;
    }
    if (val === 0) {
      return 1;
    }
    return 0;
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
    nodeDone[0] = !(-1 in node);
    while (true) {
      // walk left along exact matches
      while (c.row[i] in node) {
        stack[i] = node;
        node = node[c.row[i]];
        i++;
        nodeDone[i] = !(-1 in node);
      }
      // Check if this is an end node
      if (i == stage) {
        this.counts[node.pattern]++;
      }
      // Try right shuffle along wildcard
      if (!nodeDone[i]) {
        stack[i] = node;
        nodeDone[i] = true;
        node = node[-1];
        i++;
        nodeDone[i] = !(-1 in node);
      } else {
        // backtrack until we find another right branch
        while (i > 0 && nodeDone[i]) {
          i--;
        }
        if (nodeDone[i]) {
          break;
        }
        nodeDone[i] = true;
        node = stack[i][-1];
        i++;
        nodeDone[i] = !(-1 in node);
      }
    }
  };

  return that;
}
