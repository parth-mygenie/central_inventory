# CR-023 Manual Testing Guide
**Date:** 1 June 2026  
**Scope:** All 6 Batches (17 bugs fixed)  
**App URL:** https://api-sync-staging.preview.emergentagent.com

---

## Test Accounts

| Role | Email | Password | What you see |
|------|-------|----------|-------------|
| Central Store (Boss) | abhishek@kalabahia.com | Qplazm@10 | Everything — approvals, dispatch, all stores |
| Master Store (Mid) | owner@democentral1.com | Qplazm@10 | Transfer management, own outlets |
| Outlet (Bottom) | owner@demofranchise1.com | Qplazm@10 | Request stock, receive, wastage |

**Note:** The app talks to a real backend (preprod.mygenie.online) which is slow. After login, wait 15–20 seconds for data to load. Loading shimmer bars are normal.

---

## BATCH 1 — Store Health Grid (Operations Hub)

**Login as:** Central Store (abhishek@kalabahia.com)

### Test 1.1: Store Health Section Exists
1. After login, you land on **Operations Hub**
2. Scroll down past the KPI cards (Stale Approvals, Ready to Dispatch, etc.)
3. Look for **"STORE HEALTH ACROSS HIERARCHY"** section
4. **Expected:** You see 6 store cards in a 2-column grid

### Test 1.2: Store Cards Show Real Names
Each card should show a real store name, not "Store #783" or "—":
- DemoFranchise1
- DemoFranchise2
- DemoFranchise3
- DemoFranchise4
- TestFranchise_P23_Central
- TestFranchise_P23_Probe

### Test 1.3: Health Badges Are Correct
- Cards with stock problems show a **red badge** like "2 out of stock"
- Cards with no problems show a **green "Healthy" badge**
- Below the badge, colored dots show breakdown: "2 out · 2 low · 4 items"
- DemoFranchise4 should show "Healthy" with "4 ok · 4 items"

### Test 1.4: Cards Are Clickable
- Click any store card → it should navigate to that store's detail page (/store/783 etc.)

### Test 1.5: KPI Cards Still Work
- Top of the page should show 4 KPI cards: Stale Approvals, Ready to Dispatch, Pending Receives, Low Stock Items
- Numbers should be real (e.g., Stale Approvals = 3, Low Stock = 67)

### Test 1.6: Today's Activity Shows Real Names
- Scroll to "TODAY'S ACTIVITY" section
- Transfer entries should say "to DemoFranchise1" or "to DemoCentral1" — not "to Store #783"

### Test 1.7: Non-Central Users Don't See Store Health
- Logout → Login as **Outlet** (owner@demofranchise1.com)
- Operations Hub should NOT show "Store Health Across Hierarchy" section
- You should see your own stock health and quick actions only

---

## BATCH 2 — Restaurant Names Everywhere

**Login as:** Central Store

### Test 2.1: Pending Queues — Approval Cards
1. Click **Pending Queues** in sidebar
2. Wait for data to load (15–20 seconds)
3. Look at the approval cards in the **Approvals** tab
4. **Expected:** Each card shows real names like "My Genie → DemoFranchise4"
5. **Not expected:** "— → —" or "Store #781 → Store #783"
6. The subtitle below should say something like "My Genie requesting from you"
7. Footer should say "1 item · Requested by My Genie"

### Test 2.2: Pending Queues — Other Tabs
1. Click **Ready to Dispatch** tab
2. Click **Receives** tab
3. Click **My Requests** tab
4. In all tabs, transfer cards should show real store names, not "—"

### Test 2.3: Transfer Detail — From/To Cards
1. From Pending Queues, click any approval card (e.g., PO-0074)
2. Wait for the transfer detail page to load
3. Look at the **FROM** and **TO** cards
4. **Expected:**
   - FROM: "My Genie" with a "Central Store" badge
   - TO: "DemoFranchise4" with an "Outlet" badge
5. **Not expected:** "—" or blank names

### Test 2.4: History & Ledger — Source/Destination Columns
1. Click **History & Ledger** in sidebar
2. Wait for the table to load
3. Look at the **Source** and **Destination** columns
4. **Expected:** "My Genie" in Source, "DemoFranchise1", "DemoCentral1", etc. in Destination
5. **Not expected:** "—" in any row
6. Try switching between "All", "Incoming", "Outgoing" direction filters — names should persist

### Test 2.5: Stock Ledger Tab
1. On History & Ledger page, click the **Stock Ledger** tab
2. Wait for it to load (it fetches details for each transfer — may take 30+ seconds)
3. The **Store** and **Counterparty** columns should show real names

---

## BATCH 3 — Transfer Detail Intelligence

**Login as:** Central Store

