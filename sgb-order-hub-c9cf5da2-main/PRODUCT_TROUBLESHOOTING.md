# Product Management Troubleshooting

## Error: "Could not find the 'low_stock_threshold' column"

### Problem
The database schema doesn't have the required columns for product management.

### Solution
Run the database migration script to add the missing columns.

### Steps to Fix:

#### 1. Open Supabase Dashboard
- Go to your Supabase project
- Click on "SQL Editor" in the left sidebar

#### 2. Run the Fix Script
- Open the file: `FIX_PRODUCT_SCHEMA.sql`
- Copy ALL the content
- Paste it into the Supabase SQL Editor
- Click "Run" button

#### 3. Verify Success
You should see messages like:
```
✅ Added stock_quantity column
✅ Added low_stock_threshold column
✅ Added image_url column
✅ Created low_stock_products view
✅ Created stock reduction trigger
✅ Updated RLS policies
```

#### 4. Refresh Your Application
- Close your browser tab
- Open a new tab
- Login again
- Try adding/editing products

## Error: "Stock not updating"

### Problem
The trigger might not be active or there's a permission issue.

### Solution

#### Check if trigger exists:
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_reduce_stock';
```

#### If trigger doesn't exist, run:
```sql
CREATE OR REPLACE FUNCTION reduce_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reduce_stock ON order_items;
CREATE TRIGGER trigger_reduce_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION reduce_product_stock();
```

## Error: "Permission denied for table products"

### Problem
RLS policies might not be configured correctly.

### Solution

#### Check your role:
```sql
SELECT role FROM user_roles WHERE user_id = auth.uid();
```

#### If you're admin but still can't edit, run:
```sql
DROP POLICY IF EXISTS "Admins can update products" ON products;

CREATE POLICY "Admins can update products" 
  ON products FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

## Error: "Cannot read properties of undefined"

### Problem
The frontend is trying to access columns that don't exist yet.

### Solution
1. Run `FIX_PRODUCT_SCHEMA.sql`
2. Clear browser cache (Ctrl+Shift+Delete)
3. Refresh the page (Ctrl+F5)

## Products Not Showing in Dropdown

### Problem
Products might not be loaded or there's a query error.

### Solution

#### Check if products exist:
```sql
SELECT COUNT(*) FROM products;
```

#### If no products, insert sample data:
```sql
INSERT INTO products (product_name, category, price, stock_quantity, low_stock_threshold) 
VALUES 
('Test Product', 'Garden Tools', 100.00, 50, 10);
```

#### Check browser console:
- Press F12
- Go to Console tab
- Look for errors
- Share the error message

## Low Stock Alerts Not Showing

### Problem
The view might not exist or products don't meet the criteria.

### Solution

#### Check if view exists:
```sql
SELECT * FROM low_stock_products;
```

#### If view doesn't exist, create it:
```sql
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
  id, product_name, category, price,
  stock_quantity, low_stock_threshold, image_url
FROM products
WHERE stock_quantity <= low_stock_threshold
ORDER BY stock_quantity ASC;
```

#### Manually check low stock products:
```sql
SELECT product_name, stock_quantity, low_stock_threshold
FROM products
WHERE stock_quantity <= low_stock_threshold;
```

## Images Not Displaying

### Problem
Image URL might be invalid or not publicly accessible.

### Solution
1. Use a valid image URL (must start with http:// or https://)
2. Test the URL in a new browser tab
3. Make sure the image is publicly accessible
4. Try using a placeholder image service:
   - `https://via.placeholder.com/150`
   - `https://placehold.co/150x150`

## Complete Reset (Last Resort)

If nothing works, reset the products table:

### ⚠️ WARNING: This will delete all products!

```sql
-- Backup first
CREATE TABLE products_backup AS SELECT * FROM products;

-- Drop and recreate
DROP TABLE IF EXISTS products CASCADE;

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view products" 
  ON products FOR SELECT USING (true);

CREATE POLICY "Admins can manage products" 
  ON products FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Then run FIX_PRODUCT_SCHEMA.sql
```

## Quick Diagnostic Queries

### Check table structure:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
```

### Check all products:
```sql
SELECT 
  product_name,
  stock_quantity,
  low_stock_threshold,
  CASE 
    WHEN stock_quantity = 0 THEN 'OUT OF STOCK'
    WHEN stock_quantity <= low_stock_threshold THEN 'LOW STOCK'
    ELSE 'IN STOCK'
  END as status
FROM products;
```

### Check RLS policies:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'products';
```

### Check triggers:
```sql
SELECT tgname, tgenabled, tgtype
FROM pg_trigger
WHERE tgrelid = 'products'::regclass OR tgrelid = 'order_items'::regclass;
```

## Still Having Issues?

### Collect this information:
1. Error message (exact text)
2. Browser console errors (F12 → Console)
3. Your role (admin/billing/packing/shipping)
4. What you were trying to do
5. Result of this query:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'products';
```

### Common Causes:
- ❌ Didn't run FIX_PRODUCT_SCHEMA.sql
- ❌ Not logged in as admin
- ❌ Browser cache not cleared
- ❌ RLS policies not configured
- ❌ Trigger not created

### Quick Fix Checklist:
- [ ] Run FIX_PRODUCT_SCHEMA.sql
- [ ] Clear browser cache
- [ ] Refresh page (Ctrl+F5)
- [ ] Login as admin
- [ ] Check browser console for errors
- [ ] Verify columns exist in database
- [ ] Check RLS policies are active

## Success Indicators

You'll know it's working when:
- ✅ Products tab loads without errors
- ✅ Can add new products
- ✅ Can edit existing products
- ✅ Stock numbers update when editing
- ✅ Low stock alerts appear
- ✅ Inventory tab shows products
- ✅ Billing can select products for orders
- ✅ Stock reduces when orders are created

## Need More Help?

Check these files:
- `PRODUCT_SETUP_QUICK_START.md` - Setup guide
- `PRODUCT_INVENTORY_MANAGEMENT.md` - Full documentation
- `FIX_PRODUCT_SCHEMA.sql` - Database fix script
- `IMPLEMENTATION_STATUS.md` - Feature status
