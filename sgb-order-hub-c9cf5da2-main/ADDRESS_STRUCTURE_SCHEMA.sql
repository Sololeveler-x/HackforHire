-- ============================================
-- ADDRESS STRUCTURE UPDATE
-- Add city, state, pincode fields to orders
-- ============================================

-- Add new address fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT;

-- Update existing orders with default values (optional)
UPDATE orders 
SET city = 'Bangalore',
    state = 'Karnataka',
    pincode = '560001'
WHERE city IS NULL;

-- Create index for faster pincode searches
CREATE INDEX IF NOT EXISTS idx_orders_pincode ON orders(pincode);
CREATE INDEX IF NOT EXISTS idx_orders_city ON orders(city);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);

-- Verification query
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Address structure updated successfully!';
  RAISE NOTICE '✅ Added city, state, pincode columns';
  RAISE NOTICE '✅ Created indexes for faster searches';
END $$;
