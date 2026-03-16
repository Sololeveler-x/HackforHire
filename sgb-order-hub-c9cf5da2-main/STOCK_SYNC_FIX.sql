-- ============================================================
-- STOCK SYNC FIX — Run this entire file in Supabase SQL Editor
-- warehouse_inventory is the single source of truth
-- products.stock auto-syncs via trigger
-- ============================================================

-- STEP 1: Function to sync product stock from warehouse inventory
CREATE OR REPLACE FUNCTION sync_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock = (
    SELECT COALESCE(SUM(stock_quantity), 0)
    FROM warehouse_inventory
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 2: Trigger fires on any warehouse_inventory change
DROP TRIGGER IF EXISTS sync_stock_on_warehouse_change ON warehouse_inventory;
CREATE TRIGGER sync_stock_on_warehouse_change
AFTER INSERT OR UPDATE OR DELETE ON warehouse_inventory
FOR EACH ROW EXECUTE FUNCTION sync_product_stock();

-- STEP 3: Initial sync — fix all existing products right now
UPDATE products p
SET stock = (
  SELECT COALESCE(SUM(wi.stock_quantity), 0)
  FROM warehouse_inventory wi
  WHERE wi.product_id = p.id
);

-- STEP 4: Fix deduct_warehouse_stock — only touch warehouse_inventory
-- products.stock auto-updates via trigger above
CREATE OR REPLACE FUNCTION deduct_warehouse_stock(
  p_warehouse_id UUID,
  p_order_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE warehouse_inventory wi
  SET
    stock_quantity = GREATEST(0, wi.stock_quantity - oi.quantity),
    updated_at = NOW()
  FROM order_items oi
  WHERE wi.warehouse_id = p_warehouse_id
    AND wi.product_id = oi.product_id
    AND oi.order_id = p_order_id;
  -- products.stock auto-updates via sync_stock_on_warehouse_change trigger
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_warehouse_stock(UUID, UUID) TO authenticated;

-- STEP 5: Function to restore warehouse stock on order cancel
CREATE OR REPLACE FUNCTION restore_warehouse_stock(
  p_warehouse_id UUID,
  p_order_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE warehouse_inventory wi
  SET
    stock_quantity = wi.stock_quantity + oi.quantity,
    updated_at = NOW()
  FROM order_items oi
  WHERE wi.warehouse_id = p_warehouse_id
    AND wi.product_id = oi.product_id
    AND oi.order_id = p_order_id;
  -- products.stock auto-updates via trigger
END;
$$;

GRANT EXECUTE ON FUNCTION restore_warehouse_stock(UUID, UUID) TO authenticated;

-- ============================================================
-- VERIFY: After running, check that products.stock matches
-- SELECT p.product_name, p.stock, SUM(wi.stock_quantity) as warehouse_total
-- FROM products p
-- LEFT JOIN warehouse_inventory wi ON wi.product_id = p.id
-- GROUP BY p.id, p.product_name, p.stock;
-- ============================================================
