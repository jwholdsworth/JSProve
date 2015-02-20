/*******************************************************************************
 * DECLARE FRONT-END VARIABLES
 *******************************************************************************/
var numberOfMethods = 0; // the number of method input boxes (i.e. methods in current composition)
var stage = $('#methodRank').val();

collections = {
    "collections": [
        {"stage": "8", "collections":
                    [
                        {"key": "pitmans4", "name": "Pitman's 4", "methods":
                                    [
                                        {"key": "B", "notation": "m &-5-4.5-5.36.4-4.5-4-1"},
                                        {"key": "C", "notation": "b &-3-4-25-36-4-5-6-7"},
                                        {"key": "L", "notation": "f &3-3.4-2-3.4-4.5.6-6.5"},
                                        {"key": "S", "notation": "b &-36-4-5-36-4-5-36-7"}
                                    ]
                        },
                        {"key": "std8", "name": "Standard 8", "methods":
                                    [
                                        {"key": "B", "notation": "m &-5-4.5-5.36.4-4.5-4-1"},
                                        {"key": "C", "notation": "b &-3-4-25-36-4-5-6-7"},
                                        {"key": "L", "notation": "f &3-3.4-2-3.4-4.5.6-6.5"},
                                        {"key": "N", "notation": "b &-3-4-5-6-4-5-36-7"},
                                        {"key": "P", "notation": "b &-5-6-2-3-4-5-6-7"},
                                        {"key": "R", "notation": "f &-3-4-5-6-4-3-34-1"},
                                        {"key": "S", "notation": "b &-36-4-5-36-4-5-36-7"},
                                        {"key": "Y", "notation": "b &-3-4-5-6-2-3-4-7"},
                                    ]
                        }
                    ]
        },
        {"stage": "10", "collections":
                    [
                        {"key": "kippins4", "name": "Kippin's 4", "methods":
                                    [
                                        {"key": "B", "notation": "m &-5-4.5-5.36.4-4.5-4-1"}
                                    ]
                        },
                        {"key": "std8", "name": "Standard 8", "methods":
                                    [
                                        {"key": "B", "notation": "m &-5-4.5-5.36.4-4.5-4-1"}
                                    ]
                        }
                    ]
        }
    ]
}

/*******************************************************************************
 * ONLOAD FUNCTION
 *******************************************************************************/
$(document).ready(function() {
    setup();
    // Enable autosizing of all text areas
    $('textarea').autosize();

    // Enable as-you-type proving by adding a keyup event to the composition box
    $("#composition").trigger('keyup');

    // Enable the tabs
    $('#tabs').tabs();
});

// set the "methods" tab as the default one
$('#tabs a:first').trigger('click');

// enable tooltips
$('body').tooltip();

/*******************************************************************************
 * EVENT HANDLERS
 *******************************************************************************/
// Reset the user interface when stage changes
$('#methodRank').change(function() {
    setup();
});

$('#collectionChoice').change(function() {
    insertCollection(stage, $('option:selected', this).val());
    console.log($('option:selected', this).val());
});

// add a new method event handler
$("#searchMethod").click(displayMethodLibraryPage);

// Load the 'Insert new Method' menu
$('#moreMethods').click(function() {
    insertMethodBox("", "");
});

// add the method to the UI
$("#insertMethod").click(insertMethod);

// Display a warning when you try to use half lead calls (not implemented yet)
$('.callLocation').change(function() {
    displayMessage('Half-lead calls are not implemented yet');
});

// add event handler to composition box - on change, prove the composition
$("#composition").keyup(function() {
    prove();
});

// generate the composition from the shorthand
$("#generateShorthand").click(function() {
    // select the first method from the method list to be used for the shorthand
    var firstMethod = $('#methodList').children(':first-child');
    var mid = $(firstMethod[0]).attr('id');

    if (!mid) {
        displayMessage('No methods defined.');
        return false;
    }

    try {
        generateShorthand(mid.substr(6), [$('#symbol0').val(), $('#callNtn0').val()], [$('#symbol1').val(), $('#callNtn1').val()]);
        prove();
    } catch (e) {
        displayMessage(e, 'error');
    }
});

// add more call fields
$('#btnAddMoreCalls').click(function() {
    var children = $('#calls table tr').size() - 1;
    $('#calls table').append('<tr><td><input type="text" size="1" maxlength="1" name="symbol' + children + '" id="symbol' + children + '" value="" /></td><td><input type="text" size="3" name="callNtn' + children + '" id="callNtn' + children + '" value="" /></td><td><select class="callLocation" name="callLocation' + children + '" id="callLocation' + children + '"><option value="le">Lead End</option><option value="hl">Half Lead</option></select></td></tr>');
});

/*******************************************************************************
 * FUNCTIONS
 *******************************************************************************/
// reset the UI
function setup() {
    $('#methodList').html(""); // remove the method boxes
    stage = $('#methodRank').val();
    loadCollectionsForStage(stage);
    loadMusicForStage(stage);
}

// function to add a new input box into the method list section
function insertMethodBox(code, pn) {
    $('#methodList').append('<div id="method' + numberOfMethods + '"><input type="text" id="shortcut' + numberOfMethods + '" maxlength="1" size="1" value="' + code + '" /><input type="text" class="notation" id="notation' + numberOfMethods + '" value="' + pn + '" size="35" /><input type="button" value="&dash;" class="removeMethod btn btn-danger" onclick="removeParent(this);" /></div>');
    numberOfMethods++;
}

