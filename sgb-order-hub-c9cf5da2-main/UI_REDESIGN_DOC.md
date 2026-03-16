# SGB Agro Industries — Full UI Description for Redesign

## TECH STACK (current)
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui components
- Framer Motion for animations
- Recharts for charts
- Dark theme on Home page, light theme on dashboards
- TubelightNavBar for top navigation inside dashboards

---

## GLOBAL LAYOUT — DashboardLayout.tsx

Every dashboard page (except Home, OrderTracking, CustomerPortal) is wrapped in DashboardLayout.

### Header (sticky top bar, height 64px)
- Left: SGB logo image + "SGB Agro Industries" text (hidden on mobile)
- Center: TubelightNavBar — horizontal scrollable tab bar with icon + label per tab
  - Each tab is a link that sets ?tab= in the URL
  - Active tab has a glowing "tubelight" underline effect
- Right (admin only): "Switch Dashboard" dropdown button — lets admin jump to Billing/Packing/Shipping dashboards
- Far right: Avatar circle (initials of role) — clicking opens dropdown with role name, email, and "Sign Out" button

### Main content area
- Full height, scrollable
- Container max-width 7xl, padding 24px

---

## PAGE 1 — Home.tsx (route: /)

Full dark page. Background: #0a0f1e (very dark navy).

### Header bar
- Left: SGB logo + "SGB Agro Industries" in green-400 + "Internal Order Management System" in gray-400
- Border bottom, frosted glass effect

### Hero section (centered)
- Large SGB logo with green radial glow behind it
- H2: "SGB Agro Industries — Order Hub" (white, large)
- Subtitle paragraph in gray-400
- Small text: "Koppa, Karnataka | Est. 2020 | Elevate 2024 Award Winner 🏆"

### Role Cards (5 cards in a row, responsive grid)
Each card is a clickable link to /login?role=X
- Admin Portal — purple theme — Shield icon
- Billing Portal — blue theme — FileText icon
- Packing Portal — orange theme — Box icon
- Shipping Portal — green theme — Truck icon
- Sales Agent Portal — amber theme — Headphones icon
Each card: icon in colored circle, title, description text. Hover: lifts up, border glows.

### Login hint box (centered below cards)
- "Select your department above to sign in"
- Link: "📦 Customer? Track your order here →" → /customer

### Stats row (3 columns)
- "5" — Department Portals
- "Real-time" — Order Tracking
- "Automated" — Workflow System

### About + QR section (2 columns)
Left card: Company info grid — Company name, Location, Contact, Founded, Awards, tagline
Right card: WhatsApp QR code + instructions on how to order via WhatsApp bot

### Footer
- Copyright text, company info

---

---

## PAGE 2 — SalesAgentDashboard.tsx (route: /sales-agent)

Wrapped in DashboardLayout. Tabs in navbar: Dashboard, My Leads, Follow Ups, Products.

### Announcement Banner
- Shown at top if admin has posted an announcement for sales_agent role
- Yellow/amber strip with message text

### Profile Completion Banner (conditional)
- Shown if agent hasn't completed profile
- Amber background card: "Complete your profile to receive leads"
- Inline form: Phone input + City input + Save button + Dismiss button

### Tab: Dashboard
4 stat cards in a row:
- Leads Today (blue, Users icon)
- Calls Made (green, PhoneCall icon)
- Orders Submitted (purple, ShoppingCart icon)
- Revenue Closed (primary color, DollarSign icon) — shows ₹ value

### Tab: My Leads (default tab)
Shows TabbedLeads component with 5 sub-tabs:

Sub-tab bar (horizontal pill buttons):
1. "Follow Ups Today" — red badge count
2. "New Leads" — blue badge count
3. "In Progress" — amber badge count
4. "Submitted" — green badge count
5. "Upcoming Callbacks" — purple badge count

