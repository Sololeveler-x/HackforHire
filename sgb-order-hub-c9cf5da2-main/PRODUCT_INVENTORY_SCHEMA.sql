-- ============================================
-- PRODUCT AND INVENTORY MANAGEMENT SCHEMA
-- Add this to your existing database
-- ============================================

-- Add missing columns to products table if they don't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update existing products to have stock_quantity from stock column
UPDATE products SET stock_quantity = stock WHERE stock_quantity = 0 AND stock IS NOT NULL;

-- Create low_stock_products view
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

-- Create function to reduce stock when order is created
CREATE OR REPLACE FUNCTION reduce_product_stock()
RETURNS TRIGGER AS $
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger to automatically reduce stock
DROP TRIGGER IF EXISTS trigger_reduce_stock ON order_items;
CREATE TRIGGER trigger_reduce_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION reduce_product_stock();

-- Add RLS policies for products management
DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;

CREATE POLICY "Admins can insert products" 
  ON products FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products" 
  ON products FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products" 
  ON products FOR DELETE 
  USING (has_role(auth.uid(), 'admin'));

-- Update existing products with default thresholds
UPDATE products SET low_stock_threshold = 10 WHERE low_stock_threshold IS NULL;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check products table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- Check low stock products
SELECT * FROM low_stock_products;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $
BEGIN
  RAISE NOTICE '✅ Product and Inventory schema updated successfully!';
  RAISE NOTICE '✅ Added stock_quantity, low_stock_threshold, image_url columns';
  RAISE NOTICE '✅ Created low_stock_products view';
  RAISE NOTICE '✅ Created automatic stock reduction trigger';
  RAISE NOTICE '✅ Added admin product management policies';
END $;
