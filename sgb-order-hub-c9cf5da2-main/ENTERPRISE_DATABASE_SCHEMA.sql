-- ============================================
-- ENTERPRISE FEATURES DATABASE SCHEMA
-- SGB Order Hub - Enterprise Extensions
-- ============================================

-- ============================================
-- 1. EXTEND PRODUCTS TABLE FOR INVENTORY
-- ============================================

-- Add inventory columns to existing products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;

-- Update existing products with stock data
UPDATE products SET stock_quantity = 100, low_stock_threshold = 10 WHERE stock_quantity IS NULL;

-- ============================================
-- 2. EXTEND ORDERS TABLE FOR DELIVERED STATUS
-- ============================================

-- Update order_status enum to include 'delivered'
-- Note: In PostgreSQL, we need to handle this carefully
DO $$ 
BEGIN
    -- Check if 'delivered' value doesn't exist in the check constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'orders_order_status_check' 
        AND conbin::text LIKE '%delivered%'
    ) THEN
        -- Drop the old constraint
        ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
        
        -- Add new constraint with 'delivered' status
        ALTER TABLE orders ADD CONSTRAINT orders_order_status_check 
        CHECK (order_status IN ('ready_for_packing', 'ready_for_shipping', 'shipped', 'delivered'));
    END IF;
END $$;

-- ============================================
-- 3. EXTEND SHIPPING TABLE FOR TRACKING URL
-- ============================================

ALTER TABLE shipping 
ADD COLUMN IF NOT EXISTS tracking_url TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_by UUID REFERENCES auth.users(id);

-- ============================================
-- 4. CREATE ACTIVITY LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_order_id_idx ON activity_logs(order_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at DESC);

-- ============================================
-- 5. CREATE NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- info, success, warning, error
    related_order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

-- ============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Activity Logs Policies
CREATE POLICY "Users can view activity logs"
    ON activity_logs FOR SELECT
    USING (true); -- All authenticated users can view logs

CREATE POLICY "System can insert activity logs"
    ON activity_logs FOR INSERT
    WITH CHECK (true); -- Allow inserts from authenticated users

-- Notifications Policies
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_order_id UUID,
    p_action TEXT,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO activity_logs (user_id, order_id, action, details)
    VALUES (p_user_id, p_order_id, p_action, p_details)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_order_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, related_order_id)
    VALUES (p_user_id, p_title, p_message, p_type, p_order_id)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reduce product stock
