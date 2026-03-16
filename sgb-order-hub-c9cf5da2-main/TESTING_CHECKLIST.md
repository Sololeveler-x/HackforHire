# SGB Order Hub — Complete Testing Checklist

## How to use: Go through each item. Mark ✅ working, ❌ broken, ⚠️ partial

---

## SECTION 1 — STOCK SYSTEM (test this first, everything depends on it)

[ ] 1.1 Add product to warehouse increases product total stock
- WHERE: Admin → Warehouses tab → click Inventory on SGB Main Warehouse Koppa
- DO: Find SGB BC-520 Brush Cutter, change stock from current value to current+10, click Save
- CHECK: Admin → Products tab → SGB BC-520 → Total Stock column
- EXPECTED: Total Stock increases by 10 automatically (database trigger fires)
- ALSO CHECK: Warehouse Stock badge on product row shows updated Koppa number

[ ] 1.2 Warehouse capacity bar updates
- WHERE: Admin → Warehouses tab → Capacity column
- CHECK: SGB Main Warehouse Koppa capacity bar
- EXPECTED: Bar shows used/total (e.g. 150/500), color green if under 60%, amber 60-90%, red 90%+

[ ] 1.3 Pack order deducts from warehouse stock
- WHERE: Packing dashboard → complete packing for any order, select Koppa warehouse
- CHECK: Admin → Warehouses → Koppa inventory → find that product
- EXPECTED: Stock decreased by ordered quantity

[ ] 1.4 Pack order auto-updates product total stock
- DO: Same as 1.3
- CHECK: Admin → Products tab → that product's Total Stock column
- EXPECTED: Decreased by same amount (database trigger fires automatically)

[ ] 1.5 Cancel order restores stock
- WHERE: Billing → Order History → cancel any packed order
- CHECK: Admin → Warehouses → that warehouse inventory
- EXPECTED: Stock restored back to previous value

[ ] 1.6 Return approved restores stock
- WHERE: Admin → Returns tab → approve a return
- CHECK: Admin → Warehouses → that warehouse inventory
- EXPECTED: Stock increased by returned quantity

[ ] 1.7 Low stock WhatsApp alert
- DO: In warehouse inventory set any product stock to below its reorder level, save
- CHECK: Admin's WhatsApp (+919110404193)
- EXPECTED: WhatsApp message received saying which warehouse, which product, current stock, reorder level

[ ] 1.8 Transfer stock between warehouses
- WHERE: Admin → Warehouses → Inventory → Transfer Stock button
- DO: Transfer 5 units of any product from Koppa to Shimoga
- CHECK: Both warehouse inventories and product total stock
- EXPECTED: Koppa -5, Shimoga +5, product total unchanged

---

## SECTION 2 — WHATSAPP AUTOMATION

[ ] 2.1 Customer message creates inquiry automatically
- DO: Send this WhatsApp to +14155238886: "I want 2 SGB BC-520 Brush Cutters delivered to Mysuru. Name: Raju Kumar"
- CHECK: Supabase → Table Editor → inquiries table → newest row
- EXPECTED: customer_name=Raju Kumar, product_name contains BC-520, delivery_city=Mysuru, source=whatsapp_direct, status=new

[ ] 2.2 Auto reply sent to customer
- CHECK: Your WhatsApp chat after sending above message
- EXPECTED: Reply received within 15 seconds with order summary, product, quantity, city, SGB contact details

[ ] 2.3 Ad source detected correctly
- DO: Send "Hi I saw your ad and want 1 Power Weeder to Hubli"
- CHECK: inquiries table source column for this row
- EXPECTED: source = whatsapp_ad

[ ] 2.4 Multi-product message extracts all products
- DO: Send "I want 2 Brush Cutters and 1 Wheel Barrow delivered to Bangalore. Name: Suresh"
- CHECK: inquiries table → products_json column for this row
- EXPECTED: JSON array with 2 items: [{product_name: "Brush Cutter", quantity: 2}, {product_name: "Wheel Barrow", quantity: 1}]