#### Follow Ups Today sub-tab
- Shows FollowUpSection: cards in a 2-column grid
- Each card shows: customer name, phone, product pills, callback time with urgency color
  - 🔴 Overdue (red), 🟡 Today (amber), 🟢 Upcoming (green)
- Buttons per card: "Call Now" (opens tel: link), "Mark Called", calendar icon (reschedule)

#### Other sub-tabs (New, In Progress, Submitted, Upcoming)
- Full-width table with columns: Customer | Products | City | Source | Received | Status | Actions
- Customer cell: name + phone + "Returning ×N" or "New" badge
- Products cell: green pill badges showing "Qty× Product Name"
- Source cell: colored pill — 📢 Ad (blue), 💬 Direct (gray), ✅ Agent (green)
- Status cell: badge (Not Called / Called / Callback Scheduled / Needs Follow-up / Not Interested / Submitted)
  - If callback scheduled: shows date below badge, red if overdue
- Actions cell (for active leads):
  - "Mark Called" button (if not_called)
  - Green WhatsApp icon button (opens wa.me link)
  - Red "Not Interested" button
  - "Submit Order" button (primary)
  - If submitted: "Sent to billing" text
  - If not_interested: "Closed" text

### Submit Order Dialog (opens when "Submit Order" clicked)
Full-screen dialog, max-width medium.
Title: "Submit Confirmed Order — [Customer Name]"

#### Customer info section (pre-filled from lead)
- Customer Name input
- Phone input (10-digit normalized)
- Delivery City input
- Delivery Address textarea
- Payment Method select: UPI / Bank Transfer / Cash on Delivery / Cheque
- If UPI selected: UPI ID input appears
- Notes textarea

#### Products section (multi-product)
- "Add Product" button at top
- Each product row:
  - Product dropdown (select from 6 SGB products)
  - Quantity number input
  - Agreed Price input (₹)
  - Floor price shown as hint text
  - Stock status badge: green "X units at [warehouse]" or red "Only X available" or amber "Split: X from W1 + Y from W2"
  - Trash icon to remove row
- Order Total shown at bottom: "Total: ₹X,XXX"

#### Submit button
- "Confirm & Send to Billing" — disabled if validation fails
- Validation: payment method required, delivery address required, all products filled, price >= floor price, stock available

### Not Interested Dialog (opens when "Not Interested" clicked)
Small dialog, max-width sm.
Title: "Not Interested — [Customer Name]"
- Reason dropdown (list of reasons like "Price too high", "Not available", "Genuinely not interested", etc.)
- If reason needs callback: Date + Time inputs appear
- If reason needs follow-up: Notes textarea appears
- If "Genuinely not interested": confirmation warning shown
- Buttons: Save/Schedule/Close Lead + Cancel

### Reschedule Dialog
Small dialog.
Title: "Reschedule — [Customer Name]"
- Date input + Time input
- Reschedule button + Cancel

---

---

## PAGE 3 — BillingDashboard.tsx (route: /billing)

Wrapped in DashboardLayout. Tabs in navbar: Dashboard, New Order, Order History, Inquiries.

### Announcement Banner (top)

### Tab: Dashboard
3 stat cards:
- Total Orders (count)
- Total Revenue (₹ sum)
- Pending Orders (count of non-shipped)

COD Pending section (amber card, shown only if there are shipped+unpaid orders):
- Title: "Pending COD Payments" with count badge
- Table: Customer | Amount | Date | Action ("Send Reminder" button — sends WhatsApp)

2 charts side by side:
- Pie chart: Payment Status breakdown (Paid / COD Pending / Cheque Pending / Pending)
- Bar chart: Daily Revenue last 7 days

### Tab: New Order (default tab)
Large form card titled "Create New Order".

#### Agent Confirmed Orders section (shown above form when leads exist)
Card titled "Agent Confirmed Orders" with amber badge count.
Table: Customer | Product | Agreed Price | City | Payment | Notes | Action
- Payment column: PaymentBadge component (colored badge)
- Action: "Create Order" button — clicking saves data to sessionStorage and switches to new-order tab with form pre-filled

