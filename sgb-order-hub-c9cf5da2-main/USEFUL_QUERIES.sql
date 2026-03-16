-- ============================================
-- SGB Order Hub - Useful SQL Queries
-- ============================================

-- ============================================
-- USER MANAGEMENT
-- ============================================

-- View all users with their roles
SELECT 
    p.name,
    p.email,
    ur.role,
    p.created_at
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
ORDER BY p.created_at DESC;

-- Count users by role
SELECT 
    role,
    COUNT(*) as user_count
FROM user_roles
GROUP BY role
ORDER BY user_count DESC;

-- Find users without roles
SELECT 
    p.name,
    p.email
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
WHERE ur.role IS NULL;

-- ============================================
-- PRODUCT MANAGEMENT
-- ============================================

-- View all products with stock status
SELECT 
    product_name,
    category,
    price,
    stock,
    CASE 
        WHEN stock = 0 THEN 'Out of Stock'
        WHEN stock < 10 THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status
FROM products
ORDER BY category, product_name;

-- Products by category
SELECT 
    category,
    COUNT(*) as product_count,
    AVG(price) as avg_price,
    SUM(stock) as total_stock
FROM products
GROUP BY category
ORDER BY product_count DESC;

-- Low stock products (less than 10)
SELECT 
    product_name,
    category,
    stock,
    price
FROM products
WHERE stock < 10
ORDER BY stock ASC;

-- Most expensive products
SELECT 
    product_name,
    category,
    price
FROM products
ORDER BY price DESC
LIMIT 10;

-- ============================================
-- ORDER ANALYTICS
-- ============================================

-- Order summary by status
SELECT 
    order_status,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue
FROM orders
GROUP BY order_status
ORDER BY order_count DESC;

-- Orders by payment status
SELECT 
    payment_status,
    COUNT(*) as order_count,
    SUM(total_amount) as total_amount
FROM orders
GROUP BY payment_status;

-- Daily order statistics
SELECT 
    DATE(created_at) as order_date,
    COUNT(*) as order_count,
    SUM(total_amount) as daily_revenue
FROM orders
GROUP BY DATE(created_at)
ORDER BY order_date DESC
LIMIT 30;

-- Monthly revenue
SELECT 
    TO_CHAR(created_at, 'YYYY-MM') as month,
    COUNT(*) as order_count,
    SUM(total_amount) as monthly_revenue
FROM orders
GROUP BY TO_CHAR(created_at, 'YYYY-MM')
ORDER BY month DESC;

-- Average order value
SELECT 
    AVG(total_amount) as avg_order_value,
    MIN(total_amount) as min_order_value,
    MAX(total_amount) as max_order_value
FROM orders;

-- ============================================
-- TOP SELLING PRODUCTS
-- ============================================

-- Top 10 products by quantity sold
SELECT 
    oi.product_name,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.total_price) as total_revenue,
    COUNT(DISTINCT oi.order_id) as order_count
FROM order_items oi
GROUP BY oi.product_name
ORDER BY total_quantity DESC
LIMIT 10;

-- Top products by revenue
SELECT 
    oi.product_name,
    SUM(oi.total_price) as total_revenue,
    SUM(oi.quantity) as total_quantity,
    AVG(oi.unit_price) as avg_price
FROM order_items oi
GROUP BY oi.product_name
ORDER BY total_revenue DESC
LIMIT 10;

-- Products never ordered
SELECT 
    p.product_name,
    p.category,
    p.price,
    p.stock
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
WHERE oi.id IS NULL
ORDER BY p.category, p.product_name;

-- ============================================
-- SHIPPING ANALYTICS
-- ============================================

-- Orders by shipping provider
SELECT 
    shipping_provider,
    COUNT(*) as shipment_count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM shipping
WHERE shipping_status = 'shipped'
GROUP BY shipping_provider
ORDER BY shipment_count DESC;

-- Average shipping time (from order to shipment)
SELECT 
    AVG(EXTRACT(EPOCH FROM (s.shipped_at - o.created_at))/3600) as avg_hours
FROM orders o
JOIN shipping s ON o.id = s.order_id
WHERE s.shipped_at IS NOT NULL;

-- Pending shipments
SELECT 
    o.customer_name,
    o.phone,
    o.address,
    o.total_amount,
    o.created_at
FROM orders o
WHERE o.order_status = 'ready_for_shipping'
ORDER BY o.created_at ASC;

-- ============================================
-- PACKING ANALYTICS
-- ============================================

-- Packing performance
SELECT 
    DATE(packed_at) as packing_date,
    COUNT(*) as orders_packed
FROM packing
WHERE packed_at IS NOT NULL
GROUP BY DATE(packed_at)
ORDER BY packing_date DESC
LIMIT 30;