[ ] 2.5 Duplicate detection works
- DO: Send exact same message as 2.1 again within 2 hours
- CHECK: WhatsApp reply AND inquiries table
- EXPECTED: Reply says "We already have your inquiry" with reference ID. No duplicate row created.

[ ] 2.6 Non-order message gets help reply
- DO: Send "Hello" to the number
- CHECK: WhatsApp reply
- EXPECTED: Reply explains how to place order with example format

[ ] 2.7 New inquiry appears in Admin Leads tab
- DO: After test 2.1, login as admin → Leads tab
- EXPECTED: Raju Kumar's lead visible with whatsapp_direct badge, product, city

[ ] 2.8 Realtime lead notification
- DO: Keep Admin Leads tab open, send a new WhatsApp message
- EXPECTED: Lead appears in table without refreshing page

---

## SECTION 3 — ADMIN DASHBOARD

[ ] 3.1 Stats cards show correct numbers
- WHERE: Admin → Dashboard tab
- EXPECTED: Total Orders, Revenue (₹), Pending Packing, Packed, Shipped all show real numbers from database

[ ] 3.2 Low stock alert banner
- WHERE: Top of Admin dashboard
- EXPECTED: Amber banner visible if any product is below reorder level

[ ] 3.3 Charts render with data
- WHERE: Admin → Dashboard tab
- EXPECTED: Monthly Revenue Trend line chart and Order Status Distribution pie chart both visible

[ ] 3.4 Assign lead to sales agent
- WHERE: Admin → Leads tab → find any new lead → Assign dropdown
- DO: Select a sales agent from dropdown
- EXPECTED: Lead status changes to assigned, agent name shows in Assigned To column

[ ] 3.5 Smart AI assign multiple leads
- WHERE: Admin → Leads tab
- DO: Check 2-3 leads using checkboxes, click Smart Assign with AI
- EXPECTED: Modal shows AI suggested assignments with agent names and reasons like "Same city — Mysuru"
- DO: Click Confirm All
- EXPECTED: All selected leads assigned, status = assigned

[ ] 3.6 Auto assign all
- WHERE: Admin → Leads tab → Auto Assign button
- EXPECTED: All unassigned leads distributed evenly among available agents

[ ] 3.7 Stale lead badges appear
- WHERE: Admin → Leads tab
- CHECK: Any lead assigned 3+ days ago but not called
- EXPECTED: Amber ⏰ badge for 3-6 days old, Red 🔥 badge for 7+ days old

[ ] 3.8 Add product
- WHERE: Admin → Products tab → Add Product button
- DO: Fill Name="Test Product", Category="Test", MRP=10000, Floor Price=8000, Target Price=9000, Commission=6, Stock=50, Weight=5
- EXPECTED: Product appears in table with correct values

[ ] 3.9 Product warehouse stock badges
- WHERE: Admin → Products tab → Warehouse Stock column
- EXPECTED: Small badges on each product row showing stock per warehouse e.g. "Koppa: 20, Shimoga: 15"

[ ] 3.10 Add employee from Team tab
- WHERE: Admin → Team tab → Add Employee
- DO: Fill name, email, role=Sales Agent, city=Mysuru, phone
- EXPECTED: Modal shows generated password SGB@XXXX, employee in table

[ ] 3.11 Territory zones visible
- WHERE: Admin → Team tab → scroll to Territory Zones
- EXPECTED: 5 zones shown — Malnad, Mysuru, Bangalore, North Karnataka, Coastal with cities listed

[ ] 3.12 Set monthly target for agent
- WHERE: Admin → Team tab → Monthly Targets section
- DO: Set ₹50,000 target for current month for any agent
- CHECK: That agent's dashboard → target progress bar
- EXPECTED: Progress bar shows ₹0 of ₹50,000 target

[ ] 3.13 Performance leaderboard
- WHERE: Admin → Performance tab
- EXPECTED: Table with agent names, leads assigned, called, submitted, revenue, conversion %, medals for top 3

