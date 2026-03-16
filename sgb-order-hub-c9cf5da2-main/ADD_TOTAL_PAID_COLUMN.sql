-- Fix: add total_paid column to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_paid numeric DEFAULT 0;

-- Fix: add shipping columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_provider text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_charge numeric DEFAULT 0;

-- Backfill: set total_paid = total_amount for already-paid orders
UPDATE orders
SET total_paid = total_amount
WHERE payment_status = 'paid' AND (total_paid IS NULL OR total_paid = 0);
