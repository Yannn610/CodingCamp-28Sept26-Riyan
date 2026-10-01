# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a self-contained, single-page client-side web application with no backend or build step.
The implementation follows an incremental approach: scaffold the HTML shell first, then layer in
CSS, then build the JavaScript in section order (Config → Storage → State → Render → Events),
and finally wire everything together with Chart.js and accessibility attributes.

---

## Tasks

- [x] 1. Scaffold project structure and HTML shell
  - [x] 1.1 Create the directory structure and `index.html`
    - Create folders: `expense-budget-visualizer/`, `expense-budget-visualizer/css/`, `expense-budget-visualizer/js/`
    - Create `index.html` with the full HTML structure from the design: `<header>` (balance display), `<main>` (input section, list section, chart section), and `#storage-warning`
    - Add the Chart.js CDN `<script>` tag (`chart.js@4.4.4/dist/chart.umd.min.js` from jsDelivr) and `<script src="js/app.js">` at the end of `<body>`
    - Add `<link rel="stylesheet" href="css/style.css">` in `<head>`
    - Include all form field `id`s, `label for` associations, and `<span class="field-error">` elements for each field
    - _Requirements: 1.1, 6.1, 6.2, 6.3_

- [x] 2. Implement CSS — design tokens, layout, and components
  - [x] 2.1 Define CSS custom properties and base styles
    - Add `:root` block with all design tokens: `--color-food`, `--color-transport`, `--color-fun`, `--color-bg`, `--color-surface`, `--color-text`, `--color-text-mute`, `--color-error`, `--radius`, `--shadow`
    - Set `box-sizing: border-box` globally, apply `--color-bg` to `body`, set base font-family and color
    - _Requirements: 6.5_

  - [x] 2.2 Implement CSS Grid layout with mobile-first responsive breakpoints
    - Style `.app-main` as a single-column grid by default
    - Add `@media (min-width: 768px)` breakpoint: two-column grid with `grid-template-areas: "input list" / "chart chart"`
    - Add `@media (min-width: 1280px)` breakpoint: three-column grid with `grid-template-areas: "input list chart"`
    - _Requirements: 6.5_

  - [x] 2.3 Style form, transaction list, and balance display components
    - Style `.input-section` form fields, labels, inputs, select, and submit button
    - Style `.field-error` spans with `--color-error` and `role="alert"` consideration
    - Style `#transaction-list` with `max-height: 400px; overflow-y: auto` for scroll behavior
    - Style individual transaction list items with item name, amount badge, category chip (using category color tokens), and delete button
    - Style `#balance-display` in `.app-header`, including amount typography
    - Style `#storage-warning` (hidden by default, shown when localStorage unavailable)
    - Style empty-state messages (`.empty-state`, `.chart-empty`)
    - _Requirements: 2.3, 2.5, 3.1, 3.5_

  - [x] 2.4 Style chart section and category color chips
    - Style `.chart-section` and `#chart-container`
    - Apply `--color-food`, `--color-transport`, `--color-fun` to category badge chips in the transaction list so they match Chart.js legend colors
    - _Requirements: 4.1, 4.6_

- [x] 3. Implement `js/app.js` — Config and Storage sections
  - [x] 3.1 Create the IIFE wrapper and Config section
    - Wrap the entire app in an IIFE `(function() { ... })()` to avoid global namespace pollution
    - Define constants: `STORAGE_KEY = "ebv_transactions"`, `CATEGORIES = ['Food', 'Transport', 'Fun']`, `AMOUNT_MIN = 0.01`, `AMOUNT_MAX = 999999999.99`
    - _Requirements: 6.1, 6.6_

  - [x] 3.2 Implement the Storage section (`loadTransactions`, `saveTransactions`)
    - Write `loadTransactions()`: wraps `localStorage.getItem(STORAGE_KEY)` and `JSON.parse` in `try/catch`; calls `showStorageWarning()` and returns `[]` on any error
    - Write `saveTransactions(txns)`: wraps `localStorage.setItem(STORAGE_KEY, JSON.stringify(txns))` in `try/catch`; calls `showStorageWarning()` on error without interrupting the caller
    - Write `showStorageWarning()`: removes `hidden` attribute from `#storage-warning`
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ]* 3.3 Write property test for Storage (Property 3 & 9)
    - **Property 3: Add transaction persists and is retrievable**
    - **Validates: Requirements 1.4, 5.2, 5.5**
    - **Property 9: App init populates UI from stored transactions**
    - **Validates: Requirements 5.1**
    - Use fast-check with a mock localStorage (in-memory Map) to isolate from browser API
    - Tag tests with `// Feature: expense-budget-visualizer, Property 3` and `Property 9`

