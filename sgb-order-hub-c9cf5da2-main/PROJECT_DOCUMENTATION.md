# SGB Order Hub - Complete Project Documentation

## 📖 Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Authentication System](#authentication-system)
4. [Order Workflow](#order-workflow)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Database Schema](#database-schema)
7. [Features by Role](#features-by-role)
8. [API & Hooks](#api--hooks)
9. [UI Components](#ui-components)
10. [Security](#security)

---

## 🎯 Project Overview

**Company**: SGB Pvt. Ltd.  
**Industry**: Hardware / Agro Products  
**Purpose**: Internal order management system from WhatsApp orders to shipment

### Business Problem
- Manual order processing through WhatsApp
- No centralized tracking system
- Lack of visibility across departments
- No analytics or reporting

### Solution
A full-stack web application with:
- Role-based authentication (4 roles)
- Department-specific dashboards
- Complete order workflow automation
- Real-time analytics and reporting
- Secure access control

---

## 🏗️ System Architecture

### Frontend Stack
```
React 18 + TypeScript
├── Vite (Build Tool)
├── Tailwind CSS (Styling)
├── shadcn/ui (UI Components)
├── React Router v6 (Routing)
├── TanStack Query (State Management)
├── Recharts (Data Visualization)
└── Lucide React (Icons)
```

### Backend Stack
```
Supabase
├── PostgreSQL (Database)
├── Auth (Authentication)
├── Row Level Security (Authorization)
└── Real-time Subscriptions
```

### Project Structure
```
sgb-order-hub-c9cf5da2-main/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── DashboardLayout.tsx
│   │   ├── Navbar.tsx
│   │   ├── NavLink.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication context
│   ├── hooks/
│   │   ├── useOrders.ts     # Order management hooks
│   │   ├── useAdmin.ts      # Admin-specific hooks
│   │   └── use-toast.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts    # Supabase client
│   │       └── types.ts     # Database types
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── BillingDashboard.tsx
│   │   ├── PackingDashboard.tsx
│   │   └── ShippingDashboard.tsx
│   ├── App.tsx
│   └── main.tsx
├── supabase-setup.sql       # Database setup script
├── SETUP_GUIDE.md
└── package.json
```

---

## 🔐 Authentication System

### Single Login System
- **ONE** login page for all roles
- **ONE** users database
- Role-based dashboard routing
- Secure password hashing via Supabase Auth

### Authentication Flow
```
1. User visits Home page
2. Clicks role card (Admin/Billing/Packing/Shipping)
3. Redirected to /login?role=<selected_role>
4. Enters email & password
5. System validates credentials
6. Checks user role from database
7. Redirects to appropriate dashboard
```

### Role Assignment
```typescript
// User registration
await signUp(email, password, name, role);

// Creates:
// 1. auth.users entry (Supabase Auth)
// 2. profiles entry (user info)
// 3. user_roles entry (role assignment)
```

### Protected Routes
```typescript
<ProtectedRoute allowedRoles={['admin']}>
  <AdminDashboard />
</ProtectedRoute>
```

### Session Management
- JWT tokens managed by Supabase
- Automatic token refresh
- Persistent sessions across page reloads
- Secure logout

---

## 📋 Order Workflow

### Complete Pipeline
```
WhatsApp Order
    ↓
[BILLING] Create Order
    ↓ (order_status: ready_for_packing)
[PACKING] Confirm Packing
    ↓ (order_status: ready_for_shipping)
[SHIPPING] Select Provider & Generate Tracking
    ↓ (order_status: shipped)
COMPLETED
```

### Detailed Steps

#### Step 1: Billing Creates Order
```typescript
{
  customer_name: "John Doe",
  phone: "+91 98765 43210",
  address: "123 Main St, City",
  items: [
    { product_id, product_name, quantity, unit_price, total_price }
  ],
  total_amount: 15000,
  payment_status: "paid",
  order_status: "ready_for_packing"
}
```

#### Step 2: Packing Confirms
```typescript
// Updates:
orders.order_status = "ready_for_shipping"
packing.packing_status = "packed"
packing.packed_by = user_id
packing.packed_at = timestamp
```

#### Step 3: Shipping Dispatches
```typescript
// Updates:
orders.order_status = "shipped"
shipping.shipping_provider = "VRL Logistics"
shipping.tracking_id = "VRL1234567890"
shipping.shipped_by = user_id
shipping.shipped_at = timestamp
```

---

## 👥 User Roles & Permissions

### Admin Role
**Access**: Full system control

**Permissions**:
- ✅ View all orders
- ✅ Manage users (view list)
- ✅ Manage products (CRUD)
- ✅ View analytics & charts
- ✅ Monitor all departments
- ✅ Access all dashboards

**Dashboard Features**:
- Total orders, revenue, status counts
- Monthly revenue trend chart
- Order status distribution pie chart
- Top selling products bar chart
- Shipping provider distribution
- Recent orders table

### Billing Role
**Access**: Order creation and billing

**Permissions**:
- ✅ Create new orders
- ✅ Enter customer details
- ✅ Select products & quantities
- ✅ Set payment status
- ✅ View billing history
- ✅ Send orders to packing
- ❌ Cannot access packing/shipping

**Dashboard Features**:
- Create order form
- Product selection dropdown
- Dynamic total calculation
- Billing history table
- Order status tracker

### Packing Role
**Access**: Packing operations

**Permissions**:
- ✅ View orders ready for packing
- ✅ See order items details
- ✅ Mark orders as packed
- ✅ View packing history
- ❌ Cannot create orders
- ❌ Cannot access shipping

**Dashboard Features**:
- Pending packing orders list
- View order items dialog
- One-click "Mark as Packed"
- Packed orders history
- Statistics cards

### Shipping Role
**Access**: Shipping operations

**Permissions**:
- ✅ View packed orders
- ✅ Select shipping provider
- ✅ Generate tracking IDs
- ✅ Mark orders as shipped
- ✅ View shipping history
- ❌ Cannot create orders
- ❌ Cannot access packing

**Dashboard Features**:
- Ready for shipping orders
- Shipping provider dropdown (Sugama/VRL/Indian Post)
- Auto-generate tracking ID
- Shipment confirmation dialog
- Shipped orders history

---

## 🗄️ Database Schema

### Tables

#### profiles
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users
name TEXT
email TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### user_roles
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users
role app_role (admin|billing|packing|shipping)
```

#### products
```sql
id UUID PRIMARY KEY
product_name TEXT
category TEXT
price DECIMAL(10,2)
description TEXT
stock INTEGER
image_url TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### orders
```sql
id UUID PRIMARY KEY
customer_name TEXT
phone TEXT
address TEXT
total_amount DECIMAL(10,2)
order_status TEXT (ready_for_packing|ready_for_shipping|shipped)
payment_status TEXT (paid|unpaid|partial)
created_by UUID REFERENCES auth.users
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### order_items
```sql
id UUID PRIMARY KEY
order_id UUID REFERENCES orders
product_id UUID REFERENCES products
product_name TEXT
quantity INTEGER
unit_price DECIMAL(10,2)
total_price DECIMAL(10,2)
```

#### packing
```sql
id UUID PRIMARY KEY
order_id UUID REFERENCES orders (UNIQUE)
packing_status TEXT
packed_by UUID REFERENCES auth.users
packed_at TIMESTAMPTZ
```

#### shipping
```sql
id UUID PRIMARY KEY
order_id UUID REFERENCES orders (UNIQUE)
shipping_provider TEXT
tracking_id TEXT
shipping_status TEXT
shipped_by UUID REFERENCES auth.users
shipped_at TIMESTAMPTZ
```

#### transactions
```sql
id UUID PRIMARY KEY
order_id UUID REFERENCES orders
amount DECIMAL(10,2)
payment_method TEXT
payment_date TIMESTAMPTZ
```

### Database Functions

#### get_user_role
```sql
CREATE FUNCTION get_user_role(_user_id UUID)
RETURNS app_role
```
Returns the role for a given user ID.

#### has_role
```sql
CREATE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
```
Checks if a user has a specific role.

---

## 🎨 Features by Role

### Home Page (Public)
- Hero section with company branding
- About company section
- Product categories showcase (6 categories)
- Product cards with pricing (20 products)
- **Role Selection Cards** (4 cards)
  - Admin Login
  - Billing Login
  - Packing Login
  - Shipping Login
- Contact information
- Responsive navigation

### Admin Dashboard
**Statistics Cards**:
- Total Orders (with trend)
- Revenue (with trend)
- Pending Packing (with trend)
- Packed Orders (with trend)
- Shipped Orders (with trend)

**Charts**:
- Monthly Revenue Trend (Line Chart)
- Order Status Distribution (Pie Chart)
- Top Selling Products (Bar Chart)
- Shipping Provider Distribution (Pie Chart)

**Tables**:
- Recent Orders (10 most recent)

### Billing Dashboard
**Create Order Form**:
- Customer name input
- Phone number input
- Address input
- Payment status dropdown
- Product selection dropdown
- Quantity input
- Add/Remove items
- Dynamic total calculation
- Submit button

**Billing History**:
- Customer name
- Amount
- Status badge
- Date

### Packing Dashboard
**Statistics**:
- Pending Packing count
- Packed count

**Pending Orders Table**:
- Customer details
- Phone, Amount, Date
- "View Items" button
- "Mark as Packed" button

**Packed Orders Table**:
- Customer, Amount, Status, Date

**Order Items Dialog**:
- Product name
- Quantity
- Price

### Shipping Dashboard
**Statistics**:
- Pending Shipments count
- Shipped count

**Pending Shipments Table**:
- Customer, Phone, Address, Amount
- "Ship Order" button

**Ship Order Dialog**:
- Shipping provider dropdown
- Tracking ID input
- "Generate" button
- "Confirm Shipment" button

**Shipped Orders Table**:
- Customer, Amount, Status, Date

---

## 🔌 API & Hooks

### useOrders Hook
```typescript
useOrders(statusFilter?: string)
useOrderItems(orderId: string)
useOrderStats()
useCreateOrder()
useMarkAsPacked()
useMarkAsShipped()
useUpdateOrderStatus()
```

### useAdmin Hook
```typescript
useUsers()
useProductStats()
useShippingStats()
useMonthlyRevenue()
useCreateProduct()
useUpdateProduct()
useDeleteProduct()
```

### useProducts Hook
```typescript
useProducts()
```

### useAuth Hook
```typescript
const { user, session, role, loading, signUp, signIn, signOut } = useAuth();
```

---

## 🎨 UI Components

### Layout Components
- `DashboardLayout` - Sidebar + header layout
- `Navbar` - Public navigation
- `ProtectedRoute` - Route guard

### shadcn/ui Components Used
- Button, Card, Input, Label
- Select, Table, Dialog
- Sidebar, Toast, Tooltip
- Badge, Separator, Tabs
- And 40+ more components

### Custom Styling
```css
/* Status Badges */
.status-pending { /* Yellow */ }
.status-packed { /* Blue */ }
.status-shipped { /* Green */ }
.status-billed { /* Purple */ }
```

---

## 🔒 Security

### Row Level Security (RLS)
All tables have RLS enabled with policies:

**Products**:
- Anyone can view
- Only admins can modify

**Orders**:
- All authenticated users can view
- Only billing/admin can create
- All roles can update (for status changes)

**Packing**:
- Packing/admin can view and modify

**Shipping**:
- Shipping/admin can view and modify

### Authentication Security
- Passwords hashed by Supabase Auth
- JWT tokens for session management
- Automatic token refresh
- HTTPS only in production

### Frontend Protection
- Protected routes with role checking
- Conditional rendering based on role
- Client-side validation

### Backend Protection
- RLS policies enforce permissions
- Database functions for role checks
- Foreign key constraints
- Input validation

---

## 📊 Analytics & Reporting

### Admin Analytics
1. **Monthly Revenue Trend**
   - Last 6 months
   - Line chart visualization

2. **Order Status Distribution**
   - Pending, Packed, Shipped
   - Pie chart visualization

3. **Top Selling Products**
   - Top 5 by revenue
   - Horizontal bar chart

4. **Shipping Provider Distribution**
   - Sugama, VRL, Indian Post
   - Pie chart visualization

### Real-time Statistics
- Total orders count
- Total revenue
- Pending/Packed/Shipped counts
- Trend indicators

---

## 🚀 Deployment Checklist

- [ ] Run `supabase-setup.sql` in Supabase SQL Editor
- [ ] Verify all tables created
- [ ] Check RLS policies enabled
- [ ] Insert sample products
- [ ] Create test users (one per role)
- [ ] Test complete order workflow
- [ ] Verify role-based access control
- [ ] Test on mobile devices
- [ ] Set up production environment variables
- [ ] Deploy to hosting platform

---

## 📝 Notes

### Shipping Providers
- Sugama Transport
- VRL Logistics
- Indian Post

### Order Statuses
- `ready_for_packing` - Created by billing
- `ready_for_shipping` - Packed by packing dept
- `shipped` - Shipped by shipping dept

### Payment Statuses
- `paid` - Fully paid
- `unpaid` - Not paid
- `partial` - Partially paid

---

## 🎉 Success Metrics

After implementation, the system provides:
- ✅ 100% digital order tracking
- ✅ Real-time visibility across departments
- ✅ Automated workflow transitions
- ✅ Comprehensive analytics
- ✅ Secure role-based access
- ✅ Mobile-responsive interface
- ✅ Scalable architecture

---

**Last Updated**: March 2026  
**Version**: 1.0.0  
**Maintained by**: SGB Pvt. Ltd. Development Team
