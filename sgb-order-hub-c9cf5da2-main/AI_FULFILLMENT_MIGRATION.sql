-- AI Smart Fulfillment Migration
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS order_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id),
  split_number integer NOT NULL,
  status text DEFAULT 'pending',
  estimated_dispatch_date date,
  estimated_delivery_date date,
  distance_km numeric,
  tracking_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_split_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id uuid REFERENCES order_splits(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL,
  packed boolean DEFAULT false
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_split_order boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS split_count integer DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_plan jsonb;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS longitude numeric;

-- Update warehouse coordinates
UPDATE warehouses SET latitude = 13.5333, longitude = 75.3667 WHERE warehouse_name ILIKE '%Koppa%';
UPDATE warehouses SET latitude = 13.9299, longitude = 75.5681 WHERE warehouse_name ILIKE '%Shimoga%' OR warehouse_name ILIKE '%Shivamogga%';
UPDATE warehouses SET latitude = 12.9716, longitude = 77.5946 WHERE warehouse_name ILIKE '%Bangalore%' OR warehouse_name ILIKE '%Bengaluru%';

CREATE OR REPLACE FUNCTION deduct_warehouse_stock_specific(
  p_warehouse_id uuid,
  p_product_id uuid,
  p_quantity integer
) RETURNS void AS $$
BEGIN
  UPDATE warehouse_inventory
  SET stock_quantity = GREATEST(0, stock_quantity - p_quantity),
      updated_at = now()
  WHERE warehouse_id = p_warehouse_id
  AND product_id = p_product_id;
END;
$$ LANGUAGE plpgsql;
