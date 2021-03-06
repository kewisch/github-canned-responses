(function() {
  "use strict";
  var answers;

  // This following code is taken from
  // https://github.com/thieman/github-selfies/blob/master/chrome/selfie.js
  var allowedPaths = [
    // New issues
    /github.com\/[\w\-]+\/[\w\-]+\/issues\/new/,
    // Existing issues (comment)
    /github.com\/[\w\-]+\/[\w\-]+\/issues\/\d+/,
    // New pull request
    /github.com\/[\w\-]+\/[\w\-]+\/compare/,
    // Existing pull requests (comment)
    /github.com\/[\w\-]+\/[\w\-]+\/pull\/\d+/
  ];

  // Inject the code from fn into the page, in an IIFE.
  function inject(fn) {
    var script = document.createElement('script');
    var parent = document.documentElement;
    script.textContent = '('+ fn +')();';
    parent.appendChild(script);
    parent.removeChild(script);
  }

  // Post a message whenever history.pushState is called. GitHub uses
  // pushState to implement page transitions without full page loads.
  // This needs to be injected because content scripts run in a sandbox.
  inject(function() {
    var pushState = history.pushState;
    history.pushState = function on_pushState() {
      window.postMessage('extension:pageUpdated', '*');
      return pushState.apply(this, arguments);
    };
    var replaceState = history.replaceState;
    history.replaceState = function on_replaceState() {
      window.postMessage('extension:pageUpdated', '*');
      return replaceState.apply(this, arguments);
    };
  });

  // Do something when the extension is loaded into the page,
  // and whenever we push/pop new pages.
  window.addEventListener("message", function(event) {
    if (event.data === 'extension:pageUpdated') {
      addAnswerButton();
    }
  });

  window.addEventListener("popstate", load);
  load();

  // End of code from https://github.com/thieman/github-selfies/blob/master/chrome/selfie.js

  function load() {
    chrome.runtime.sendMessage('load', function(response) {
      answers = response.answers;
      addAnswerButton();
    });
  }

  function any(array, predicate) {
    for (var i = 0; i < array.length; i++) {
      if (predicate(array[i])) {
        return true;
      }
    }
    return false;
  }

  function addAnswerButton() {
    if (!any(allowedPaths, (path) => path.test(window.location.href))) {
      // NOPE.
      return;
    }

    // If there's already a button nuke it so we can start fresh.
    var existingButtons = document.querySelectorAll('.github-canned-response-item');
    if (existingButtons && existingButtons.length !== 0) {
      for (var i = 0; i < existingButtons.length; i++) {
        existingButtons[i].parentNode.removeChild(existingButtons[i]);
      }
    }

    var targets = document.querySelectorAll('.js-toolbar.toolbar-commenting');

    for (var i = 0; i < targets.length; i++) {
      var target = createNodeWithClass('div', 'toolbar-group github-canned-response-item');
      targets[i].insertBefore(target, targets[i].childNodes[0]);

      var item = createNodeWithClass('div', 'select-menu js-menu-container js-select-menu label-select-menu');
      target.appendChild(item);

      var button = createButton();
      item.appendChild(button);

      if (targets[i]) {
        var dropdown = createDropdown(answers, targets[i]);
        item.appendChild(dropdown);
      }
    }
  }

  function createNodeWithClass(nodeType, className) {
    var element = document.createElement(nodeType);
    element.className = className;
    return element;
  }

  function createButton() {
    var button = createNodeWithClass('button', 'toolbar-item tooltipped tooltipped-n js-menu-target menu-target');

    button.setAttribute('aria-label', 'Insert canned response');
    button.style.display = 'inline-block';

    //var text = document.createTextNode('Canned Response');
    //button.appendChild(text);

    // Github just shipped svg icons, so this doesn't work anymore.
    //var span = createNodeWithClass('span', 'octicon octicon-mail-read');
    //button.appendChild(span);
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'octicon octicon-mail-read');
    svg.style.height = 18;
    svg.style.width = 16;
    svg.setAttribute('viewBox', '0 0 18 16');

    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttributeNS(null, 'd', "M6 5H4v-1h2v1z m3 1H4v1h5v-1z m5-0.48v8.48c0 0.55-0.45 1-1 1H1c-0.55 0-1-0.45-1-1V5.52c0-0.33 0.16-0.63 0.42-0.81l1.58-1.13v-0.58c0-0.55 0.45-1 1-1h1.2L7 0l2.8 2h1.2c0.55 0 1 0.45 1 1v0.58l1.58 1.13c0.27 0.19 0.42 0.48 0.42 0.81zM3 7.5l4 2.5 4-2.5V3H3v4.5zM1 13.5l4.5-3L1 7.5v6z m11 0.5L7 11 2 14h10z m1-6.5L8.5 10.5l4.5 3V7.5z");
    svg.appendChild(path);

    button.appendChild(svg);
    var span = createNodeWithClass('span', 'dropdown-caret');
    button.appendChild(span);

    return button;
  }

  function createDropdown(answers, toolbar) {
    // This should use the fuzzy search instead (see labels)
    var outer = createNodeWithClass('div', 'select-menu-modal-holder js-menu-content js-navigation-container');
    var inner = createNodeWithClass('div', 'select-menu-modal');
    outer.appendChild(inner);

    var header = createNodeWithClass('div', 'select-menu-header');
    var headerText = createNodeWithClass('span', 'select-menu-title');
    headerText.innerHTML = 'Insert response';
    header.appendChild(headerText);
    inner.appendChild(header);

    var main = createNodeWithClass('div', 'js-select-menu-deferred-content');
    inner.appendChild(main);

    var filter = createNodeWithClass('div', 'select-menu-filters');
    var filterText = createNodeWithClass('div', 'select-menu-text-filter');
    var filterInput = createNodeWithClass('input', 'js-filterable-field js-navigation-enable form-control');
    filterInput.id = 'canned-response-filter-field';
    filterInput.type = 'text';
    filterInput.placeholder = 'Filter responses';
    filterInput.autocomplete = 'off';
    filterInput.setAttribute('aria-label', 'Type or choose an answer');

    filterText.appendChild(filterInput);
    filter.appendChild(filterText);
    main.appendChild(filter);

    var itemList = createNodeWithClass('div', 'select-menu-list');
    itemList.setAttribute('data-filterable-for', 'canned-response-filter-field');
    itemList.setAttribute('data-filterable-type', 'fuzzy');

    main.appendChild(itemList);

    for (var i = 0; i < answers.length; i++) {
      var item = createDropdownItem(answers[i].name);
      itemList.appendChild(item);
      item.toolbar = toolbar;
      item.answer = answers[i].description;
      item.addEventListener('click', insertAnswer);

      // Gigantic hack because the PR page is not setting up mouse events correctly.
      item.addEventListener('mouseenter', function() {
        this.className += ' navigation-focus';
      });
      item.addEventListener('mouseleave', function() {
        this.className = this.className.replace(/ navigation-focus/g, '');
      });
    }

    return outer;
  }

  function createDropdownItem(text) {
    var item = createNodeWithClass('div', 'select-menu-item js-navigation-item');
    item.textContent = text;
    return item;
  }

  function insertAnswer(event) {
    var item = event.target;
    var textarea = item.toolbar.parentNode.parentNode.querySelector('textarea');
    textarea.value += item.answer + '\n';

    // Scroll down.
    textarea.focus();
    textarea.scrollTop = textarea.scrollHeight;
  }
})();
