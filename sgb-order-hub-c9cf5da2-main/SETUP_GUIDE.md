# SGB Order Hub - Complete Setup Guide

## 🏢 About SGB Pvt. Ltd.

SGB Pvt. Ltd. is a hardware and agro products company specializing in:
- Brush Cutters
- Garden Tools
- Sprayers
- Tillers
- Chainsaws
- Lawn Equipment

This application digitizes the internal order workflow from billing to shipping with complete operational visibility.

---

## 🎯 System Overview

### Order Workflow Pipeline
```
WhatsApp Order → Billing → Packing → Shipping → Shipped
```

### User Roles
1. **Admin** - Full system control, analytics, user management
2. **Billing** - Create orders, generate invoices
3. **Packing** - Confirm product packing
4. **Shipping** - Select providers, generate tracking IDs

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)

### 1. Clone and Install
```bash
cd sgb-order-hub-c9cf5da2-main
npm install
```

### 2. Environment Setup
The `.env` file is already configured with Supabase credentials:
```
VITE_SUPABASE_PROJECT_ID="bmpdxpqvjdhukaupczji"
VITE_SUPABASE_PUBLISHABLE_KEY="..."
VITE_SUPABASE_URL="https://bmpdxpqvjdhukaupczji.supabase.co"
```

### 3. Database Setup


1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to SQL Editor
3. Copy the entire content from `supabase-setup.sql`
4. Paste and run it in the SQL Editor
5. This will create:
   - All required tables (users, products, orders, etc.)
   - Row Level Security policies
   - Sample products (20 items)
   - Database functions for role management

### 4. Run the Application
```bash
npm run dev
```

The app will open at `http://localhost:5173`

---

## 📋 Database Schema

### Tables Created
- **profiles** - User profile information
- **user_roles** - Role assignments (admin, billing, packing, shipping)
- **products** - Product catalog with 20 pre-loaded items
- **orders** - Customer orders
- **order_items** - Individual items in each order
- **packing** - Packing status tracking
- **shipping** - Shipping details and tracking
- **transactions** - Payment records

### Sample Products Included
The database comes pre-loaded with 20 products including:
- Brush Cutters (BC-520, BC-430)
- Garden Tools (Pruning Shears, Rake, Hoe, Spade, Fork)
- Sprayers (Manual 16L, Power Sprayer)
- Tillers (Mini Tiller, Heavy Duty)
- Chainsaws (CS-5200, Electric)
- Lawn Equipment (Mower, Grass Trimmer)
- And more...

---

## 👥 User Authentication

### Single Login System
- ONE login page for all roles
- Role-based dashboard routing
- Secure password hashing via Supabase Auth

### Home Page Role Selection
The home page displays 4 role cards:
- **Admin Login** - System control and analytics
- **Billing Login** - Create invoices and orders
- **Packing Login** - Manage packing operations
- **Shipping Login** - Handle shipments

### Registration
Users can register with:
- Full Name
- Email
- Password (min 6 characters)
- Role selection (Admin/Billing/Packing/Shipping)

### Access Control
Each role has specific permissions enforced by:
- Frontend route protection
- Backend Row Level Security (RLS)
- Role-based queries

---

## 🔐 Role Permissions

### Admin
✅ View all orders
✅ Manage users
✅ Manage products
✅ View analytics and charts
✅ Monitor all departments
✅ Access all dashboards

### Billing
✅ Create new orders
✅ Enter customer details
✅ Select products and quantities
✅ Set payment status
✅ View billing history
✅ Send orders to packing

### Packing
✅ View orders ready for packing
✅ See order items details
✅ Mark orders as packed
✅ Send to shipping department
✅ View packing history

### Shipping
✅ View packed orders
✅ Select shipping provider (Sugama/VRL/Indian Post)
✅ Generate tracking IDs
✅ Mark orders as shipped
✅ View shipping history

---

## 📊 Features

### Admin Dashboard
- Total orders, revenue, pending/packed/shipped counts
- Order status distribution pie chart
- Orders overview bar chart
- Recent orders table
- Real-time statistics

### Billing Dashboard
- Create order form with customer details
- Product selection with quantity
- Dynamic total calculation
- Payment status selection
- Billing history table

### Packing Dashboard
- Pending packing orders list
- View order items dialog
- One-click "Mark as Packed"
- Packed orders history

### Shipping Dashboard
- Ready for shipping orders
- Shipping provider dropdown
- Auto-generate tracking ID
- Shipment confirmation
- Shipped orders history

### Home Page
- Hero section with company branding
- About company section
- Product categories showcase
- Product cards with pricing
- Role selection cards
- Contact information
- Responsive design

---

## 🎨 UI/UX Features

- Modern dashboard layout with sidebar
- Responsive design (mobile, tablet, desktop)
- Clean business interface
- Status badges with color coding
- Interactive charts (Recharts)
- Toast notifications (Sonner)
- Loading states
- Form validation
- Protected routes

---

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod

---

## 📱 Testing the Application

### 1. Create Test Users
Register 4 users with different roles:
- admin@sgb.com (Admin)
- billing@sgb.com (Billing)
- packing@sgb.com (Packing)
- shipping@sgb.com (Shipping)

### 2. Test Order Flow
1. Login as **Billing** user
2. Create a new order with customer details
3. Add products (e.g., Brush Cutter, Garden Tools)
4. Set payment status and submit
5. Logout

6. Login as **Packing** user
7. View the order in pending packing
8. Click "View Items" to see products
9. Click "Mark as Packed"
10. Logout

11. Login as **Shipping** user
12. View the order in pending shipments
13. Select shipping provider (e.g., VRL Logistics)
14. Generate tracking ID
15. Confirm shipment
16. Logout

17. Login as **Admin** user
18. View complete order in dashboard
19. Check analytics and charts

---

## 🔧 Customization

### Adding More Products
```sql
INSERT INTO products (product_name, category, price, description, stock) 
VALUES ('New Product', 'Category', 1000.00, 'Description', 50);
```

### Changing Company Information
Edit `src/pages/Home.tsx`:
- Company name
- Contact details
- Product categories
- Hero section content

### Modifying Shipping Providers
Edit `src/pages/ShippingDashboard.tsx`:
```typescript
<SelectItem value="Your Provider">Your Provider</SelectItem>
```

---

## 📦 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel/Netlify
1. Connect your Git repository
2. Set environment variables
3. Deploy

### Environment Variables for Production
```
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
VITE_SUPABASE_URL=your_url
```

---

## 🐛 Troubleshooting

### Database Connection Issues
- Verify Supabase credentials in `.env`
- Check if SQL setup script ran successfully
- Ensure RLS policies are enabled

### Authentication Errors
- Clear browser cache and cookies
- Check Supabase Auth settings
- Verify user_roles table has entries

### Products Not Showing
- Run the INSERT products query from `supabase-setup.sql`
- Check RLS policy: "Anyone can view products"

---

## 📞 Support

For issues or questions:
- Check Supabase logs
- Review browser console
- Verify database tables exist
- Check RLS policies

---

## 🎉 Success!

Your SGB Order Hub is now ready! The system provides:
✅ Role-based authentication
✅ Complete order workflow
✅ Department dashboards
✅ Real-time analytics
✅ Secure access control
✅ Professional UI/UX

Happy order management! 🚀
