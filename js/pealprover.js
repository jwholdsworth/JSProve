// "use strict"; // removing this until the whole thing has been improved

const MAX_RANK = 24
const bell_names = "1234567890ET"

const loadUserInput = () => {
    const input = {
        composition: '',
        methods: [],
        stage: 0,
        calls: [],
    }

    input.composition = document.getElementById('composition').value
    input.stage = parseInt(document.getElementById('methodRank').value, 10)

    const htmlMethods = document.getElementById('methodList').childNodes
    htmlMethods.forEach((element) => {
        input.methods.push({
            shorthand: element.childNodes[0].value,
            notation: element.childNodes[1].value,
        })
    })

    const htmlCalls = Array.from(document.getElementsByClassName('callRow'))
    input.calls = htmlCalls.map((element) => {
        return {
            symbol: element.getElementsByClassName('callSymbol')[0].value,
            notation: element.getElementsByClassName('callNtn')[0].value
        }
    })

    console.debug(input)

    return input
}

const createComposition = (userInput) => {
    const selectedMethods = {}
    const comp = Composition()
    const txtCalls = {}
    let done_call = true
    let last_method

    userInput.methods.forEach((method) => {
        const validatedMethod = validateMethod(method.shorthand, method.notation, userInput.stage)
        selectedMethods[method.shorthand] = validatedMethod
    })

    userInput.calls.forEach((call) => {
        txtCalls[call.symbol] = parse_bell_list(userInput.stage, 0, call.notation)
    })

    for (let i = 0; i < userInput.composition.length; i++) {
        let c = userInput.composition.charAt(i);
        if (c in selectedMethods) {
            if (!done_call) {
                comp.append_lead(last_method, -1);
            }
            last_method = selectedMethods[c];
            done_call = false;
        } else if (c in txtCalls) {
            comp.append_lead(last_method, txtCalls[c].mask);
            done_call = true;
        }
    }

    if (!done_call) {
        comp.append_lead(last_method, -1);
    }

    return {
        comp:comp,
        calls:txtCalls
    };
}

function get_composition() {
    const input = loadUserInput()
    return createComposition(input)
}

const validateMethod = (shortcut, notation, stage) => {
    let rows;
    const parsedNotation = notation.replace(/x/gi, '-');
    if (!Number.isInteger(stage)) {
        return false
    }
    if (stage <= 0 || stage > MAX_RANK) {
        return false
    }

    rows = parse_method(stage, parsedNotation);

    return Method(stage, shortcut, rows);
}

function validate_method(id) {
    var shortcut;
    var rows;
    var rank;
    var method;
    var notation;

    shortcut = $('#shortcut' + id).val();
    if (shortcut == "") {
        return false;
    }
    notation = $('#notation' + id).val();
    notation = notation.replace(/x/gi, '-');
    if (notation == "") {
        return false;
    }
    rank = parseInt($('#methodRank').val(), 10);
    if (rank <= 0 || rank > MAX_RANK) {
        return false;
    }
    rows = parse_method(rank, notation);
    method = Method(rank, shortcut, rows);

    return [shortcut, method];
}

