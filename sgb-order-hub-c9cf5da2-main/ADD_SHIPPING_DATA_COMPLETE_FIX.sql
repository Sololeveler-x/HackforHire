-- COMPLETE FIX: Add Shipping Data for All Shipped Orders
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Add tracking_url column if missing
-- ============================================
ALTER TABLE shipping 
ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- ============================================
-- STEP 2: Check current situation
-- ============================================
-- See which shipped orders are missing shipping data
SELECT 
  'Orders marked as shipped but missing shipping data:' as status,
  COUNT(*) as count
FROM orders o
LEFT JOIN shipping s ON o.id = s.order_id
WHERE o.order_status = 'shipped'
  AND s.id IS NULL;

-- ============================================
-- STEP 3: Insert shipping data for missing orders
-- ============================================
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
  -- Smart courier assignment based on amount
  CASE 
    WHEN o.total_amount::numeric < 1000 THEN 'India Post'
    WHEN o.total_amount::numeric < 10000 THEN 'VRL Logistics'
    ELSE 'Sugama Transport'
  END as shipping_provider,
  -- Generate unique tracking ID
  CONCAT(
    CASE 
      WHEN o.total_amount::numeric < 1000 THEN 'INP'
      WHEN o.total_amount::numeric < 10000 THEN 'VRL'
      ELSE 'SGM'
    END,
    UPPER(SUBSTRING(MD5(o.id::text || o.created_at::text) FROM 1 FOR 9))
  ) as tracking_id,
  -- Generate tracking URL
  CONCAT(
    'http://localhost:8080/track/',
    CONCAT(
      CASE 
        WHEN o.total_amount::numeric < 1000 THEN 'INP'
        WHEN o.total_amount::numeric < 10000 THEN 'VRL'
        ELSE 'SGM'
      END,
      UPPER(SUBSTRING(MD5(o.id::text || o.created_at::text) FROM 1 FOR 9))
    )
  ) as tracking_url,
  'shipped' as shipping_status,
  COALESCE(o.updated_at, o.created_at) as shipped_at
FROM orders o
LEFT JOIN shipping s ON o.id = s.order_id
WHERE o.order_status = 'shipped'
  AND s.id IS NULL
ON CONFLICT (order_id) DO NOTHING;

-- ============================================
-- STEP 4: Update existing shipping records that are missing tracking_url
-- ============================================
UPDATE shipping
SET tracking_url = CONCAT('http://localhost:8080/track/', tracking_id)
WHERE tracking_url IS NULL 
  AND tracking_id IS NOT NULL;

-- ============================================
-- STEP 5: Verify the fix worked
-- ============================================
SELECT 
  o.customer_name,
  o.phone,
  o.total_amount,
  o.order_status,
  s.shipping_provider,
  s.tracking_id,
  s.tracking_url,
  o.created_at
FROM orders o
INNER JOIN shipping s ON o.id = s.order_id
WHERE o.order_status = 'shipped'
ORDER BY o.created_at DESC
LIMIT 10;

-- ============================================
-- STEP 6: Summary report
-- ============================================
SELECT 
  'Total shipped orders' as metric,
  COUNT(*) as count
FROM orders 
WHERE order_status = 'shipped'

UNION ALL

SELECT 
  'Shipped orders with tracking data' as metric,
  COUNT(*) as count
FROM orders o
INNER JOIN shipping s ON o.id = s.order_id
WHERE o.order_status = 'shipped'
  AND s.tracking_id IS NOT NULL

UNION ALL

SELECT 
  'Shipped orders with tracking URL' as metric,
  COUNT(*) as count
FROM orders o
INNER JOIN shipping s ON o.id = s.order_id
WHERE o.order_status = 'shipped'
  AND s.tracking_url IS NOT NULL;

-- ============================================
-- OPTIONAL: Manual courier assignment
-- ============================================
-- If you want to assign specific couriers to specific orders:

-- Example: Assign Sugama Transport to high-value orders
-- UPDATE shipping s
-- SET shipping_provider = 'Sugama Transport'
-- FROM orders o
-- WHERE s.order_id = o.id
--   AND o.total_amount::numeric > 10000
--   AND o.order_status = 'shipped';

-- Example: Assign VRL to medium-value orders
-- UPDATE shipping s
-- SET shipping_provider = 'VRL Logistics'
-- FROM orders o
-- WHERE s.order_id = o.id
--   AND o.total_amount::numeric BETWEEN 1000 AND 10000
--   AND o.order_status = 'shipped';

-- Example: Assign India Post to low-value orders
-- UPDATE shipping s
-- SET shipping_provider = 'India Post'
-- FROM orders o
-- WHERE s.order_id = o.id
--   AND o.total_amount::numeric < 1000
--   AND o.order_status = 'shipped';