-- Average packing time
SELECT 
    AVG(EXTRACT(EPOCH FROM (p.packed_at - o.created_at))/3600) as avg_hours
FROM orders o
JOIN packing p ON o.id = p.order_id
WHERE p.packed_at IS NOT NULL;

-- Pending packing orders
SELECT 
    o.customer_name,
    o.phone,
    o.total_amount,
    o.created_at,
    EXTRACT(HOUR FROM (NOW() - o.created_at)) as hours_pending
FROM orders o
WHERE o.order_status = 'ready_for_packing'
ORDER BY o.created_at ASC;

-- ============================================
-- CUSTOMER ANALYTICS
-- ============================================

-- Top customers by order count
SELECT 
    customer_name,
    phone,
    COUNT(*) as order_count,
    SUM(total_amount) as total_spent,
    AVG(total_amount) as avg_order_value
FROM orders
GROUP BY customer_name, phone
ORDER BY order_count DESC
LIMIT 20;

-- Top customers by revenue
SELECT 
    customer_name,
    phone,
    COUNT(*) as order_count,
    SUM(total_amount) as total_spent
FROM orders
GROUP BY customer_name, phone
ORDER BY total_spent DESC
LIMIT 20;

-- Customer order frequency
SELECT 
    customer_name,
    COUNT(*) as order_count,
    MIN(created_at) as first_order,
    MAX(created_at) as last_order,
    EXTRACT(DAY FROM (MAX(created_at) - MIN(created_at))) as days_between
FROM orders
GROUP BY customer_name
HAVING COUNT(*) > 1
ORDER BY order_count DESC;

-- ============================================
-- PAYMENT ANALYTICS
-- ============================================

-- Payment method distribution
SELECT 
    payment_method,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount
FROM transactions
GROUP BY payment_method
ORDER BY transaction_count DESC;

-- Unpaid orders
SELECT 
    o.customer_name,
    o.phone,
    o.total_amount,
    o.created_at,
    o.order_status
FROM orders o
WHERE o.payment_status = 'unpaid'
ORDER BY o.created_at DESC;

-- Payment collection rate
SELECT 
    payment_status,
    COUNT(*) as order_count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM orders
GROUP BY payment_status;

-- ============================================
-- PERFORMANCE QUERIES
-- ============================================

-- Complete order details
SELECT 
    o.id,
    o.customer_name,
    o.phone,
    o.address,
    o.total_amount,
    o.order_status,
    o.payment_status,
    o.created_at,
    p.packing_status,
    p.packed_at,
    s.shipping_provider,
    s.tracking_id,
    s.shipped_at
FROM orders o
LEFT JOIN packing p ON o.id = p.order_id
LEFT JOIN shipping s ON o.id = s.order_id
ORDER BY o.created_at DESC
LIMIT 100;

-- Order with items
SELECT 
    o.id,
    o.customer_name,
    o.total_amount,
    o.order_status,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    oi.total_price
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.id = 'ORDER_ID_HERE';

-- ============================================
-- MAINTENANCE QUERIES
-- ============================================

-- Delete test orders (use with caution!)
-- DELETE FROM orders WHERE customer_name LIKE 'Test%';

-- Update product stock
-- UPDATE products SET stock = stock + 10 WHERE product_name = 'Product Name';

-- Reset order status (use with caution!)
-- UPDATE orders SET order_status = 'ready_for_packing' WHERE id = 'ORDER_ID';

-- ============================================
-- REPORTING QUERIES
-- ============================================

-- Daily sales report
SELECT 
    DATE(o.created_at) as sale_date,
    COUNT(DISTINCT o.id) as order_count,
    SUM(o.total_amount) as total_revenue,
    COUNT(DISTINCT o.customer_name) as unique_customers,
    AVG(o.total_amount) as avg_order_value
FROM orders o
WHERE DATE(o.created_at) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(o.created_at)
ORDER BY sale_date DESC;

-- Product performance report
SELECT 
    p.product_name,
    p.category,
    p.price,
    p.stock,
    COALESCE(SUM(oi.quantity), 0) as total_sold,
    COALESCE(SUM(oi.total_price), 0) as total_revenue,
    COALESCE(COUNT(DISTINCT oi.order_id), 0) as order_count
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.product_name, p.category, p.price, p.stock
ORDER BY total_revenue DESC;

-- Department performance
SELECT 
    'Billing' as department,
    COUNT(*) as orders_created
FROM orders
UNION ALL
SELECT 
    'Packing' as department,
    COUNT(*) as orders_packed
FROM packing
WHERE packing_status = 'packed'
UNION ALL
SELECT 
    'Shipping' as department,
    COUNT(*) as orders_shipped
FROM shipping
WHERE shipping_status = 'shipped';

-- ============================================
-- END OF QUERIES
-- ============================================
