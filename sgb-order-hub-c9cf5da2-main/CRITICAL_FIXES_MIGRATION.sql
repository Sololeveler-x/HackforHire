-- ============================================================
-- CRITICAL FIXES MIGRATION — Run in Supabase SQL Editor
-- ============================================================

-- 1. Stock reservations table
CREATE TABLE IF NOT EXISTS stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  warehouse_id uuid REFERENCES warehouses(id),
  quantity integer NOT NULL,
  status text DEFAULT 'reserved', -- reserved | fulfilled | released
  created_at timestamptz DEFAULT now()
);

-- 2. Notification failures table
CREATE TABLE IF NOT EXISTS notification_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text,
  message_preview text,
  failed_at timestamptz DEFAULT now(),
  attempts integer DEFAULT 1
);

-- 3. Add tracking_url to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url text;

-- 4. Add tracking_url to shipping table (if not already there)
ALTER TABLE shipping ADD COLUMN IF NOT EXISTS tracking_url text;

-- 5. Reserve stock function (atomic — deducts immediately at billing)
CREATE OR REPLACE FUNCTION reserve_stock(
  p_order_id uuid,
  p_product_id uuid,
  p_warehouse_id uuid,
  p_quantity integer
) RETURNS boolean AS $$
DECLARE
  available integer;
BEGIN
  SELECT stock_quantity INTO available
  FROM warehouse_inventory
  WHERE product_id = p_product_id
    AND warehouse_id = p_warehouse_id
  FOR UPDATE;

  IF available IS NULL OR available < p_quantity THEN
    RETURN false;
  END IF;

  UPDATE warehouse_inventory
  SET stock_quantity = stock_quantity - p_quantity
  WHERE product_id = p_product_id
    AND warehouse_id = p_warehouse_id;

  INSERT INTO stock_reservations(order_id, product_id, warehouse_id, quantity, status)
  VALUES(p_order_id, p_product_id, p_warehouse_id, p_quantity, 'reserved');

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 6. Release reservation (for cancellations — restores stock)
CREATE OR REPLACE FUNCTION release_stock_reservation(p_order_id uuid) RETURNS void AS $$
BEGIN
  UPDATE warehouse_inventory wi
  SET stock_quantity = stock_quantity + sr.quantity
  FROM stock_reservations sr
  WHERE sr.order_id = p_order_id
    AND wi.product_id = sr.product_id
    AND wi.warehouse_id = sr.warehouse_id
    AND sr.status = 'reserved';

  UPDATE stock_reservations
  SET status = 'released'
  WHERE order_id = p_order_id AND status = 'reserved';
END;
$$ LANGUAGE plpgsql;

-- 7. Mark reservation as fulfilled (called at packing — no stock deduction)
CREATE OR REPLACE FUNCTION fulfill_stock_reservation(p_order_id uuid) RETURNS void AS $$
BEGIN
  UPDATE stock_reservations
  SET status = 'fulfilled'
  WHERE order_id = p_order_id AND status = 'reserved';
END;
$$ LANGUAGE plpgsql;

-- 8. Check if order already has reservations (to avoid double-deduct)
CREATE OR REPLACE FUNCTION has_stock_reservation(p_order_id uuid) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM stock_reservations
    WHERE order_id = p_order_id AND status = 'reserved'
  );
END;
$$ LANGUAGE plpgsql;
