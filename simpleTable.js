class SimpleTable {
  static pluginTitle = "wmSimpleTable";
  static defaultSettings = {
    demo: "value",
    layout: "horizontal",
    mobileLayout: "overflow",
    itemsPerPage: 12,
    showPagination: false,
    dualTitle: false,
    stylePreset: "simple",
  };
  static get userSettings() {
    return window["wmSimpleTableSettings"] || {};
  }
  constructor(el) {
    this.el = el;

    this.loadingState = "building";

    this.settings = this.deepMerge(
      {},
      SimpleTable.defaultSettings,
      SimpleTable.userSettings,
      this.instanceSettings
    );

    this.tableData = [];
    this.init();
  }
  async init() {
    const self = this;
    this.emitEvent("wmSimpleTable:beforeInit", self);
    this.parseTableData();
    this.buildStructure();
    this.loadingState = "built";
    this.emitEvent("wmSimpleTable:afterInit", self);
  }

  buildStructure() {
    this.plugin = document.createElement("div");
    this.plugin.classList.add("wm-simple-table");
    this.plugin.setAttribute("data-wm-plugin", "simple-table");

    this.el.insertAdjacentElement("afterend", this.plugin);

    this.tableWrapper = document.createElement("div");
    this.tableWrapper.classList.add("table-wrapper");

    this.table = document.createElement("table");
    this.table.classList.add("wm-table");

    this.plugin.append(this.tableWrapper);
    this.tableWrapper.append(this.table);

    this.mobileView = document.createElement('div');
    this.mobileView.classList.add('wm-table-mobile-view');
    this.plugin.appendChild(this.mobileView);

    if (this.settings.dualTitle) {
      this.plugin.classList.add("dual-title");
    }

    if (this.settings.stylePreset === "simple") {
      console.log("working");
      this.plugin.classList.add("simple-layout");
    }

    if (this.settings.layout === "horizontal") {
      this.createHorizontalLayout();
    } else if (this.settings.layout === "vertical") {
      this.createVerticalLayout();
      this.tableWrapper.classList.add("vertical-view");
    } else if (this.settings.layout === "select") {
      this.createSelectView();
      this.settings.mobileLayout = '';
      this.plugin.classList.add('desktop-select');
    }

  if (this.settings.mobileLayout === 'stack') {
      this.createStackView();
    } else if (this.settings.mobileLayout === 'select') {
        this.createSelectView();
      } else if (this.settings.mobileLayout === 'overflow') {
          this.tableWrapper.classList.add("mobile-overflow");
      }

    // Create pagination if enabled
    if (this.settings.showPagination) {
      this.paginationWrapper = document.createElement('div');
      this.paginationWrapper.classList.add('wm-table-pagination');
      this.plugin.appendChild(this.paginationWrapper);
      
      this.currentPage = 1;  // Start on page 1
      this.updatePagination();  // Initialize pagination
    }
  }

  parseTableData() {
  this.tableTitles = this.el.querySelector("TableHeaders")
    .textContent
    .split('|')
    .map(title => title.trim());

  const items = this.el.querySelectorAll("TableRow");
  this.tableData = Array.from(items).map(item => {
    const values = item.textContent.split('|').map(val => val.trim());
    return this.tableTitles.reduce((obj, title, index) => {
      obj[title] = {
        text: values[index],
        element: this.parseTextWithLinks(values[index])
      };
      return obj;
    }, {});
  });
}
  
  parseTextWithLinks(text) {
  const linkRegex = /(.*?)\s*\[href="([^"]+)"\]/;
  const match = text.match(linkRegex);
  
  if (match) {
    const [, value, href] = match;
    const link = document.createElement('a');
    link.href = href;
    link.textContent = value.trim();
    return link;
  }
  
  return document.createTextNode(text);
}
  
  updatePagination() {
  if (!this.settings.showPagination) return;
  
  const totalItems = this.tableData.length;
  const itemsPerPage = this.settings.itemsPerPage;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  this.paginationWrapper.innerHTML = '';
  
  if (totalPages <= 1) {
    this.showAllRows();
    return;
  }

  // Create pagination controls
  const paginationControls = document.createElement('div');
  paginationControls.classList.add('pagination-controls');

  const prevButton = document.createElement('button');
  prevButton.classList.add('pagination-btn', 'prev-btn');
  prevButton.innerHTML = '←';
  prevButton.disabled = this.currentPage === 1;
  prevButton.addEventListener('click', () => this.changePage(this.currentPage - 1));

  const nextButton = document.createElement('button');
  nextButton.classList.add('pagination-btn', 'next-btn');
  nextButton.innerHTML = '→';
  nextButton.disabled = this.currentPage === totalPages;
  nextButton.addEventListener('click', () => this.changePage(this.currentPage + 1));

  const pageNumbers = document.createElement('div');
  pageNumbers.classList.add('page-numbers');

  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement('button');
    pageButton.classList.add('page-number');
    if (i === this.currentPage) pageButton.classList.add('active');
    pageButton.textContent = i;
    pageButton.addEventListener('click', () => this.changePage(i));
    pageNumbers.appendChild(pageButton);
  }

  paginationControls.appendChild(prevButton);
  paginationControls.appendChild(pageNumbers);
  paginationControls.appendChild(nextButton);
  this.paginationWrapper.appendChild(paginationControls);

  this.updateRowVisibility();
}

  showAllRows() {
  const rows = this.getTableRows();
  rows.forEach(row => row.style.display = '');
}

  getTableRows() {
  if (this.settings.layout === "horizontal") {
    return Array.from(this.table.querySelectorAll('tr')).slice(1); // Skip header
  } else if (this.settings.layout === "vertical") {
    return Array.from(this.table.querySelectorAll('tr'));
  }
  return [];
}

  getPaginatedElements() {
  if (this.settings.layout === "horizontal") {
    return Array.from(this.table.querySelectorAll('tr')).slice(1); // Skip header row
  } else if (this.settings.layout === "vertical") {
    return Array.from(this.table.querySelectorAll('tr')).map(row => 
      Array.from(row.querySelectorAll('td'))
    ).reduce((acc, curr) => acc.concat(curr), []); // Get all td elements
  }
  return [];
}
  
  updateRowVisibility() {
  const start = (this.currentPage - 1) * this.settings.itemsPerPage;
  const end = start + this.settings.itemsPerPage;

  if (this.settings.layout === "horizontal") {
    const rows = this.getPaginatedElements();
    rows.forEach((row, index) => {
      row.style.display = (index >= start && index < end) ? '' : 'none';
    });
  } else if (this.settings.layout === "vertical") {
    const rows = this.table.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      cells.forEach((cell, cellIndex) => {
        cell.style.display = (cellIndex >= start && cellIndex < end) ? '' : 'none';
      });
    });
  }

  if (this.settings.mobileLayout === 'stack') {
    const cards = this.mobileView.querySelectorAll('.wm-table-stack-card');
    cards.forEach((card, index) => {
      card.style.display = (index >= start && index < end) ? '' : 'none';
    });
  }
}

  changePage(newPage) {
  this.currentPage = newPage;
  this.updatePagination();
}

  createHorizontalLayout() {
  const headerRow = document.createElement('tr');
  this.tableTitles.forEach(title => {
    const th = document.createElement('th');
    th.appendChild(this.parseTextWithLinks(title));
    headerRow.appendChild(th);
  });
  this.table.appendChild(headerRow);

  this.tableData.forEach(item => {
    const row = document.createElement('tr');
    this.tableTitles.forEach(title => {
      const td = document.createElement('td');
      td.appendChild(item[title].element.cloneNode(true));
      row.appendChild(td);
    });
    this.table.appendChild(row);
  });
}

  createVerticalLayout() {
  this.tableTitles.forEach(title => {
    const row = document.createElement('tr');
    
    const th = document.createElement('th');
    th.appendChild(this.parseTextWithLinks(title));
    row.appendChild(th);

    this.tableData.forEach(item => {
      const td = document.createElement('td');
      td.appendChild(item[title].element.cloneNode(true));
      row.appendChild(td);
    });

    this.table.appendChild(row);
  });
}

  createStackView() {
  this.mobileView.innerHTML = '';
  this.mobileView.classList.add('wm-table-stack-view');
  
  this.tableData.forEach(item => {
    const card = document.createElement('div');
    card.classList.add('wm-table-stack-card');

    this.tableTitles.forEach(title => {
      const row = document.createElement('div');
      row.classList.add('wm-table-stack-row');

      const titleEl = document.createElement('div');
      titleEl.classList.add('wm-table-stack-title');
      titleEl.appendChild(this.parseTextWithLinks(title));

      const valueEl = document.createElement('div');
      valueEl.classList.add('wm-table-stack-value');
      valueEl.appendChild(item[title].element.cloneNode(true));

      row.appendChild(titleEl);
      row.appendChild(valueEl);
      card.appendChild(row);
    });

    this.mobileView.appendChild(card);
  });
}

  createSelectView() {
    this.mobileView.innerHTML = '';
    this.mobileView.classList.add('wm-table-select-view');
    
    // Create structure
    const structure = this.createSelectViewStructure();
    this.mobileView.appendChild(structure.navigationContainer);
    this.mobileView.appendChild(structure.resultsContainer);
    
    // Store elements for later use
    this.elements = structure.elements;
    
    // Get unique values for the first column
    const firstTitle = this.tableTitles[0];
    const uniqueValues = [...new Set(this.tableData.map(item => item[firstTitle].text))];
    
    // Add options and bind events
    this.populateSelectOptions(uniqueValues, firstTitle);
    this.bindDropdownEvents();
    
    // Show initial card
    this.showCard(uniqueValues[0]);
  }

  createSelectViewStructure() {
    const navigationContainer = document.createElement('div');
    navigationContainer.classList.add('select-navigation-container');

    const selectNavigation = document.createElement('div');
    selectNavigation.classList.add('select-navigation');

    const selectButton = document.createElement('button');
    selectButton.classList.add('select-button');
    
    const selectButtonText = document.createElement('span');
    selectButtonText.classList.add('select-button-text');

    const selectItemsWrapper = document.createElement('div');
    selectItemsWrapper.classList.add('select-items-wrapper');

    const resultsContainer = document.createElement('div');
    resultsContainer.classList.add('results-container');

    // Assemble the structure
    selectButton.appendChild(selectButtonText);
    selectButton.insertAdjacentHTML('beforeend', `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="select-icon">
        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    `);

    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('select-button-container');
    buttonContainer.appendChild(selectButton);

    const itemsContainer = document.createElement('div');
    itemsContainer.classList.add('select-items-container');
    itemsContainer.appendChild(selectItemsWrapper);

    selectNavigation.appendChild(buttonContainer);
    selectNavigation.appendChild(itemsContainer);
    navigationContainer.appendChild(selectNavigation);

    return {
      navigationContainer,
      resultsContainer,
      elements: {
        selectNavigation,
        selectButton,
        selectButtonText,
        selectItemsWrapper,
        resultsContainer
      }
    };
  }

  populateSelectOptions(uniqueValues, firstTitle) {
    const firstValue = uniqueValues[0];
    if (this.settings.dualTitle) {
        this.elements.selectButtonText.textContent = `${firstValue}`;
    } else {
      this.elements.selectButtonText.textContent = `${firstTitle}: ${firstValue}`;;
      }

    uniqueValues.forEach(value => {
      const item = document.createElement('button');
      item.classList.add('select-item');
      item.dataset.value = value;
      item.textContent = value;
      if (value === firstValue) {
        item.classList.add('selected');
      }
      this.elements.selectItemsWrapper.appendChild(item);
    });
  }

  bindDropdownEvents() {
    this.elements.selectButton.addEventListener('click', () => {
      this.elements.selectNavigation.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!this.elements.selectNavigation.contains(e.target)) {
        this.elements.selectNavigation.classList.remove('open');
      }
    });

    this.elements.selectItemsWrapper.addEventListener('click', (e) => {
      const item = e.target.closest('.select-item');
      if (!item) return;

      const selectedValue = item.dataset.value;
      if (this.settings.dualTitle) {
        this.elements.selectButtonText.textContent = `${selectedValue}`;
    } else {
      this.elements.selectButtonText.textContent = `${this.tableTitles[0]}: ${selectedValue}`;
      }
      this.elements.selectNavigation.classList.remove('open');
      this.showCard(selectedValue);
    });
  }

  showCard(selectedValue) {
  const resultsContainer = this.elements.resultsContainer;
  resultsContainer.innerHTML = '';

  const matchingItem = this.tableData.find(item => item[this.tableTitles[0]].text === selectedValue);
  
  if (matchingItem) {
    const card = document.createElement('div');
    card.classList.add('data-card');

    this.tableTitles.forEach(title => {
      const row = document.createElement('div');
      row.classList.add('card-row');
      
      const label = document.createElement('div');
      label.classList.add('card-label');
      label.appendChild(this.parseTextWithLinks(title));

      const valueEl = document.createElement('div');
      valueEl.classList.add('card-value');
      valueEl.appendChild(matchingItem[title].element.cloneNode(true));

      row.appendChild(label);
      row.appendChild(valueEl);
      card.appendChild(row);
    });

    resultsContainer.appendChild(card);
  }
}

  deepMerge(...objs) {
    function getType(obj) {
      return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
    }
    function mergeObj(clone, obj) {
      for (let [key, value] of Object.entries(obj)) {
        let type = getType(value);
        if (type === "object" || type === "array") {
          if (clone[key] === undefined) {
            clone[key] = type === "object" ? {} : [];
          }
          mergeObj(clone[key], value); // Corrected recursive call
        } else if (type === "function") {
          clone[key] = value; // Directly reference the function
        } else {
          clone[key] = value;
        }
      }
    }
    if (objs.length === 0) {
      return {};
    }
    let clone = {};
    objs.forEach(obj => {
      mergeObj(clone, obj);
    });
    return clone;
  }

  get instanceSettings() {
    const dataAttributes = {};
    // Function to set value in a nested object based on key path
    const setNestedProperty = (obj, keyPath, value) => {
      const keys = keyPath.split("__");
      let current = obj;

      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          current[key] = this.parseAttr(value);
        } else {
          current = current[key] = current[key] || {};
        }
      });
    };

    for (let [attrName, value] of Object.entries(this.el.dataset)) {
      setNestedProperty(dataAttributes, attrName, value);
    }
    return dataAttributes;
  }
  parseAttr(string) {
    if (string === "true") return true;
    if (string === "false") return false;
    const number = parseFloat(string);
    if (!isNaN(number) && number.toString() === string) return number;
    return string;
  }
  emitEvent(type, detail = {}, elem = document) {
    // Make sure there's an event type
    if (!type) return;

    // Create a new event
    let event = new CustomEvent(type, {
      bubbles: true,
      cancelable: true,
      detail: detail,
    });

    // Dispatch the event
    return elem.dispatchEvent(event);
  }
}

(() => {
  function initSimpleTable() {
    const els = document.querySelectorAll(
      "SimpleTable:not([data-loading-state])"
    );

    if (!els.length) return;
    els.forEach(el => {
      el.dataset.loadingState = "loading";
      el.wmSimpleTable = new SimpleTable(el);
    });
  }
  window.wmSimpleTable = {
    init: () => initSimpleTable(),
  };
  window.wmSimpleTable.init();
})();
