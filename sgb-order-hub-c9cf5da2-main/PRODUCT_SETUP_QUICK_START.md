# Product & Inventory Management - Quick Start

## 🚀 Setup (5 minutes)

### Step 1: Run Database Migration
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the entire content of `PRODUCT_INVENTORY_SCHEMA.sql`
4. Click "Run"
5. Wait for success message

### Step 2: Verify Installation
Run this query in SQL Editor:
```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'products';

-- Check if view exists
SELECT * FROM low_stock_products;

-- Check if trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_reduce_stock';
```

### Step 3: Test the Features

#### As Admin:
1. Login with admin credentials
2. Go to Admin Dashboard
3. Click "Products" tab
4. Click "Add Product" button
5. Fill in product details:
   - Name: "Test Product"
   - Category: Select from dropdown
   - Price: 1000
   - Stock: 5
   - Threshold: 10
6. Click "Create Product"
7. Go to "Inventory" tab
8. See your product with "Low Stock" badge (since 5 < 10)

#### As Billing:
1. Login with billing credentials
2. Go to Billing Dashboard
3. Click "New Order" tab
4. Fill customer details
5. Select your test product from dropdown
6. Enter quantity: 2
7. Click "Add" (plus icon)
8. Complete order creation
9. Logout and login as Admin
10. Check Inventory - stock should be reduced to 3

## ✅ Features Available

### Admin Dashboard
- **Products Tab**: Full CRUD operations
  - Add new products
  - Edit existing products
  - Delete products
  - Search products
  - View product images
  
- **Inventory Tab**: Stock monitoring
  - View all products
  - See stock levels
  - Low stock alerts
  - Color-coded badges

### Billing Dashboard
- **New Order Tab**: Enhanced with products
  - Select products from dropdown
  - Add multiple products
  - Automatic price calculation
  - Stock reduces automatically

## 🎨 UI Features

### Product Management
- Clean table layout with images
- Search bar for quick filtering
- Add/Edit/Delete buttons
- Form with validation
- Image preview

### Inventory Display
- Low stock alert section (top)
- Full inventory table
- Status badges:
  - 🟢 Green = In Stock
  - 🟠 Orange = Low Stock
  - 🔴 Red = Out of Stock

## 📊 Sample Data

20 products are pre-loaded in categories:
- Brush Cutters
- Garden Tools
- Sprayers
- Tillers
- Chainsaws
- Lawn Equipment

## 🔧 Configuration

### Low Stock Threshold
Default: 10 units
- Customizable per product
- Set during product creation/edit
- Triggers alert when stock ≤ threshold

### Product Categories
Current categories (hardcoded):
- Brush Cutters
- Garden Tools
- Sprayers
- Tillers
- Chainsaws
- Lawn Equipment

To add more: Edit `ProductManagement.tsx` line 35

## 🔐 Security

### Role-Based Access
- **Admin**: Full product management
- **Billing**: View products, create orders
- **Packing**: View products
- **Shipping**: View products

### RLS Policies
- Anyone can view products
- Only admins can add/edit/delete
- Enforced at database level

## 📱 Mobile Responsive

All features work on:
- Desktop
- Tablet
- Mobile phones

## 🐛 Troubleshooting

### "Cannot find products"
- Check if you're logged in
- Verify RLS policies are active
- Check browser console for errors

### "Stock not reducing"
- Verify trigger is active
- Check order_items are being created
- Look for errors in Supabase logs

### "Images not showing"
- Verify image URL is valid
- Check if URL is publicly accessible
- Try a different image URL

## 📝 Next Steps

1. ✅ Run database migration
2. ✅ Test product creation
3. ✅ Test order creation
4. ✅ Verify stock reduction
5. ✅ Check low stock alerts

## 🎯 Quick Test Scenario

```
1. Admin adds "Test Brush Cutter" - Stock: 5, Threshold: 10
2. Check Inventory - Should show "Low Stock" badge
3. Billing creates order for 2 units
4. Check Inventory - Stock should be 3
5. Admin Dashboard - Low stock alert should appear
```

## 💡 Tips

- Use descriptive product names
- Set realistic stock thresholds
- Add product images for better UX
- Regularly monitor low stock alerts
- Update stock quantities as needed

## 🚨 Important Notes

- Stock reduction is automatic
- Cannot undo stock changes (yet)
- Deleting products with orders may cause issues
- Always test in development first

## ✨ Success!

If you can:
- ✅ Add a product as Admin
- ✅ See it in Inventory
- ✅ Create an order with it as Billing
- ✅ See stock reduced automatically

Then everything is working perfectly! 🎉
