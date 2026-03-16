# 🚀 START HERE - Quick Setup Instructions

## ⚡ Step-by-Step Setup (5 Minutes)

### Step 1: Open PowerShell in Correct Directory

You should be in: `C:\Users\JEEVAN\Downloads\sgb-order-hub-c9cf5da2-main`

Run this command to navigate to the project folder:
```powershell
cd sgb-order-hub-c9cf5da2-main
```

Verify you're in the right place:
```powershell
ls package.json
```
You should see the package.json file listed.

---

### Step 2: Install Dependencies (2-3 minutes)

```powershell
npm install
```

**Note**: This will take 2-3 minutes. You'll see:
- ⠋ Loading indicators (this is normal)
- Some deprecation warnings (safe to ignore)
- "added XXX packages" when complete

**If it's taking too long or stuck:**
- Press `Ctrl+C` to cancel
- Run: `npm install --legacy-peer-deps`

---

### Step 3: Update Environment Variables

The `.env` file is already configured with your Supabase credentials:
```
VITE_SUPABASE_PROJECT_ID="fwmnriafhdbdgtklheyy"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_xdgTOLxRK9umcQWpd_eCmA_mLBSASCi"
VITE_SUPABASE_URL="https://fwmnriafhdbdgtklheyy.supabase.co"
```

✅ No action needed - already done!

---

### Step 4: Setup Database (2 minutes)

1. Open your browser
2. Go to: https://supabase.com/dashboard
3. Select project: `fwmnriafhdbdgtklheyy`
4. Click "SQL Editor" in left sidebar
5. Open the file: `supabase-setup.sql` (in your project folder)
6. Copy ALL content (Ctrl+A, then Ctrl+C)
7. Paste in Supabase SQL Editor
8. Click "Run" button
9. Wait for "Success" message

**What this does:**
- Creates 8 database tables
- Adds 20 sample products
- Sets up security policies
- Creates database functions

---

### Step 5: Start the Application

```powershell
npm run dev
```

You should see:
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Open your browser and go to:**
```
http://localhost:5173
```

---

## ✅ Verification

You should see:
1. ✅ SGB Pvt. Ltd. home page
2. ✅ Hero section with company name
3. ✅ 4 role selection cards (Admin, Billing, Packing, Shipping)
4. ✅ Product categories
5. ✅ 20 products displayed

---

## 🧪 Test the Application

### Create Test Users

1. Click "Admin Login" card
2. Click "Register" link
3. Create admin user:
   - Name: Admin User
   - Email: admin@sgb.com
   - Password: admin123
   - Role: Admin
4. Click "Create Account"

Repeat for other roles:
- billing@sgb.com / billing123 (Role: Billing)
- packing@sgb.com / packing123 (Role: Packing)
- shipping@sgb.com / shipping123 (Role: Shipping)

### Test Complete Workflow

1. **Login as Billing** (billing@sgb.com)
   - Create a new order
   - Add customer details
   - Select products
   - Submit order

2. **Login as Packing** (packing@sgb.com)
   - View pending orders
   - Click "Mark as Packed"

3. **Login as Shipping** (shipping@sgb.com)
   - View packed orders
   - Select shipping provider
   - Generate tracking ID
   - Confirm shipment

4. **Login as Admin** (admin@sgb.com)
   - View dashboard
   - See analytics and charts
   - View all orders

---

## 🐛 Common Issues

### Issue: npm install fails
```powershell
# Try with legacy peer deps
npm install --legacy-peer-deps

# Or clear cache first
npm cache clean --force
npm install
```

### Issue: Port 5173 already in use
```powershell
# Use different port
npm run dev -- --port 3000
```

### Issue: No products showing
- Make sure you ran `supabase-setup.sql` in Supabase SQL Editor
- Check Supabase dashboard → Table Editor → products table

### Issue: Can't login
- Make sure you created a user account
- Check Supabase dashboard → Authentication → Users
- Verify user has a role in user_roles table

---

## 📚 Documentation Files

- **QUICK_START.md** - 5-minute setup guide
- **SETUP_GUIDE.md** - Detailed setup instructions
- **TROUBLESHOOTING.md** - Common issues and solutions
- **PROJECT_DOCUMENTATION.md** - Complete technical docs
- **FEATURES_CHECKLIST.md** - All 300+ features

---

## 🎉 You're Ready!

Once you see the home page with role cards, you're all set!

The application includes:
- ✅ 4 role-based dashboards
- ✅ Complete order workflow
- ✅ 20 sample products
- ✅ Real-time analytics
- ✅ Secure authentication

**Next Steps:**
1. Create test users for each role
2. Test the complete order workflow
3. Explore the dashboards
4. Customize company information

---

## 💡 Quick Commands

```powershell
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test
```

---

## 📞 Need Help?

Check these files:
1. **TROUBLESHOOTING.md** - Solutions to common issues
2. **QUICK_START.md** - Quick setup guide
3. **SETUP_GUIDE.md** - Detailed instructions

Or check:
- Browser console (F12) for errors
- Supabase logs in dashboard
- Network tab (F12) for failed requests

---

**Happy Coding! 🚀**

Your SGB Order Hub is ready to transform your business operations!
