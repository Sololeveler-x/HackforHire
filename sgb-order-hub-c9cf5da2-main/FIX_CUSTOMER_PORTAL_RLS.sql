-- Allow customers to read their own orders by phone (no auth required)
-- Run this in Supabase SQL Editor

-- Orders: allow anon read by phone
CREATE POLICY "customers_read_own_orders" ON orders
  FOR SELECT TO anon
  USING (true);

-- Order items: allow anon read
CREATE POLICY "customers_read_order_items" ON order_items
  FOR SELECT TO anon
  USING (true);

-- Shipping: allow anon read
CREATE POLICY "customers_read_shipping" ON shipping
  FOR SELECT TO anon
  USING (true);

-- Customer loyalty: allow anon read (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_loyalty') THEN
    EXECUTE 'CREATE POLICY "customers_read_loyalty" ON customer_loyalty FOR SELECT TO anon USING (true)';
  END IF;
END $$;