### Test 3.1: Requester Store Snapshot Appears
1. Go to **Pending Queues** → click a transfer with status **"Requested"** (e.g., PO-0074)
2. Wait 15–30 seconds for the snapshot to load
3. Below the FROM/TO cards, look for **"REQUESTER STORE SNAPSHOT — DEMOFRANCHISE4"**
4. **Expected:**
   - Blue left border on the card
   - 4 stat cards at top: Out of Stock | Low Stock | Adequate | Total Items
   - A table below with columns: Item | Stock Level | Min Threshold | Status | In This Request?
   - Status column shows colored badges: OUT (red), LOW (amber), OK (green)
   - "In This Request?" shows "Yes — 0.1 kg" for items in the request, "Not requested" for others
   - Footer note if applicable: "X out-of-stock items not included in this request"

### Test 3.2: Approval Impact Table
1. Below the snapshot, look for **"APPROVAL IMPACT ON YOUR STOCK"**
2. **Expected:**
   - Amber left border on the card
   - Table: Item | Requested | Your Stock | After Approval
   - e.g., "patri kg | 0.1 kg | 64.83 kg | 64.73 kg"
   - Amber footer: "Approving will reduce your stock as shown above"
   - If "After Approval" goes negative, the number shows in red

### Test 3.3: Snapshot Hidden for Non-Central
1. Logout → Login as **Outlet** (owner@demofranchise1.com)
2. Navigate to any transfer detail page
3. **Expected:** No "Requester Store Snapshot" or "Approval Impact" sections visible

### Test 3.4: Snapshot Hidden for Non-Requested Status
1. Login as Central → go to History & Ledger → click a **Dispatched** or **Received** transfer
2. **Expected:** No snapshot or impact sections (they only show for Requested/Approved/Partially Approved)

### Test 3.5: Loading State
1. When the snapshot is loading, you should see a spinner with "Loading requester store snapshot..."
2. It should not block the rest of the page

---

## BATCH 4 — Consumption Intelligence + Dispatch Auto-Detect

**Login as:** Central Store

### Test 4.1: Consumption Report — New Columns
1. Click **Consumption Report** in sidebar
2. Set a date range that has consumption data (try a wider range like past 30 days)
3. Click **Generate Report**
4. If data exists, the Ingredient Summary table should have these columns:
   - Ingredient | Category | Opening | Consumed | Closing | **Current Stock** | **Days of Cover** | **Trend**
5. **Current Stock:** Shows your current inventory quantity (from stock-inventory API)
6. **Days of Cover:** Shows "~Xd" — how many days the current stock will last based on consumption rate
   - Red if < 3 days, amber if < 7 days
7. **Trend:** Shows "Normal" (green badge) or "Above Avg" (amber badge)

### Test 4.2: Consumption Report — No Data
1. If the date range has no consumption, you'll see "No consumption recorded"
2. This is expected — the columns will appear when data exists

### Test 4.3: Direct Dispatch — "What This Store Needs"
1. Click **Operations Hub** → **Dispatch Stock** (or navigate to /dispatch/new)
2. Wait for the page to load
3. Select a **Destination Store** from the dropdown (e.g., "DemoFranchise1 (Outlet)")
4. Wait 10–15 seconds for destination stock to load
5. **Expected:** A new section appears below the destination selector:
   - **"WHAT THIS STORE NEEDS (X ITEMS)"** with amber left border
   - Table: Item | Their Stock | Min Threshold | Gap | Your Stock
   - Items with 0 stock show "OUT" red badge
   - Gap column shows how much they're short
   - Your Stock column shows what you have available
   - Footer: "Items below minimum threshold at the destination store."

### Test 4.4: Dispatch — Section Hidden Until Destination Selected
1. Before selecting a destination, the "What This Store Needs" section should NOT be visible
2. While loading, a spinner says "Analyzing destination stock..."

### Test 4.5: Dispatch — Change Destination
1. Select a different destination store
2. The "What This Store Needs" table should update with that store's data

---

## BATCH 5 — Dialog Intelligence + Hierarchy Health

**Login as:** Central Store

### Test 5.1: Hierarchy Summary — Health Columns
1. Click **Hierarchy Summary** in sidebar
2. Wait 15–20 seconds for health data to load
3. Table columns should be: Store | Sent | Received | Txns | **Out of Stock** | **Low Stock** | **Adequate**
4. **Expected:**
   - OUT OF STOCK column shows red badges with counts (e.g., "182")
   - LOW STOCK column shows amber counts
   - ADEQUATE column shows green counts
   - Stores with high out-of-stock have a red left border
5. Switch between **Master Stores** and **Outlets** tabs — both should have health columns

### Test 5.2: Hierarchy Summary — Health Loading
1. When health data is still loading, the columns show "—"
2. Once loaded, they switch to actual numbers

### Test 5.3: Receive Dialog — Comparison Badges
1. To test this, you need a transfer in **Dispatched** status where you are the receiver
2. Login as **Outlet** (owner@demofranchise1.com)
3. Go to **Pending Queues** → **Receives** tab → click a dispatched transfer → click **Receive**
4. **Expected in the dialog:**
   - Each line item shows: "Dispatched: X kg | Requested: Y kg"
   - If they match: green "Match" badge
   - If they differ: amber badge "Z less than requested" or "Z more than requested"
   - Below the items: green box "After receiving:" showing "+X kg" per item
