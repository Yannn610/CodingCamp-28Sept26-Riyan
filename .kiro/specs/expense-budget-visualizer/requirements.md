# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses by adding transactions with a name, amount, and category. It provides an at-a-glance total balance, a scrollable transaction list with delete capability, and an auto-updating pie chart visualizing spending by category. The entire application runs in the browser with no backend server; all data is persisted using the browser's Local Storage API. It is deliverable as a standalone web page or browser extension.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense record consisting of an Item Name, Amount, and Category.
- **Item_Name**: A text label identifying what the expense was for.
- **Amount**: A positive numeric value representing the cost of a transaction in the user's local currency.
- **Category**: One of three predefined expense classifications: Food, Transport, or Fun.
- **Transaction_List**: The scrollable on-screen list of all saved transactions.
- **Balance_Display**: The UI element at the top of the App that shows the current total of all transaction amounts.
- **Pie_Chart**: A circular chart rendered by Chart.js that visualizes the percentage breakdown of spending per Category.
- **Input_Form**: The HTML form through which users enter and submit new transactions.
- **Local_Storage**: The browser's Web Storage API used to persist transaction data client-side.
- **Validator**: The client-side logic responsible for checking that Input_Form fields are correctly filled before submission.

---

## Requirements

### Requirement 1: Add a Transaction via Input Form

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can record a new expense quickly.

#### Acceptance Criteria

1. THE Input_Form SHALL display three fields: Item_Name (text, maximum 100 characters), Amount (number, accepting values from 0.01 to 999,999,999.99), and Category (select with options Food, Transport, and Fun).
2. WHEN the user submits the Input_Form with all fields filled and a valid Amount, THE Validator SHALL verify that the Item_Name field is not empty, the Amount field contains a number between 0.01 and 999,999,999.99, and a Category has been selected.
3. IF the Validator detects that one or more required fields are empty or the Amount is not a number between 0.01 and 999,999,999.99, THEN THE Validator SHALL display an inline error message adjacent to each invalid field identifying the validation failure and SHALL NOT add the Transaction.
4. IF the Validator confirms all fields are valid, THEN THE App SHALL add the Transaction to the Transaction_List and persist it to Local_Storage within 1 second.
5. WHEN a Transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty state and the Category select SHALL return to its default unselected state.

---

### Requirement 2: View and Manage the Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list and be able to remove any entry so that I can review and correct my expense history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display every stored Transaction in reverse-chronological order based on the submission timestamp stored with each Transaction, so that the most recently added Transaction appears first.
2. THE Transaction_List SHALL show the Item_Name, Amount (formatted to exactly 2 decimal places), and Category for each Transaction.
3. WHILE the number of visible Transactions exceeds the height of the Transaction_List container, THE Transaction_List SHALL remain scrollable so that all entries are accessible.
4. WHEN the user activates the delete control on a Transaction entry, THE App SHALL immediately remove that Transaction from the Transaction_List and from Local_Storage with no confirmation step required.
5. WHEN the Transaction_List contains no Transactions, THE App SHALL display an empty-state message indicating that no expenses have been recorded yet.

---

### Requirement 3: Display and Update the Total Balance

**User Story:** As a user, I want to see my total spending at a glance so that I can understand how much I have spent overall.

#### Acceptance Criteria

1. THE Balance_Display SHALL be rendered in the topmost section of the App and SHALL NOT be hidden, collapsed, or removed regardless of the state of the Transaction_List.
2. THE Balance_Display SHALL show the sum of all Transaction Amounts currently stored in Local_Storage, formatted as a numeric value with exactly 2 decimal places, where expense amounts are treated as positive values contributing to the total.
3. WHEN a Transaction is added, THE Balance_Display SHALL update to reflect the new total without requiring a page reload.
4. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the new total without requiring a page reload.
5. IF the Transaction_List is empty, THEN THE Balance_Display SHALL show a total of 0.00.
6. IF Local_Storage contains corrupted or non-numeric Transaction Amount data, THEN THE Balance_Display SHALL treat the corrupted entry as 0.00 and continue displaying the sum of all valid Transaction Amounts.

---

### Requirement 4: Visualize Spending by Category with a Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending broken down by category so that I can quickly understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL render using Chart.js and display one segment per Category (Food, Transport, Fun) proportional to the total Amount spent in each Category relative to overall spending.
2. WHEN a Transaction is added, THE Pie_Chart SHALL update automatically to reflect the new spending distribution without requiring a page reload.
3. WHEN a Transaction is deleted, THE Pie_Chart SHALL update automatically to reflect the revised spending distribution without requiring a page reload.
4. WHEN all Transactions belonging to a Category are deleted, THE Pie_Chart SHALL remove that Category's segment from the chart.
5. WHEN the Transaction_List is empty, THE Pie_Chart SHALL display a placeholder state indicating there is no data to visualize.
6. THE Pie_Chart SHALL display a legend identifying each Category by name and its associated color.

---

### Requirement 5: Persist Data Across Sessions

**User Story:** As a user, I want my transactions to be saved between browser sessions so that I do not lose my expense history when I close and reopen the App.

#### Acceptance Criteria

1. WHEN the App initializes, THE App SHALL read all Transactions from Local_Storage and populate the Transaction_List, Balance_Display, and Pie_Chart with the stored data before accepting user input.
2. WHEN a Transaction is added, THE App SHALL write the updated Transaction collection to Local_Storage before updating the UI.
3. WHEN a Transaction is deleted, THE App SHALL write the updated Transaction collection to Local_Storage before updating the UI.
4. IF Local_Storage is unavailable or returns a read error on initialization, THEN THE App SHALL display a non-blocking warning message informing the user that data persistence is unavailable and SHALL continue to operate with in-memory data for the current session.
5. THE App SHALL store each Transaction as a JSON object with at minimum the fields: id (unique string), itemName, amount (number), category, and timestamp (ISO 8601 string).

---

### Requirement 6: Technical Constraints and Non-Functional Properties

**User Story:** As a developer, I want the application to adhere to defined technology, structural, and performance constraints so that it remains maintainable and compatible across modern browsers.

#### Acceptance Criteria

1. THE App SHALL be implemented using HTML, CSS, and Vanilla JavaScript only, with no JavaScript frameworks (such as React or Vue).
2. THE App SHALL load and become interactive in a modern browser (Chrome, Firefox, Edge, Safari) without a backend server.
3. THE App SHALL include exactly one CSS file located at `css/` and exactly one JavaScript file located at `js/`.
4. WHEN the user interacts with the Input_Form, Transaction_List, Balance_Display, or Pie_Chart, THE App SHALL reflect the interaction result within 100 milliseconds on a modern desktop browser.
5. THE App SHALL render correctly at viewport widths from 320px to 1920px, maintaining readable typography and a clear visual hierarchy at all sizes.
6. THE App's single JavaScript file SHALL NOT exceed 500 lines so that the codebase remains readable and maintainable.