- [x] 4. Implement `js/app.js` — Utility functions and Validator
  - [x] 4.1 Implement utility functions (`generateId`, `formatAmount`, `groupByCategory`)
    - Write `generateId()`: uses `crypto.randomUUID()` with fallback to `Date.now().toString(36) + Math.random().toString(36)`
    - Write `formatAmount(n)`: returns `Number(n).toFixed(2)` as a string
    - Write `groupByCategory(txns)`: iterates transactions, sums amounts per category key, treats `isNaN(Number(txn.amount))` as `0`
    - _Requirements: 2.2, 3.6_

  - [x] 4.2 Implement the `validate()` function
    - Write `validate(itemName, amount, category)` as a pure function returning `{ valid: boolean, errors: { itemName, amount, category } }`
    - Item name valid: `typeof itemName === 'string' && itemName.trim().length >= 1 && itemName.trim().length <= 100`
    - Amount valid: numeric, `>= 0.01` and `<= 999999999.99`, not NaN
    - Category valid: one of `CATEGORIES`
    - Return `{ valid: false, errors: { ... } }` with a descriptive string for each failing field, `null` for passing fields
    - _Requirements: 1.2, 1.3_

  - [ ]* 4.3 Write property test for validator (Property 1 & 2)
    - **Property 1: Validator accepts all valid inputs**
    - **Validates: Requirements 1.2**
    - **Property 2: Validator rejects all invalid inputs**
    - **Validates: Requirements 1.3**
    - Use fast-check arbitraries as specified in the design's testing strategy section
    - Tag tests with `// Feature: expense-budget-visualizer, Property 1` and `Property 2`

- [x] 5. Implement `js/app.js` — State section
  - [x] 5.1 Implement in-memory state and `addTransaction` / `deleteTransaction`
    - Declare `let transactions = []` as the canonical in-memory array
    - Write `addTransaction(formData)`: creates a `Transaction` object with `id` from `generateId()`, `timestamp` from `new Date().toISOString()`, calls `saveTransactions` before `renderAll`
    - Write `deleteTransaction(id)`: filters `transactions` array, calls `saveTransactions` before `renderAll`
    - Both functions sort `transactions` newest-first by `timestamp` after mutation
    - _Requirements: 1.4, 2.4, 5.2, 5.3_

  - [ ]* 5.2 Write property test for add/delete state mutations (Property 4)
    - **Property 4: Delete transaction removes it from storage and list**
    - **Validates: Requirements 2.4, 5.3**
    - Use fast-check to generate transaction arrays, add then delete, verify absence by id
    - Tag test with `// Feature: expense-budget-visualizer, Property 4`