#### New Order Form
Customer info (2-column grid):
- Customer Name* + Phone*
- Street Address* (full row)
- City* + State* + Pincode* (3-column grid)

Payment Method* (read-only badge if pre-filled from agent, otherwise dropdown):
- UPI — Paid immediately
- Bank Transfer — Paid immediately
- Cash on Delivery
- Cheque

Shipping section:
- Shipping Provider dropdown: VRL Logistics / India Post / DTDC / Blue Dart / Delhivery / Ekart / Other
- Shipping Charge input (₹)
- "VRL Calculator" button — opens VRL Calculator dialog

Fulfillment Plan (auto-computed when items + city filled):
- Loading spinner: "Computing fulfillment plan..."
- If single warehouse: green banner "✅ Single shipment from [Warehouse]"
- If split: amber banner "⚡ Split into N shipments"
- Warehouse override dropdown (manual selection)

Products section:
- Product dropdown + Quantity input + "Add" button
- Items table: Product Name | Qty | Unit Price | Total | Remove button
- Order Total shown below

Submit button: "Create Order" — validates all required fields

### VRL Calculator Dialog (opens from "VRL Calculator" button)
Title: "VRL Shipping Calculator"
- Per-leg table: From → To | Distance (km) | Weight (kg) | Charge (₹)
  - If split order: multiple rows, one per warehouse leg
  - Total row at bottom
- Rate per kg input (₹) — applies to all legs
- "Free Shipping (₹0)" toggle switch
- "Apply ₹X" button + Cancel

### Tab: Order History
Search bar at top.
Full orders table: Customer | Products | Amount | Payment | Status | Date | Actions
- Products column: green pill badges
- Payment column: PaymentBadge component
- Status column: colored badge
- Actions: "Invoice" button (opens print window), "Cancel" button (opens cancel dialog), "Payment" button (opens payment panel)

#### Cancel Order Dialog
Small dialog.
- "Reason for cancellation" textarea
- Confirm Cancel + Cancel buttons

#### Payment Panel (opens as inline panel or dialog)
Title: "Payment History — Order #XXXX"
3 stat boxes: Total | Paid | Remaining
Record Payment form:
- Amount input + Method select (Cash/UPI/Bank Transfer/Cheque)
- Transaction ref input + Notes input
- "Record Payment" button
Payment history table: Date | Amount | Method | Ref

### Tab: Inquiries
Shows WhatsApp inquiries from the bot.
(Handled by InquiryList component — table of inquiries with status and convert button)

---

---

## PAGE 4 — PackingDashboard.tsx (route: /packing)

Wrapped in DashboardLayout. Tabs in navbar: Dashboard, Pending Packing, Packed Orders.

### Announcement Banner (top)

### Tab: Dashboard
2 stat cards:
- Pending Packing (orange, Package icon)
- Packed (green, CheckCircle icon)

2 charts side by side:
- Line chart: "Packing Progress (Last 7 Days)" — two lines: Packed (green) + Pending (orange)
- Bar chart: "Daily Packing Volume" — total orders per day (blue bars)

### Tab: Pending Packing (default tab)
#### Priority Orders section (shown only if priority orders exist)
Red-bordered card titled "Priority Orders 🔥" with red badge count.
Table: Customer | Warehouse | Amount | Date | Actions
- Priority badge shown on customer name

#### Normal Orders card
Title: "Orders Ready for Packing" + search bar (top right)
Table: Customer | Warehouse | Amount | Date | Actions
- Customer cell: name + phone + Priority badge (red) if priority + "⚠ Damage" badge (orange) if damage reported
- Warehouse cell: badge showing warehouse name, or "⚠️ No warehouse" amber badge
- Actions cell:
  - "View Items" button — opens Order Items dialog
  - "Pack" button (with ClipboardList icon) — opens AI Packing Checklist dialog
  - "Damage" button (orange) — opens Damage Report dialog

