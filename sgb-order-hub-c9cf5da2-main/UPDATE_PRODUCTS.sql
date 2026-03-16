-- Replace all products with official SGB website products
-- Run this in Supabase SQL Editor

-- Step 1: Clear existing products (safe — order_items keeps product_name as text)
DELETE FROM products;

-- Step 2: Insert correct products from SGB website
INSERT INTO products (product_name, price, description, stock_quantity, reorder_level, weight_kg) VALUES
  ('SGB Brush Cutter Trolley',  3999,   'Brush cutter with trolley attachment',    0, 10, 15),
  ('SGB BC-520 Brush Cutter',   13000,  'BC-520 model brush cutter',               0, 10, 8),
  ('SGB Carry Cart',            50000,  'Heavy duty carry cart for agriculture',   0, 5,  40),
  ('SGB Cycle Weeder',          3499,   'Cycle weeder for field use',              0, 10, 12),
  ('SGB G45L Brush Cutter',     13000,  'G45L model brush cutter',                 0, 10, 9),
  ('SGB Wheel Barrow',          6500,   'Agricultural wheel barrow',               0, 10, 18);