[ ] 3.14 Pay agent commission
- WHERE: Admin → Performance tab → Commission section
- DO: Click Pay Commission for any agent
- CHECK: agent_commissions table in Supabase
- EXPECTED: Status changes from pending to paid, WhatsApp sent to agent

[ ] 3.15 Create announcement
- WHERE: Admin → Announcements tab → Create
- DO: Write "Test announcement for all staff", select All roles, click Save
- CHECK: Login as any other role (billing, agent, etc.)
- EXPECTED: Amber banner visible at top of their dashboard with announcement text

[ ] 3.16 Dismiss announcement
- DO: Click X on announcement banner
- EXPECTED: Banner disappears and does not come back on page refresh

[ ] 3.17 Approve return
- WHERE: Admin → Returns tab → Approve button
- CHECK: Warehouse inventory after approval
- EXPECTED: Stock restored, return status = approved

[ ] 3.18 Analytics charts
- WHERE: Admin → Analytics tab
- EXPECTED: Revenue trend, top products bar chart, city distribution, sales funnel, agent performance charts all visible

[ ] 3.19 WhatsApp tab status
- WHERE: Admin → WhatsApp tab
- EXPECTED: Green "Webhook Active" and "Groq AI Active" cards, QR code for sandbox join, recent inquiries list

[ ] 3.20 Settings tab
- WHERE: Admin → Settings tab
- EXPECTED: Company GSTIN, PAN, invoice prefix, GST rate fields visible and editable

---

## SECTION 4 — SALES AGENT DASHBOARD

[ ] 4.1 Lead appears after admin assigns
- DO: Admin assigns a lead to this agent (test 3.4)
- WHERE: Sales Agent → My Leads tab
- EXPECTED: Lead visible with customer name, product, city, whatsapp_direct/ad badge

[ ] 4.2 Update call status
- WHERE: My Leads → find any lead → click status button
- DO: Change from Not Called to Called
- EXPECTED: Badge changes to blue Called

[ ] 4.3 Not Interested modal with callback
- DO: Click Not Interested on a lead
- EXPECTED: Modal opens with reason dropdown
- DO: Select "Will call back later", set date as tomorrow, save
- EXPECTED: Lead moves to Follow Ups tab, status = callback_scheduled

[ ] 4.4 Follow Ups tab shows overdue
- WHERE: Sales Agent → Follow Ups tab (or badge on My Leads)
- EXPECTED: Past callback dates in red, today's in amber, future in green

[ ] 4.5 Product catalogue is read only
- WHERE: Sales Agent → Products tab
- EXPECTED: All SGB products listed with MRP, stock — NO edit or delete buttons visible

[ ] 4.6 Submit order with pricing guidance
- WHERE: My Leads → click Submit Order on a called lead
- DO: Select SGB BC-520 Brush Cutter, quantity 2
- EXPECTED: Shows MRP ₹13,000, Floor ₹X, Target ₹X below product dropdown
- EXPECTED: Commission shown as "6% = ₹780 per unit × 2 = ₹1,560"

[ ] 4.7 Price below floor shows error
- DO: Enter agreed price below floor price
- EXPECTED: Red error "Price below minimum allowed ₹X — cannot submit"

[ ] 4.8 Stock check shows warehouse availability
- DO: Enter quantity 30
- EXPECTED: Shows "✅ 30 units available at SGB Main Warehouse Koppa" OR shows split suggestion

[ ] 4.9 Shipping provider cards shown
- WHERE: Submit Order form → scroll to Shipping Provider
- EXPECTED: Two cards — India Post and VRL Logistics, one marked Recommended based on city

[ ] 4.10 UPI payment sends WhatsApp
- DO: Select UPI, enter UPI ID, submit order
- CHECK: Customer's WhatsApp
- EXPECTED: Payment request message with UPI ID and amount received

[ ] 4.11 Order appears in billing
- DO: Submit any confirmed order
- WHERE: Login as billing → Inquiries tab → Agent Confirmed Orders
- EXPECTED: Order visible with correct products, agreed price, payment method set by agent

