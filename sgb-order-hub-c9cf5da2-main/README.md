# SGB Order Hub - Complete Order Management System

## 🏢 About SGB Pvt. Ltd.

SGB Pvt. Ltd. is a hardware and agro products company specializing in brush cutters, garden tools, sprayers, tillers, chainsaws, and lawn equipment. This application digitizes the complete internal order workflow from WhatsApp orders to shipment.

## 🎯 Project Overview

A full-stack role-based order management web application that manages the internal workflow of orders through Billing, Packing, and Shipping departments until they are shipped.

### Order Workflow Pipeline
```
WhatsApp Order → Billing → Packing → Shipping → Shipped
```

## ✨ Key Features

### 🔐 Authentication System
- **Single login system** for all roles
- **4 user roles**: Admin, Billing, Packing, Shipping
- Role-based dashboard routing
- Secure password hashing via Supabase Auth
- Protected routes with access control

### 🏠 Home Page
- Professional company website design
- Hero section with company branding
- **Role selection cards** (4 interactive cards)
- Product categories showcase (6 categories)
- Product cards with pricing (20 pre-loaded products)
- About company section
- Contact information
- Fully responsive design

### 👨‍💼 Admin Dashboard
- **Statistics Cards**: Total orders, revenue, pending/packed/shipped counts with trends
- **Monthly Revenue Trend** (Line Chart)
- **Order Status Distribution** (Pie Chart)
- **Top Selling Products** (Bar Chart)
- **Shipping Provider Distribution** (Pie Chart)
- Recent orders table
- Complete system visibility

### 💰 Billing Dashboard
- Create new orders with customer details
- Product selection with quantity management
- Dynamic total calculation
- Payment status selection (Paid/Unpaid/Partial)
- Billing history table
- Send orders to packing department

### 📦 Packing Dashboard
- View orders ready for packing
- Order items detail dialog
- One-click "Mark as Packed"
- Packed orders history
- Statistics cards

### 🚚 Shipping Dashboard
- View packed orders ready for shipping
- Select shipping provider (Sugama Transport, VRL Logistics, Indian Post)
- Auto-generate tracking IDs
- Shipment confirmation
- Shipped orders history
- Statistics cards

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)

### Installation
```bash
cd sgb-order-hub-c9cf5da2-main
npm install
```

### Database Setup
1. Go to https://supabase.com/dashboard
2. Open SQL Editor
3. Copy content from `supabase-setup.sql`
4. Run in SQL Editor
5. Verify tables created successfully

### Run Application
```bash
npm run dev
```

Open http://localhost:5173

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - 5-minute setup and testing guide
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup instructions
- **[PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)** - Full technical documentation
- **[supabase-setup.sql](supabase-setup.sql)** - Database schema and sample data

## 🎯 User Roles

### Admin
- Full system control and analytics
- Manage users and products
- View all orders and departments
- Access comprehensive analytics

### Billing
- Create invoices and process orders
- Enter customer details
- Select products and quantities
- Send orders to packing

### Packing
- Manage product packing
- Confirm packed orders
- Send to shipping department

### Shipping
- Handle shipment operations
- Select shipping providers
- Generate tracking IDs
- Mark orders as shipped

## 🗄️ Database Schema

### Tables
- **profiles** - User information
- **user_roles** - Role assignments
- **products** - Product catalog (20 pre-loaded)
- **orders** - Customer orders
- **order_items** - Order line items
- **packing** - Packing status
- **shipping** - Shipping details
- **transactions** - Payment records

### Sample Data
20 pre-loaded products including:
- Brush Cutters (BC-520, BC-430)
- Garden Tools (Pruning Shears, Rake, Hoe, Spade)
- Sprayers (Manual, Power)
- Tillers (Mini, Heavy Duty)
- Chainsaws (CS-5200, Electric)
- Lawn Equipment (Mower, Trimmer)

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Routing**: React Router v6
- **State Management**: TanStack Query
- **Backend**: Supabase (PostgreSQL + Auth)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod

## 🔒 Security

- Row Level Security (RLS) on all tables
- Role-based access control
- JWT authentication
- Secure password hashing
- Protected API routes
- Input validation

## 📱 Responsive Design

- Mobile-first approach
- Tablet optimization
- Desktop layouts
- Touch-friendly interfaces
- Adaptive navigation

## 🎨 UI/UX Features

- Modern dashboard layouts
- Sidebar navigation
- Interactive charts
- Status badges with color coding
- Toast notifications
- Loading states
- Form validation
- Smooth transitions

## 🧪 Testing

Create test users for each role:
```
admin@sgb.com / admin123
billing@sgb.com / billing123
packing@sgb.com / packing123
shipping@sgb.com / shipping123
```

Test complete workflow:
1. Billing creates order
2. Packing marks as packed
3. Shipping ships order
4. Admin views analytics

## 📦 Deployment

### Build
```bash
npm run build
```

### Environment Variables
```
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
VITE_SUPABASE_URL=your_url
```

## 🎉 Features Summary

✅ Single authentication system with 4 roles  
✅ Role-based dashboard routing  
✅ Complete order workflow automation  
✅ Real-time analytics and charts  
✅ 20 pre-loaded sample products  
✅ Secure access control with RLS  
✅ Professional UI/UX design  
✅ Mobile responsive  
✅ Order tracking from creation to shipment  
✅ Department-specific dashboards  

## 📞 Support

For issues or questions, check:
- Browser console for errors
- Supabase logs
- Database tables and RLS policies
- Documentation files

---

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