5. Toggle "Partial Receive" on — the comparison and summary should still show

### Test 5.4: Approve Dialog — FEFO Badges
1. Login as **Central Store**
2. Go to Pending Queues → click a **Requested** transfer → click **Partial Approve**
3. Check a line item checkbox to include it
4. In the **Source segment** dropdown:
   - Segments should be sorted by expiry date (nearest first)
   - Nearest-expiry segment should have a blue **"FEFO"** badge
   - Segments expiring within 30 days show amber **"Exp Xd"** badge
   - Segments expiring after 30 days show gray **"Exp Xd"** badge
5. When you include a line, the nearest-expiry segment should be **auto-selected**
6. If you enter a qty larger than the segment's available amount, an amber warning appears:
   "Approved qty (X) exceeds segment availability (Y)"

### Test 5.5: Dispute Resolution Dialog — Impact Text
1. This can only be tested if a transfer is in **receive_dispute_pending** status
2. If you can trigger one: go to the transfer detail → click **Resolve Dispute**
3. The **Accept** card should show explanation:
   "Acknowledge the damage. X rejected written off. No stock returns to sender. Transfer closes as partially received."
4. The **Reject** card should show:
   "Dispute the claim. Transfer reverts to dispatched. Destination must re-receive. Use if damage claim is incorrect."

---

## BATCH 6 — Catalogues + Polish

**Login as:** Central Store

### Test 6.1: Ingredients — "Recipes" Column
1. Click **Ingredients** in sidebar
2. The table should have a **"Recipes"** column (between Status and Vendor)
3. Each row shows a number — how many recipes use that ingredient
4. Currently all show "0" because no recipes exist yet
5. Once recipes are created, the count will update automatically

### Test 6.2: Products — "Has Recipe" Column
1. Click **Products** in sidebar → **Foods** tab
2. The table should have a **"Has Recipe"** column
3. If a food has a matching recipe, it shows green **"Yes"**
4. If not, it shows **"—"**
5. This uses actual recipe data, not a flag from the food record

### Test 6.3: Recipes — "Cost Mapped" Column
1. Click **Recipes** in sidebar → **Recipes** tab
2. The **"Cost Mapped"** column logic:
   - "No ingredients" — if recipe has zero ingredients
   - "Yes" (green) — if all ingredients have a purchase_price > 0
   - "Partial" (amber) — if some ingredients lack purchase_price

### Test 6.4: Addon Recipes — Same Cost Mapped Logic
1. Click **Addon Recipes** in sidebar
2. Same "Cost Mapped" column logic as regular recipes

### Test 6.5: Store Management — Push Status Column
1. Click **Store Management** in sidebar
2. Wait 10–15 seconds for push-form data to load
3. The **"Push Status"** column should show:
   - **"Stale — X items behind"** (amber badge) — if the child store is missing items from the parent
   - **"Synced"** (green badge) — if the child has all parent items
   - **"—"** — if push-form data is still loading
4. Stale stores show a **"Push Now"** button (filled/primary style)
5. Synced stores show a regular **"Push"** button (outline style)
6. Nested outlets (indented with └) may show "—" since push-form is only fetched for direct children

### Test 6.6: Source Selector — Available Qty
1. Go to **Direct Dispatch** → select a destination → add an item → select a segment
2. After selecting a segment, below the dropdown you should see:
   "Available: X in this segment"

### Test 6.7: Source Selector — Existing FEFO Badges
1. In the segment dropdown, segments with expiry dates show:
   - "[EXPIRED]" for expired segments (disabled, can't select)
   - "[Xd left - FEFO]" for near-expiry segments

---

## GENERAL CHECKS

### Navigation
- All sidebar links work: Operations Hub, Stock Inventory, Hierarchy Summary, Store Management, Pending Queues, History & Ledger, Consumption Report, Vendors, Ingredients, Products, Recipes, Addon Recipes, Settings
- Back button works on all detail pages
- Logout works and returns to login page

### Role Visibility
- **Central Store** sees all sidebar items including Store Management, Settings
- **Outlet** does NOT see Store Management, Hierarchy Summary (Master Stores tab)
- Store Health Grid only appears for Central Store

### Data Integrity
- No "undefined", "null", or "NaN" visible anywhere
- No JavaScript errors in browser console (open DevTools → Console tab)
- All numbers are formatted properly (no excessive decimals)

---

## KNOWN LIMITATIONS

1. **Slow loading:** The external POS API takes 4–30 seconds per call. This is not a bug — it's the upstream API speed.
2. **B10 not fixed:** Vendor purchase history columns are NOT implemented because no backend API exists for this.
3. **Consumption data:** The Consumption Report may show "No consumption recorded" if no orders have been placed in the POS system during the selected date range.
4. **Recipes column shows 0:** All ingredients show "0 recipes" because no recipes currently exist in the POS system. This will auto-populate when recipes are created.
5. **Foods tab empty:** The Products Foods tab may show empty if no foods exist in the POS catalog.