[ ] 4.12 Commission saved in ledger
- DO: Submit an order
- CHECK: Supabase → agent_commissions table
- EXPECTED: New row with agent_id, correct commission_amount, status=pending

[ ] 4.13 My Earnings tab shows commission
- WHERE: Sales Agent → My Earnings tab
- EXPECTED: Table shows submitted orders with commission amounts, total pending payout displayed

[ ] 4.14 Simulate lead button works
- WHERE: Sales Agent → Dashboard tab → Simulate Incoming Lead button
- EXPECTED: New demo lead appears immediately in My Leads tab

---

## SECTION 5 — BILLING DASHBOARD

[ ] 5.1 Tab bar visible and working
- WHERE: Billing dashboard top
- EXPECTED: Dashboard, New Order, Order History, Inquiries, Customers tabs all clickable

[ ] 5.2 Create order from agent inquiry
- WHERE: Billing → Inquiries → Agent Confirmed Orders → click Create Order
- EXPECTED: New Order form opens pre-filled with customer name, phone, city, products, payment method from agent
- EXPECTED: Green banner "Pre-filled from sales agent inquiry"

[ ] 5.3 Payment method pre-filled and locked
- WHERE: New Order form opened from agent inquiry
- EXPECTED: Payment method shows what agent selected — billing cannot change it

[ ] 5.4 Manual order creation
- WHERE: Billing → New Order tab
- DO: Fill customer name, phone, city, address, select product, quantity, select payment method = UPI
- EXPECTED: Order created, status = pending, payment_method = UPI, payment_status = paid

[ ] 5.5 COD order payment status
- DO: Create order with Cash on Delivery
- CHECK: Supabase → orders → payment_method and payment_status columns
- EXPECTED: payment_method = Cash on Delivery, payment_status = cod_pending

[ ] 5.6 Payment badges in Order History
- WHERE: Billing → Order History tab
- EXPECTED: ✅ Paid for UPI/Bank, 💵 COD Pending for COD, 📃 Cheque Pending for cheque

[ ] 5.7 Invoice generation
- WHERE: Billing → Order History → Invoice button on any order
- EXPECTED: New browser tab opens with printable invoice showing SGB header, products table, shipping charge, total, payment method

[ ] 5.8 Cancel order
- WHERE: Billing → Order History → Cancel button
- DO: Cancel any pending order, enter reason
- CHECK: Supabase → orders → status
- EXPECTED: status = cancelled, WhatsApp sent to customer with cancellation reason

[ ] 5.9 Priority flag
- DO: Mark any order as priority
- WHERE: Packing dashboard → Pending Packing
- EXPECTED: That order at top of list with red URGENT badge

---

## SECTION 6 — PACKING DASHBOARD

[ ] 6.1 Tab bar works
- EXPECTED: Dashboard, Pending Packing, Packed Orders tabs visible and clickable, URL updates on click

[ ] 6.2 Packed orders appear after billing creates order
- WHERE: Packing → Pending Packing tab
- EXPECTED: Order from billing visible with customer name, products

[ ] 6.3 Warehouse source badge on each order
- CHECK: Each order row in Pending Packing
- EXPECTED: Green "📦 Pick from: [warehouse name]" badge OR amber "⚠️ No warehouse assigned"

[ ] 6.4 Packing checklist shows correct products
- DO: Click Pack button on any order
- EXPECTED: Modal shows correct products from that order (not wrong products)

[ ] 6.5 Warehouse dropdown shows stock levels
- WHERE: Inside packing checklist modal
- EXPECTED: Each warehouse in dropdown shows product stock e.g. "SGB BC-520: 25 available ✅ / 2 needed"

[ ] 6.6 AI fulfillment plan generates
- DO: Open packing checklist
- EXPECTED: "AI planning optimal fulfillment..." spinner, then plan shows warehouse name, distance from customer, estimated delivery days

[ ] 6.7 Complete packing deducts stock
- DO: Check all items, select warehouse, click Confirm Packing Plan
- CHECK: That warehouse's inventory in Supabase
- EXPECTED: Stock decreased by ordered quantity

