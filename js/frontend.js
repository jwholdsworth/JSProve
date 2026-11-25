/* eslint-disable no-undef */
/** *****************************************************************************
 * DECLARE FRONT-END VARIABLES
 *******************************************************************************/
// the number of method input boxes (i.e. methods in current composition)
let numberOfMethods = 0;
let numberOfCalls = 0;
let alertTimer;
let musicRequest = 0;
let stage = document.getElementById('methodRank').value;

/** *****************************************************************************
 * ONLOAD FUNCTION
 *******************************************************************************/
document.addEventListener('DOMContentLoaded', function () {
  setup();

  prove();
});

// set the "methods" tab as the default one
bootstrap.Tab.getOrCreateInstance(document.querySelector('#tabs a')).show();

// enable tooltips
document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((element) => new bootstrap.Tooltip(element));

document.getElementById('closeAlert').addEventListener('click', function () {
  clearTimeout(alertTimer);
  document.getElementById('alert').classList.remove('show');
});

/** *****************************************************************************
 * EVENT HANDLERS
 *******************************************************************************/
// Reset the user interface when stage changes
document.getElementById('methodRank').addEventListener('change', function () {
  setup();
});

document.getElementById('collectionChoice').addEventListener('change', function () {
  insertCollection(stage, this.querySelector('select').value);
});

// add a new method event handler
document.getElementById('searchMethod').addEventListener('click', displayMethodLibraryPage);

// Load the 'Insert new Method' menu
document.getElementById('moreMethods').addEventListener('click', function () {
  insertMethodBox('', '');
});

// add the method to the UI
document.getElementById('insertMethod').addEventListener('click', insertMethod);

// Display a warning when you try to use half lead calls (not implemented yet)
document.querySelectorAll('.callLocation').forEach((element) => {
  element.addEventListener('change', function () {
    displayMessage('Half-lead calls are not implemented yet');
  });
});

// add event handler to composition box - on change, prove the composition
document.getElementById('composition').addEventListener('keyup', function () {
  prove();
});

// generate the composition from the shorthand
document.getElementById('generateShorthand').addEventListener('click', function () {
  // select the first method from the method list to be used for the shorthand
  const mid = document.getElementById('methodList').firstElementChild?.id;

  if (!mid) {
    displayMessage('No methods defined.');
    return;
  }

  try {
    const comp = generateShorthand(mid.substr(6), [document.getElementById('symbol0').value, document.getElementById('callNtn0').value], [document.getElementById('symbol1').value, document.getElementById('callNtn1').value]);
    document.getElementById('composition').value = comp;
    prove();
  } catch (e) {
    displayMessage(e.toString(), 'danger');
  }
});

// add more call fields
document.getElementById('btnAddMoreCalls').addEventListener('click', function () {
  insertCallBox('', '');
});

/** *****************************************************************************
 * FUNCTIONS
 *******************************************************************************/

/**
 * Writes the DOM
 */
function setup() {
  document.getElementById('methodList').replaceChildren(); // remove the method boxes
  stage = document.getElementById('methodRank').value;
  loadCollectionsForStage(stage);
  loadMusicForStage(stage);
  loadCalls();
  insertCollection(stage, document.querySelector('#collectionChoice select').value);
}

function insertCallBox(symbol, notation) {
  const callRow = `
    <div class="row g-2 mb-1 js-call" id="call${numberOfCalls}">
        <div class="col-2">
            <input class="form-control callSymbol" type="text" maxlength="1" name="symbol1"
                id="symbol${numberOfCalls}" placeholder="Symbol" />
        </div>
        <div class="col">
            <input class="form-control callNtn" type="text" name="callNtn${numberOfCalls}" id="callNtn${numberOfCalls}"
                placeholder="Notation" />
        </div>
        <div class="col-1">
            <input type="button" value="&dash;" class="removeCall btn btn-danger" onclick="removeElement('call${numberOfCalls}');" />
        </div>
    </div>
  `;
  const template = document.createElement('template');
  template.innerHTML = callRow.trim();
  const row = template.content.firstElementChild;
  row.querySelector('.callSymbol').value = symbol ?? '';
  row.querySelector('.callNtn').value = notation ?? '';
  document.getElementById('js-calls-form').append(row);
  numberOfCalls++;
}

/**
 * function to add a new input box into the method list section
 * @param {string} code Single character to represent a method
 * @param {string} pn Place notation
 */
function insertMethodBox(code, pn) {
  const methodRow = `
    <div id="method${numberOfMethods}" class="row g-2 js-method mb-1">
      <div class="col-2">
        <input type="text" class="js-shortcut form-control" id="shortcut${numberOfMethods}" maxlength="1" placeholder="Symbol" />
      </div>
      <div class="col">
        <input type="text" class="js-notation form-control" id="notation${numberOfMethods}" placeholder="Notation" />
      </div>
      <div class="col-1">
        <input type="button" value="&dash;" class="removeMethod btn btn-danger" onclick="removeElement('method${numberOfMethods}');" />
      </div>
    </div>
  `;
  const template = document.createElement('template');
  template.innerHTML = methodRow.trim();
  const row = template.content.firstElementChild;
  row.querySelector('.js-shortcut').value = code ?? '';
  row.querySelector('.js-notation').value = pn ?? '';
  document.getElementById('methodList').append(row);
  numberOfMethods++;
}

/**
 * insert the selected method into the methods list
 */