### AI Packing Checklist Dialog (opens when "Pack" clicked)
Title: "Packing Checklist" with ClipboardList icon
Shows customer name below title.

Loading state: spinner + "AI planning optimal fulfillment..."

When loaded:
- AI explanation banner:
  - Green: "✅ Single shipment — [explanation text]"
  - Amber: "⚡ Split into N shipments — [explanation text]"

For each shipment:
- Bordered card with warehouse name + distance/days/estimated delivery date
- City badge (top right of card)
- Checklist items: each item has a checkbox + product name + quantity
  - When checked: green checkmark appears
- All items must be checked to enable confirm button

Bottom:
- "✅ Confirm Packing Plan" button (disabled until all checked)
- Cancel button
- Warning text if not all checked: "Check all N item(s) to confirm"

### Order Items Dialog (opens when "View Items" clicked)
Simple dialog.
Table: Product | Qty | Price

### Damage Report Dialog (opens when "Damage" clicked)
Title: "Report Damage" in orange with AlertTriangle icon
- Order name shown
- "Damage Description *" textarea (required)
- "Submit Damage Report" button (orange) + Cancel

### Tab: Packed Orders
Card titled "Packed Orders" + search bar.
Table: Customer | Amount | Status | Date
- Status shows "Ready for Shipping" text

---

---

## PAGE 5 — ShippingDashboard.tsx (route: /shipping)

Wrapped in DashboardLayout. Tabs in navbar: Dashboard, Pending, Shipped, Delivered, Failed, Pending Payments.

### Announcement Banner (top)
Page title: "Shipping Dashboard" (h1)

### Tab: Dashboard
4 stat cards in a 2x2 grid (mobile) / 4-column row (desktop):
- Pending Shipments (amber)
- In Transit (blue)
- Delivered (green)
- Total Revenue (₹)

Carrier Distribution pie chart (shown if any orders exist):
- Pie chart with carrier names and counts
- Colors: green, blue, amber, red, purple

### Tab: Pending (shows orders with status "ready_for_shipping")
Search bar (max-width sm).
Table card:
Columns: Customer | Products | Amount | Payment | City | Action
- Customer: name + phone
- Products: comma-separated "Product ×Qty" (truncated)
- Payment: PaymentBadge component
- Action: "Ship" button with Truck icon
  - Shows spinner while loading order details
  - Clicking opens Payment Confirmation Modal first

### Payment Confirmation Modal (opens before shipping)
Title: "Payment Check — [Customer Name]" with DollarSign icon
- Summary box: Order Total + Method
- Product list (small text): "Qty× Product Name" per item
- Conditional message:
  - UPI/Bank Transfer: green box "✅ Payment confirmed via [method]. Ready to ship!"
  - COD: amber box "💵 ₹X to collect on delivery. Proceed to ship."
  - Cheque: blue box "📃 Collect cheque of ₹X on delivery. Proceed to ship."
- "Proceed to Ship" button (full width)
- "Cancel" ghost button

### Ship Order Modal (opens after payment check)
Title: "Ship Order" with Truck icon
- Customer name shown
- Courier Provider* dropdown: VRL Logistics / India Post / DTDC / Blue Dart / Delhivery / Ekart / Other
  - Pre-filled from order's shipping_provider if set
- Tracking ID* input — auto-generated on load and when provider changes
  - Format: VRL + timestamp + random (for VRL), IP + ... (for India Post), TRK + ... (for others)
  - User can manually edit
- "Confirm Shipment" button + Cancel

On confirm: marks order shipped, sends WhatsApp notification with tracking + invoice details.

