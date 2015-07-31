function get_composition() {
    var methods = {};
    var comptext = $('#composition').val();
    var comp = Composition();
    var done_call = true;
    var last_method;
    var txtCalls = new Object();

    // TODO: warn about failures
    $('#methodList').each(function() {
        for(i=0; i < $(this).children().length; i++) {
            var vm = validate_method($(this).children()[i].id.substr(6));
            methods[vm[0]] = vm[1];
        }
    });

    for (n = 0; n < $('#calls table tr').size()-1; n++) {
        var symbol = $("#symbol"+n).val();
        var not = $("#callNtn"+n).val();
        txtCalls[symbol] = parse_bell_list(comp.rank, 0, not);
    }

    for (i = 0; i < comptext.length; i++) {
        c = comptext.charAt(i);
        if (c in methods) {
            if (!done_call) {
                comp.append_lead(last_method, -1);
            }
            last_method = methods[c];
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
    for(i=0; i < comp.rank; i++) {
        // fill up the rest of the music array with the correct number of -1's
        var spareBells = new Array();
        var runs = new Array();
        for(j=0; j < (comp.rank-4); j++) {
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

    // add user specific music patterns
    //TODO: put this in a separate method and don't hard code #userMusicList you numpty
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
