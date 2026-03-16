# 🚀 Quick Start Guide - SGB Order Hub

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies (1 min)
```bash
cd sgb-order-hub-c9cf5da2-main
npm install
```

### Step 2: Setup Database (2 min)
1. Open https://supabase.com/dashboard
2. Go to your project: `bmpdxpqvjdhukaupczji`
3. Click "SQL Editor" in left sidebar
4. Open `supabase-setup.sql` file
5. Copy ALL content
6. Paste in SQL Editor
7. Click "Run" button
8. Wait for "Success" message

### Step 3: Start Application (1 min)
```bash
npm run dev
```

Open http://localhost:5173

### Step 4: Create Test Users (1 min)
Click "Register" and create 4 accounts:

**Admin User**:
- Name: Admin User
- Email: admin@sgb.com
- Password: admin123
- Role: Admin

**Billing User**:
- Name: Billing User
- Email: billing@sgb.com
- Password: billing123
- Role: Billing

**Packing User**:
- Name: Packing User
- Email: packing@sgb.com
- Password: packing123
- Role: Packing

**Shipping User**:
- Name: Shipping User
- Email: shipping@sgb.com
- Password: shipping123
- Role: Shipping

---

## 🧪 Test Complete Workflow (5 min)

### Test 1: Create Order (Billing)
1. Logout if logged in
2. Click "Billing Login" card on home page
3. Login: billing@sgb.com / billing123
4. Fill customer details:
   - Name: Test Customer
   - Phone: +91 98765 43210
   - Address: 123 Test Street, Mumbai
5. Select products:
   - Brush Cutter BC-520 (Qty: 2)
   - Garden Rake (Qty: 5)
6. Set Payment Status: Paid
7. Click "Create Order & Send to Packing"
8. See success message
9. Logout

### Test 2: Pack Order (Packing)
1. Click "Packing Login" card
2. Login: packing@sgb.com / packing123
3. See order in "Orders Ready for Packing"
4. Click "View Items" to see products
5. Click "Mark as Packed"
6. See success message
7. Order moves to "Packed Orders"
8. Logout

### Test 3: Ship Order (Shipping)
1. Click "Shipping Login" card
2. Login: shipping@sgb.com / shipping123
3. See order in "Orders Ready for Shipping"
4. Click "Ship Order" button
5. Select Provider: VRL Logistics
6. Click "Generate" for tracking ID
7. Click "Confirm Shipment"
8. See success message
9. Order moves to "Shipped Orders"
10. Logout

### Test 4: View Analytics (Admin)
1. Click "Admin Login" card
2. Login: admin@sgb.com / admin123
3. See dashboard with:
   - Total Orders: 1
   - Revenue: ₹18,600 (or your order total)
   - Charts showing data
   - Recent orders table
4. Explore all charts and statistics

---

## ✅ Verification Checklist

After testing, verify:
- [ ] All 4 users can login
- [ ] Billing can create orders
- [ ] Packing can mark as packed
- [ ] Shipping can ship orders
- [ ] Admin sees all data
- [ ] Charts display correctly
- [ ] Order appears in all relevant dashboards
- [ ] Status updates correctly
- [ ] No console errors

---

## 🎯 What You Should See

### Home Page
- Hero section with SGB branding
- 4 role selection cards
- Product categories (6 cards)
- Product showcase (20 products)
- Contact section

### Billing Dashboard
- Create order form
- Product dropdown with 20 items
- Billing history table
- Order status badges

### Packing Dashboard
- 2 statistics cards
- Pending packing table
- Packed orders table
- View items dialog

### Shipping Dashboard
- 2 statistics cards
- Pending shipments table
- Ship order dialog
- Shipped orders table

### Admin Dashboard
- 5 statistics cards with trends
- Monthly revenue line chart
- Order status pie chart
- Top products bar chart
- Shipping providers pie chart
- Recent orders table

---

## 🐛 Common Issues

### Issue: "Cannot connect to database"
**Solution**: Check `.env` file has correct Supabase credentials

### Issue: "No products in dropdown"
**Solution**: Run `supabase-setup.sql` to insert sample products

### Issue: "Login fails"
**Solution**: 
1. Check user was created successfully
2. Verify email/password
3. Check Supabase Auth logs

### Issue: "Charts not showing"
**Solution**: Create at least one order to populate data

### Issue: "Role not working"
**Solution**: 
1. Check `user_roles` table has entry
2. Verify RLS policies are enabled
3. Logout and login again

---

## 📱 Mobile Testing

Test on mobile devices:
1. Open http://YOUR_IP:5173 on phone
2. Test all role logins
3. Verify responsive design
4. Test order creation on mobile
5. Check charts render correctly

---

## 🎨 Customization Quick Tips

### Change Company Name
Edit `src/pages/Home.tsx`:
```typescript
<h1>Your Company Name</h1>
```

### Add More Products
Run in Supabase SQL Editor:
```sql
INSERT INTO products (product_name, category, price, description, stock) 
VALUES ('New Product', 'Category', 1000.00, 'Description', 50);
```

### Change Shipping Providers
Edit `src/pages/ShippingDashboard.tsx`:
```typescript
<SelectItem value="Your Provider">Your Provider</SelectItem>
```

### Modify Colors
Edit `tailwind.config.js` or use CSS variables

---

## 📊 Sample Data

After setup, you'll have:
- ✅ 20 products across 6 categories
- ✅ 4 user roles configured
- ✅ Complete database schema
- ✅ RLS policies enabled
- ✅ All tables with relationships

---

## 🎉 You're Ready!

Your SGB Order Hub is now fully functional with:
- ✅ Role-based authentication
- ✅ Complete order workflow
- ✅ Department dashboards
- ✅ Real-time analytics
- ✅ 20 sample products
- ✅ Secure access control

**Next Steps**:
1. Customize company information
2. Add real products
3. Invite team members
4. Start processing orders!

---

## 📞 Need Help?

Check these files:
- `SETUP_GUIDE.md` - Detailed setup instructions
- `PROJECT_DOCUMENTATION.md` - Complete technical docs
- `supabase-setup.sql` - Database schema

**Happy Order Management! 🚀**
