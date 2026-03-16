-- Fix Missing Shipping Data for Shipped Orders
-- Run this in Supabase SQL Editor

-- This script adds shipping records for orders marked as "shipped" but missing shipping data

-- Step 1: Check which orders are missing shipping data
SELECT 
  o.id,
  o.customer_name,
  o.order_status,
  o.created_at,
  s.tracking_id
FROM orders o
LEFT JOIN shipping s ON o.order_id = s.order_id
WHERE o.order_status = 'shipped'
  AND s.id IS NULL;

-- Step 2: Insert shipping records for all shipped orders without shipping data
INSERT INTO shipping (
  order_id,
  shipping_provider,
  tracking_id,
  tracking_url,
  shipping_status,
  shipped_at
)
SELECT 
  o.id as order_id,
  -- Assign courier based on order amount (you can customize this logic)
  CASE 
    WHEN o.total_amount < 1000 THEN 'India Post'
    WHEN o.total_amount < 10000 THEN 'VRL Logistics'
    ELSE 'Sugama Transport'
  END as shipping_provider,
  -- Generate tracking ID
  CONCAT(
    CASE 
      WHEN o.total_amount < 1000 THEN 'INP'
      WHEN o.total_amount < 10000 THEN 'VRL'
      ELSE 'SGM'
    END,
    UPPER(SUBSTRING(MD5(o.id::text) FROM 1 FOR 8))
  ) as tracking_id,
  -- Generate tracking URL
  CONCAT(
    'http://localhost:8080/track/',
    CONCAT(
      CASE 
        WHEN o.total_amount < 1000 THEN 'INP'
        WHEN o.total_amount < 10000 THEN 'VRL'
        ELSE 'SGM'
      END,
      UPPER(SUBSTRING(MD5(o.id::text) FROM 1 FOR 8))
    )
  ) as tracking_url,
  'shipped' as shipping_status,
  o.updated_at as shipped_at
FROM orders o
LEFT JOIN shipping s ON o.id = s.order_id
WHERE o.order_status = 'shipped'
  AND s.id IS NULL;

-- Step 3: Verify the fix
SELECT 
  o.id,
  o.customer_name,
  o.total_amount,
  s.shipping_provider,
  s.tracking_id,
  s.tracking_url
FROM orders o
INNER JOIN shipping s ON o.id = s.order_id
WHERE o.order_status = 'shipped'
ORDER BY o.created_at DESC;

-- Alternative: If you want to assign specific couriers manually
-- UPDATE shipping 
-- SET shipping_provider = 'Sugama Transport',
--     tracking_id = 'SGM' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8))
-- WHERE order_id IN (
--   SELECT id FROM orders WHERE order_status = 'shipped'
-- );