function do_prove() {
    var p = Prover();
    var changes = 0;
    var rounds = 0;
    var music = MusicBox();
    var result = {
        trueTouch: false,
        complete: false,
        length: 0,
        status: 'No touch entered',
        courses: '',
        music: '',
        atw: '',
        com: 0
    };
    composition = get_composition();
    var comp = composition.comp;
    var txtCalls = composition.calls;

    function test_row(c, le) {
        var r;

        changes++;
        if (rounds !== 0) {
            return;
        }
        music.match_row(c);
        r = p.check_row(c);

        if (r < 0) {
            rounds = -changes;
        } else if (r == 1) {
            rounds = changes;
        }
    }

    // add 4-bell run patterns whatever the stage (rank)
    addFourBellRuns(comp.rank, music);

    // add user specific music patterns
    var userInputPatterns = $('#userMusicList').val();
    if(userInputPatterns.length != 0) {
        var userPatterns = readUserMusicPatterns(userInputPatterns);
        for(i = 0; i < userPatterns.length; i++) {
            // ignore empty values (ie line feeds)
            if(userPatterns[i].length != 0) {
                music.add_pattern(userPatterns[i]);
            }
        }
    }

    music.setup(comp.rank);
    comp.run(test_row);

    // display course ends
    var comptext = $('#composition').val();

    // now remove the calls from the comp text (look up from call list)
    // split the composition up at the carriage returns.
    for(i in txtCalls) {
        var regex = new RegExp(i, 'g');
        comptext = comptext.replace(regex, '');
    }
    comptext = comptext.split("\n");

    var leads = [];
    for(i=0; i<comp.leadends.length; i++) {
        var lead = "";
        for(j=0; j<comp.leadends[i].length; j++) {
            lead += bell_name(comp.leadends[i][j]);
        }
        leads[i] = lead;
    }

    // get the course ends for displaying
    var leadNo = 0;
    for(c = 0; c < comptext.length; c++) {
        if(comptext[c].length > 0) {
            leadNo = comptext[c].length + leadNo;
            result.courses += leads[leadNo-1];
        }
        result.courses += "\n";
    }

    if (rounds > 0) {
        result.trueTouch = true;
        result.length = (changes - rounds);
        result.complete = true;

        if (rounds != changes) {
            result.status = "Touch is true: " + rounds + " changes (" + (changes - rounds) + " before last course end)";
        } else {
            result.status = "Touch is true: " + rounds + " changes";
        }
    } else if (rounds < 0) {
        result.complete = true;
        result.trueTouch = false;
        result.length = (-rounds);
        result.status = "Touch is false: false after " + (-rounds) + " changes";
    } else {
        result.complete = false;
        result.trueTouch = true;
        result.length = changes;
        result.status = "Incomplete touch (" + changes + " changes)";
    }

    result.music = "<pre>";
    for (i = 0; i < music.counts.length; i++) {
        var pattern = "";
        // add run count to music output array only if those runs exist
        if(music.counts[i] != 0 ) {
            for(j=0; j < music.patterns[i].length; j++) {
                pattern += bell_name(music.patterns[i][j]);
            }
            result.music += "<strong>" + music.counts[i] + "</strong>\t" + pattern + "\n";
        }
    }
    result.music += "</pre>";

    var atw = AtwChecker(comp);
    atw.getAtw();
    result.atw = formatAtw(atw);
    result.com = atw.com;

    return result;
}

/**
 * Add some basic music (four bell runs)
 */
function addFourBellRuns(stage, music) {
    for(i=0; i < stage; i++) {
        // fill up the rest of the music array with the correct number of -1's
        var spareBells = new Array();
        var runs = new Array();
        for(j=0; j < (stage-4); j++) {
            spareBells[j] = -1;
        }

        // forward run off the front (ie 1234.... etc)
        runs = runs.concat([i, i+1, i+2, i+3], spareBells);
        music.add_pattern(runs);
        runs = new Array();

        // backward run off the front (ie 4321....)
        runs = runs.concat([i+3, i+2, i+1, i], spareBells);
        music.add_pattern(runs);
        runs = new Array();

        // forward run at the back (ie ....1234)
        runs = runs.concat(spareBells, [i, i+1, i+2, i+3]);
        music.add_pattern(runs);
        runs = new Array();

        // backward run at the back (ie ....4321)
        runs = runs.concat(spareBells, [i+3, i+2, i+1, i]);
        music.add_pattern(runs);
    }
}

/**
 * Create a human-friendly all-the-work table by bell numbers
 */
