-- ============================================
-- FIX PRODUCT SCHEMA - Run this in Supabase SQL Editor
-- This adds missing columns and creates necessary views/triggers
-- ============================================

-- Step 1: Add missing columns to products table
DO $$ 
BEGIN
    -- Add stock_quantity column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'stock_quantity'
    ) THEN
        ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added stock_quantity column';
    ELSE
        RAISE NOTICE '⚠️  stock_quantity column already exists';
    END IF;

    -- Add low_stock_threshold column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'low_stock_threshold'
    ) THEN
        ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 10;
        RAISE NOTICE '✅ Added low_stock_threshold column';
    ELSE
        RAISE NOTICE '⚠️  low_stock_threshold column already exists';
    END IF;

    -- Add image_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE products ADD COLUMN image_url TEXT;
        RAISE NOTICE '✅ Added image_url column';
    ELSE
        RAISE NOTICE '⚠️  image_url column already exists';
    END IF;
END $$;

-- Step 2: Migrate data from 'stock' column to 'stock_quantity' if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'stock'
    ) THEN
        UPDATE products 
        SET stock_quantity = COALESCE(stock, 0) 
        WHERE stock_quantity = 0 OR stock_quantity IS NULL;
        RAISE NOTICE '✅ Migrated stock data to stock_quantity';
    END IF;
END $$;

-- Step 3: Set default values for existing products
UPDATE products 
SET low_stock_threshold = 10 
WHERE low_stock_threshold IS NULL;

UPDATE products 
SET stock_quantity = 0 
WHERE stock_quantity IS NULL;

-- Step 4: Create or replace low_stock_products view
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
  id,
  product_name,
  category,
  price,
  stock_quantity,
  low_stock_threshold,
  image_url
FROM products
WHERE stock_quantity <= low_stock_threshold
ORDER BY stock_quantity ASC;

-- Step 5: Create function to reduce stock when order is created
CREATE OR REPLACE FUNCTION reduce_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0)
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to automatically reduce stock
DROP TRIGGER IF EXISTS trigger_reduce_stock ON order_items;
CREATE TRIGGER trigger_reduce_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION reduce_product_stock();

-- Step 7: Update RLS policies for product management
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Admins can insert products" ON products;
    DROP POLICY IF EXISTS "Admins can update products" ON products;
    DROP POLICY IF EXISTS "Admins can delete products" ON products;

    -- Create new policies
    CREATE POLICY "Admins can insert products" 
      ON products FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );

    CREATE POLICY "Admins can update products" 
      ON products FOR UPDATE 
      USING (
        EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );

    CREATE POLICY "Admins can delete products" 
      ON products FOR DELETE 
      USING (
        EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );

    RAISE NOTICE '✅ Created RLS policies for product management';
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check products table structure
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'products' 
    AND column_name IN ('stock_quantity', 'low_stock_threshold', 'image_url');
    
    IF col_count = 3 THEN
        RAISE NOTICE '✅ All required columns exist in products table';
    ELSE
        RAISE NOTICE '⚠️  Missing columns. Found % out of 3', col_count;
    END IF;
END $$;

-- Display products table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- Check if view exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'low_stock_products'
    ) THEN
        RAISE NOTICE '✅ low_stock_products view exists';
    ELSE
        RAISE NOTICE '⚠️  low_stock_products view does not exist';
    END IF;
END $$;

-- Check if trigger exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_reduce_stock'
    ) THEN
        RAISE NOTICE '✅ trigger_reduce_stock exists';
    ELSE
        RAISE NOTICE '⚠️  trigger_reduce_stock does not exist';
    END IF;
END $$;

-- Display sample products with new columns
SELECT 
    product_name,
    category,
    price,
    stock_quantity,
    low_stock_threshold,
    CASE 
        WHEN stock_quantity = 0 THEN 'OUT OF STOCK'
        WHEN stock_quantity <= low_stock_threshold THEN 'LOW STOCK'
        ELSE 'IN STOCK'
    END as status
FROM products
ORDER BY stock_quantity ASC
LIMIT 10;

-- Check low stock products
SELECT COUNT(*) as low_stock_count FROM low_stock_products;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PRODUCT SCHEMA FIX COMPLETED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Added stock_quantity column';
  RAISE NOTICE '✅ Added low_stock_threshold column';
  RAISE NOTICE '✅ Added image_url column';
  RAISE NOTICE '✅ Created low_stock_products view';
  RAISE NOTICE '✅ Created stock reduction trigger';
  RAISE NOTICE '✅ Updated RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 You can now use Product Management!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh your browser';
  RAISE NOTICE '2. Login as Admin';
  RAISE NOTICE '3. Go to Products tab';
  RAISE NOTICE '4. Add or edit products';
  RAISE NOTICE '';
END $$;