[ ] 6.8 WhatsApp notification sent on pack
- DO: Complete packing (test 6.7)
- CHECK: Customer WhatsApp
- EXPECTED: "Your order has been packed" message with tracking reference

[ ] 6.9 Order moves to Shipping after packing
- WHERE: Shipping → Pending tab
- EXPECTED: Order appears after packing is confirmed

---

## SECTION 7 — SHIPPING DASHBOARD

[ ] 7.1 All 7 tabs visible
- EXPECTED: Dashboard, Pending, Shipped, Delivered, Failed, Pending Payments, Route Planner

[ ] 7.2 Payment confirmation modal — COD
- DO: Click Ship on a COD order
- EXPECTED: Modal shows amber banner "₹X to be collected on delivery", Proceed COD button

[ ] 7.3 Payment confirmation modal — UPI paid
- DO: Click Ship on a UPI order
- EXPECTED: Modal shows green banner "Payment complete ✅", Proceed to Ship button

[ ] 7.4 Payment confirmation modal — Cheque
- DO: Click Ship on a Cheque order
- EXPECTED: Modal shows blue banner "Collect cheque of ₹X on delivery"

[ ] 7.5 Create shipment
- DO: Proceed through modal, select VRL Logistics, enter tracking ID VRL123456, confirm
- CHECK: Supabase → shipping table
- EXPECTED: New shipment row, order status = shipped, tracking_id = VRL123456

[ ] 7.6 Invoice WhatsApp on shipment
- DO: Create shipment (test 7.5)
- CHECK: Customer WhatsApp
- EXPECTED: Invoice message received with products, amounts, shipping provider (VRL Logistics), tracking link

[ ] 7.7 Shipped notification WhatsApp
- CHECK: Customer WhatsApp after test 7.5
- EXPECTED: "Your order is on the way via VRL Logistics" message with tracking link

[ ] 7.8 Out for delivery update
- WHERE: Shipping → Shipped tab → Out for Delivery button
- EXPECTED: Status updates, customer WhatsApp "Your order arrives TODAY"

[ ] 7.9 Mark delivered
- WHERE: Shipping → Shipped tab → status dropdown → Delivered
- EXPECTED: Status = delivered, customer WhatsApp "Your order has been delivered"

[ ] 7.10 COD appears in Pending Payments
- WHERE: Shipping → Pending Payments tab → COD Pending section
- EXPECTED: Delivered COD orders visible with amount to collect

[ ] 7.11 Mark cash collected
- DO: Click Mark Cash Collected on a COD order
- CHECK: Supabase → orders → payment_status and cod_collected
- EXPECTED: payment_status = paid, cod_collected = true
- CHECK: Customer WhatsApp
- EXPECTED: "Thank you, cash received" message

[ ] 7.12 Cheque appears in Pending Payments
- WHERE: Shipping → Pending Payments tab → Cheque Pending section
- EXPECTED: Shipped cheque orders visible

[ ] 7.13 Mark cheque received
- DO: Click Mark Cheque Received
- CHECK: orders → payment_status
- EXPECTED: payment_status = paid, WhatsApp confirmation sent

[ ] 7.14 Route Planner map works
- WHERE: Shipping → Route Planner tab
- DO: Select 2-3 pending orders, click Optimize Route
- EXPECTED: Map renders with numbered markers, polyline connecting them, total distance shown, VRL/India Post badge per stop

---

## SECTION 8 — ORDER TRACKING PAGE (PUBLIC — NO LOGIN)

[ ] 8.1 Page loads without crash
- DO: Go to /track/[any tracking id]
- EXPECTED: Page loads, no crash, no "render2 is not a function" error

[ ] 8.2 Map renders correctly
- EXPECTED: Leaflet map visible, green marker at warehouse (Koppa), red marker at customer city

[ ] 8.3 Truck position matches status
- CHECK: Truck emoji on map
- EXPECTED: Near warehouse if packed, halfway if shipped, near destination if out for delivery, at destination if delivered

[ ] 8.4 Order timeline shows
- EXPECTED: Timeline with stages Ordered → Packed → Shipped → Out for Delivery → Delivered with timestamps for completed stages

