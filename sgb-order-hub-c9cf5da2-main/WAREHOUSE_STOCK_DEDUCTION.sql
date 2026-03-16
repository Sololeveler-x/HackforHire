-- ============================================================
-- WAREHOUSE STOCK DEDUCTION FUNCTION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create the RPC function that deducts stock from warehouse_inventory
--    AND from products.stock_quantity atomically
CREATE OR REPLACE FUNCTION deduct_warehouse_stock(
  p_warehouse_id UUID,
  p_order_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item RECORD;
BEGIN
  -- Loop over each item in the order
  FOR item IN
    SELECT product_id, quantity
    FROM order_items
    WHERE order_id = p_order_id
  LOOP
    -- Deduct from warehouse_inventory
    UPDATE warehouse_inventory
    SET
      stock_quantity = GREATEST(0, stock_quantity - item.quantity),
      updated_at = NOW()
    WHERE warehouse_id = p_warehouse_id
      AND product_id = item.product_id;

    -- Deduct from products global stock (stock column)
    UPDATE products
    SET
      stock = GREATEST(0, COALESCE(stock, 0) - item.quantity),
      updated_at = NOW()
    WHERE id = item.product_id;
  END LOOP;
END;
$$;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION deduct_warehouse_stock(UUID, UUID) TO authenticated;

-- ============================================================
-- VERIFY: Check warehouse_inventory table has these columns
-- ============================================================
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'warehouse_inventory';

-- ============================================================
-- VERIFY: Check products table has stock_quantity column
-- If it only has 'stock' column, update the function above
-- to use 'stock' instead of 'stock_quantity'
-- ============================================================
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'products' AND column_name IN ('stock', 'stock_quantity');
