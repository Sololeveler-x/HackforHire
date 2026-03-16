# 🏗️ SGB Order Hub - System Architecture

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Admin   │  │ Billing  │  │ Packing  │  │ Shipping │   │
│  │Dashboard │  │Dashboard │  │Dashboard │  │Dashboard │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
│       └─────────────┴──────────────┴─────────────┘          │
│                          │                                   │
│                   React Application                          │
│              (TypeScript + Vite + Tailwind)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTPS/REST API
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                     BACKEND LAYER                            │
│                   Supabase Platform                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │              PostgreSQL Database                    │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │     │
│  │  │ Products │  │  Orders  │  │  Users   │        │     │
│  │  └──────────┘  └──────────┘  └──────────┘        │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │     │
│  │  │ Packing  │  │ Shipping │  │Transactions│       │     │
│  │  └──────────┘  └──────────┘  └──────────┘        │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Supabase Auth (JWT)                        │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │      Row Level Security (RLS)                      │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Order Workflow

```
┌──────────────┐
│   WhatsApp   │ (Manual Entry)
│    Order     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│           BILLING DEPARTMENT                      │
│  • Create order                                   │
│  • Enter customer details                         │
│  • Select products                                │
│  • Set payment status                             │
│  • Generate invoice                               │
└──────┬───────────────────────────────────────────┘
       │ order_status = "ready_for_packing"
       ▼
┌──────────────────────────────────────────────────┐
│           PACKING DEPARTMENT                      │
│  • View pending orders                            │
│  • Check product list                             │
│  • Confirm packing                                │
│  • Mark as packed                                 │
└──────┬───────────────────────────────────────────┘
       │ order_status = "ready_for_shipping"
       ▼
┌──────────────────────────────────────────────────┐
│          SHIPPING DEPARTMENT                      │
│  • View packed orders                             │
│  • Select shipping provider                       │
│  • Generate tracking ID                           │
│  • Confirm shipment                               │
└──────┬───────────────────────────────────────────┘
       │ order_status = "shipped"
       ▼
┌──────────────────────────────────────────────────┐
│              ORDER COMPLETED                      │
│  • Customer receives order                        │
│  • Admin views analytics                          │
└───────────────────────────────────────────────────┘
```

## 🔐 Authentication Flow

```
┌─────────────┐
│  Home Page  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│    Role Selection Cards              │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ Admin  │ │Billing │ │Packing │  │
│  └────────┘ └────────┘ └────────┘  │
│  ┌────────┐                         │
│  │Shipping│                         │
│  └────────┘                         │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────┐
│   Login Page    │
│  • Email        │
│  • Password     │
└──────┬──────────┘
       │
       ▼
┌─────────────────────────────────────┐
│    Supabase Auth Validation         │
│  • Check credentials                │
│  • Generate JWT token               │
│  • Fetch user role                  │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│      Role-Based Routing             │
│  Admin    → /admin                  │
│  Billing  → /billing                │
│  Packing  → /packing                │
│  Shipping → /shipping               │
└─────────────────────────────────────┘
```

## 📁 Project Structure

```
sgb-order-hub-c9cf5da2-main/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── DashboardLayout.tsx    # Main dashboard layout
│   │   ├── Navbar.tsx             # Navigation bar
│   │   ├── NavLink.tsx            # Navigation link
│   │   └── ProtectedRoute.tsx     # Route guard
│   ├── contexts/
│   │   └── AuthContext.tsx        # Authentication context
│   ├── hooks/
│   │   ├── useOrders.ts           # Order management
│   │   ├── useAdmin.ts            # Admin operations
│   │   └── use-toast.ts           # Toast notifications
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          # Supabase client
│   │       └── types.ts           # Database types
│   ├── pages/
│   │   ├── Home.tsx               # Landing page
│   │   ├── Login.tsx              # Login page
│   │   ├── Register.tsx           # Registration
│   │   ├── AdminDashboard.tsx     # Admin dashboard
│   │   ├── BillingDashboard.tsx   # Billing dashboard
│   │   ├── PackingDashboard.tsx   # Packing dashboard
│   │   └── ShippingDashboard.tsx  # Shipping dashboard
│   ├── App.tsx                    # Main app component
│   └── main.tsx                   # Entry point
├── supabase-setup.sql             # Database setup
├── README.md                      # Project overview
├── SETUP_GUIDE.md                 # Setup instructions
├── QUICK_START.md                 # Quick start guide
├── PROJECT_DOCUMENTATION.md       # Technical docs
├── FEATURES_CHECKLIST.md          # Feature list
├── DEPLOYMENT_GUIDE.md            # Deployment guide
└── package.json                   # Dependencies
```


