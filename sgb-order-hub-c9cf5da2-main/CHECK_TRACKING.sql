-- Check if tracking ID exists
SELECT * FROM shipping WHERE tracking_id = 'VRLMMOYU3L0';

-- Check all shipping records
SELECT 
  s.tracking_id,
  s.shipping_provider,
  s.tracking_url,
  o.customer_name,
  o.phone,
  o.order_status
FROM shipping s
LEFT JOIN orders o ON s.order_id = o.id
ORDER BY s.shipped_at DESC
LIMIT 10;

-- Check if order exists but not shipped
SELECT 
  id,
  customer_name,
  phone,
  order_status,
  created_at
FROM orders
WHERE order_status IN ('ready_for_packing', 'ready_for_shipping', 'shipped')
ORDER BY created_at DESC
LIMIT 10;