### Tab: Shipped (orders with status "shipped" or "out_for_delivery")
Search bar.
Table: Customer | Tracking | Provider | Payment | Status | Actions
- Tracking: monospace tracking ID + copy icon button
- Provider: colored pill badge (🚛 VRL in blue, 📮 India Post in orange)
- Status: dropdown select to update status (Shipped / Out for Delivery / Delivered / Failed)
  - Changing to "out_for_delivery" sends WhatsApp notification
  - Changing to "delivered" sends WhatsApp notification
- Actions: WhatsApp share button (green) + external link button (opens tracking page)

### Tab: Delivered
Table of delivered orders (similar structure).

### Tab: Failed
Table of failed delivery orders.

### Tab: Pending Payments
2 summary stat cards:
- COD Pending (amber) — total ₹ + count
- Cheque Pending (blue) — total ₹ + count

Section 1: "💵 COD Pending — Delivered Orders"
Table: Customer | Amount | City | Delivery Date | Action
- Action: "Mark Cash Collected" button (amber) — updates DB + sends WhatsApp confirmation

Section 2: "📃 Cheque Pending"
Table: Customer | Amount | City | Order Status | Action
- Action: "Mark Cheque Received" button (blue) — updates DB + sends WhatsApp confirmation

---

---

## PAGE 6 — AdminDashboard.tsx (route: /admin)

Wrapped in DashboardLayout. 14 tabs in navbar.

### Announcement Banner (top)

### Tab: Dashboard (default)
5 stat cards in a row:
- Total Orders (ShoppingCart, primary)
- Revenue (DollarSign, green) — ₹ value
- Pending Packing (Clock, amber)
- Packed (Package, blue)
- Shipped (Truck, primary)
Each card shows a trend % (e.g. "+12%").

Low Stock Alert section (shown if any products below threshold):
- Amber card with AlertTriangle icon
- Table: Product | Stock | Threshold

Charts section:
- Bar chart: Order Status breakdown (Pending/Packed/Shipped)
- Pie chart: Payment status distribution
- Line chart: Monthly Revenue (last 6 months)

Export button: "Export CSV" — downloads orders as CSV file.

### Tab: Orders
Search bar at top.
Full orders table: Customer | Products | Amount | Payment | Status | Date | Actions
- Actions: Invoice button (prints GST invoice in new tab), Cancel button

### Tab: Products
ProductManagement component.
- Table of all products: Name | Price | Stock | Actions
- "Add Product" button — opens add product dialog
- Edit/Delete per row

### Tab: Warehouses
WarehouseManagement component.
- Table of warehouses: Name | City | State | Actions
- "Add Warehouse" button

### Tab: Inventory
InventoryTable component.
- Table: Product | Warehouse | Stock Quantity | Actions
- Low stock items highlighted
- Update stock button per row

### Tab: Leads
AdminLeads component.
- Table of all WhatsApp inquiries/leads
- Columns: Customer | Phone | Products | City | Status | Agent | Created | Actions
- Smart Assign button — uses Haversine distance to assign nearest agent
- Filter by status

### Tab: Team
TeamManagement component.
- Table of employees: Name | Role | Email | City | Status | Actions
- "Add Employee" button — opens create employee dialog
- Reset password button per employee

### Tab: Performance
(Note: this tab exists in the tab list but was removed from the UI in Task 2)

### Tab: Announcements
AdminAnnouncements component.
- List of active announcements with target role, message, created date
- "New Announcement" button — opens form dialog
- Delete button per announcement

### Tab: Returns
ReturnsManagement component.
- Table of return requests
- Status management

### Tab: Complaints
Table of customer complaints from CustomerPortal.
- Columns: Customer | Phone | Order | Type | Description | Status | Date
- Update status dropdown per complaint

### Tab: Analytics
TerritoryAndTargets component + charts.
- Sales funnel chart
- Revenue by region
- Agent performance metrics

### Tab: Settings
Company settings form:
- GSTIN input
- Invoice prefix input
- Invoice counter input
- Default GST rate input
- Save button