## 🗄️ Database Schema

```
┌─────────────────┐
│   auth.users    │ (Supabase Auth)
│  • id           │
│  • email        │
│  • password     │
└────────┬────────┘
         │
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌─────────────────┐
│    profiles     │          │   user_roles    │
│  • id           │          │  • id           │
│  • user_id  ────┼──────────┤  • user_id      │
│  • name         │          │  • role         │
│  • email        │          │    (enum)       │
└─────────────────┘          └─────────────────┘

┌─────────────────┐
│    products     │
│  • id           │
│  • product_name │
│  • category     │
│  • price        │
│  • stock        │
└────────┬────────┘
         │
         │
         ▼
┌─────────────────┐          ┌─────────────────┐
│  order_items    │          │     orders      │
│  • id           │          │  • id           │
│  • order_id ────┼──────────┤  • customer_name│
│  • product_id   │          │  • phone        │
│  • quantity     │          │  • address      │
│  • total_price  │          │  • total_amount │
└─────────────────┘          │  • order_status │
                             │  • payment_status│
                             └────────┬────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
         ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
         │    packing      │ │    shipping     │ │  transactions   │
         │  • id           │ │  • id           │ │  • id           │
         │  • order_id     │ │  • order_id     │ │  • order_id     │
         │  • packed_by    │ │  • provider     │ │  • amount       │
         │  • packed_at    │ │  • tracking_id  │ │  • method       │
         └─────────────────┘ │  • shipped_by   │ └─────────────────┘
                             │  • shipped_at   │
                             └─────────────────┘
```

## 🔒 Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND SECURITY                     │
│  • Protected Routes (React Router)                       │
│  • Role-based rendering                                  │
│  • Input validation (Zod)                                │
│  • XSS prevention                                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 AUTHENTICATION LAYER                     │
│  • Supabase Auth (JWT)                                   │
│  • Password hashing (bcrypt)                             │
│  • Session management                                    │
│  • Token refresh                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 AUTHORIZATION LAYER                      │
│  • Row Level Security (RLS)                              │
│  • Role-based policies                                   │
│  • has_role() function                                   │
│  • get_user_role() function                              │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                        │
│  • PostgreSQL constraints                                │
│  • Foreign keys                                          │
│  • Data validation                                       │
│  • SQL injection prevention                              │
└─────────────────────────────────────────────────────────┘
```

## 📊 Data Flow

### Creating an Order (Billing)

```
User Input
    ↓
React Form
    ↓
Form Validation (Zod)
    ↓
useCreateOrder Hook
    ↓
TanStack Query Mutation
    ↓
Supabase Client
    ↓
RLS Policy Check (has_role: billing)
    ↓
Insert into orders table
    ↓
Insert into order_items table
    ↓
Insert into transactions table
    ↓
Query Invalidation
    ↓
UI Update + Toast Notification
```

### Marking as Packed (Packing)

```
User Click "Mark as Packed"
    ↓
useMarkAsPacked Hook
    ↓
TanStack Query Mutation
    ↓
Supabase Client
    ↓
RLS Policy Check (has_role: packing)
    ↓
Upsert into packing table
    ↓
Update orders.order_status = "ready_for_shipping"
    ↓
Query Invalidation
    ↓
UI Update + Toast Notification
```

### Shipping Order (Shipping)

```
User Selects Provider + Generates Tracking
    ↓
useMarkAsShipped Hook
    ↓
TanStack Query Mutation
    ↓
Supabase Client
    ↓
RLS Policy Check (has_role: shipping)
    ↓
Upsert into shipping table
    ↓
Update orders.order_status = "shipped"
    ↓
Query Invalidation
    ↓