CREATE OR REPLACE FUNCTION reduce_product_stock(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_stock INTEGER;
BEGIN
    -- Get current stock
    SELECT stock_quantity INTO v_current_stock
    FROM products
    WHERE id = p_product_id;
    
    -- Check if enough stock
    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
    END IF;
    
    -- Reduce stock
    UPDATE products
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_product_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users by role
CREATE OR REPLACE FUNCTION get_users_by_role(p_role TEXT)
RETURNS TABLE (user_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT ur.user_id
    FROM user_roles ur
    WHERE ur.role = p_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. TRIGGERS FOR AUTOMATIC NOTIFICATIONS
-- ============================================

-- Trigger: Notify packing when order is created
CREATE OR REPLACE FUNCTION notify_packing_on_order_created()
RETURNS TRIGGER AS $$
DECLARE
    v_packing_user UUID;
BEGIN
    -- Get all packing users and notify them
    FOR v_packing_user IN 
        SELECT user_id FROM get_users_by_role('packing')
    LOOP
        PERFORM create_notification(
            v_packing_user,
            'New Order Ready for Packing',
            'Order #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' from ' || NEW.customer_name || ' is ready for packing.',
            'info',
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER order_created_notify_packing
    AFTER INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_status = 'ready_for_packing')
    EXECUTE FUNCTION notify_packing_on_order_created();

-- Trigger: Notify shipping when order is packed
CREATE OR REPLACE FUNCTION notify_shipping_on_order_packed()
RETURNS TRIGGER AS $$
DECLARE
    v_shipping_user UUID;
BEGIN
    -- Get all shipping users and notify them
    FOR v_shipping_user IN 
        SELECT user_id FROM get_users_by_role('shipping')
    LOOP
        PERFORM create_notification(
            v_shipping_user,
            'Order Ready for Shipping',
            'Order #' || SUBSTRING(NEW.order_id::TEXT, 1, 8) || ' has been packed and is ready for shipping.',
            'info',
            NEW.order_id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER order_packed_notify_shipping
    AFTER INSERT ON packing
    FOR EACH ROW
    EXECUTE FUNCTION notify_shipping_on_order_packed();

-- Trigger: Notify admin when order is shipped
CREATE OR REPLACE FUNCTION notify_admin_on_order_shipped()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_user UUID;
BEGIN
    -- Get all admin users and notify them
    FOR v_admin_user IN 
        SELECT user_id FROM get_users_by_role('admin')
    LOOP
        PERFORM create_notification(
            v_admin_user,
            'Order Shipped',
            'Order #' || SUBSTRING(NEW.order_id::TEXT, 1, 8) || ' has been shipped via ' || NEW.shipping_provider || '.',
            'success',
            NEW.order_id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER order_shipped_notify_admin
    AFTER INSERT ON shipping
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_on_order_shipped();

-- ============================================
-- 9. VIEWS FOR ANALYTICS
-- ============================================

-- View: Low stock products
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
    id,
    product_name,
    category,
    stock_quantity,
    low_stock_threshold,
    price,
    (low_stock_threshold - stock_quantity) as stock_deficit
FROM products
WHERE stock_quantity <= low_stock_threshold
ORDER BY stock_quantity ASC;

-- View: Order timeline with all statuses
CREATE OR REPLACE VIEW order_timeline AS
SELECT 
    o.id as order_id,
    o.customer_name,
    o.phone,
    o.order_status,
    o.created_at as order_created_at,
    p.packed_at,
    p.packed_by,
    s.shipped_at,
    s.shipped_by,
    s.tracking_id,
    s.tracking_url,
    s.shipping_provider,
    s.delivered_at,
    s.delivered_by
FROM orders o
LEFT JOIN packing p ON o.id = p.order_id
LEFT JOIN shipping s ON o.id = s.order_id
ORDER BY o.created_at DESC;

-- View: Recent activity logs with user details
CREATE OR REPLACE VIEW recent_activities AS
SELECT 
    al.id,
    al.action,
    al.details,
    al.created_at,
    p.full_name as user_name,
    o.customer_name,
    o.id as order_id
FROM activity_logs al
LEFT JOIN profiles p ON al.user_id = p.id
LEFT JOIN orders o ON al.order_id = o.id
ORDER BY al.created_at DESC
LIMIT 50;

-- ============================================
-- 10. GRANT PERMISSIONS
-- ============================================

-- Grant access to authenticated users
GRANT SELECT, INSERT ON activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT ON low_stock_products TO authenticated;
GRANT SELECT ON order_timeline TO authenticated;
GRANT SELECT ON recent_activities TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION reduce_product_stock TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_by_role TO authenticated;

-- ============================================
-- SETUP COMPLETE
-- ============================================

-- Verify tables exist
SELECT 'activity_logs' as table_name, COUNT(*) as row_count FROM activity_logs
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;

-- Verify columns added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('stock_quantity', 'low_stock_threshold');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'shipping' 
AND column_name IN ('tracking_url', 'delivered_at', 'delivered_by');

COMMENT ON TABLE activity_logs IS 'Logs all major actions performed by users';
COMMENT ON TABLE notifications IS 'Role-based notification system for internal communication';
COMMENT ON COLUMN products.stock_quantity IS 'Current available stock';
COMMENT ON COLUMN products.low_stock_threshold IS 'Alert threshold for low stock';
COMMENT ON COLUMN shipping.tracking_url IS 'Public tracking URL for customers';
COMMENT ON COLUMN shipping.delivered_at IS 'Timestamp when order was delivered';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Enterprise database schema setup complete!';
    RAISE NOTICE '📊 New tables: activity_logs, notifications';
    RAISE NOTICE '📦 Extended tables: products, orders, shipping';
    RAISE NOTICE '🔔 Notification triggers activated';
    RAISE NOTICE '📈 Analytics views created';
END $$;
