/* eslint-disable no-undef */
/** *****************************************************************************
 * DECLARE FRONT-END VARIABLES
 *******************************************************************************/
let numberOfMethods = 0; // the number of method input boxes (i.e. methods in current composition)
let stage = $('#methodRank').val();

/** *****************************************************************************
 * ONLOAD FUNCTION
 *******************************************************************************/
$(document).ready(function() {
  setup();
  // Enable autosizing of all text areas
  autosize($('textarea'));

  // Enable as-you-type proving by adding a keyup event to the composition box
  $('#composition').trigger('keyup');
});

// set the "methods" tab as the default one
$('#tabs a:first').trigger('click');

// enable tooltips
$('body').tooltip();

/** *****************************************************************************
 * EVENT HANDLERS
 *******************************************************************************/
// Reset the user interface when stage changes
$('#methodRank').change(function() {
  setup();
});

$('#collectionChoice').change(function() {
  insertCollection(stage, $('option:selected', this).val());
});

// add a new method event handler
$('#searchMethod').click(displayMethodLibraryPage);

// Load the 'Insert new Method' menu
$('#moreMethods').click(function() {
  insertMethodBox('', '');
});

// add the method to the UI
$('#insertMethod').click(insertMethod);

// Display a warning when you try to use half lead calls (not implemented yet)
$('.callLocation').change(function() {
  displayMessage('Half-lead calls are not implemented yet');
});

// add event handler to composition box - on change, prove the composition
$('#composition').keyup(function() {
  prove();
});

// generate the composition from the shorthand
$('#generateShorthand').click(function() {
  // select the first method from the method list to be used for the shorthand
  const firstMethod = $('#methodList').children(':first-child');
  const mid = $(firstMethod[0]).attr('id');

  if (!mid) {
    displayMessage('No methods defined.');
    return false;
  }

  try {
    comp = generateShorthand(mid.substr(6), [$('#symbol0').val(), $('#callNtn0').val()], [$('#symbol1').val(), $('#callNtn1').val()]);
    $('#composition').val(comp);
    autosize.update($('#composition'));
    prove();
  } catch (e) {
    displayMessage(e, 'error');
  }
});

// add more call fields
$('#btnAddMoreCalls').click(function() {
  const children = $('#calls table tr').size() - 1;
  $('#calls table').append('<tr class="callRow"><td><input type="text" size="1" maxlength="1" class="callSymbol" name="symbol' + children + '" id="symbol' + children + '" value="" /></td><td><input type="text" size="3" class="callNtn" name="callNtn' + children + '" id="callNtn' + children + '" value="" /></td><td><select class="callLocation" name="callLocation' + children + '" id="callLocation' + children + '"><option value="le">Lead End</option><option value="hl">Half Lead</option></select></td></tr>');
});

/** *****************************************************************************
 * FUNCTIONS
 *******************************************************************************/

/**
 * Writes the DOM
 */
function setup() {
  $('#methodList').html(''); // remove the method boxes
  stage = $('#methodRank').val();
  loadCollectionsForStage(stage);
  loadMusicForStage(stage);
  insertCollection(stage, $('#collectionChoice option:selected').val());
}

/**
 * function to add a new input box into the method list section
 * @param {string} code Single character to represent a method
 * @param {string} pn Place notation
 */
function insertMethodBox(code, pn) {
  $('#methodList').append('<div id="method' + numberOfMethods + '" class="method form-row"><input type="text" id="shortcut' + numberOfMethods + '" maxlength="1" size="1" value="' + code + '" class="form-control col-sm-1" /><input type="text" class="notation form-control col-sm-10" id="notation' + numberOfMethods + '" value="' + pn + '" size="35" /><input type="button" value="&dash;" class="removeMethod btn btn-danger" onclick="removeParent(this);" /></div>');
  numberOfMethods++;
}

/**
 * insert the selected method into the methods list
 */
function insertMethod() {
  const methodName = $('#methodSelect option:selected').text();
  const methodSymbol = $('#methodSymbol').val();
  if (checkMethodLetterIsUnique(methodName.charAt(0), methodName, methodSymbol)) {
    if (methodSymbol === '') {
      insertMethodBox(methodName.charAt(0), $('#methodSelect').val());
    } else {
      insertMethodBox(methodSymbol, $('#methodSelect').val());
    }
  }
  $('#popup').modal('hide');
}

/**
 * removes an element's parent from the dom
 * @param {HTMLElement} me Thing who's parent to remove
 */
function removeParent(me) {
  $(me).parent().remove();
}

/**
 * checks if a letter is unique - gives an error if not.
 * @param {string} letter
 */
function checkMethodLetterIsUnique(letter, methodName, methodSymbol) {
  // trawl through the DOM to find matching methods
  let isUnique = true;
  for (let i = 0; i < numberOfMethods; i++) {
    if (methodSymbol == '') {
      if ($('#shortcut' + i).val() === letter) {
        isUnique = false;
      }
    } else {
      if ($('#shortcut' + i).val() === methodSymbol) {
        isUnique = false;
      }
    }
    if (isUnique === false) {
      displayMessage('A method with shortcut <strong>' + letter + '</strong> already exists. ' + methodName + ' has not been added.');
      return isUnique;
    }
  }
  return isUnique;
}

/**
 * Returns a list of method collections for this particular stage
 * @param string stage
 * @return array of Collection objects
 */
function getCollectionsForStage(stage) {
  for (let i = 0; i < collections.collections.length; i++) {
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
  options = '<select name="collection" class="form-control">';
  for (let i = 0; i < stageCollections.length; i++) {
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
  $('#methodList').html('');
  for (let i = 0; i < stageCollections.length; i++) {
    if (stageCollections[i].key === key) {
      for (let j = 0; j < stageCollections[i].methods.length; j++) {
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
    $('#userMusicList').val(data);
  }, 'text');
  autosize.update($('#userMusicList'));
}

/**
 * Prove the composition
 */
function prove() {
  try {
    const composition = get_composition();
    res = doProve(composition);

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
    $('#results').html(res.status).attr('class', 'text-' + messageType);
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
  const method_file = $('#class').val() + $('#methodRank').val();
  loadMethods(method_file);
}

/**
 * Display the Load Method from File box
 */
function loadMethods(file) {
  $.get('lib/' + file, function(data) {
    let methods = '';
    methods += '<select name="method" id="methodSelect" data-live-search="true" class="form-control">';
    const m = data.split('\n');
    for (i = 1; i < m.length; i++) {
      const n = m[i].split(' ');
      methods += '<option value=\'' + n[1] + ' ' + n[2] + '\'>' + n[0] + '</option>';
    }
    methods += '</select>';

    $('#methodDropDown').html(methods);
    $('#popup').modal();
    $('#methodSelect').selectpicker();
  }, 'text');
}

/**
 * Display a message
 * @param message
 * @param level
 * @param timeout
 */
function displayMessage(message, level, timeout) {
  console.log(message);
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