function insertMethod() {
  const method = document.getElementById('methodSelect').selectedOptions[0];
  if (!method) return;

  const methodName = method.textContent;
  const methodSymbol = document.getElementById('methodSymbol').value;
  if (checkMethodLetterIsUnique(methodName.charAt(0), methodName, methodSymbol)) {
    insertMethodBox(methodSymbol || methodName.charAt(0), method.value);
  }
  bootstrap.Modal.getOrCreateInstance(document.getElementById('popup')).hide();
}

/**
 * Removes a method from the Method List
 * @param {string} domId
 */
function removeElement(domId) {
  document.getElementById(domId).remove();
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
      if (document.getElementById('shortcut' + i)?.value === letter) {
        isUnique = false;
      }
    } else {
      if (document.getElementById('shortcut' + i)?.value === methodSymbol) {
        isUnique = false;
      }
    }
    if (isUnique === false) {
      displayMessage('That letter has already been used for a method. Please choose a different one.');
      return isUnique;
    }
  }
  return isUnique;
}

/**
 * Returns a list of method collections for this particular stage
 * @param {string} stage
 * @return {array} of Collection objects
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
 * @param {string} stage
 */
function loadCollectionsForStage(stage) {
  const stageCollections = getCollectionsForStage(stage);
  const select = document.createElement('select');
  select.name = 'collection';
  select.className = 'form-select';
  for (const collection of stageCollections) {
    select.add(new Option(collection.name, collection.key));
  }
  document.getElementById('collectionChoice').replaceChildren(select);
}

/**
 * Adds the methods associated with a particular 'collection', e.g. std 8
 */
function insertCollection(stage, key) {
  const stageCollections = getCollectionsForStage(stage);
  document.getElementById('methodList').replaceChildren();
  for (let i = 0; i < stageCollections.length; i++) {
    if (stageCollections[i].key === key) {
      for (let j = 0; j < stageCollections[i].methods.length; j++) {
        insertMethodBox(stageCollections[i].methods[j].key, stageCollections[i].methods[j].notation);
      }
    }
  }
}

function loadCalls() {
  calls.forEach((call) => {
    insertCallBox(call.symbol, call.notation);
  });
}

/**
 * Applies some default music for this stage
 */
async function loadMusicForStage(stage) {
  const request = ++musicRequest;
  try {
    const response = await fetch('music/' + stage);
    if (!response.ok) throw new Error('Unable to load default music');
    const data = await response.text();
    if (request === musicRequest) {
      document.getElementById('userMusicList').value = data;
    }
  } catch (error) {
    if (request === musicRequest) displayMessage(error.message, 'danger');
  }
}

/**
 * Prove the composition
 */
function prove() {
  try {
    const composition = get_composition();
    const res = doProve(composition);
    let messageType;

    if (res.trueTouch === true) {
      if (res.complete === true) {
        messageType = 'success';
      } else {
        messageType = 'info';
      }
    } else {
      messageType = 'danger';
    }

    const results = document.getElementById('results');
    results.textContent = res.status;
    results.className = 'text-' + messageType;
    document.getElementById('music').innerHTML = res.music;
    document.getElementById('courseEnds').textContent = res.courses;
    document.querySelector('#atw pre').textContent = res.atw;
    document.getElementById('com').textContent = res.com + ' changes of method';
  } catch (e) {
    displayMessage(e.toString(), 'danger');
  }
}

/**
 * Load the methods from the method file
 */
function displayMethodLibraryPage() {
  const method_file = document.getElementById('class').value + document.getElementById('methodRank').value;
  loadMethods(method_file);
}

/**
 * Display the Load Method from File box
 */
let libraryMethods = [];

const methodSearch = document.getElementById('methodSearch');
const methodSelect = document.getElementById('methodSelect');
const insertMethodButton = document.getElementById('insertMethod');

methodSearch.addEventListener('input', filterMethods);
methodSearch.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown' && methodSelect.options.length) {
    event.preventDefault();
    methodSelect.focus();
  }
});
methodSelect.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    insertMethod();
  }
});
document.getElementById('popup').addEventListener('shown.bs.modal', () => methodSearch.focus());

function filterMethods() {
  const query = methodSearch.value.trim().toLowerCase();
  const matches = libraryMethods.filter((method) => method.name.toLowerCase().includes(query));
  const options = document.createDocumentFragment();
  for (const method of matches) {
    options.append(new Option(method.name, method.notation));
  }
  methodSelect.replaceChildren(options);
  methodSelect.selectedIndex = matches.length ? 0 : -1;
  insertMethodButton.disabled = matches.length === 0;
  document.getElementById('methodSearchStatus').textContent =
    matches.length ? matches.length + ' matching methods' : 'No matching methods';
}

async function loadMethods(file) {
  try {
    const response = await fetch('lib/' + file);
    if (!response.ok) throw new Error('Unable to load method library');
    const data = await response.text();
    libraryMethods = data.split('\n').slice(1).filter((line) => line.trim()).map((line) => {
      const [name, group, notation] = line.trim().split(/\s+/);
      return {name, notation: group + ' ' + notation};
    });
    methodSearch.value = '';
    filterMethods();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('popup')).show();
  } catch (error) {
    displayMessage(error.message, 'danger');
  }
}

/**
 * Display a message
 * @param message
 * @param level
 * @param timeout
 */
function displayMessage(message, level, timeout) {
  console.warn(message);
  if (level === undefined) {
    level = 'danger';
  }
  if (timeout === undefined) {
    timeout = 2000;
  }
  const alert = document.getElementById('alert');
  clearTimeout(alertTimer);
  alert.className = 'alert alert-' + level + ' show';
  document.querySelector('#alert div').textContent = message;
  alertTimer = setTimeout(() => alert.classList.remove('show'), timeout + 600);
}