### Tab: WhatsApp
WhatsApp inquiry management.
- InquiryList component showing bot-received inquiries
- Convert to lead button per inquiry

---

---

## PAGE 7 — OrderTracking.tsx (route: /track/:trackingId)

Public page — no login required. Light gradient background (primary/5 to primary/10).

### Loading state
Centered: pulsing Package icon + "Loading tracking information..."

### If tracking ID not found → Demo View
- Info banner: "📍 Demo tracking view — Shipment movement is simulated"
- Centered title: "Track Your Order" + tracking ID
- Status card (gradient): shows "Out for Delivery" badge + description + location + expected delivery
- Journey timeline card:
  - Vertical timeline with 6 steps (Order Placed → Packed → Shipped → In Transit → Reached City → Out for Delivery)
  - Each step: colored dot + status badge + description + timestamp + location
  - Active step (top) has primary-colored dot, rest are muted
  - Vertical line connecting dots

### If tracking ID found → Real View
- Title + tracking ID
- Status card: customer name + address + amount + carrier
- Split shipments card (if split order): shows each shipment with items and estimated delivery
- Delivery proof image (if available)
- Journey timeline: Order Placed → Packed → Shipped → (Delivered if delivered)

### Back to Home button (centered, bottom)

---

## PAGE 8 — CustomerPortal.tsx (route: /customer)

Public page. Light green gradient background.

### Header
- "SGB Agro Industries" (green-800, large)
- "Customer Self-Service Portal" (green-600)

### Step 1: Phone Entry
Card with Phone icon.
- Title: "Enter Your Phone Number"
- Subtitle: "We'll send a verification code to your WhatsApp"
- Phone input (10 digits only, numeric)
- "Send OTP via WhatsApp" button (green)
- Note: "You must have previously ordered from SGB Agro Industries"

### Step 2: OTP Verification
Card with CheckCircle icon.
- Title: "Enter OTP"
- Subtitle: "Check your WhatsApp for the 4-digit code sent to [phone]"
- Large centered OTP input (4 digits, tracking-widest style)
- "Verify & View Orders" button (green)
- "Change Phone Number" ghost button

### Step 3: Portal (after verification)
Loyalty card (if exists):
- Green-bordered card: Star icon + customer name + points available + tier badge (GOLD/SILVER/BRONZE)

Orders header: "Your Orders (N)" + Sign Out button

Order cards (one per order):
- Order ID (short) + date
- Status badge (colored by status)
- Address + amount + payment status
- Product list (bullet points)
- Buttons: "Track Order" (if tracking ID exists) + "Raise Complaint"

### Complaint Dialog (opens when "Raise Complaint" clicked)
- Order ID shown
- Complaint Type dropdown: Damaged Product / Wrong Product / Missing Item / Delivery Issue / Quality Issue / Other
- Description textarea
- Submit Complaint button (green) + Cancel

---

---

## CURRENT UI PROBLEMS (gaps to fix in redesign)