UI Update + Toast Notification
```

## 🎨 Component Architecture

```
App.tsx
├── AuthProvider (Context)
│   └── BrowserRouter
│       └── Routes
│           ├── Home
│           │   └── Navbar
│           ├── Login
│           │   └── Navbar
│           ├── Register
│           │   └── Navbar
│           └── ProtectedRoute
│               └── DashboardLayout
│                   ├── Sidebar
│                   ├── Header
│                   └── Main Content
│                       ├── AdminDashboard
│                       │   ├── StatCards
│                       │   ├── Charts (Recharts)
│                       │   └── OrdersTable
│                       ├── BillingDashboard
│                       │   ├── CreateOrderForm
│                       │   └── BillingHistory
│                       ├── PackingDashboard
│                       │   ├── PendingTable
│                       │   ├── PackedTable
│                       │   └── ItemsDialog
│                       └── ShippingDashboard
│                           ├── PendingTable
│                           ├── ShippedTable
│                           └── ShipDialog
```

## 🔄 State Management

```
┌─────────────────────────────────────────────────────────┐
│                   SERVER STATE                           │
│              (TanStack Query)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Orders    │  │  Products   │  │    Users    │    │
│  │   Cache     │  │   Cache     │  │   Cache     │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│  • Automatic caching                                     │
│  • Background refetching                                 │
│  • Query invalidation                                    │
│  • Optimistic updates                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   CLIENT STATE                           │
│               (React Context)                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │           AuthContext                            │   │
│  │  • user                                          │   │
│  │  • session                                       │   │
│  │  • role                                          │   │
│  │  • loading                                       │   │
│  │  • signIn(), signOut(), signUp()                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   LOCAL STATE                            │
│                (useState)                                │
│  • Form inputs                                           │
│  • Dialog open/close                                     │
│  • Selected items                                        │
│  • UI toggles                                            │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION                            │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         CDN (Vercel/Netlify)                   │    │
│  │  • Static assets                               │    │
│  │  • Global distribution                         │    │
│  │  • HTTPS                                       │    │
│  └────────────────┬───────────────────────────────┘    │
│                   │                                      │
│                   ▼                                      │
│  ┌────────────────────────────────────────────────┐    │
│  │         React Application                      │    │
│  │  • Optimized build                             │    │
│  │  • Code splitting                              │    │
│  │  • Lazy loading                                │    │
│  └────────────────┬───────────────────────────────┘    │
│                   │                                      │
│                   ▼                                      │
│  ┌────────────────────────────────────────────────┐    │
│  │         Supabase Cloud                         │    │
│  │  • PostgreSQL database                         │    │
│  │  • Authentication                              │    │
│  │  • Real-time subscriptions                     │    │
│  │  • Automatic backups                           │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## 📱 Responsive Design

```
Mobile (< 640px)
├── Single column layout
├── Hamburger menu
├── Stacked cards
├── Simplified tables
└── Touch-friendly buttons

Tablet (640px - 1024px)
├── Two column layout
├── Collapsible sidebar
├── Grid cards (2 columns)
├── Responsive tables
└── Medium-sized buttons

Desktop (> 1024px)
├── Multi-column layout
├── Fixed sidebar
├── Grid cards (3-5 columns)
├── Full tables
└── Standard buttons
```

## 🎯 Performance Optimization

```
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND OPTIMIZATION                   │
│  • Code splitting (React.lazy)                           │
│  • Tree shaking (Vite)                                   │
│  • Asset optimization                                    │
│  • Query caching (TanStack Query)                        │
│  • Debounced inputs                                      │
│  • Memoization (useMemo, useCallback)                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  BACKEND OPTIMIZATION                    │
│  • Database indexes                                      │
│  • Query optimization                                    │
│  • Connection pooling                                    │
│  • RLS policy optimization                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  NETWORK OPTIMIZATION                    │
│  • HTTPS/2                                               │
│  • Gzip compression                                      │
│  • CDN caching                                           │
│  • Asset minification                                    │
└─────────────────────────────────────────────────────────┘
```

---

**System Architecture Version**: 1.0.0  
**Last Updated**: March 2026  
**Status**: Production Ready ✅
