/* VARIABLES */
var numberOfMethods = 0; // the number of method input boxes (i.e. methods in current composition)
var stage = $('#methodRank').val();

/* ONLOAD function */
$(document).ready(function() {
    setup();

    $("textarea").elastic();

    $("#composition").trigger('keyup');

    checkLiveProve();

    $("#tabs").tabs();
});

/* EVENT HANDLERS */
// Replace 'x' in place notation with '-'
$(".notation").blur(function() {
    var not = $(this).val();
    not = not.replace(/x/g, '-');
    $(this).val(not);
});

// Reset the user interface when stage changes
$('#methodRank').change(function () {
    setup();
});

// add a new method event handler
$("#searchMethod").click(displayMethodLibraryPage);

// Load the 'Insert new Method' menu
$('#moreMethods').click(function(){
    insertMethodBox("", "");
});

// add the method to the UI
$("#insertMethod").click(insertMethod);

// enable / disable live proving
$("#liveProve").click(checkLiveProve);

// click the prove button
$("#prove").click(prove);

$('.callLocation').change(function() {
    displayWarning('Half-lead bobs are not implemented yet');
});

// generate the composition from the shorthand
$("#generateShorthand").click(function() {
    var firstMethod = $('#methodList').children(':first-child');
    var mid = $(firstMethod[0]).attr('id');
    if(!mid) {
        displayWarning('No methods defined.');
    } else {
        generateShorthand(mid.substr(6), [$('#symbol0').val(), $('#callNtn0').val()], [$('#symbol1').val(), $('#callNtn1').val()]);
        // displayWarning('This feature is still experimental. Check the output in the composition box looks correct', 3000);
        prove();
    }
});

// add more call fields
$('#btnAddMoreCalls').click(function() {
    var children=$('#calls table tr').size() - 1;
    $('#calls table').append('<tr><td><input type="text" size="1" maxlength="1" name="symbol'+children+'" id="symbol'+children+'" value="" /></td><td><input type="text" size="3" name="callNtn'+children+'" id="callNtn'+children+'" value="" /></td><td><select class="callLocation" name="callLocation'+children+'" id="callLocation'+children+'"><option value="le">Lead End</option><option value="hl">Half Lead</option></select></td></tr>');
});

/* FUNCTIONS */
// reset the UI
function setup() {
    $('#methodList').html(""); // remove the method boxes
    stage = $('#methodRank').val();
    loadMethodsForStage(stage);
    loadMusicForStage(stage);
}

// function to add a new input box into the method list section
function insertMethodBox(code, pn) {
    $('#methodList').append('<div id="method' + numberOfMethods + '"><input type="text" id="shortcut' + numberOfMethods + '" maxlength="1" size="1" value="'+code+'" /><input type="text" class="notation" id="notation' + numberOfMethods + '" value="'+pn+'" size="35" /><input type="button" value="&dash;" class="removeMethod" onclick="removeParent(this);" /></div>');
    numberOfMethods++;
}

// insert the selected method into the methods list
function insertMethod() {
    var method_name = $("#methodSelect option:selected").text();
    var method_symbol = $("#methodSymbol").val();
    if(checkMethodLetterIsUnique(method_name.charAt(0), method_name, method_symbol)) {
        if(method_symbol == "") {
            insertMethodBox(method_name.charAt(0), $("#methodSelect").val());
        } else {
            insertMethodBox(method_symbol, $("#methodSelect").val());
        }
    }
    closePopup();
}

// removes an element's parent from the dom
function removeParent(me) {
    $(me).parent().remove();
}

// either enable live proving or disable it and give a prove button
function checkLiveProve() {
    if($('#liveProve').attr('checked')) {
        $('#composition').keyup(function() {
            prove();
        });
        $('#prove').hide();
    } else {
        $('#composition').unbind('keyup');
        $('#prove').show();
    }
}

// checks if a letter is unique - gives an error if not.
function checkMethodLetterIsUnique(letter, method_name, method_symbol) {
    // trawl through the DOM to find matching methods
    var is_unique = true;
    for(i = 0; i < numberOfMethods; i++) {
        if(method_symbol == "") {
            if($('#shortcut'+i).val() === letter) {
                is_unique = false;
            }
        } else {
            if($('#shortcut'+i).val() === method_symbol) {
                is_unique = false;
            }
        }
        if(is_unique === false) {
            displayWarning("A method with shortcut <strong>" + letter + "</strong> already exists. " + method_name + " has not been added.");
            return is_unique;
            break;
        }
    }
    return is_unique;
}

function loadMethodsForStage(stage) {
    switch (stage) {
        case '6':
            insertMethodBox("C", "-3-4-2-3-4-5,2");
            break;

        case '8':
            insertMethodBox("Y", "-3-4-5-6-2-3-4-7,2");
            insertMethodBox("S", "-36-4-5-36-4-5-36-7,2");
            insertMethodBox("B", "-5-4.5-5.36.4-4.5-4-1,1");
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
 * Applies some default music for this stage
 */
function loadMusicForStage(stage) {
    $.get('music/'+stage, function(data) {
        $('#userMusicList').val(data);
    }, 'text');
}

function prove() {
    try {
        res = do_prove();
    } catch (e) {
        res = "Error: " + e;
    }
    $('#results').html(res[0]);
    $('#music').html(res[1]);
    $('#courseEnds').html(res[2]);
    $('#atw pre').html(res[3]);
    $('#com').html(res[4] + ' changes of method');
}

function displayMethodLibraryPage() {
    var method_file = $('#class').val() + $('#methodRank').val();
    loadMethods(method_file);
}

function loadMethods(file) {
    $.get('lib/'+file, function(data) {
        var methods = "<label for=\"methodSymbol\">Shortcut</label><input type=\"text\" size=\"2\" maxlength=\"1\" name=\"methodSymbol\" id=\"methodSymbol\" />";
        methods += "<select name=\"method\" id=\"methodSelect\">";
        var m = data.split("\n");
        for(i=1; i<m.length; i++) {
            var n = m[i].split(" ");
            methods += "<option value='"+n[1]+" "+n[2]+"'>" + n[0] + "</option>"
        }
        methods += "</select><input type=\"button\" id=\"insertMethod\" value=\"Insert Method\" onclick=\"insertMethod();\" />";

        $('#popup').html(methods + "<span style=\"float:right\"><a href=\"javascript:closePopup();\">close</a></span>");
        $('#popup').fadeIn('slow');
    }, "text");
}

function displayWarning(warning, timeout) {
    if(timeout === undefined) {
        timeout = 2000;
    }
    $('#warning div').html(warning);
    $('#warning').fadeIn('slow').delay(timeout).fadeOut('slow');
}

function hideWarning() {
    $('#warning').fadeOut('slow');
}

function closePopup() {
    $('#popup').fadeOut('slow');
}
