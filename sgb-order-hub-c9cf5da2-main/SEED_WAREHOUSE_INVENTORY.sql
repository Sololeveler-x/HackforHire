-- ============================================================
-- SEED WAREHOUSE INVENTORY
-- Inserts all products into all warehouses with realistic stock.
-- Most products are well-stocked, 2-3 are at 0 or low stock
-- to trigger Low Stock alerts for demo purposes.
--
-- Run this in Supabase SQL Editor AFTER running STOCK_SYNC_FIX.sql
-- ============================================================

-- Step 1: Clear existing warehouse_inventory (optional — comment out if you want to keep existing)
-- DELETE FROM warehouse_inventory;

-- Step 2: Insert all products × all warehouses using a cross join
-- Stock levels are set per product per warehouse:
--   - Most products: healthy stock (50–200 units)
--   - SGB Carry Cart: 0 in Koppa (out of stock), 2 in Shimoga (low stock)
--   - SGB G45L Brush Cutter: 3 in Koppa (low stock), 0 in Shimoga (out of stock)

INSERT INTO warehouse_inventory (warehouse_id, product_id, stock_quantity, reorder_level)
SELECT
  w.id AS warehouse_id,
  p.id AS product_id,
  CASE
    -- SGB Carry Cart: out of stock in Koppa, low in Shimoga
    WHEN p.product_name ILIKE '%Carry Cart%' AND w.city ILIKE '%Koppa%'    THEN 0
    WHEN p.product_name ILIKE '%Carry Cart%' AND w.city ILIKE '%Shimoga%'  THEN 2

    -- SGB G45L Brush Cutter: low in Koppa, out in Shimoga
    WHEN p.product_name ILIKE '%G45L%' AND w.city ILIKE '%Koppa%'          THEN 3
    WHEN p.product_name ILIKE '%G45L%' AND w.city ILIKE '%Shimoga%'        THEN 0

    -- SGB BC-520 Brush Cutter: good stock everywhere
    WHEN p.product_name ILIKE '%BC-520%' AND w.city ILIKE '%Koppa%'        THEN 50
    WHEN p.product_name ILIKE '%BC-520%' AND w.city ILIKE '%Shimoga%'      THEN 60

    -- SGB Cycle Weeder: good stock
    WHEN p.product_name ILIKE '%Cycle Weeder%' AND w.city ILIKE '%Koppa%'  THEN 80
    WHEN p.product_name ILIKE '%Cycle Weeder%' AND w.city ILIKE '%Shimoga%' THEN 90

    -- SGB Brush Cutter Trolley: good stock
    WHEN p.product_name ILIKE '%Trolley%' AND w.city ILIKE '%Koppa%'       THEN 60
    WHEN p.product_name ILIKE '%Trolley%' AND w.city ILIKE '%Shimoga%'     THEN 75

    -- SGB Wheel Barrow: good stock
    WHEN p.product_name ILIKE '%Wheel Barrow%' AND w.city ILIKE '%Koppa%'  THEN 100
    WHEN p.product_name ILIKE '%Wheel Barrow%' AND w.city ILIKE '%Shimoga%' THEN 150

    -- Default for any other warehouse/product combo
    ELSE 50
  END AS stock_quantity,
  10 AS reorder_level  -- alert when stock drops to 10 or below
FROM warehouses w
CROSS JOIN products p
ON CONFLICT (warehouse_id, product_id)
DO UPDATE SET
  stock_quantity = EXCLUDED.stock_quantity,
  reorder_level  = EXCLUDED.reorder_level,
  updated_at     = NOW();

-- Step 3: Sync products.stock from warehouse totals (trigger should handle this,
-- but run manually to be safe)
UPDATE products p
SET stock = (
  SELECT COALESCE(SUM(wi.stock_quantity), 0)
  FROM warehouse_inventory wi
  WHERE wi.product_id = p.id
);

-- ============================================================
-- VERIFY: Check what you just inserted
-- ============================================================
-- SELECT
--   p.product_name,
--   w.warehouse_name,
--   wi.stock_quantity,
--   wi.reorder_level,
--   CASE WHEN wi.stock_quantity = 0 THEN 'OUT OF STOCK'
--        WHEN wi.stock_quantity <= wi.reorder_level THEN 'LOW STOCK'
--        ELSE 'OK' END AS status
-- FROM warehouse_inventory wi
-- JOIN products p ON p.id = wi.product_id
-- JOIN warehouses w ON w.id = wi.warehouse_id
-- ORDER BY p.product_name, w.warehouse_name;
-- ============================================================