1. INCONSISTENT THEMES — Home page is dark (#0a0f1e), all dashboards are light. No unified design language.
2. NAVBAR OVERFLOW — TubelightNavBar has too many tabs (admin has 14). On smaller screens it overflows and scrolls awkwardly.
3. NO MOBILE LAYOUT — Tables are not responsive. On mobile, tables overflow horizontally with no card fallback.
4. DIALOGS ARE PLAIN — All dialogs use basic shadcn Dialog with minimal styling. No visual hierarchy.
5. STAT CARDS ARE GENERIC — All stat cards look the same. No visual differentiation between critical/normal metrics.
6. FORMS ARE DENSE — New Order form in Billing is very long with no section grouping or visual breaks.
7. NO EMPTY STATES — Most tables just show "No orders" text with no illustration or helpful CTA.
8. CHARTS LACK CONTEXT — Charts have no titles explaining what action to take based on the data.
9. BADGE OVERUSE — Too many badge variants used inconsistently across pages.
10. NO LOADING SKELETONS — Pages show blank space while data loads instead of skeleton placeholders.
11. ANNOUNCEMENT BANNER — Plain yellow strip, not visually distinct enough.
12. PRODUCT PILLS — Green pills are fine but repeated in many places with slightly different styles.
13. PAYMENT BADGE — PaymentBadge component exists but styling is inconsistent with rest of UI.
14. ADMIN DASHBOARD — 14 tabs is too many. Should be grouped or use a sidebar instead.
15. NO BREADCRUMBS — No way to know where you are in the app hierarchy.

---

## REDESIGN SUGGESTIONS FOR CLAUDE

### Design Direction
- Unified dark/light mode toggle across all pages
- Use a consistent design system: one primary green (#16a34a), one accent amber, one danger red
- Card-based layouts replacing raw tables on mobile
- Sidebar navigation for Admin (too many tabs for top nav)
- Glassmorphism cards on dark pages, clean white cards on light pages

### Component Suggestions
- Replace TubelightNavBar with a cleaner pill-tab system or sidebar
- Use skeleton loaders (shimmer effect) for all data-loading states
- Add illustrated empty states (SVG illustrations)
- Redesign dialogs with colored headers matching the action type (green for success, red for danger)
- Group the New Order form into collapsible sections: Customer Info / Products / Shipping / Payment
- Add a floating action button (FAB) for "New Order" in Billing
- Use a stepper/wizard UI for the Ship Order flow (Payment Check → Ship Details → Confirm)
- Add toast notifications with icons and better positioning
- Make stat cards show sparkline mini-charts instead of just numbers

### Page-specific suggestions
- Home: Keep dark theme, make role cards larger with better hover animations, add a search/quick-access bar
- Sales Agent: Replace table with Kanban board for leads (columns: New / Called / Callback / Submitted)
- Billing: Split New Order into a 3-step wizard
- Packing: Add a progress bar showing X of Y orders packed today
- Shipping: Add a map view showing delivery locations (optional)
- Admin: Use a left sidebar for navigation instead of top tabs
- Order Tracking: Add animated progress bar showing shipment stage
- Customer Portal: Add order timeline view per order

### Typography
- Use a modern sans-serif: Inter or Geist
- Heading font: keep current font-heading class
- Increase base font size slightly for readability

### Color Palette (suggested)
- Primary: #16a34a (green-600) — SGB brand color
- Primary dark: #15803d (green-700)
- Accent: #f59e0b (amber-500) — for warnings/COD
- Danger: #dc2626 (red-600)
- Info: #2563eb (blue-600)
- Background light: #f8fafc
- Background dark: #0a0f1e
- Card light: #ffffff
- Card dark: #111827
- Border light: #e2e8f0
- Border dark: rgba(255,255,255,0.1)

---

## PRODUCTS REFERENCE (use these exact names everywhere)
1. SGB Brush Cutter Trolley — ₹3,999
2. SGB BC-520 Brush Cutter — ₹13,000
3. SGB Carry Cart — ₹50,000
4. SGB Cycle Weeder — ₹3,499
5. SGB G45L Brush Cutter — ₹13,000
6. SGB Wheel Barrow — ₹6,500

---

## COMPANY INFO
- Name: SGB Agro Industries (unit of Sri Gowri Bhargava Pvt. Ltd.)
- Location: Opp. Municipal Ground, Near JMJ Talkies, Koppa, Karnataka — 577126
- Phone: 08277009667
- Website: www.sgbagroindustries.com
- Founded: 16th March 2020
- Award: Elevate 2024 Winner — Karnataka State
- Tagline: "Smart Machines. Simple Farming. Stronger Farmers."
- WhatsApp bot: +1 415 523 8886 (Twilio sandbox)
- Supabase project: fwmnriafhdbdgtklheyy
