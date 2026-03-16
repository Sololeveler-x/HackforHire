-- ============================================
-- SHIPMENT TRACKING SCHEMA
-- Add real-time tracking like Flipkart/Amazon
-- ============================================

-- Create shipment_tracking table for tracking updates
CREATE TABLE IF NOT EXISTS shipment_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  tracking_id TEXT NOT NULL,
  status TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add delivered_at column to shipping table if not exists
ALTER TABLE shipping 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_location TEXT,
ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_order_id ON shipment_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_tracking_id ON shipment_tracking(tracking_id);

-- Enable RLS
ALTER TABLE shipment_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (public can view tracking)
DROP POLICY IF EXISTS "Anyone can view shipment tracking" ON shipment_tracking;
CREATE POLICY "Anyone can view shipment tracking" 
  ON shipment_tracking FOR SELECT 
  USING (true);

-- Shipping team can insert tracking updates
DROP POLICY IF EXISTS "Shipping can insert tracking" ON shipment_tracking;
CREATE POLICY "Shipping can insert tracking" 
  ON shipment_tracking FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('shipping', 'admin')
    )
  );


-- Function to add tracking update
CREATE OR REPLACE FUNCTION add_tracking_update(
  p_order_id UUID,
  p_tracking_id TEXT,
  p_status TEXT,
  p_location TEXT,
  p_description TEXT
)
RETURNS UUID AS $$
DECLARE
  v_tracking_id UUID;
BEGIN
  INSERT INTO shipment_tracking (
    order_id,
    tracking_id,
    status,
    location,
    description,
    timestamp
  ) VALUES (
    p_order_id,
    p_tracking_id,
    p_status,
    p_location,
    p_description,
    NOW()
  ) RETURNING id INTO v_tracking_id;
  
  -- Update current location in shipping table
  UPDATE shipping 
  SET current_location = p_location
  WHERE order_id = p_order_id;
  
  RETURN v_tracking_id;
END;
$$ LANGUAGE plpgsql;

-- Sample tracking data insertion function
CREATE OR REPLACE FUNCTION create_sample_tracking(p_tracking_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_order_id UUID;
BEGIN
  -- Get order_id from tracking_id
  SELECT order_id INTO v_order_id
  FROM shipping
  WHERE tracking_id = p_tracking_id;
  
  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Tracking ID not found';
  END IF;
  
  -- Insert sample tracking updates
  INSERT INTO shipment_tracking (order_id, tracking_id, status, location, description, timestamp) VALUES
  (v_order_id, p_tracking_id, 'Order Placed', 'Bangalore, Karnataka', 'Your order has been placed successfully', NOW() - INTERVAL '3 days'),
  (v_order_id, p_tracking_id, 'Order Confirmed', 'Bangalore, Karnataka', 'Your order has been confirmed and is being prepared', NOW() - INTERVAL '2 days 20 hours'),
  (v_order_id, p_tracking_id, 'Packed', 'Bangalore Warehouse', 'Your order has been packed and ready for dispatch', NOW() - INTERVAL '2 days 12 hours'),
  (v_order_id, p_tracking_id, 'Shipped', 'Bangalore Hub', 'Your order has been shipped from our warehouse', NOW() - INTERVAL '2 days'),
  (v_order_id, p_tracking_id, 'In Transit', 'Bangalore - Hubli Highway', 'Your order is on the way to destination', NOW() - INTERVAL '1 day 12 hours'),
  (v_order_id, p_tracking_id, 'Reached Hub', 'Hubli Distribution Center', 'Your order has reached the nearest hub', NOW() - INTERVAL '12 hours'),
  (v_order_id, p_tracking_id, 'Out for Delivery', 'Hubli, Karnataka', 'Your order is out for delivery', NOW() - INTERVAL '2 hours');
  
  -- Update current location
  UPDATE shipping 
  SET current_location = 'Out for Delivery - Hubli, Karnataka',
      estimated_delivery = NOW() + INTERVAL '4 hours'
  WHERE tracking_id = p_tracking_id;
END;
$$ LANGUAGE plpgsql;

-- Verification
SELECT 'Shipment tracking schema created successfully!' as message;
