# SGB Order Hub - Complete Project Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [User Roles & Access](#user-roles--access)
3. [Complete Feature List](#complete-feature-list)
4. [Detailed Dashboard Breakdown](#detailed-dashboard-breakdown)
5. [Database Architecture](#database-architecture)
6. [Technical Implementation](#technical-implementation)
7. [Workflow Diagrams](#workflow-diagrams)
8. [API & Services](#api--services)

---

## System Overview

### What is SGB Order Hub?
A complete order management system for SGB Agro Industries that handles the entire lifecycle of orders from creation to delivery tracking.

### Core Purpose
- Manage orders across multiple departments (Billing, Packing, Shipping, Admin)
- Track inventory and products
- Handle logistics and warehouse operations
- Provide real-time order tracking to customers
- Extract customer inquiries from WhatsApp messages
- Send tracking links via WhatsApp

### Technology Stack
- **Frontend**: React + TypeScript + Vite
- **UI Library**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Maps**: Leaflet for shipment tracking
- **Charts**: Recharts for analytics
- **State Management**: React Hooks + Context

---

## User Roles & Access

### 1. Admin Role
**Access Level**: Full system access


**Capabilities**:
- View all system statistics and analytics
- Manage users (create, edit, delete, change roles)
- Extract WhatsApp inquiries
- View all orders across all statuses
- Access warehouse management
- View logistics network
- Quick role switching (can switch to any role without logout)

**Dashboard Tabs**:
1. Overview - System-wide statistics
2. Users - User management
3. WhatsApp - Inquiry extraction
4. Orders - All orders view
5. Warehouses - Warehouse management
6. Logistics - Network visualization

### 2. Billing Role
**Access Level**: Order creation and inquiry management

**Capabilities**:
- Create new orders
- View order history
- Manage customer inquiries from WhatsApp
- Convert inquiries to orders
- Bulk order upload via CSV
- Search and filter orders

**Dashboard Tabs**:
1. New Order - Create single orders
2. Order History - View all created orders
3. Inquiries - Manage WhatsApp inquiries
4. Bulk Upload - Upload multiple orders via CSV

### 3. Packing Role
**Access Level**: Order packing operations

**Capabilities**:
- View pending orders (orders sent from billing)
- Mark orders as packed
- View packing history
- See order details and items

**Dashboard Tabs**:
1. Pending Orders - Orders waiting to be packed
2. Packing History - Previously packed orders

### 4. Shipping Role
**Access Level**: Shipment and delivery management

**Capabilities**:
- View orders ready to ship (packed orders)
- Create shipments with tracking IDs
- Update shipment status
- Send WhatsApp tracking links to customers
- View shipped orders
- Manage delivery updates

**Dashboard Tabs**:
1. Pending Shipments - Orders ready to ship
2. Shipped Orders - Active shipments with tracking
3. Delivery History - Completed deliveries

---

## Complete Feature List

### 1. Authentication & User Management


#### Features:
- **User Registration**: Email + password with role assignment
- **Login/Logout**: Secure authentication via Supabase
- **Role-Based Access Control**: Different dashboards per role
- **Quick Role Switch** (Admin only): Switch roles without logout
- **User Profile**: View current user info in navbar
- **Session Management**: Automatic session handling

#### How It Works:
1. User registers with email, password, full name, and role
2. Supabase creates auth user and profile entry
3. On login, system checks role and redirects to appropriate dashboard
4. Session persists across page refreshes
5. Logout clears session and redirects to home

### 2. Order Management System

#### Order Creation (Billing Dashboard)
**UI Components**:
- Customer information form (name, phone, address)
- Product selection dropdown (from inventory)
- Quantity input with stock validation
- Multiple items per order support
- Payment status selection (Paid/Pending/COD)
- Total amount auto-calculation

**Process Flow**:
1. Billing staff fills customer details
2. Selects products from dropdown (shows available stock)
3. Adds quantity (validates against stock)
4. Can add multiple products to same order
5. Selects payment status
6. Clicks "Create Order & Send to Packing"
7. Order gets unique order number (ORD-XXXXXX)
8. Order status set to "pending" (waiting for packing)
9. Stock automatically deducted from inventory
10. Order appears in Packing dashboard

#### Order Tracking Statuses:
- **pending**: Created, waiting for packing
- **packed**: Packed, waiting for shipment
- **shipped**: In transit with tracking
- **delivered**: Successfully delivered
- **cancelled**: Order cancelled

### 3. WhatsApp Integration (2 Features)

#### Feature A: Inquiry Extraction (Admin Dashboard)


**Purpose**: Extract customer information from WhatsApp messages

**UI Components**:
- Large text area for pasting WhatsApp messages
- "Extract Details" button
- Auto-populated form fields (name, phone, product, quantity, city)
- Editable fields for corrections
- "Create Inquiry" button

**Extraction Patterns**:
- **Phone Number**: 10-digit Indian numbers (9876543210)
- **Customer Name**: "Name: Ramesh" or "My name is Ramesh"
- **Quantity**: Numbers before product keywords (20 pipes, 50 bags)
- **Product Name**: Matches database products or common keywords
- **City**: Detects cities from logistics database

**Example Message**:
```
Hi I need 20 steel pipes delivered to Shivamogga.
Name: Ramesh Kumar
Phone: 9876543210
```

**Extracted Data**:
- Name: Ramesh Kumar
- Phone: 9876543210
- Product: steel pipes
- Quantity: 20
- City: Shivamogga

**Process**:
1. Admin pastes WhatsApp message
2. Clicks "Extract Details"
3. System uses regex patterns to extract info
4. Fields auto-populate (can be edited)
5. Admin clicks "Create Inquiry"
6. Inquiry saved with status "pending"
7. Appears in Billing Dashboard → Inquiries tab

#### Feature B: Tracking Link Sender (Shipping Dashboard)

**Purpose**: Send tracking links to customers via WhatsApp

**Location**: Shipping Dashboard → Shipped Orders tab

**UI Components**:
- List of shipped orders with customer details
- Three action buttons per order:
  - 📋 Copy Link (copies tracking URL)
  - 🔗 Open (opens tracking page in new tab)
  - 💬 WhatsApp (opens WhatsApp with pre-filled message)

**Message Format**:
```
Hello [Customer Name],

Your order has been shipped! 🚚

Courier Partner: [Courier Name]
Tracking ID: [Tracking ID]

Track your shipment here: [Tracking URL]

Thank you for shopping with us.
- SGB Agro Industries
```

**Technical Implementation**:


1. When order is shipped, system generates tracking URL:
   ```
   https://your-domain.com/track/SGM1A2B3C4D5
   ```

2. Creates WhatsApp message with customer details

3. Generates WhatsApp Web URL:
   ```
   https://wa.me/91[phone]?text=[encoded_message]
   ```

4. When clicked, opens WhatsApp with pre-filled message

5. User just clicks "Send" in WhatsApp

**No API Required**: Uses WhatsApp's web protocol (wa.me)

### 4. Inquiry Management (Billing Dashboard)

**Purpose**: Convert WhatsApp inquiries into orders

**UI Components**:
- Table showing all pending inquiries
- Columns: Customer, Phone, Product, Quantity, City, Date, Status
- Eye icon to view details
- "Convert to Order" button in details dialog

**Workflow**:
1. Billing views pending inquiries
2. Clicks eye icon to see full details
3. Reviews original WhatsApp message
4. Clicks "Convert to Order"
5. System automatically:
   - Switches to "New Order" tab
   - Pre-fills customer name, phone, city
   - Adds product to items list (if exists in inventory)
   - Sets quantity
6. Billing completes remaining fields (address, state, pincode)
7. Creates order
8. Inquiry marked as "converted" and disappears from pending list

**Status Types**:
- **pending**: Waiting for billing action
- **converted**: Successfully converted to order
- **rejected**: Inquiry rejected/invalid

### 5. Bulk Order Upload (Billing Dashboard)

**Purpose**: Upload multiple orders at once via CSV file

**UI Components**:
- File upload dropzone
- "Download Template" button
- Upload progress indicator
- Success/error summary

**CSV Template Format**:
```csv
customer_name,phone,street,city,state,pincode,product_name,quantity,payment_status
Ramesh Kumar,9876543210,123 Main St,Bangalore,Karnataka,560001,Steel Pipes,20,paid
```

**Process**:


1. User downloads CSV template
2. Fills in order details
3. Uploads CSV file
4. System validates each row:
   - Checks product exists
   - Validates phone number format
   - Checks required fields
   - Validates stock availability
5. Creates orders in batch
6. Shows summary: X successful, Y failed
7. All successful orders sent to packing

**Validation Rules**:
- Phone must be 10 digits
- Product must exist in inventory
- Quantity must be available in stock
- All required fields must be filled
- Payment status must be: paid, pending, or cod

### 6. Product & Inventory Management (Admin Dashboard)

**Purpose**: Manage product catalog and stock levels

**UI Components**:
- Product table with image, name, category, price, stock
- Stock status badges (In Stock/Low Stock/Out of Stock)
- Add Product button
- Edit/Delete buttons per product
- Product form dialog

**Product Fields**:
- Product Name
- Category (dropdown)
- Description
- Price (₹)
- Stock Quantity
- Image URL (optional)

**Stock Status Logic**:
- **In Stock**: stock > 10 (green badge)
- **Low Stock**: stock 1-10 (yellow badge)
- **Out of Stock**: stock = 0 (red badge)

**Features**:
- Add new products
- Edit existing products
- Delete products (with confirmation)
- View product images
- Real-time stock updates
- Automatic stock deduction on order creation

**Stock Management**:
- Stock decreases when order is created
- Stock increases when order is cancelled
- Low stock warnings visible to admin
- Out of stock products can't be ordered

### 7. Packing Operations (Packing Dashboard)

**Purpose**: Mark orders as packed and ready for shipping

**UI Components**:


- **Pending Orders Tab**: Orders waiting to be packed
- Order cards showing:
  - Order number
  - Customer name and phone
  - Delivery address
  - Products list with quantities
  - Total amount
  - Payment status badge
  - "Mark as Packed" button

- **Packing History Tab**: Previously packed orders

**Workflow**:
1. Packing staff sees new orders from billing
2. Reviews order details and items
3. Physically packs the items
4. Clicks "Mark as Packed"
5. Order status changes to "packed"
6. Order disappears from pending
7. Order appears in Shipping Dashboard

**Visual Indicators**:
- Payment status badges (green=paid, yellow=pending, blue=COD)
- Product quantities clearly displayed
- Full delivery address visible
- Order number for reference

### 8. Shipping & Tracking (Shipping Dashboard)

#### Pending Shipments Tab

**Purpose**: Create shipments for packed orders

**UI Components**:
- List of packed orders ready to ship
- "Ship Order" button per order
- Shipment creation dialog with:
  - Courier partner dropdown
  - Tracking ID input (with auto-generate)
  - "Confirm Shipment" button

**Courier Partners**:
- Sugama Transport
- DTDC
- Blue Dart
- Delhivery
- India Post

**Tracking ID Format**: 
- Auto-generated: SGM + 10 random alphanumeric characters
- Example: SGM1A2B3C4D5
- Can be manually edited

**Process**:
1. Shipping staff clicks "Ship Order"
2. Selects courier partner
3. Generates or enters tracking ID
4. Clicks "Confirm Shipment"
5. System creates tracking URL automatically:
   ```
   https://your-domain.com/track/SGM1A2B3C4D5
   ```
6. Order status changes to "shipped"
7. Order moves to "Shipped Orders" tab

#### Shipped Orders Tab

**Purpose**: Manage active shipments and send tracking links

**UI Components**:


- Table of shipped orders with:
  - Order number
  - Customer name and phone
  - Courier partner
  - Tracking ID
  - Current status
  - Action buttons (Copy, Open, WhatsApp)
  - "Update Status" button

**Action Buttons**:
1. **📋 Copy Link**: Copies tracking URL to clipboard
2. **🔗 Open**: Opens tracking page in new tab
3. **💬 WhatsApp**: Opens WhatsApp with pre-filled tracking message

**Status Update Dialog**:
- Dropdown with statuses:
  - Order Placed
  - Picked Up
  - In Transit
  - Out for Delivery
  - Delivered
- Location input (city/area)
- "Update Status" button

**Update Process**:
1. Click "Update Status" on order
2. Select new status from dropdown
3. Enter current location
4. Click "Update Status"
5. New tracking event created with timestamp
6. Visible on public tracking page
7. If status = "Delivered", order moves to Delivery History

#### Delivery History Tab

**Purpose**: View completed deliveries

**Features**:
- Shows all delivered orders
- Delivery date and time
- Final tracking information
- Customer details
- Order summary

### 9. Public Order Tracking Page

**Purpose**: Allow customers to track orders without login

**URL Format**: `https://your-domain.com/track/[TRACKING_ID]`

**UI Components**:
- Company logo and branding
- Current shipment status (large, prominent)
- Tracking timeline with:
  - Status icons
  - Status names
  - Locations
  - Timestamps
- Interactive map showing shipment route
- Order details section:
  - Order number
  - Customer name
  - Delivery address
  - Products list
  - Total amount
- Courier information

**Map Features**:
- Shows warehouse location (origin)
- Shows delivery location (destination)
- Shows current location (if in transit)
- Route line connecting points
- Zoom controls
- Responsive on mobile

**Status Icons**:


- 📦 Order Placed
- 📤 Picked Up
- 🚚 In Transit
- 🏠 Out for Delivery
- ✅ Delivered

**How It Works**:
1. Customer receives WhatsApp message with tracking link
2. Clicks link (no login required)
3. Page loads tracking information from database
4. Shows real-time status and location
5. Map displays shipment journey
6. Timeline shows all tracking events
7. Updates automatically when shipping team updates status

**Mobile Responsive**:
- Optimized for mobile viewing
- Touch-friendly map controls
- Readable on small screens
- Fast loading

### 10. Warehouse Management (Admin Dashboard)

**Purpose**: Manage warehouse locations and logistics network

**UI Components**:
- Warehouse table with:
  - Name
  - City
  - State
  - Capacity
  - Current stock
  - Status (Active/Inactive)
- Add Warehouse button
- Edit/Delete buttons
- Warehouse form dialog

**Warehouse Fields**:
- Warehouse Name
- City
- State
- Capacity (units)
- Current Stock (units)
- Status (Active/Inactive)

**Features**:
- Add new warehouses
- Edit warehouse details
- Deactivate warehouses
- View capacity utilization
- Track stock across locations

**Use Cases**:
- Multi-location inventory management
- Regional distribution planning
- Capacity planning
- Logistics optimization

### 11. Logistics Network (Admin Dashboard)

**Purpose**: Visualize and manage delivery routes

**UI Components**:
- Interactive map showing:
  - Warehouse locations (blue markers)
  - Delivery locations (green markers)
  - Route lines
- Route table with:
  - Origin warehouse
  - Destination city
  - Distance (km)
  - Estimated time
  - Status
- Add Route button

**Features**:


- View all delivery routes
- Add new routes
- Calculate distances
- Estimate delivery times
- Optimize logistics planning

**Map Visualization**:
- Leaflet-based interactive map
- Zoom and pan controls
- Marker clustering for multiple locations
- Route lines showing connections
- Tooltips with location details

### 12. Analytics & Dashboard (Admin Dashboard)

**Purpose**: System-wide statistics and insights

**UI Components**:
- Statistics cards showing:
  - Total Orders (with trend)
  - Revenue (with trend)
  - Pending Orders
  - Active Users
- Charts:
  - Orders by Status (pie chart)
  - Revenue Trend (line chart)
  - Orders by Payment Status (bar chart)
- Recent orders table
- Quick actions panel

**Metrics Tracked**:
- Total orders count
- Total revenue (₹)
- Orders by status breakdown
- Payment status distribution
- Daily/weekly/monthly trends
- User activity

**Chart Types**:
1. **Pie Chart**: Orders by status (pending, packed, shipped, delivered)
2. **Line Chart**: Revenue over time
3. **Bar Chart**: Payment status distribution (paid, pending, COD)

**Real-Time Updates**:
- Statistics update when new orders created
- Charts refresh automatically
- Recent orders list updates

### 13. User Management (Admin Dashboard)

**Purpose**: Manage system users and roles

**UI Components**:
- Users table with:
  - Full Name
  - Email
  - Role badge
  - Created date
  - Action buttons (Edit, Delete)
- Add User button
- User form dialog
- Role dropdown

**Available Roles**:
- Admin (full access)
- Billing (order creation)
- Packing (packing operations)
- Shipping (shipment management)

**Features**:
- Create new users
- Edit user details
- Change user roles
- Delete users (with confirmation)
- View user creation date
- Role-based access enforcement

**User Creation Process**:


1. Admin clicks "Add User"
2. Fills form: name, email, password, role
3. Clicks "Create User"
4. System creates Supabase auth user
5. Creates profile entry with role
6. User can now login with credentials
7. Redirected to appropriate dashboard based on role

### 14. Search & Filter System

**Purpose**: Find orders quickly across the system

**UI Components**:
- Search bar in navbar (global)
- Filter dropdowns per dashboard
- Advanced search in Order History

**Search Capabilities**:
- Search by order number
- Search by customer name
- Search by phone number
- Search by tracking ID
- Filter by status
- Filter by date range
- Filter by payment status

**Where Available**:
- Billing Dashboard → Order History
- Admin Dashboard → Orders tab
- Shipping Dashboard → All tabs
- Packing Dashboard → Both tabs

**Search Features**:
- Real-time search (as you type)
- Case-insensitive matching
- Partial matches supported
- Multiple filter combinations
- Clear filters button

---

## Detailed Dashboard Breakdown

### Admin Dashboard - Complete Tab-by-Tab

#### Tab 1: Overview
**Purpose**: System-wide analytics and quick insights

**Sections**:
1. **Statistics Cards** (Top Row):
   - Total Orders: Count + percentage change
   - Revenue: Amount in ₹ + trend
   - Pending Orders: Current count
   - Active Users: Total user count

2. **Charts Section** (Middle):
   - Orders by Status (Pie Chart)
   - Revenue Trend (Line Chart)
   - Payment Status (Bar Chart)

3. **Recent Orders** (Bottom):
   - Last 10 orders
   - Quick view of order details
   - Status badges

**Use Cases**:
- Daily business overview
- Performance monitoring
- Trend analysis
- Quick decision making

#### Tab 2: Users
**Purpose**: User account management

**Features**:


- View all users in table format
- Add new users with role assignment
- Edit user details and roles
- Delete users (cannot delete self)
- See user creation dates
- Role badges with color coding

**Table Columns**:
- Full Name
- Email
- Role (with colored badge)
- Created At (formatted date)
- Actions (Edit/Delete buttons)

**Add User Form**:
- Full Name (text input)
- Email (email input)
- Password (password input, min 6 chars)
- Role (dropdown: Admin/Billing/Packing/Shipping)

#### Tab 3: WhatsApp
**Purpose**: Extract customer inquiries from WhatsApp messages

**UI Layout**:
1. **Input Section** (Left):
   - Large textarea for pasting messages
   - "Extract Details" button
   - Character count indicator

2. **Extracted Data Form** (Right):
   - Customer Name (auto-filled, editable)
   - Phone Number (auto-filled, editable)
   - Product Name (auto-filled, editable)
   - Quantity (auto-filled, editable)
   - Delivery City (auto-filled, editable)
   - "Create Inquiry" button

**Extraction Logic**:
```javascript
// Phone: 10 digits
/\b\d{10}\b/

// Name: "Name: X" or "My name is X"
/name[:\s]+([a-z\s]+)/i

// Quantity: number before product
/(\d+)\s*(bags?|pipes?|units?)/i

// City: matches known cities
/(bangalore|mysore|hubli|shivamogga)/i
```

**Workflow**:
1. Paste WhatsApp message
2. Click "Extract Details"
3. Review auto-filled fields
4. Edit if needed
5. Click "Create Inquiry"
6. Success message shown
7. Inquiry saved to database
8. Form resets for next inquiry

#### Tab 4: Orders
**Purpose**: View all orders across all statuses

**Features**:
- Complete order list
- Status filter dropdown
- Search by order number/customer
- Date range filter
- Export to CSV option
- Pagination

**Order Card Display**:
- Order number (large, prominent)
- Customer name and phone
- Status badge (color-coded)
- Products list
- Total amount
- Created date
- Action buttons (View Details, Cancel)

**Status Filters**:
- All Orders
- Pending (yellow)
- Packed (blue)
- Shipped (purple)
- Delivered (green)
- Cancelled (red)

#### Tab 5: Warehouses


**Purpose**: Manage warehouse locations

**Table View**:
- Warehouse Name
- City
- State
- Capacity (units)
- Current Stock (units)
- Utilization % (calculated)
- Status badge (Active/Inactive)
- Actions (Edit/Delete)

**Add Warehouse Form**:
- Warehouse Name
- City (dropdown or text)
- State (dropdown)
- Capacity (number)
- Current Stock (number)
- Status (Active/Inactive toggle)

**Features**:
- Add multiple warehouses
- Track capacity utilization
- Deactivate unused warehouses
- Edit warehouse details
- Delete warehouses (with confirmation)

**Capacity Calculation**:
```
Utilization % = (Current Stock / Capacity) × 100
```

**Visual Indicators**:
- Green: < 70% utilized
- Yellow: 70-90% utilized
- Red: > 90% utilized

#### Tab 6: Logistics
**Purpose**: Visualize delivery network

**Map Section** (Top):
- Interactive Leaflet map
- Warehouse markers (blue)
- Delivery location markers (green)
- Route lines connecting locations
- Zoom controls
- Full-screen option

**Routes Table** (Bottom):
- Origin Warehouse
- Destination City
- Distance (km)
- Estimated Time (hours)
- Status (Active/Inactive)
- Actions (Edit/Delete)

**Add Route Form**:
- Origin Warehouse (dropdown)
- Destination City (dropdown or text)
- Distance (auto-calculated or manual)
- Estimated Time (calculated)

**Map Features**:
- Click markers for details
- Hover for tooltips
- Pan and zoom
- Route highlighting on hover
- Responsive on mobile

### Billing Dashboard - Complete Tab-by-Tab

#### Tab 1: New Order
**Purpose**: Create individual orders

**Form Sections**:

1. **Customer Information**:
   - Customer Name (required)
   - Phone Number (10 digits, required)
   - Street Address (required)
   - City (required)
   - State (dropdown, required)
   - Pincode (6 digits, required)

2. **Order Items**:
   - Product dropdown (shows available products)
   - Quantity input (validates against stock)
   - "Add Item" button
   - Items list (shows added products)
   - Remove item button per product
   - Total amount (auto-calculated)

3. **Payment Information**:


   - Payment Status (dropdown: Paid/Pending/COD)
   - Total Amount (auto-calculated, read-only)

4. **Action Buttons**:
   - "Create Order & Send to Packing" (primary)
   - "Clear Form" (secondary)

**Validation Rules**:
- All required fields must be filled
- Phone must be exactly 10 digits
- Pincode must be exactly 6 digits
- At least one product must be added
- Quantity must not exceed available stock
- Quantity must be > 0

**Order Creation Process**:
1. Fill customer details
2. Select product from dropdown
3. Enter quantity
4. Click "Add Item"
5. Product appears in items list
6. Repeat for multiple products
7. Select payment status
8. Click "Create Order & Send to Packing"
9. System generates order number (ORD-XXXXXX)
10. Deducts stock from inventory
11. Creates order with status "pending"
12. Shows success message
13. Form resets
14. Order appears in Packing Dashboard

**Stock Validation**:
- Dropdown shows only products with stock > 0
- Quantity input shows max available stock
- Error if quantity exceeds stock
- Real-time stock check on submission

#### Tab 2: Order History
**Purpose**: View all orders created by billing team

**Features**:
- Search bar (order number, customer name, phone)
- Status filter dropdown
- Date range picker
- Sort options (newest/oldest, amount high/low)
- Pagination (20 orders per page)

**Order Display**:
- Order cards with:
  - Order number
  - Customer name and phone
  - Delivery address
  - Products list with quantities
  - Total amount
  - Payment status badge
  - Order status badge
  - Created date
  - "View Details" button

**Order Details Dialog**:
- Full customer information
- Complete address
- All products with prices
- Subtotal, tax, total
- Payment status
- Order status
- Timestamps (created, updated)
- Status history
- "Print Invoice" button
- "Cancel Order" button (if not shipped)

**Actions Available**:
- View order details
- Print invoice
- Cancel order (if status = pending or packed)
- Search and filter
- Export to CSV

#### Tab 3: Inquiries
**Purpose**: Manage WhatsApp inquiries and convert to orders

**Inquiry List View**:


- Table showing pending inquiries
- Columns:
  - Customer Name
  - Phone Number
  - Product Name
  - Quantity
  - City
  - Created Date
  - Status Badge (Pending/Converted/Rejected)
  - Actions (View/Convert/Reject)

**Inquiry Details Dialog**:
- Original WhatsApp message (full text)
- Extracted customer information
- Product details
- Delivery city
- Created timestamp
- Action buttons:
  - "Convert to Order" (green)
  - "Reject Inquiry" (red)
  - "Close" (gray)

**Convert to Order Process**:
1. Click eye icon on inquiry
2. Review inquiry details
3. Click "Convert to Order"
4. Dialog closes
5. Automatically switches to "New Order" tab
6. Form pre-fills with:
   - Customer name
   - Phone number
   - City
   - Product (if exists in inventory)
   - Quantity
7. Billing completes remaining fields:
   - Street address
   - State
   - Pincode
8. Reviews and edits if needed
9. Clicks "Create Order & Send to Packing"
10. Order created
11. Inquiry status changes to "converted"
12. Inquiry disappears from pending list

**Reject Inquiry Process**:
1. Click "Reject Inquiry"
2. Confirmation dialog appears
3. Click "Confirm"
4. Inquiry status changes to "rejected"
5. Inquiry disappears from pending list
6. Stored in database for records

**Filter Options**:
- Show All
- Pending Only
- Converted Only
- Rejected Only

#### Tab 4: Bulk Upload
**Purpose**: Upload multiple orders via CSV file

**UI Components**:

1. **Instructions Section**:
   - Step-by-step guide
   - CSV format requirements
   - Example data
   - "Download Template" button

2. **Upload Section**:
   - Drag-and-drop zone
   - "Browse Files" button
   - Accepted format: .csv only
   - File size limit indicator

3. **Preview Section** (after upload):
   - Table showing parsed data
   - Row count
   - Column headers
   - First 5 rows preview
   - Validation status per row

4. **Results Section** (after processing):
   - Success count (green)
   - Failed count (red)
   - Error details per failed row
   - "Download Error Report" button

**CSV Template Format**:
```csv
customer_name,phone,street,city,state,pincode,product_name,quantity,payment_status
Ramesh Kumar,9876543210,123 Main St,Bangalore,Karnataka,560001,Steel Pipes,20,paid
Priya Sharma,9988776655,456 Park Ave,Mysore,Karnataka,570001,Cement Bags,50,pending
```

**Required Columns**:
