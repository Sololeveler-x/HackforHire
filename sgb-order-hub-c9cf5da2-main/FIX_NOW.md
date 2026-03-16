# 🔧 QUICK FIX - Product Management Not Working

## Your Issue
```
Error: Could not find the 'low_stock_threshold' column of 'products' in the schema cache
Stock numbers not updating when you try to add/edit
```

## The Problem
Your database is missing the required columns for product management.

## The Solution (3 Steps - Takes 2 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com
2. Login to your project
3. Click **"SQL Editor"** in the left sidebar (looks like a document icon)

### Step 2: Run the Fix Script
1. Open the file: **`FIX_PRODUCT_SCHEMA.sql`** (in your project folder)
2. **Copy EVERYTHING** from that file (Ctrl+A, then Ctrl+C)
3. **Paste** it into the Supabase SQL Editor (Ctrl+V)
4. Click the **"Run"** button (or press Ctrl+Enter)
5. Wait 5-10 seconds

### Step 3: Refresh Your App
1. Go back to your application
2. Press **Ctrl+Shift+R** (hard refresh)
3. Or close the tab and open a new one
4. Login as Admin
5. Try adding/editing a product again

## What You Should See

After running the script, you'll see messages like:
```
✅ Added stock_quantity column
✅ Added low_stock_threshold column
✅ Added image_url column
✅ Created low_stock_products view
✅ Created stock reduction trigger
✅ Updated RLS policies
🎉 You can now use Product Management!
```

## Test It Works

1. Login as **Admin**
2. Go to **Admin Dashboard**
3. Click **"Products"** tab
4. Click **"Add Product"** button
5. Fill in:
   - Product Name: "Test Item"
   - Category: Select any
   - Price: 100
   - Stock Quantity: 50
   - Low Stock Alert: 10
6. Click **"Create Product"**
7. You should see success message!
8. Go to **"Inventory"** tab
9. You should see your product listed

## Still Not Working?

### Check 1: Did the script run successfully?
Go back to Supabase SQL Editor and run:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'products';
```

You should see these columns:
- id
- product_name
- category
- price
- description
- stock
- **stock_quantity** ← Must be here
- **low_stock_threshold** ← Must be here
- **image_url** ← Must be here
- created_at
- updated_at

### Check 2: Are you logged in as Admin?
Run this in SQL Editor:
```sql
SELECT role FROM user_roles WHERE user_id = auth.uid();
```

Should return: `admin`

### Check 3: Clear browser cache
1. Press **Ctrl+Shift+Delete**
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh the page

## Quick Video Guide

If you prefer visual instructions:
1. Open Supabase → SQL Editor
2. Copy `FIX_PRODUCT_SCHEMA.sql` content
3. Paste and click Run
4. Wait for success messages
5. Refresh your app
6. Done!

## What This Fix Does

The script:
- ✅ Adds `stock_quantity` column to products table
- ✅ Adds `low_stock_threshold` column to products table
- ✅ Adds `image_url` column to products table
- ✅ Creates a view for low stock products
- ✅ Creates a trigger to auto-reduce stock on orders
- ✅ Sets up proper permissions (RLS policies)
- ✅ Migrates existing data if you have any

## After the Fix

You'll be able to:
- ✅ Add new products with stock quantities
- ✅ Edit product stock levels
- ✅ See low stock alerts
- ✅ View inventory dashboard
- ✅ Create orders that auto-reduce stock
- ✅ Upload product images

## Need More Help?

Check these files in order:
1. **FIX_PRODUCT_SCHEMA.sql** - The fix script (run this first!)
2. **PRODUCT_TROUBLESHOOTING.md** - Detailed troubleshooting
3. **PRODUCT_SETUP_QUICK_START.md** - Complete setup guide
4. **PRODUCT_INVENTORY_MANAGEMENT.md** - Full documentation

## Common Mistakes

❌ **Don't do this:**
- Running only part of the script
- Skipping the refresh step
- Not logged in as admin
- Using wrong Supabase project

✅ **Do this:**
- Copy and run the ENTIRE script
- Hard refresh after (Ctrl+Shift+R)
- Login as admin user
- Verify you're in the correct project

## Success!

When it works, you'll see:
- Products tab loads without errors
- Add Product button works
- Stock numbers save correctly
- Inventory tab shows products
- Low stock alerts appear
- Everything just works! 🎉

---

**Time to fix:** 2 minutes
**Difficulty:** Easy
**Risk:** None (script is safe)
**Reversible:** Yes (we don't delete anything)
