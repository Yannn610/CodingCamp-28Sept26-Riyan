(function () {
  'use strict';

  /* =========================================================
     1. CONFIG & STORAGE KEYS
     ========================================================= */

  var STORAGE_KEY            = 'ebv_transactions';
  var STORAGE_KEY_CATEGORIES = 'ebv_categories';
  var STORAGE_KEY_LIMIT      = 'ebv_limit';
  var STORAGE_KEY_THEME      = 'ebv_theme';

  var DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

  var AMOUNT_MIN = 0.01;
  var AMOUNT_MAX = 999999999.99;

  /* =========================================================
     2. STORAGE HELPERS
     ========================================================= */

  function showStorageWarning() {
    var el = document.getElementById('storage-warning');
    if (el) { el.removeAttribute('hidden'); }
  }

  function storageGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch (e) {
      showStorageWarning();
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      showStorageWarning();
    }
  }

  /* =========================================================
     3. UTILITIES
     ========================================================= */

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function formatAmount(n) {
    return Number(n).toFixed(2);
  }

  function groupByCategory(txns) {
    var result = {};
    for (var i = 0; i < txns.length; i++) {
      var txn = txns[i];
      var cat = txn.category;
      var amt = isNaN(Number(txn.amount)) ? 0 : Number(txn.amount);
      if (Object.prototype.hasOwnProperty.call(result, cat)) {
        result[cat] += amt;
      } else {
        result[cat] = amt;
      }
    }
    return result;
  }

  /* =========================================================
     4. APPLICATION STATE
     ========================================================= */

  var transactions = [];
  var categories   = [];
  var spendingLimit = 0;   // 0 = no limit set
  var currentSort  = 'date'; // 'date' | 'amount' | 'category'

  /* =========================================================
     5. CATEGORY COLORS
     — fixed palette for defaults; extras get auto-assigned
     ========================================================= */

  var FIXED_COLORS = {
    Food:      '#FF6384',
    Transport: '#36A2EB',
    Fun:       '#FFCE56'
  };

  var PALETTE = [
    '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF',
    '#E7E9ED', '#71B37C', '#C45850', '#F7464A',
    '#46BFBD', '#FDB45C'
  ];

  var colorCache = {};

  function colorForCategory(cat) {
    if (FIXED_COLORS[cat]) { return FIXED_COLORS[cat]; }
    if (colorCache[cat])   { return colorCache[cat]; }
    var idx   = Object.keys(colorCache).length % PALETTE.length;
    colorCache[cat] = PALETTE[idx];
    return colorCache[cat];
  }

  /* =========================================================
     6. VALIDATOR
     ========================================================= */

  function validate(itemName, amount, category) {
    var errors = { itemName: null, amount: null, category: null };
    var valid  = true;

    if (typeof itemName !== 'string' || itemName.trim().length < 1) {
      errors.itemName = 'Item name is required';
      valid = false;
    } else if (itemName.trim().length > 100) {
      errors.itemName = 'Item name must be 100 characters or fewer';
      valid = false;
    }

    var numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < AMOUNT_MIN || numAmount > AMOUNT_MAX) {
      errors.amount = 'Amount must be a number between 0.01 and 999,999,999.99';
      valid = false;
    }

    if (categories.indexOf(category) === -1) {
      errors.category = 'Please select a valid category';
      valid = false;
    }

    return { valid: valid, errors: errors };
  }

  /* =========================================================
     7. TRANSACTIONS — CRUD
     ========================================================= */

  function sortedTransactions(txns) {
    var copy = txns.slice();
    if (currentSort === 'amount') {
      copy.sort(function (a, b) { return Number(b.amount) - Number(a.amount); });
    } else if (currentSort === 'category') {
      copy.sort(function (a, b) { return a.category.localeCompare(b.category); });
    } else {
      copy.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    }
    return copy;
  }

  function addTransaction(formData) {
    var txn = {
      id:        generateId(),
      itemName:  formData.itemName,
      amount:    formData.amount,
      category:  formData.category,
      timestamp: new Date().toISOString()
    };
    transactions.push(txn);
    storageSet(STORAGE_KEY, transactions);
    renderAll();
  }

  function deleteTransaction(id) {
    transactions = transactions.filter(function (txn) { return txn.id !== id; });
    storageSet(STORAGE_KEY, transactions);
    renderAll();
  }

  /* =========================================================
     8. CUSTOM CATEGORIES
     ========================================================= */

  function addCategory(name) {
    var trimmed = name.trim();
    if (!trimmed) { return 'Category name cannot be empty.'; }
    if (trimmed.length > 30) { return 'Category name must be 30 characters or fewer.'; }
    // Case-insensitive duplicate check
    var lower = trimmed.toLowerCase();
    for (var i = 0; i < categories.length; i++) {
      if (categories[i].toLowerCase() === lower) {
        return '"' + trimmed + '" already exists.';
      }
    }
    categories.push(trimmed);
    storageSet(STORAGE_KEY_CATEGORIES, categories);
    renderCategoryDropdown();
    renderCategoryTagList();
    return null; // no error
  }

  function deleteCategory(name) {
    // Disallow deleting a category that has transactions
    for (var i = 0; i < transactions.length; i++) {
      if (transactions[i].category === name) {
        return '"' + name + '" is used by existing transactions and cannot be removed.';
      }
    }
    categories = categories.filter(function (c) { return c !== name; });
    storageSet(STORAGE_KEY_CATEGORIES, categories);
    renderCategoryDropdown();
    renderCategoryTagList();
    return null;
  }

  /* =========================================================
     9. SPENDING LIMIT
     ========================================================= */

  function getTotalSpent() {
    var sum = 0;
    for (var i = 0; i < transactions.length; i++) {
      var amt = Number(transactions[i].amount);
      sum += isNaN(amt) ? 0 : amt;
    }
    return sum;
  }

  function applyLimitHighlight() {
    var total       = getTotalSpent();
    var balanceEl   = document.getElementById('balance-amount');
    var balanceWrap = document.getElementById('balance-display');
    var over        = spendingLimit > 0 && total > spendingLimit;

    if (balanceEl)   { balanceEl.classList.toggle('over-limit', over); }
    if (balanceWrap) { balanceWrap.classList.toggle('over-limit', over); }

    // Also tag each list item
    var items = document.querySelectorAll('#transaction-list li');
    for (var i = 0; i < items.length; i++) {
      var li   = items[i];
      var txId = li.dataset.txId;
      if (!txId) { continue; }
      var txn  = null;
      for (var j = 0; j < transactions.length; j++) {
        if (transactions[j].id === txId) { txn = transactions[j]; break; }
      }
      if (!txn) { continue; }
      // Highlight individual transaction if the total is over-limit
      li.classList.toggle('over-limit-item', over);
    }
  }

  /* =========================================================
     10. THEME — DARK / LIGHT MODE
     ========================================================= */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next    = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    storageSet(STORAGE_KEY_THEME, next);
  }

  /* =========================================================
     11. RENDER — CATEGORY DROPDOWN
     ========================================================= */

  function renderCategoryDropdown() {
    var select = document.getElementById('category');
    if (!select) { return; }
    var current = select.value;
    // Rebuild options
    select.innerHTML = '<option value="">-- Select --</option>';
    for (var i = 0; i < categories.length; i++) {
      var opt = document.createElement('option');
      opt.value       = categories[i];
      opt.textContent = categories[i];
      select.appendChild(opt);
    }
    // Restore previous selection if still valid
    if (categories.indexOf(current) !== -1) {
      select.value = current;
    }
  }

  /* =========================================================
     12. RENDER — CATEGORY TAG LIST
     ========================================================= */

  function renderCategoryTagList() {
    var ul = document.getElementById('category-tag-list');
    if (!ul) { return; }
    ul.innerHTML = '';
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var li  = document.createElement('li');
      li.className = 'category-tag';

      var dot = document.createElement('span');
      dot.className           = 'category-dot';
      dot.style.backgroundColor = colorForCategory(cat);

      var name = document.createElement('span');
      name.className   = 'category-tag-name';
      name.textContent = cat;

      var delBtn = document.createElement('button');
      delBtn.type            = 'button';
      delBtn.className       = 'btn-tag-delete';
      delBtn.dataset.catName = cat;
      delBtn.setAttribute('aria-label', 'Remove category ' + cat);
      delBtn.textContent     = '×';

      li.appendChild(dot);
      li.appendChild(name);
      li.appendChild(delBtn);
      ul.appendChild(li);
    }
  }

  /* =========================================================
     13. RENDER — TRANSACTION LIST
     ========================================================= */

  function renderList() {
    var container = document.getElementById('transaction-list');
    if (!container) { return; }

    var txns = sortedTransactions(transactions);

    if (txns.length === 0) {
      container.innerHTML = '<p class="empty-state">No expenses recorded yet.</p>';
      return;
    }

    var ul = document.createElement('ul');
    for (var i = 0; i < txns.length; i++) {
      var txn = txns[i];
      var li  = document.createElement('li');
      li.dataset.txId = txn.id;

      var nameSpan = document.createElement('span');
      nameSpan.className   = 'txn-name';
      nameSpan.textContent = txn.itemName;

      var amountSpan = document.createElement('span');
      amountSpan.className   = 'amount-badge';
      amountSpan.textContent = '$' + formatAmount(txn.amount);

      var categoryChip = document.createElement('span');
      categoryChip.className        = 'category-chip';
      categoryChip.textContent      = txn.category;
      categoryChip.dataset.category = txn.category;
      categoryChip.style.backgroundColor = colorForCategory(txn.category);
      // Choose text colour based on lightness (yellow-ish = dark text)
      categoryChip.style.color = isDarkBg(colorForCategory(txn.category)) ? '#fff' : '#111827';

      var deleteBtn = document.createElement('button');
      deleteBtn.className          = 'btn-delete';
      deleteBtn.type               = 'button';
      deleteBtn.dataset.id         = txn.id;
      deleteBtn.setAttribute('aria-label', 'Delete ' + txn.itemName);
      deleteBtn.textContent        = '×';

      li.appendChild(nameSpan);
      li.appendChild(amountSpan);
      li.appendChild(categoryChip);
      li.appendChild(deleteBtn);
      ul.appendChild(li);
    }

    container.innerHTML = '';
    container.appendChild(ul);
  }

  /** Return true when a hex colour is considered "dark" (for text contrast). */
  function isDarkBg(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    // Perceived brightness formula
    return (r * 299 + g * 587 + b * 114) / 1000 < 160;
  }

  /* =========================================================
     14. RENDER — BALANCE
     ========================================================= */

  function renderBalance() {
    var total = getTotalSpent();
    var el    = document.getElementById('balance-amount');
    if (el) { el.textContent = formatAmount(total); }
  }

  /* =========================================================
     15. RENDER — CHART
     ========================================================= */

  var chartInstance = null;

  var CHART_OPTIONS = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: function (context) {
            return context.label + ': $' + Number(context.parsed).toFixed(2);
          }
        }
      }
    }
  };

  function buildChartData() {
    var grouped = groupByCategory(transactions);
    var labels  = [];
    var data    = [];
    var colors  = [];

    var cats = Object.keys(grouped);
    for (var i = 0; i < cats.length; i++) {
      var cat = cats[i];
      if (grouped[cat] > 0) {
        labels.push(cat);
        data.push(grouped[cat]);
        colors.push(colorForCategory(cat));
      }
    }
    return { labels: labels, datasets: [{ data: data, backgroundColor: colors }] };
  }

  function renderChart() {
    var canvas      = document.getElementById('pie-chart');
    var emptyNotice = document.querySelector('.chart-empty');

    if (chartInstance !== null) { chartInstance.destroy(); chartInstance = null; }

    if (transactions.length === 0) {
      if (canvas)      { canvas.style.display = 'none'; }
      if (emptyNotice) { emptyNotice.removeAttribute('hidden'); }
      return;
    }

    if (canvas)      { canvas.style.display = ''; }
    if (emptyNotice) { emptyNotice.setAttribute('hidden', ''); }

    chartInstance = new Chart(canvas, {
      type: 'pie', data: buildChartData(), options: CHART_OPTIONS
    });
  }

  /* =========================================================
     16. RENDER ALL
     ========================================================= */

  function renderAll() {
    renderList();
    renderBalance();
    renderChart();
    applyLimitHighlight();
  }

  /* =========================================================
     17. EVENTS
     ========================================================= */

  // — Delete transaction (event delegation)
  var listContainer = document.getElementById('transaction-list');
  if (listContainer) {
    listContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-id]');
      if (btn && btn.dataset.id) { deleteTransaction(btn.dataset.id); }
    });
  }

  // — Add transaction form
  var form = document.getElementById('transaction-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var itemName = document.getElementById('item-name').value;
      var amount   = document.getElementById('amount').value;
      var category = document.getElementById('category').value;

      // Clear previous errors
      ['item-name-error', 'amount-error', 'category-error'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { el.textContent = ''; el.removeAttribute('role'); }
      });

      var result = validate(itemName, amount, category);
      if (!result.valid) {
        if (result.errors.itemName) {
          var ne = document.getElementById('item-name-error');
          if (ne) { ne.textContent = result.errors.itemName; ne.setAttribute('role', 'alert'); }
        }
        if (result.errors.amount) {
          var ae = document.getElementById('amount-error');
          if (ae) { ae.textContent = result.errors.amount; ae.setAttribute('role', 'alert'); }
        }
        if (result.errors.category) {
          var ce = document.getElementById('category-error');
          if (ce) { ce.textContent = result.errors.category; ce.setAttribute('role', 'alert'); }
        }
        return;
      }

      addTransaction({ itemName: itemName, amount: parseFloat(amount), category: category });
      form.reset();
    });
  }

  // — Add custom category
  var addCatBtn = document.getElementById('add-category-btn');
  if (addCatBtn) {
    addCatBtn.addEventListener('click', function () {
      var input  = document.getElementById('new-category-input');
      var errEl  = document.getElementById('category-add-error');
      if (!input) { return; }

      var err = addCategory(input.value);
      if (errEl) {
        errEl.textContent = err || '';
        if (err) { errEl.setAttribute('role', 'alert'); } else { errEl.removeAttribute('role'); }
      }
      if (!err) { input.value = ''; input.focus(); }
    });
  }

  // Also allow Enter key in category input
  var newCatInput = document.getElementById('new-category-input');
  if (newCatInput) {
    newCatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('add-category-btn').click();
      }
    });
  }

  // — Delete custom category (event delegation on tag list)
  var tagList = document.getElementById('category-tag-list');
  if (tagList) {
    tagList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cat-name]');
      if (!btn) { return; }
      var errEl = document.getElementById('category-add-error');
      var err   = deleteCategory(btn.dataset.catName);
      if (errEl) {
        errEl.textContent = err || '';
        if (err) { errEl.setAttribute('role', 'alert'); } else { errEl.removeAttribute('role'); }
      }
    });
  }

  // — Spending limit input
  var limitInput = document.getElementById('budget-limit');
  if (limitInput) {
    limitInput.addEventListener('input', function () {
      var val = parseFloat(limitInput.value);
      spendingLimit = isNaN(val) || val <= 0 ? 0 : val;
      storageSet(STORAGE_KEY_LIMIT, spendingLimit);
      applyLimitHighlight();
    });
  }

  // — Sort buttons
  var sortBtns = document.querySelectorAll('.btn-sort');
  for (var s = 0; s < sortBtns.length; s++) {
    sortBtns[s].addEventListener('click', function () {
      currentSort = this.dataset.sort;
      // Update active state
      for (var k = 0; k < sortBtns.length; k++) {
        sortBtns[k].classList.toggle('active', sortBtns[k].dataset.sort === currentSort);
      }
      renderList();
      applyLimitHighlight();
    });
  }

  // — Theme toggle
  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  /* =========================================================
     18. INIT
     ========================================================= */

  document.addEventListener('DOMContentLoaded', function () {
    // Load persisted data
    transactions  = storageGet(STORAGE_KEY, []);
    categories    = storageGet(STORAGE_KEY_CATEGORIES, DEFAULT_CATEGORIES.slice());
    spendingLimit = storageGet(STORAGE_KEY_LIMIT, 0) || 0;

    // Ensure defaults always present
    for (var i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      if (categories.indexOf(DEFAULT_CATEGORIES[i]) === -1) {
        categories.push(DEFAULT_CATEGORIES[i]);
      }
    }

    // Theme
    var savedTheme = storageGet(STORAGE_KEY_THEME, null);
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

    // Restore limit input
    var limitEl = document.getElementById('budget-limit');
    if (limitEl && spendingLimit > 0) { limitEl.value = spendingLimit; }

    // Render
    renderCategoryDropdown();
    renderCategoryTagList();
    renderAll();
  });

})();