// insert the selected method into the methods list
function insertMethod() {
    var method_name = $("#methodSelect option:selected").text();
    var method_symbol = $("#methodSymbol").val();
    if (checkMethodLetterIsUnique(method_name.charAt(0), method_name, method_symbol)) {
        if (method_symbol == "") {
            insertMethodBox(method_name.charAt(0), $("#methodSelect").val());
        } else {
            insertMethodBox(method_symbol, $("#methodSelect").val());
        }
    }
    $('#popup').modal('hide');
}

// removes an element's parent from the dom
function removeParent(me) {
    $(me).parent().remove();
}

// checks if a letter is unique - gives an error if not.
function checkMethodLetterIsUnique(letter, method_name, method_symbol) {
    // trawl through the DOM to find matching methods
    var is_unique = true;
    for (i = 0; i < numberOfMethods; i++) {
        if (method_symbol == "") {
            if ($('#shortcut' + i).val() === letter) {
                is_unique = false;
            }
        } else {
            if ($('#shortcut' + i).val() === method_symbol) {
                is_unique = false;
            }
        }
        if (is_unique === false) {
            displayMessage("A method with shortcut <strong>" + letter + "</strong> already exists. " + method_name + " has not been added.");
            return is_unique;
            break;
        }
    }
    return is_unique;
}

// Load some default methods for the particular stage (just for examples)
function loadMethodsForStage(stage) {
    switch (stage) {
        case '6':
            insertMethodBox("C", "-3-4-2-3-4-5,2");
            break;

        case '8':
            loadCollectionsForStage(stage);
            break;

        case '10':
            insertMethodBox("B", "-5-4.5-5.36.4-7.58.6-6.7-6-1,1");
            insertMethodBox("C", "-3-4-25-36-47-58-6-7-8-9,2");
            insertMethodBox("Y", "-3-4-5-6-27-38-4-5-6-9,2");
            break;

        case '12':
            insertMethodBox("C", "-3-4-25-36-47-58-69-70-8-9-0-E,2");
            insertMethodBox("N", "-3-4-5-6-7-8-9-0-8-9-70-E,2");
            insertMethodBox("Y", "-3-4-5-6-27-38-49-50-6-7-8-E,2");
            break;
    }
}

/**
 * Returns a list of method collections for this particular stage
 * @param string stage
 * @returns array of Collection objects
 */
function getCollectionsForStage(stage) {
    for (var i = 0; i < collections.collections.length; i++) {
        if (collections.collections[i].stage === stage) {
            return collections.collections[i].collections;
        }
    }

    return false;
}

/**
 * Loads the collections associated with this particular stage into a drop-down
 */
function loadCollectionsForStage(stage) {
    stageCollections = getCollectionsForStage(stage);
    options = '<select name="collection">';
    for (var i = 0; i < stageCollections.length; i++) {
        options += '<option value="' + stageCollections[i].key + '">' + stageCollections[i].name + '</option>';
    }
    options += '</select>';
    $('#collectionChoice').html(options);
}

/**
 * Adds the methods associated with a particular 'collection', e.g. std 8
 */
function insertCollection(stage, key) {
    stageCollections = getCollectionsForStage(stage);
    $('#methodList').html("");
    for (var i = 0; i < stageCollections.length; i++) {
        if (stageCollections[i].key === key) {
            for (var j = 0; j < stageCollections[i].methods.length; j++) {
                insertMethodBox(stageCollections[i].methods[j].key, stageCollections[i].methods[j].notation);
            }
        }
    }
}

/**
 * Applies some default music for this stage
 */
function loadMusicForStage(stage) {
    $.get('music/' + stage, function(data) {
        $('#userMusicList').val(data).trigger('autosize.resize');
    }, 'text');
}

/**
 * Prove the composition
 */
function prove() {
    try {
        res = do_prove();

        if (res.trueTouch === true) {
            if (res.complete === true) {
                messageType = 'success';
            } else {
                messageType = 'info';
            }
        } else {
            messageType = 'error';
        }

        /*        displayMessage(res.status, messageType);*/
        $('#results').html(res.status).attr('class', messageType);
        $('#music').html(res.music);
        $('#courseEnds').html(res.courses);
        $('#atw pre').html(res.atw);
        $('#com').html(res.com + ' changes of method');
    } catch (e) {
        displayMessage(e, 'error');
    }
}

/**
 * Load the methods from the method file
 */
function displayMethodLibraryPage() {
    var method_file = $('#class').val() + $('#methodRank').val();
    loadMethods(method_file);
}

/**
 * Display the Load Method from File box
 */
function loadMethods(file) {
    $.get('lib/' + file, function(data) {
        var methods = "<label for=\"methodSymbol\">Shortcut</label><input type=\"text\" size=\"2\" maxlength=\"1\" name=\"methodSymbol\" id=\"methodSymbol\" />";
        methods += "<select name=\"method\" id=\"methodSelect\">";
        var m = data.split("\n");
        for (i = 1; i < m.length; i++) {
            var n = m[i].split(" ");
            methods += "<option value='" + n[1] + " " + n[2] + "'>" + n[0] + "</option>"
        }
        methods += "</select>";

        $('#popup .modal-body').html(methods);
        $('#popup').modal();
    }, "text");
}

/**
 * Display a message
 * @param message
 * @param level
 * @param timeout
 */
function displayMessage(message, level, timeout) {
    if (level === undefined) {
        level = 'error';
    }
    if (timeout === undefined) {
        timeout = 1000;
    }
    $('#alert').attr('class', 'alert alert-' + level);
    $('#alert div').html(message);
    $('#alert').fadeIn('slow').delay(timeout).fadeOut('slow');
}
