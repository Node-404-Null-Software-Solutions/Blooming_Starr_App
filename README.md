# Blooming Starr

Blooming Starr is a multi-business nursery management application for plant and
product intake, inventory, sales, expenses, plant-care records, employees,
scheduling, and tax-oriented business summaries.

This README is both:

1. the end-user operating manual for the hosted application; and
2. the technical handoff guide for whoever maintains or deploys it next.

The instructions describe the application as it exists in this repository.
The [Current limitations](#current-limitations) section identifies controls or
features that are present in the interface but are not fully implemented.

> Important: The dashboard and CSV export are organizational tools, not tax,
> accounting, payroll, pesticide, or legal advice. Verify financial and
> regulatory records with the appropriate professional.

## Contents

- [Quick start for a business owner](#quick-start-for-a-business-owner)
- [What each role can do](#what-each-role-can-do)
- [How to navigate and edit records](#how-to-navigate-and-edit-records)
- [Dashboard](#dashboard)
- [Plant workflows](#plant-workflows)
- [Product workflows](#product-workflows)
- [Operations workflows](#operations-workflows)
- [Employees and schedule](#employees-and-schedule)
- [Search and QR scanning](#search-and-qr-scanning)
- [Workbook import](#workbook-import)
- [Business and team settings](#business-and-team-settings)
- [App Logic guide](#app-logic-guide)
- [Troubleshooting](#troubleshooting)
- [Current limitations](#current-limitations)
- [Data-safety and handoff checklist](#data-safety-and-handoff-checklist)
- [Developer setup](#developer-setup)
- [Production deployment](#production-deployment)
- [Testing and verification](#testing-and-verification)

## Quick start for a business owner

### 1. Sign in

The application uses Clerk for authentication. Open the deployed application
and sign in or create a Clerk account.

On the first sign-in, the app asks for a business name. Creating the business
also creates an Owner membership for that signed-in account.

### 2. Confirm the active business

The business name and logo appear in the green bar at the top of the app. Select
the business name to:

- switch to another business that the user can access; or
- create another independent business.

Each business has separate inventory, sales, expenses, employees, settings, and
App Logic rules. Always confirm the active business before entering, importing,
editing, or deleting data.

### 3. Configure the business

Open **Settings > Business** to:

- confirm or edit the business name;
- upload a PNG logo;
- set primary and secondary colors; and
- view the permanent URL slug.

Only an Owner can change the business name. Owners and Managers can change the
theme and logo.

### 4. Review App Logic before entering data

Open **Settings > App Logic** as an Owner. A new business receives four active
default calculation rules:

- Sales totals;
- Product intake unit cost;
- Overhead totals; and
- Division cost.

These rules determine calculated amounts when records are added, edited, or
imported. Read [App Logic guide](#app-logic-guide) before changing them.

### 5. Choose a data-entry method

For an existing Inventory Trackers workbook, use **Settings > Import**. Imports
must be `.xlsx` files and must use the recognized sheet and column names
documented in [Workbook import](#workbook-import).

For a new business without a workbook, enter records through the **Add** button
inside each module. A practical setup order is:

1. Plant Intake and Product Intake;
2. Sales and Overhead Expenses;
3. Transplant Log, Treatment Tracking, and Fertilizer Log;
4. Employees; and
5. Schedule.

### 6. Invite other users

Open **Settings > Team** as an Owner. Generate an Employee, Manager, or Co-Owner
invite link and send it to the intended person. Invite links expire after seven
days and the recipient must sign in before accepting.

### 7. Verify the result

After initial entry or import:

- review the import report for inserted, skipped, and duplicate rows;
- open Plant Inventory and Product Inventory;
- compare a few inventory quantities with the source records;
- open the Dashboard and choose the correct tax year;
- review Settings > App Logic > Execution History for failures; and
- export the accountant CSV and inspect it before sending it to anyone.

## What each role can do

The current permission behavior is:

| Capability | Owner | Manager | Employee |
| --- | --- | --- | --- |
| View dashboard and operational modules | Yes | Yes | Yes |
| Add, edit, and delete operational records | Yes | Yes | Yes |
| Manage the employee list and schedule | Yes | Yes | Yes |
| Change business colors and logo | Yes | Yes | No |
| Import a workbook | Yes | Yes | No |
| Change the business name | Yes | No | No |
| Manage members and invite links | Yes | No | No |
| Create, preview, activate, or run App Logic | Yes | No | No |
| Permanently clear imported/operational data | Yes | No | No |

An important current behavior is that all active business members, including
Employees, can modify operational records, the employee list, and the schedule.
The Employee role is not read-only.

## How to navigate and edit records

### Main navigation

The left navigation is grouped into:

- **Plants:** Dashboard, Plant Intake, Plant Inventory, Transplant Log
- **Products:** Product Intake, Product Inventory
- **Operations:** Treatment Tracking, Fertilizer Log, Overhead Expenses, Sales
- **Team:** Employees, Schedule
- **Settings**

On a smaller screen, use the menu button in the upper-left corner to open or
close the navigation.

### Common module buttons

Most modules use the same controls:

- **Add:** opens a new-record form.
- **Filter:** opens module-specific filters. Select **Apply** to use them and
  **Clear** to remove them.
- **Select:** marks one or more rows. In the current version this only tracks
  selection; it does not perform a bulk update or bulk delete.
- **Edit:** switches supported tables into inline edit mode.
- **Chevron or row click:** opens the row detail panel.

### Editing a table cell

When a value supports inline editing:

1. select the cell;
2. enter the new value;
3. press Enter or select outside the field to save; or
4. press Escape to cancel the edit.

Calculated fields such as total sale, profit, margin, unit cost, total cost, and
remaining quantity are intentionally read-only. Edit their source fields and
the app recalculates them.

### Deleting a row

Open the row detail panel and select **Delete Row**. The app asks for
confirmation. Row deletion cannot be undone from within the application.

### Dates and money

- Normal data-entry forms use dollars, such as `15.00`.
- App Logic and App Logic preview JSON use integer cents, such as `1500`.
- Dates are entered with the browser date picker.
- Card fields are intended for the last four digits, not a full card number.

## Dashboard

The Dashboard is a tax-year and business summary. Use the year buttons near the
top to select the current year or one of the three preceding years.

### Profit and loss

The dashboard shows:

- total sales revenue;
- plant cost of goods sold;
- product cost of goods sold;
- total cost of goods sold;
- gross profit and gross margin;
- overhead expenses;
- net profit and net margin;
- transaction count;
- average sale value; and
- average profit per sale.

Sales are classified as Product COGS when the sale SKU exists in Product Intake.
Other sale SKUs are classified as Plant COGS.

### Sales summaries

Sales are grouped by:

- sale channel; and
- calendar month.

Blank sale channels are grouped as **Other**.

### Plant inventory summary

The dashboard counts plant intake records by status:

- Available
- Sold
- Dead
- Damaged
- Giveaway
- Donation

Blank or unrecognized statuses are treated as available for the dashboard.
Dead, Damaged, Giveaway, and Donation amounts contribute to the inventory-loss
summary.

For consistent results, use these exact status words. Status spelling and the
SKU must be consistent across intake and sales records.

### Expense summary

Overhead expenses are grouped by category. A blank category appears as
**Uncategorized**.

### Accountant CSV

Select **Export for accountant (CSV)** to download:

```text
tax-summary-YYYY.csv
```

The CSV contains the selected year, revenue, COGS, gross profit, expense totals
by category, and net profit. It is a summary, not a full transaction export.

## Plant workflows

### Plant Intake

Use Plant Intake to record acquired plants.

To add a record:

1. open **Plant Intake**;
2. select **Add**;
3. enter Date, Source, Genus, Cultivar, ID, Quantity, cost, MSRP, pot type,
   payment information, and any supported optional values;
4. select **Save**.

Source, Genus, Cultivar, ID, Quantity, cost, MSRP, and Pot Type are required by
the current form.

#### Automatic plant SKU

The app generates a unique SKU from:

- Genus;
- Source;
- Cultivar; and
- ID/location suffix.

The generator uses imported reference codes when available. If no code exists,
it creates a short fallback code. If the resulting full SKU is already in use,
the app adds a numeric suffix.

Changing Source, Genus, Cultivar, or ID on an existing intake regenerates the
SKU. A regenerated SKU is a new identifier. Verify linked sales, treatments,
fertilizer entries, and transplants afterward because those records match by
exact SKU text.

#### Plant cost meaning

The current Plant Intake screen labels the input **Total Cost**, while parts of
the inventory view multiply the stored cost by quantity. Until that field is
made unambiguous in code, use one consistent business convention and verify the
result in Plant Inventory after saving.

### Plant Inventory

Plant Inventory is a calculated view assembled from Plant Intake, Sales,
Transplant Log, and imported pricing data. It is not a second place to enter
inventory.

It shows:

- plant name and SKU;
- status;
- plant, other, and total costs;
- plant, other, and total MSRP;
- estimated and actual sale price;
- profit and margin; and
- purchased, sold, used, and remaining quantities.

Quantity sold comes from Sales rows with the exact same SKU. Quantity used
includes Plant Intake records marked Dead, Damaged, Giveaway, Donation, or Not
for Sale.

If the inventory quantity is wrong, check the source Plant Intake and Sales
records rather than trying to edit Plant Inventory.

### Transplant Log

Use Transplant Log for up-potting, divisions, media changes, and related plant
work.

The entry form includes:

- Date
- Original SKU
- Action
- Media
- To Pot
- ID
- New SKU
- Pot Color
- Notes

Original SKU and some lookup-backed values can be typed, selected, or scanned.

#### Division cost

When:

- the action contains the word `division`;
- the submitted cost is zero; and
- the original Plant Intake record has a cost;

the app calculates a cost per division. The default App Logic formula is:

```text
costCents = originalCostCents > 0 ? round(originalCostCents / max(1, totalParts)) : 0
```

A New SKU entered on the transplant becomes an inventory item with an initial
quantity of one.

App Logic for Transplant Log supports only the **Before Save** trigger.

## Product workflows

### Product Intake

Use Product Intake for pots, supplies, accessories, and other non-plant products
that will be tracked as inventory.

The form includes:

- Date
- Vendor
- Source
- Category
- Size
- Style
- Purchase number
- Quantity
- Total cost
- MSRP
- Payment method
- Card last four
- Invoice number
- Photo selector

Date, Vendor, Source, Category, Style, Quantity, Total Cost, Payment Method, and
Card number are required by the current form.

#### Automatic product SKU

The app generates the SKU from:

- Source;
- Category;
- Size and Style; and
- Purchase number.

Changing those identity fields on an existing row regenerates the SKU. Verify
linked Sales records afterward.

#### Unit cost

The default rule calculates:

```text
unitCostCents = totalCostCents > 0 && qty > 0 ? round(totalCostCents / qty) : 0
```

For example, a total cost of `$48.00` and quantity `12` produces a `$4.00` unit
cost.

### Product Inventory

Product Inventory is derived from Product Intake and Sales:

```text
quantity remaining = quantity purchased - quantity sold
```

The status is **In Stock** while quantity remains and **Sold Out** when all
quantity has been sold. Sales must use the exact Product Intake SKU.

## Operations workflows

### Sales

Use Sales to record a sold plant or product.

Required inputs are:

- Date
- SKU
- Quantity
- Sale price
- Cost

Optional inputs include item name, sale channel, payment method, card last four,
and notes.

The sale price is treated as the per-unit price by the default rule:

```text
totalSaleCents = qty * salePriceCents
```

The default profit rule subtracts `costCents` once:

```text
profitCents = totalSaleCents - costCents
```

Therefore, the default rule treats the Sales **Cost** field as the total cost for
the complete sale, not the unit cost. If the business enters unit cost instead,
the Owner should change the rule as documented in
[Sales: unit cost instead of total cost](#sales-unit-cost-instead-of-total-cost).

After a sale is saved, matching inventory is reduced by the exact SKU. A
different spelling, extra space, or regenerated SKU creates a mismatch.

### Overhead Expenses

Use Overhead Expenses for non-inventory business spending such as supplies,
utilities, shipping, equipment, and project expenses.

The form includes:

- Date
- Vendor
- Brand
- Category
- Description
- Quantity
- Subtotal
- Shipping
- Discount
- Payment method
- Card last four
- Invoice number
- Notes or project

The default totals are:

```text
totalCents = subTotalCents + shippingCents - discountCents
unitCostCents = qty > 0 ? round((subTotalCents - discountCents) / qty) : 0
```

The default unit cost excludes shipping, while Actual Total includes shipping.
See [Overhead: include shipping in unit cost](#overhead-include-shipping-in-unit-cost)
to change that convention.

### Treatment Tracking

Use Treatment Tracking to record:

- treatment date and SKU;
- pest or target;
- product and active ingredient;
- EPA number;
- rate;
- pot size;
- application method;
- applicator initials; and
- next earliest and latest application dates.

SKU is required. Treatment dates are entered manually. App Logic can validate
or calculate the treatment date window using UTC epoch-day fields.

### Fertilizer Log

Use Fertilizer Log to record:

- application date;
- plant SKU;
- pot size/SKU;
- product;
- method;
- rate and unit; and
- notes.

The form supports typing, selecting, or scanning the plant SKU.

If both next-application dates are blank, the app automatically calculates a
7-to-14-day window for product names containing `Ferti-lome` or `Arber`.
Other fertilizer products do not receive automatic dates.

App Logic can validate or replace the application date window after the
built-in product-name calculation runs.

## Employees and schedule

### Employees

Use **Employees > Add** to create an employee with:

- name;
- email;
- phone;
- position;
- hourly rate;
- salary rate; and
- notes.

Name is required. Employees can be deactivated and later reactivated instead of
being deleted.

Enter compensation carefully on the Add Employee form and verify the saved
amount. See the compensation warning in [Current limitations](#current-limitations)
before changing a wage through an inline table cell.

### Schedule

The Schedule shows one week at a time, Monday through Sunday.

To add a shift:

1. add and activate the employee first;
2. open Schedule;
3. use the left or right arrow to choose a week;
4. select the plus button in the employee/date cell;
5. enter start time, end time, optional title, and optional notes;
6. select **Add Shift**.

Hover over a shift and use the trash icon to delete it. The current Schedule
does not provide an edit dialog; delete and recreate a shift to change it.
App Logic can validate or adjust a new shift's date and minute-of-day values.

## Search and QR scanning

### Search

The search field in the green top bar passes a `q` value to the current page.
It is currently effective for:

- Plant Intake;
- Plant Inventory;
- Product Inventory;
- Sales; and
- Transplant Log.

For Product Intake, Overhead Expenses, Treatment Tracking, and Fertilizer Log,
use the module's Filter button because those pages use field-specific filters
instead of the top-bar `q` value.

### QR scanning

Select the QR icon in the top search box or beside a scannable form field. The
scanner can:

- use the device camera; or
- read a QR code from an uploaded photo.

Camera scanning requires:

- an `https://` deployment or `localhost`;
- browser permission to use the camera; and
- a camera that is not already in use by another application or tab.

The QR content may be:

- a plain SKU;
- a URL with `sku`, `SKU`, `code`, `barcode`, or `value` in the query string; or
- a URL whose final path segment is the SKU.

If camera access fails, use **Scan photo** or type the SKU manually.

## Workbook import

### Access and file type

Owners and Managers can open **Settings > Import**. Only `.xlsx` workbooks are
accepted.

Imports are additive. They do not replace the database. The importer:

- inserts recognized new rows;
- skips rows missing required identity values;
- skips duplicates using each module's duplicate key;
- seeds lookup options from recognized KEY sheets; and
- applies active Before Save and After Import App Logic rules to Plant Intake,
  Product Intake, Sales, Overhead Expenses, Treatment Tracking, and Fertilizer
  Log.

Always keep a copy of the original workbook and review the import report.

### Recognized data sheet names

Sheet matching ignores letter case but otherwise uses these names:

| Data | Accepted sheet names | Minimum identifying headers |
| --- | --- | --- |
| Plant Intake | `PLANT Intake Coding`, `Plant Intake Coding`, `Plant Intake`, `PLANT Intake` | `Source`, `Genus`, `Cultivar`, `SKU` |
| Product Intake | `PRODUCT Intake Coding`, `Product Intake Coding`, `Product Intake` | `Date`, plus `Code / SKU` or `SKU` |
| Sales | `Sales` | `Date`, `SKU` |
| Overhead Expenses | `Overhead Expenses`, `Overhead` | `Date`, plus Vendor or a nonzero imported actual total |
| Transplant Log | `Transplant Log` | `Date`, `Original SKU` |
| Fertilizer Log | `Fertilizer Log` | `Date`, `Plant SKU` |
| Treatment Tracking | `Treatment Tracker`, `Treatment Tracking` | `Date`, `SKU` |

When a recognized sheet or its required headers are missing, the import report
shows **sheet not found**.

### Recognized KEY sheets

Lookup/reference data can be seeded from:

- `Plant KEY`
- `Product KEY`
- `Transplant KEY`
- `Treatment KEY`
- `Fertilizer KEY`
- `Overhead KEY`
- `SKU KEY`

KEY sheets provide dropdown and suggestion values such as sources, genera,
cultivars, categories, styles, payment methods, transplant actions, media, pot
sizes, treatment products, and fertilizer products.

### Common recognized columns

The importer recognizes the following headers. Some listed alternatives are
accepted exactly as shown.

#### Plant Intake

`Date`, `Source`, `Genus`, `Cultivar`, `ID #`/`ID#`/`ID`, `SKU`,
`Total Cost`/`Cost`, `Location`, `Status`, `MSRP`, `QTY`/`Qty`/`Quantity`,
`Pot Type`/`PotType`

#### Product Intake

`Date`, `Code / SKU`/`SKU`/`Code/SKU`, `Vendor`, `Source`, `Category`, `Size`,
`Style`, `Pur #`, `Qty`, `Tot Cost`/`Total Cost`, `Unit Cost`,
`Pmt Method`/`Payment Method`, `Card #`, `Invoice #`,
`Associated Product / Notes`/`Notes`

#### Sales

`Date`, `SKU`, `Item Name`, `Qty`, `Sale Price`, `Cost`, `Payment Method`,
`Card #`, `Sale Channel`, `Notes`

#### Overhead Expenses

`Date`, `Vendor`, `Brand`, `Category`, `Description`, `Qty`, `Sub Tot`, `Ship.`,
`Disc.`, `Act. Tot`, `Pmt. M.`, `Card #`, `Invoice #`,
`Notes / Project`/`Notes`

#### Transplant Log

`Date`, `Original SKU`, `Action`, `Media`, `From Pot`, `To Pot`, `ID`,
`Division SKU`, `$ PER`, `POT COLOR`/`Pot Color`, `Notes`, `Created At`

#### Fertilizer Log

`Date`, `Plant SKU`, `Pot SKU`, `Product`, `Method`, `Rate`, `Unit`,
`Next Earliest`, `Next Latest`, `Notes`

#### Treatment Tracking

`Date`, `SKU`, `Target`, `Product`, `Act Ing`/`Active Ingredient`, `EPA #`,
`Rate`, `Pot Sz`/`Pot Size`, `Method`, `Init.`/`Initials`, `Next Earliest`,
`Next Latest`

### How duplicates are identified

- Plant Intake: existing exact SKU
- Product Intake: SKU plus date
- Sales: SKU, date, quantity, sale price, and channel
- Overhead: invoice number, date, total, and vendor
- Transplant: original SKU, date, action, and division SKU
- Fertilizer: plant SKU, date, product, and method
- Treatment: SKU, date, target, and product

If a corrected row has the same duplicate key, importing it again will not
update the original row. Edit the original record or clear the appropriate data
before reimporting.

### Clear all business data

Only an Owner can use **Clear all business data**. The confirmation word is:

```text
CLEAR
```

This permanently deletes the current business's:

- Plant Intake;
- Product Intake;
- Sales;
- imported Pricing;
- Overhead Expenses;
- Transplant Log;
- Fertilizer Log;
- Treatment Tracking; and
- imported lookup/reference data.

It does not delete the business itself, memberships, employees, schedule, or
App Logic rules.

There is no in-app undo. Confirm the active business and preserve a source
workbook or database backup before clearing data.

## Business and team settings

### Business settings

Open **Settings > Business**.

- Owner: change business name, logo, and colors.
- Manager: change logo and colors.
- Employee: cannot open this settings page.

The URL slug is shown but is not editable in the interface.

Logo uploads must be PNG files.

### Team settings

Only an Owner can open **Settings > Team**.

The Owner can:

- generate seven-day Employee, Manager, and Co-Owner invite links;
- copy and send an invite link;
- view active memberships;
- remove another member;
- approve or deny pending join requests.

An Owner cannot remove their own membership from the Team page.

Invite links are intended for one recipient and are deleted after use.

## App Logic guide

### Read this first

App Logic is an advanced Owner-only feature. An invalid active rule can stop a
record from saving or stop a workbook import. Test every change with Preview,
save it as an inactive draft first, and activate it only after verifying the
output.

App Logic is **not JavaScript, TypeScript, Python, SQL, or an Excel macro**.
It is a small custom rule language interpreted by the server.

It cannot access:

- the database directly;
- other businesses;
- arbitrary tables or fields;
- the browser or page;
- the network;
- files;
- environment variables;
- the current time;
- random values; or
- user-written functions.

This restriction is intentional. It keeps rules deterministic and prevents
client-entered text from becoming arbitrary server code.

### Where to manage rules

Open:

```text
Settings > App Logic
```

Only an Owner can access this page.

Each rule has:

- **Name:** a descriptive label;
- **Module:** the type of row it receives;
- **Trigger:** when it runs;
- **Type:** Formula or Script;
- **Formula or Script:** the rule text;
- **Notes:** an explanation for future users; and
- **Active:** whether it runs in normal application workflows.

### Default rules

When a business has no App Logic rules, the app creates these active defaults.

#### Sales totals

```text
qty = max(1, floor(qty))
totalSaleCents = qty * salePriceCents
profitCents = totalSaleCents - costCents
marginPct = totalSaleCents > 0 ? (profitCents / totalSaleCents) * 100 : 0
```

#### Product intake unit cost

```text
unitCostCents = totalCostCents > 0 && qty > 0 ? round(totalCostCents / qty) : 0
```

#### Overhead totals

```text
totalCents = subTotalCents + shippingCents - discountCents
unitCostCents = qty > 0 ? round((subTotalCents - discountCents) / qty) : 0
```

#### Division cost

```text
costCents = originalCostCents > 0 ? round(originalCostCents / max(1, totalParts)) : 0
```

If all rules are deleted, the defaults can be created again when the app detects
that the business has no rules. To intentionally stop a calculation, deactivate
or replace its rule instead of relying on an empty rule list.

### Safest procedure for changing logic

1. Take a screenshot or copy the current rule text to a separate file.
2. Select **New Rule**, or edit the existing rule.
3. Keep **Active** turned off.
4. Choose the correct Module, Trigger, and Type.
5. Enter the rule using only the allowed fields and syntax.
6. Use the prefilled sample JSON or enter representative numeric sample values.
7. Select **Run Preview**.
8. Confirm the output row and changed fields.
9. Test boundary cases such as zero quantity, zero price, and a large value.
10. Save the rule as an inactive draft.
11. If replacing a default rule, deactivate the old rule so both do not run.
12. Activate the new rule.
13. Perform one real test entry.
14. Review **Execution History**.
15. Verify the saved row and the affected inventory/dashboard totals.

### Supported modules and triggers

| Module | Before Save | After Save | After Import | Manual |
| --- | --- | --- | --- | --- |
| Sales | Yes | Yes | Yes | Yes |
| Product Intake | Yes | Yes | Yes | Yes |
| Overhead Expenses | Yes | Yes | Yes | Yes |
| Transplant Log | Yes | No | No | No |
| Plant Intake | Yes | Yes | Yes | Yes |
| Treatment Tracking | Yes | Yes | Yes | Yes |
| Fertilizer Log | Yes | Yes | Yes | Yes |
| Schedule | Yes | Yes | No | Yes |

Schedule has no workbook import workflow, so After Import is unavailable.

### Trigger meanings

- **Before Save:** runs for an interactive create/update and before each
  applicable imported row is stored.
- **After Save:** runs during an interactive create/update after the Before Save
  rules. It does not run for workbook imports.
- **After Import:** runs for imported rows after their Before Save rules. It
  does not run for ordinary forms.
- **Manual:** runs only when an Owner selects a saved row in the Manual
  Execution section and chooses **Run Rules**.

Using Manual Execution does not run a Before Save rule. A rule intended for the
Manual runner must use the Manual trigger.

### Rule order

Active rules run in their stored order. Output from one rule becomes input to
the next rule for the same row. If two active rules write the same field, the
later rule wins unless an earlier rule fails.

There is no reorder control in the current interface. Rules are normally stored
in creation order.

### Fields by module

Field names are case-sensitive and must be entered exactly as shown.

#### Plant Intake

Readable and writable:

```text
qty
costCents
msrpCents
```

#### Sales

Readable:

```text
qty
salePriceCents
costCents
totalSaleCents
profitCents
marginPct
```

Writable:

```text
qty
totalSaleCents
profitCents
marginPct
```

`salePriceCents` and `costCents` can be used in expressions but cannot be
changed by App Logic.

#### Product Intake

Readable:

```text
totalCostCents
qty
unitCostCents
```

Writable:

```text
unitCostCents
```

#### Overhead Expenses

Readable:

```text
subTotalCents
shippingCents
discountCents
qty
unitCostCents
totalCents
```

Writable:

```text
unitCostCents
totalCents
```

#### Transplant Log

Readable:

```text
originalCostCents
totalParts
costCents
```

#### Treatment Tracking and Fertilizer Log

Readable and writable:

```text
dateEpochDays
nextEarliestEpochDays
nextLatestEpochDays
```

An epoch-day value is the whole number of UTC days since January 1, 1970.
Optional dates use `0` for no date. For example, a seven-day treatment window
can set `nextEarliestEpochDays = dateEpochDays + 7`.

#### Schedule

Readable and writable:

```text
dateEpochDays
startMinutes
endMinutes
```

`startMinutes` and `endMinutes` are minutes after midnight from `0` through
`1439`. A Schedule rule must leave `dateEpochDays` as a valid, nonzero date.

Writable:

```text
costCents
```

### Formula type

Formula rules contain one assignment per line:

```text
field = expression
```

Example:

```text
totalSaleCents = qty * salePriceCents
profitCents = totalSaleCents - costCents
marginPct = totalSaleCents > 0 ? (profitCents / totalSaleCents) * 100 : 0
```

Do not add `SET` in Formula mode.

### Script type

Script rules support only three commands:

```text
REQUIRE booleanExpression
SET writableField = numericExpression
ACTION SYNC_PRODUCT_MASTER
```

Example:

```text
REQUIRE qty > 0
SET totalSaleCents = qty * salePriceCents
SET profitCents = totalSaleCents - costCents
```

`REQUIRE` must produce true or false. When false, execution stops with a
`REQUIREMENT` error and the business operation is rejected.

`SET` must produce a finite number and must target a writable field for the
selected module.

### Governed action

The only supported action is:

```text
ACTION SYNC_PRODUCT_MASTER
```

It refreshes the underlying Product record from a Plant Intake, Sales, or
Product Intake row.
It is allowed only for:

- Plant Intake, Sales, or Product Intake; and
- After Save or Manual triggers.

Preview reports the action intent but never executes it.

No other action name is supported.

### Expressions

Supported operators:

| Purpose | Operators |
| --- | --- |
| Arithmetic | `+`, `-`, `*`, `/`, `%` |
| Comparison | `<`, `<=`, `>`, `>=`, `==`, `===`, `!=`, `!==` |
| Boolean | `!`, `&&`, `||` |
| Conditional | `condition ? valueWhenTrue : valueWhenFalse` |

Supported helpers:

```text
abs(value)
ceil(value)
floor(value)
max(value1, value2, ...)
min(value1, value2, ...)
round(value)
```

Parentheses are supported.

Logical operators and conditional expressions short-circuit. For example, the
division below is not evaluated when quantity is zero:

```text
unitCostCents = qty > 0 ? round(totalCostCents / qty) : 0
```

### Comments and statement separators

An entire comment line may start with:

```text
#
```

or:

```text
//
```

Statements may be separated by new lines or semicolons. New lines are clearer
and are recommended.

Do not put a trailing comment after a statement.

### Dollars, cents, and percentages

App Logic uses cents:

| Dollar amount | App Logic value |
| --- | ---: |
| `$0.99` | `99` |
| `$15.00` | `1500` |
| `$48.75` | `4875` |

Percentages are ordinary numbers. A `25` margin value means `25%`, not `0.25%`.

Example 10% reduction:

```text
round(totalSaleCents * 0.90)
```

Decimal numeric literals are allowed.

### How to convert existing business logic

#### Convert an Excel IF

Excel:

```text
=IF(Qty>0,ROUND(TotalCost/Qty,0),0)
```

App Logic Formula:

```text
unitCostCents = qty > 0 ? round(totalCostCents / qty) : 0
```

Conversion rules:

- `IF(condition, yes, no)` becomes `condition ? yes : no`;
- `ROUND(...)` becomes `round(...)`;
- use the exact App Logic field names; and
- remove the leading Excel `=`.

#### Convert JavaScript validation and assignments

JavaScript:

```javascript
if (qty <= 0) {
  throw new Error("Quantity is required");
}

const total = qty * salePriceCents;
const profit = total - costCents;
```

App Logic Script:

```text
REQUIRE qty > 0
SET totalSaleCents = qty * salePriceCents
SET profitCents = totalSaleCents - costCents
```

There are no variables such as `const total`. Write directly to an approved
output field.

#### Convert Math helpers

| JavaScript | App Logic |
| --- | --- |
| `Math.round(value)` | `round(value)` |
| `Math.floor(value)` | `floor(value)` |
| `Math.ceil(value)` | `ceil(value)` |
| `Math.abs(value)` | `abs(value)` |
| `Math.max(a, b)` | `max(a, b)` |
| `Math.min(a, b)` | `min(a, b)` |

Do not include `Math.` because property access is blocked.

#### Convert an if/else calculation

Plain-language rule:

> If quantity is at least 10, reduce the total sale by 10%; otherwise use the
> normal total.

App Logic Formula:

```text
totalSaleCents = qty >= 10 ? round(qty * salePriceCents * 0.90) : qty * salePriceCents
profitCents = totalSaleCents - costCents
marginPct = totalSaleCents > 0 ? (profitCents / totalSaleCents) * 100 : 0
```

This changes the total but does not change the stored per-unit sale price,
because `salePriceCents` is read-only to App Logic.

### Sales: unit cost instead of total cost

If the Sales Cost field contains the unit cost for one item, use:

```text
qty = max(1, floor(qty))
totalSaleCents = qty * salePriceCents
profitCents = totalSaleCents - (qty * costCents)
marginPct = totalSaleCents > 0 ? (profitCents / totalSaleCents) * 100 : 0
```

If Sales Cost contains the total cost for the entire transaction, keep the
default:

```text
profitCents = totalSaleCents - costCents
```

Choose one convention and use it consistently in forms and workbooks.

### Overhead: include shipping in unit cost

The default Actual Total includes shipping, but the default unit cost does not.
To allocate shipping across the units:

```text
totalCents = subTotalCents + shippingCents - discountCents
unitCostCents = qty > 0 ? round(totalCents / qty) : 0
```

### Product Intake: reject a zero quantity

Use Script mode:

```text
REQUIRE qty > 0
SET unitCostCents = round(totalCostCents / qty)
```

When quantity is zero, the row is rejected instead of receiving a zero unit
cost.

### Sales: prevent a zero-price transaction

Use Script mode:

```text
REQUIRE qty > 0
REQUIRE salePriceCents > 0
SET totalSaleCents = qty * salePriceCents
SET profitCents = totalSaleCents - costCents
SET marginPct = (profitCents / totalSaleCents) * 100
```

### Preview

Preview uses the same parser and calculation runtime as saved rules.

1. Enter a Formula or Script.
2. Review the sample row JSON.
3. Use numeric values only.
4. Select **Run Preview**.
5. Review changed fields, output row, statement count, and action intents.

Preview does not save a business row and does not execute
`SYNC_PRODUCT_MASTER`.

Every preview is recorded in Execution History.

### Manual execution

Manual execution is available for:

- Sales;
- Product Intake; and
- Overhead Expenses.

To use it:

1. create and activate a rule whose Trigger is **Manual**;
2. select the module under Manual Execution;
3. select **Load Rows**;
4. choose a recent saved row;
5. select **Run Rules**;
6. verify the updated row; and
7. inspect Execution History.

A Before Save, After Save, or After Import rule will not run from the Manual
runner.

### Execution history

Execution History shows:

- success or failure;
- rule name;
- module and trigger;
- execution source;
- source row ID when available;
- statement and action counts;
- duration;
- timestamp; and
- sanitized error code and message.

If a form does not leave the entry screen after selecting Save, check Execution
History for an active rule failure.

Common error codes include:

- `INPUT`: invalid module, trigger, sample JSON, or numeric input;
- `VALIDATION`: the previewed rule violates the module or syntax contract;
- `SYNTAX`: invalid expression structure;
- `TYPE`: expression produced the wrong type;
- `ARITHMETIC`: invalid math, including division by zero or a non-finite result;
- `REQUIREMENT`: a `REQUIRE` expression was false;
- `LIMIT`: a structural or execution limit was exceeded; and
- `ACTION`: a governed action failed.

### App Logic errors and fixes

#### "scripts only support SET, REQUIRE, and governed ACTION statements"

The rule contains JavaScript, a bare assignment, or another unsupported command.
Use Script syntax:

```text
SET field = expression
```

or change the rule Type to Formula and remove `SET`.

#### "Unknown field or helper"

The field is misspelled, has the wrong capitalization, belongs to another
module, or is not part of the safe contract. Copy the field name from the
**Available fields** line beneath the editor.

#### "is not a writable output field"

The value may be read but cannot be changed. Choose one of the fields listed
under **Writable outputs**.

#### "Property access is not allowed"

Remove syntax such as:

```text
Math.round(...)
row.qty
object.value
```

Use:

```text
round(...)
qty
```

#### "This rule uses a blocked keyword"

Remove JavaScript or server keywords such as `function`, `fetch`, `window`,
`process`, `import`, `eval`, or `constructor`.

#### Requirement failure

The data did not pass a `REQUIRE` line. Either correct the row input or change
the business requirement.

#### Division or modulo by zero

Guard the expression:

```text
unitCostCents = qty > 0 ? round(totalCostCents / qty) : 0
```

### Structural limits

Per rule:

- 100 statements;
- 512 tokens per expression;
- 512 expression nodes per expression; and
- 32 expression nesting levels.

Per module/trigger execution:

- 25 active rules;
- 250 total statements; and
- 10 governed action intents.

Normal business rules should remain much smaller than these limits.

### Unsupported App Logic

App Logic cannot currently:

- change text fields, SKUs, categories, statuses, notes, or names;
- create arbitrary new fields;
- read another row;
- aggregate multiple rows;
- query current inventory;
- send email or notifications;
- call an API;
- run JavaScript or SQL;
- update an arbitrary database table;
- change records other than the current row, except through the governed
  `SYNC_PRODUCT_MASTER` action.

A requirement outside the supported numeric row fields requires an application
code change, not a different App Logic expression.

For implementation-level runtime details, see
[docs/app-logic-runtime.md](docs/app-logic-runtime.md).

## Troubleshooting

### Save appears to do nothing

1. Wait a few seconds and select Save only once.
2. Confirm all required fields are filled.
3. Confirm numeric fields are valid and nonnegative where required.
4. As an Owner, open Settings > App Logic > Execution History.
5. Look for a failed rule at the time of the save.
6. Preview the failing rule with the same values.
7. Deactivate the rule if normal operations must resume while it is corrected.

Some new-record forms do not currently display the returned App Logic error
inline, so the form may simply remain open.

### Calculated amount is wrong

Check:

- whether the business uses dollars in the normal form and cents in App Logic;
- whether Sales Cost means total transaction cost or unit cost;
- whether more than one active rule writes the same field;
- rule order;
- whether the record was entered interactively or imported;
- the selected trigger; and
- Execution History.

### Manual rule did not run

Confirm that:

- the rule is Active;
- its Trigger is Manual;
- the module supports Manual execution (all connected modules except Transplant
  Log);
- rows were loaded;
- a row was selected; and
- Execution History shows the attempt.

### Import says "sheet not found"

Check the exact sheet name and minimum header names in
[Workbook import](#workbook-import). The importer does not guess unrelated sheet
names.

### Import inserted zero rows

Check the report for:

- **already existed:** the duplicate key matched an existing row;
- **skipped:** a required date, SKU, or identity field was missing;
- **sheet not found:** required headers were not recognized; or
- a top-level error caused by an active App Logic rule.

### Inventory did not decrease after a sale

Compare the Sales SKU and Intake SKU character for character. Inventory is
derived by exact SKU matching.

Also confirm that:

- the sale quantity is positive;
- the sale is in the correct business; and
- the intake identity fields were not edited after the sale, which can
  regenerate the intake SKU.

### Dashboard total is wrong

Check:

- the selected tax year;
- record dates;
- Sales totals;
- Sales cost convention;
- Overhead categories and totals;
- exact plant status spelling; and
- App Logic Execution History.

Records without a date use their creation timestamp for dashboard date ranges.

### Camera scanner does not start

Confirm:

- the page uses HTTPS or localhost;
- browser camera permission is allowed;
- another app is not using the camera; and
- the device has a camera.

Use **Scan photo** or manual entry when live scanning is unavailable.

### User cannot open Settings

Confirm the active business and membership role:

- Employee cannot open business, import, team, or App Logic settings.
- Manager can open Business and Import.
- Owner can open all settings.

### Data appears under the wrong company

Stop editing and check the business switcher in the top bar. Each business is
isolated. Switch to the intended business before making corrections.

## Current limitations

The following behavior is present in this repository and should be understood
before relying on the app:

1. **Photo support is incomplete.** Plant photo buttons and Product Intake photo
   selection do not currently persist and display record photos. Inventory photo
   cells are placeholders.
2. **Top-bar Refresh is visual only.** Use the browser reload command when a
   manual refresh is required.
3. **Selection mode has no bulk operation.** It marks rows but does not currently
   update or delete them in bulk.
4. **Top-bar search is not universal.** Use module filters on Product Intake,
   Overhead Expenses, Treatment Tracking, and Fertilizer Log.
5. **Sales has placeholder columns.** Customer Name is not stored by the current
   Sales model and the table displays Status as Sold.
6. **Treatment Notes are not persisted.** The new Treatment form displays a
   Notes field, but the current create/update data contract does not save it.
7. **Treatment and Fertilizer next dates are read-only after creation** in the
   current tables.
8. **Overhead Shipping cannot be edited from the list/detail view.** It can be
   entered during creation or import and is used in recalculation.
9. **Employee compensation inline editing has inconsistent dollars/cents
    conversion.** Enter the initial amount through Add Employee and verify any
    later inline wage edit immediately.
10. **The Schedule does not edit existing shifts.** Delete and recreate a shift.
11. **Raw transaction export is not provided.** The Dashboard exports a tax
    summary CSV only.
12. **Some new-record forms do not show server-side rule errors inline.** Check
    App Logic Execution History when Save leaves the form open.
13. **Plant Intake cost labeling is ambiguous.** The form says Total Cost while
    parts of the inventory calculation treat the stored amount as a cost that is
    multiplied by quantity.
14. **Operational permissions are broad.** All active members, including the
    Employee role, can currently edit and delete operational data, employees,
    and schedule entries.

These items require application code changes if different behavior is needed.

## Data-safety and handoff checklist

Before transferring ownership or ending support:

- [ ] Confirm the production URL.
- [ ] Confirm the primary Owner can sign in.
- [ ] Confirm there is at least one additional Owner if continuity requires it.
- [ ] Transfer control of the domain and DNS account.
- [ ] Transfer control of the VPS or hosting account.
- [ ] Transfer control of the Supabase project.
- [ ] Transfer control of the Clerk application.
- [ ] Transfer repository access.
- [ ] Transfer any deployment credentials through a secure password manager,
      not through this README.
- [ ] Document the current production branch and commit.
- [ ] Verify the latest database migration is deployed.
- [ ] Create and test a database backup according to the Supabase plan.
- [ ] Preserve the original import workbooks.
- [ ] Review active App Logic rules and copy them into a handoff archive.
- [ ] Export the current accountant CSV for comparison.
- [ ] Record all known limitations and outstanding issues.
- [ ] Remove former contractors' access after the transfer is confirmed.

Never commit real passwords, private keys, Clerk secrets, database URLs, or
customer data to Git.

## Developer setup

### Stack

- Next.js 16
- React 19
- TypeScript 5
- Prisma 7
- Supabase Postgres
- Clerk authentication
- Tailwind CSS 4

### Local installation

Use a current Node.js LTS release compatible with Next.js 16.

```bash
npm ci
npm run db:generate
npm run dev
```

Open:

```text
http://localhost:3000
```

On Windows PowerShell systems that block `npm.ps1`, use:

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run dev
```

### Environment variables

Create `.env` locally or `/etc/blooming-starr.env` on the production VPS.

```env
DATABASE_URL=postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_live_your_clerk_secret_key
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

Do not reuse the example values.

### Database

Generate Prisma Client:

```bash
npm run db:generate
```

Apply committed production migrations:

```bash
npm run db:migrate
```

Push the schema directly only in an appropriate development environment:

```bash
npm run db:push
```

The application scopes business data through BusinessContext-aware
repositories. Supabase/Postgres row-level security verification is a separate
explicit test because it requires a disposable configured database.

### Build

```bash
npm run build
```

The build command runs Prisma generation before the Next.js build.

### Run

Full project checkout:

```bash
npm run start
```

Standalone production server:

```bash
npm run start:standalone
```

## Production deployment

The included deployment model uses:

- a Next.js standalone server;
- a Namecheap Ubuntu VPS;
- Caddy as the HTTPS reverse proxy;
- systemd as the process service;
- Supabase Postgres; and
- Clerk authentication.

Example templates:

- [deploy/Caddyfile.example](deploy/Caddyfile.example)
- [deploy/blooming-starr.service.example](deploy/blooming-starr.service.example)

Recommended server paths:

```text
/var/www/blooming-starr/app/current
/etc/blooming-starr.env
```

After copying the service file to
`/etc/systemd/system/blooming-starr.service`:

```bash
sudo systemctl daemon-reload
sudo systemctl enable blooming-starr
sudo systemctl restart blooming-starr
```

Check service status and logs:

```bash
sudo systemctl status blooming-starr
sudo journalctl -u blooming-starr -n 200 --no-pager
```

Health endpoint:

```text
https://yourdomain.com/api/health
```

Camera scanning requires the production site to use HTTPS.

### Recommended deployment order

```bash
npm ci
npm run db:migrate
npm run build
sudo systemctl restart blooming-starr
```

Then verify:

1. `/api/health`;
2. sign-in;
3. dashboard load;
4. one read-only module;
5. App Logic page as Owner;
6. camera permission over HTTPS; and
7. systemd logs.

## Testing and verification

### Lint

```bash
npm run lint
```

### Full build

```bash
npm run build
```

### Offline tests

```bash
npm test
```

### App Logic tests

```bash
npm run test:app-logic
```

The focused App Logic suite covers:

- contract field restrictions;
- formulas and scripts;
- preview;
- manual execution;
- lifecycle triggers;
- tenant isolation;
- governed actions;
- execution history;
- deterministic runtime limits; and
- rejection of arbitrary JavaScript.

### Isolation tests

Offline isolation suite:

```bash
npm run test:isolation
```

Connected disposable-database isolation verification:

```bash
npm run test:isolation:db
```

Do not point the connected isolation verifier at a production database.

### Final release check

Before a production handoff or release:

```bash
npm run check
npm test
```

Also perform a manual smoke test of sign-in, business switching, one
create/edit/delete workflow, workbook import against a disposable business,
Dashboard CSV export, App Logic Preview, and camera scanning over HTTPS.