[ ] 8.5 Estimated delivery shown
- EXPECTED: "Estimated delivery: X days" shown below map based on distance

---

## SECTION 9 — CUSTOMER PORTAL (PUBLIC — NO LOGIN)

[ ] 9.1 Portal loads
- DO: Go to /customer
- EXPECTED: Phone number input page loads

[ ] 9.2 OTP sent via WhatsApp
- DO: Enter phone number that has placed an order, click Send OTP
- CHECK: That phone's WhatsApp
- EXPECTED: "Your SGB verification code is: XXXX" message received within 30 seconds

[ ] 9.3 Correct OTP shows order history
- DO: Enter the OTP received
- EXPECTED: All orders for that phone number listed with status and tracking links

[ ] 9.4 Track order link works
- DO: Click Track Order button on any order
- EXPECTED: Opens /track/[tracking_id] page correctly

[ ] 9.5 Raise complaint works
- DO: Click Raise Complaint, select reason, enter description, submit
- WHERE: Admin → Complaints tab
- EXPECTED: Complaint appears in admin dashboard

---

## SECTION 10 — LANDING PAGE AND AUTH

[ ] 10.1 Landing page loads correctly
- DO: Go to /
- EXPECTED: Dark background, SGB Agro Industries title, Elevate 2024 badge, 5 portal cards visible

[ ] 10.2 All 5 portal cards present
- EXPECTED: Admin Portal, Billing Portal, Packing Portal, Shipping Portal, Sales Agent Portal cards

[ ] 10.3 Login redirects to correct dashboard
- DO: Login as admin → goes to /admin ✓
- DO: Login as billing → goes to /billing ✓
- DO: Login as packing → goes to /packing ✓
- DO: Login as shipping → goes to /shipping ✓
- DO: Login as sales_agent → goes to /sales-agent ✓

[ ] 10.4 Protected routes work
- DO: Open incognito, go to /admin directly
- EXPECTED: Redirected to /login

[ ] 10.5 Session stays active
- DO: Login, wait 10 minutes, come back to tab
- EXPECTED: Still logged in, no redirect

---

## SECTION 11 — FULL END TO END FLOW (run this last)

[ ] 11.1 Complete WhatsApp to delivery flow
- Step 1: Send WhatsApp "I want 1 SGB BC-520 to Mysuru. Name: E2E Test"
- Step 2: Check inquiry created in Supabase ✓
- Step 3: Admin assigns to sales agent ✓
- Step 4: Agent updates call status to Called ✓
- Step 5: Agent submits confirmed order with VRL Logistics, COD payment ✓
- Step 6: Billing creates order from inquiry ✓
- Step 7: Packing packs order, AI selects Koppa warehouse ✓
- Step 8: Stock deducted from Koppa warehouse ✓
- Step 9: WhatsApp "packed" notification sent to customer ✓
- Step 10: Shipping ships order, tracking ID created ✓
- Step 11: Invoice WhatsApp sent to customer ✓
- Step 12: Status updated to out for delivery, WhatsApp sent ✓
- Step 13: Marked as delivered, WhatsApp sent ✓
- Step 14: COD appears in Pending Payments tab ✓
- Step 15: Mark cash collected, payment_status = paid ✓
- Step 16: Admin sees commission for agent in Performance tab ✓
- Step 17: Admin pays commission, agent gets WhatsApp ✓
- EXPECTED: All 17 steps work without any manual database editing

---

## PRIORITY ORDER

Test sections in this order:
1. Section 1 (Stock) — foundation of everything
2. Section 2 (WhatsApp) — entry point of all orders
3. Section 3 (Admin) — lead management
4. Section 4 (Sales Agent) — order negotiation
5. Section 5 (Billing) — order processing
6. Section 6 (Packing) — fulfillment
7. Section 7 (Shipping) — dispatch
8. Section 8 (Tracking) — customer view
9. Section 9 (Customer Portal)
10. Section 10 (Auth)
11. Section 11 (Full E2E) — run only after all above pass