function formatAtw(atw) {
    var output = '';
    for (i in atw.positionsRung) {
        // output the method key
        output += i + ':\n'
        // output the bell number
        for (j=0; j < atw.comp.rank; j++) {
            output += '  ' + bell_names.charAt(j) + ': ';
            // find which positions it rings
            for (k=0; k < atw.comp.rank; k++) {
                if (atw.positionsRung[i][bell_names.charAt(j)][bell_names.charAt(k)] == true) {
                    output += bell_names.charAt(k);
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
    patternList = patternList.split("\n");

    for(j=0; j < patternList.length; j++) {
        var pattern = patternList[j].split("");
        for(i=0; i < pattern.length; i++) {
            // do the opposite of what we do in do_prove() - convert bell numbers into array items
            pattern[i] = bell_index(pattern[i]);
        }
        patternList[j] = pattern;
    }
    return patternList;
}

/**
 * Convert the user's shorthand into JSProve input format, and update the text box
 */
function generateShorthand(methodID, bob, single) {
    var vm = validate_method(methodID);
    var s = Shorthand($('#shorthand').val(), vm[1]);

    s.run(nothing, bob, single);

    // empty function required here by the Shorthand class
    function nothing() {}

    return s.compText
}

module.exports = {
    validateMethod,
    createComposition,
}







/**
 * Method Object
 * @author Paul Brook
 */
function Method(rank, name, rows) {
    var lead_end = rows.pop();
    var that = {
        rank:rank,
        name:name,
        rows:rows,
        lead_end:lead_end
    };
    return that;
}

/**
 * Change Object - represents a row and advances to the next row or next lead
 * @author Paul Brook
 */
function Change(rank) {
    var i;
    var that = {
        rank:rank
    };
    that.row = new Array(rank);
    for (i = 0; i < rank; i++) {
        that.row[i] = i;
    }

    that.advance = function (mask) {
        console.debug('mask', mask)
        console.debug('row', this.row)
        var i = 0;
        var tmp;
        while (i < rank) {
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

    that.advance_lead = function (method, call, fn) {
        var mask;
        var n;

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

    that.pp = function () {
        var s = "";
        for (i = 0; i < this.rank; i++) {
            s += bell_names[this.row[i]];
        }
        return s;
    };

    that.setRow = function (newRow) {
        this.row = newRow;
    }

    return that;
}

// map human bell names to bell indexes
function bell_index(name) {
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
    if(name === '*') {
        return -1;
    }
    return -1;
}

// map bell indexes to human bell names
function bell_name(index) {
    if(index === -1) {
        return "*";
    }
    if(index > -1 && index < 9) {
        return (index+1).toString();
    }
    if(index === 9) {
        return '0';
    }
    if(index === 10) {
        return 'E';
    }
    if(index === 11) {
        return 'T';
    }
    return index;
}

/**
 * Generate a row
 * @author Paul Brook
 */
function parse_bell_list(rank, n, notation) {
    var mask = 0;
    var last_bell = -1;
    var c;
    var bell;

    while (n < notation.length) {
        c = notation.charAt(n);
        if (c === '.') {
            n++;
            break;
        }
        bell = bell_index(c);
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
        mask |= 1 << (rank - 1);
    }

    return {
        n:n,
        mask:mask
    };
}

// function to decide which parsing method to use
function parse_method(rank, notation) {
    if((notation.indexOf("&") === -1) && (notation.indexOf("+") === -1)) {
        return parse_method_cc(rank, notation);
    } else {
        return parse_method_microsiril(rank, notation.split(" ")[0], notation.split(" ")[1]);
    }
}

/**
 * Parse method notation as used by MicroSIRIL libraries
 * @author Paul Brook
 */
function parse_method_microsiril(rank, group, notation) {
    function get_mask(rank, n, notation) {
        if (notation.charAt(n) === "-") {
            return {
                n:n+1,
                mask:0
            };
        }
        return parse_bell_list(rank, n, notation);
    }
    var symmetric;
    var c;
    c = notation.charAt(0);
    if (c === '&') {
        symmetric = true;
    } else if (c === '+') {
        symmetric = false;
    } else {
        throw "Unexpected notation (expected + or &):" + notation;
    }
    var res;
    var n = 1;
    var rows = [];
    var lead_end;

    while (n < notation.length) {
        res = get_mask(rank, n, notation);
        if (res.n === n) {
            throw "Bad place notation";
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
        res = parse_bell_list(rank, 0, group);
        if (res.n !== res.length) {
            throw "Bad method group: " + group;
        }
        lead_end = res.mask;
    } else if ((c >= 'a' && c <= 'f')
        || c === 'p' || c === 'q') {
        lead_end = 3;
    } else if ((c >= 'g' && c <= 'm')
        || c === 'r' || c === 's') {
        lead_end = 1 | (1 << (rank - 1));
    } else {
        throw "Bad method group: " + group;
    }
    rows.push(lead_end);
    return rows;
}

/**
 * Parse method notation as used in Central Council XML files
 * @author Paul Brook
 */
function parse_method_cc(rank, notation) {
    function get_mask(rank, n, notation) {
        if (notation.charAt(n) === "-") {
            return {
                n:n+1,
                mask:0
            };
        }
        return parse_bell_list(rank, n, notation);
    }
    var res;
    var n = 0;
    var sep;
    var lead_end;
    var rows = [];

    sep = notation.indexOf(",");
    if (sep === -1)
        sep = notation.length;
    while (n < sep) {
        res = get_mask(rank, n, notation);
        if (res.n === n) {
            throw "Bad place notation";
        }
        n = res.n;
        rows.push(res.mask);
    }
    if (sep !== notation.length) {
        for (n = rows.length - 2; n >= 0; n--) {
            rows.push(rows[n]);
        }
        res = parse_bell_list(rank, sep + 1, notation);
        rows.push(res.mask);
    }
    return rows;
}

/**
 * Composition Object
 * @author Paul Brook, modified by James Holdsworth to allow spliced
 */
function Composition() {
    var that = {
        methods:[],
        calls:[],
        leadends:[],
        rank:0
    };

    that.append_lead = function (method, call) {
        this.methods.push(method);
        this.calls.push(call);
        if (method.rank > this.rank) {
            this.rank = method.rank;
        }
    };

    that.run = function (fn) {
        var ch = Change(this.rank);
        var method;
        var call;
        for (let a = 0; a < this.methods.length; a++) {
            method = this.methods[a];
            call = this.calls[a];
            ch.advance_lead(method, call, fn);
            this.leadends[a] = ch.row.slice(0);
        }
    };
    return that;
}

/**
 * Shorthand Object
 * @author James Holdsworth
 * @todo Remove hard coding of symbols
 */
function Shorthand(shorthand, method) {
    var that = {
        shorthandCalls:shorthand,
        rank:method.rank,
        compText:"",
        method:method,
        bob:null,
        single:null
    };

    that.run = function(fn, b, s) {
        this.bob = b;
        this.single = s;
        var bob = parse_bell_list(this.rank, 0, b[1]);
        var single = parse_bell_list(this.rank, 0, s[1]);
        var c = Change(this.rank);
        // loop through the calls and for each one, work out its meaning
        for(i=0; i<this.shorthandCalls.length; i++) {
            if(this.shorthandCalls.charAt(i) === "s") {
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
        var moreLeads = true;
        var tenorPosition = bell_index(call);
        // couldn't find index
        if(tenorPosition < 1) {
            call = call.toLowerCase();
            switch(call) {
                case "h":
                    tenorPosition = this.rank-1;
                    break;
                case "w":
                    tenorPosition = this.rank-2;
                    break;
                case "m":
                    tenorPosition = this.rank-3;
                    break;
                case "i":
                    // won't this break if using n-2 place calls?
                    if(isSingle) {
                        // single 3rds
                        tenorPosition = 2;
                    } else {
                        // run in
                        tenorPosition = 1;
                    }
                    break;
                case "b":
                case "o":
                    if(isSingle) {
                        tenorPosition = 1;
                    } else {
                        tenorPosition = 2;
                    }
                    break;
                case "t":
                    tenorPosition = 2;
                    break;
                case "f":
                    tenorPosition = 3;
                    break;
                case "v":
                    tenorPosition = 4;
                    break;
                default:
                    throw "Calling Position " + call + " not found";
            }
        }

        if(tenorPosition >= this.rank) {
            throw "Tenor doesn't get to this position in a "+this.rank+"-bell method";
        }
        while(moreLeads === true) {
            var previousLeadHead = c.row.slice(0);
            c.advance_lead(this.method, callType.mask, fn);
            var thisLeadhead = c.row.slice(0);
            this.compText += this.method.name;
            // if tenor's in that position with a call
            if(thisLeadhead[tenorPosition] === (this.rank-1)) {
                moreLeads = false;
                if(isSingle === false) {
                    this.compText += this.bob[0];
                } else {
                    this.compText += this.single[0];
                }
            } else { // tenor's not in specified position, undo the call and move on a lead
                c.setRow(previousLeadHead);
                c.advance_lead(this.method, this.method.lead_end, fn);
            }
            // if the tenor's home, put a line break in
            if(c.row.indexOf(this.rank-1) === (this.rank-1)) {
                this.compText += "\n";
            }
        }
    };
    return that;
}

/**
 * ATW checker object
 * @author James Holdsworth
 */
function AtwChecker(comp) {
    // build an array like Method[bellNo][position] = true
    var that = {
        comp:comp,
        positionsRung:[],
        methodList:'',
        com:0
    }

    that.getAtw = function() {
        for (i=0; i < this.comp.methods.length; i++) {
            // add the method symbol to the list
            this.methodList += this.comp.methods[i].name;
            this.positionsRung[this.comp.methods[i].name] = [];
            // add the bell to the list
            for (j=0; j < this.comp.rank; j++) {
                this.positionsRung[this.comp.methods[i].name][bell_names[j]] = [];
                // add the bell's position to the list
                for (k=0; k < this.comp.rank; k++) {
                    this.positionsRung[this.comp.methods[i].name][bell_names[j]][bell_names[k]] = false;
                }
            }
        }

        // for each lead
        for (i=0; i < this.comp.methods.length; i++) {
            // loop through the number of bells
            for (j=0; j < this.comp.rank; j++) {
                // bell at this position in the lead
                leadend = this.comp.leadends[i-1];
                // note we can't use leadend-1 for the first lead, so generate a lead of rounds and use that
                if (leadend === undefined) {
                    leadend = [];//this.comp.leadends[this.comp.methods.length - 1];
                    for (k=0; k < this.comp.rank; k++) {
                        leadend.push(k);
                    }
                }
                this.positionsRung[this.comp.methods[i].name][bell_names[leadend[j]]][bell_names[j]] = true;
            }
        }

        // count changes of method
        var previousLeadMethod = this.methodList[0];
        // ends up comparing the first lead against the first lead - probably OK
        for (i=0; i < this.methodList.length; i++) {
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
function Prover() {
    that = {
        changes:{}
    };

    that.check_row = function (c) {
        var val = 0;
        var rank = c.rank;
        var row = new Array(rank);
        var n;
        var i;
        var j;
        var bell;
        var seen = false;

        for (i = 0; i < rank; i++) {
            row[i] = c.row[i];
        }
        n = rank;
        for (i = 0; i < rank; i++) {
            bell = row[i];
            for (j = i + 1; j < rank; j++) {
                if (row[j] > bell) {
                    row[j]--;
                }
            }
            val = val * n + bell;
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
    };

    return that;
}

/**
 * MusicBox object
 * @author Paul Brook
 */
function MusicBox() {
    var that = {
        patterns:[],
        counts:[]
    };
    var node_done;
    var stack;
    var objtree;

    that.add_pattern = function (pattern) {
        this.patterns.push(pattern);
        this.counts.push(0);
    };

    that.setup = function (rank) {
        var pattern;
        var node;
        var bell;

        node_done = new Array(rank);
        stack = new Array(rank);
        objtree = {};

        for (n = 0; n < this.patterns.length; n++) {
            pattern = this.patterns[n];
            if (pattern.length != rank) {
                continue;
            }
            node = objtree;
            for (i = 0; i < rank; i++) {
                bell = pattern[i];
                if (bell in node) {
                    next_node = node[bell];
                } else {
                    next_node = {};
                    node[bell] = next_node;
                }
                node = next_node;
            }
            node.pattern = n;
        }
    };

    that.match_row = function (c) {
        var rank = c.rank;
        var i;
        var node;

        i = 0;
        node = objtree;
        node_done[0] = !(-1 in node);
        while (true) {
            // walk left along exact matches
            while (c.row[i] in node) {
                stack[i] = node;
                node = node[c.row[i]];
                i++;
                node_done[i] = !(-1 in node);
            }
            // Check if this is an end node
            if (i == rank) {
                this.counts[node.pattern]++;
            }
            // Try right shuffle along wildcard
            if (!node_done[i]) {
                stack[i] = node;
                node_done[i] = true;
                node = node[-1];
                i++;
                node_done[i] = !(-1 in node);
            } else {
                // backtrack until we find another right branch
                while (i > 0 && node_done[i]) {
                    i--;
                }
                if (node_done[i]) {
                    break;
                }
                node_done[i] = true;
                node = stack[i][-1];
                i++;
                node_done[i] = !(-1 in node);
            }
        }
    };

    return that;
}