- [x] 6. Implement `js/app.js` — Render section
  - [x] 6.1 Implement `renderList(txns)`
    - If `txns.length === 0`, render `<p class="empty-state">No expenses recorded yet.</p>` inside `#transaction-list`
    - Otherwise render a `<ul>` with one `<li>` per transaction (newest-first order — relies on sorted state)
    - Each `<li>` must include: item name text, amount formatted to 2 decimal places, category chip, and a delete `<button>` with `data-id` attribute
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [ ]* 6.2 Write property test for renderList (Property 5 & 6)
    - **Property 5: Transaction list renders in reverse-chronological order**
    - **Validates: Requirements 2.1**
    - **Property 6: Transaction list items contain all required fields formatted correctly**
    - **Validates: Requirements 2.2**
    - Use fast-check with `arbitraryTransaction()` and DOM inspection helpers
    - Tag tests with `// Feature: expense-budget-visualizer, Property 5` and `Property 6`

  - [x] 6.3 Implement `renderBalance(txns)`
    - Sum all `txn.amount` values using `Number(txn.amount)`, treating `isNaN` results as `0`
    - Set `#balance-amount` text content to `formatAmount(sum)`
    - Add `aria-live="polite"` to the balance container (can be in HTML; ensure it's present)
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 6.4 Write property test for renderBalance (Property 7)
    - **Property 7: Balance equals sum of all transaction amounts**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**
    - Use fast-check with `arbitraryTransaction()` including some corrupted amount values
    - Tag test with `// Feature: expense-budget-visualizer, Property 7`

  - [x] 6.5 Implement `renderChart(txns)` with Chart.js
    - Declare `let chartInstance = null` at module scope
    - On every call: if `chartInstance !== null`, call `chartInstance.destroy()` then set to `null`
    - If `txns.length === 0`: hide `<canvas id="pie-chart">` and show `<p class="chart-empty">` placeholder; return early
    - Otherwise: call `buildChartData(txns)`, construct `new Chart(canvas, { type: 'pie', data, options: CHART_OPTIONS })`
    - Implement `buildChartData(txns)`: calls `groupByCategory(txns)`, filters to categories with `> 0` total, maps to `labels` and `data` arrays with `CATEGORY_COLORS` for `backgroundColor`
    - Define `CHART_OPTIONS` constant with `responsive: true`, legend at bottom, tooltip callback showing `$X.XX`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 6.6 Write property test for chart data (Property 8)
    - **Property 8: Chart data reflects per-category totals**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
    - Use fast-check with `arbitraryTransaction()`, call `buildChartData`, verify values match `groupByCategory` output
    - Tag test with `// Feature: expense-budget-visualizer, Property 8`

  - [x] 6.7 Implement `renderAll(txns)`
    - Call `renderList(txns)`, `renderBalance(txns)`, `renderChart(txns)` in sequence
    - _Requirements: 3.3, 3.4, 4.2, 4.3_

- [-] 7. Checkpoint — Core rendering pipeline complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify manually: open `index.html` in a browser, confirm the page loads with empty state, balance shows `0.00`, chart shows placeholder, and the form is visible.

- [x] 8. Implement `js/app.js` — Events section and form wiring
  - [x] 8.1 Implement the form submit handler
    - Add `submit` event listener on `#transaction-form`
    - On submit: call `preventDefault()`, read field values, call `validate(itemName, amount, category)`
    - If `!result.valid`: iterate `result.errors`, populate each `<span class="field-error">` with the error string; set `role="alert"` on each non-null error span; return without adding
    - Clear all `<span class="field-error">` text content at the start of every submit attempt
    - If valid: call `addTransaction({ itemName, amount: parseFloat(amount), category })`, then call `form.reset()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 8.2 Implement delete event delegation on the transaction list
    - Add `click` event listener on `#transaction-list`
    - Check `event.target.closest('[data-id]')` (or `event.target.dataset.id`) to identify delete button clicks
    - Call `deleteTransaction(id)` with the extracted id
    - _Requirements: 2.4_

  - [x] 8.3 Implement `DOMContentLoaded` init
    - On `DOMContentLoaded`: call `loadTransactions()`, assign result to `transactions`, call `renderAll(transactions)`
    - _Requirements: 5.1_

- [x] 9. Implement accessibility attributes
  - [x] 9.1 Add ARIA attributes to HTML elements
    - Ensure `<span class="field-error">` elements have `role="alert"` in `index.html` (so screen readers announce errors)
    - Ensure `#balance-amount`'s parent element has `aria-live="polite"` in `index.html`
    - In `renderList()`, ensure each delete `<button>` sets `aria-label` to `"Delete ${txn.itemName}"` so screen readers distinguish buttons
    - Confirm all `<label for="...">` associations are in place for all three form fields
    - _Requirements: 6.5 (accessibility)_

- [x] 10. Final integration checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify the complete data flow end-to-end:
    - Add a Food transaction → list updates, balance updates, pie chart shows Food segment
    - Add a Transport transaction → pie chart shows two segments
    - Delete one transaction → balance and chart both update
    - Reload the page → all data reloads from localStorage correctly

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) with `numRuns: 100`
- Each property test file must tag tests with `// Feature: expense-budget-visualizer, Property N`
- Unit tests for pure functions (`validate`, `formatAmount`, `groupByCategory`, `generateId`) are covered under their implementation tasks
- The destroy-and-recreate Chart.js pattern is intentional — do not attempt incremental updates
- Write to `localStorage` before calling `renderAll` in both `addTransaction` and `deleteTransaction`
- The IIFE wrapper in `app.js` is required — do not use ES modules or `import/export`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 2, "tasks": ["2.3", "2.4", "3.2", "4.1", "4.2"] },
    { "id": 3, "tasks": ["3.3", "4.3", "5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1", "6.3", "6.5"] },
    { "id": 5, "tasks": ["6.2", "6.4", "6.6", "6.7"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 7, "tasks": ["9.1"] }
  ]
}
```
