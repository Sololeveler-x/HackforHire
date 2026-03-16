-- ── Payment System Simplification Migration ──────────────────────────────────
-- Run in Supabase SQL Editor

-- Add UPI fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS upi_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS upi_qr_sent boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_collected boolean DEFAULT false;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS upi_id text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- Migrate existing payment_status values to new clean values
UPDATE orders SET payment_status = 'paid'        WHERE payment_status IN ('paid', 'Paid');
UPDATE orders SET payment_status = 'cod_pending'  WHERE payment_status IN ('unpaid', 'pending') AND (payment_method ILIKE '%cod%' OR payment_method ILIKE '%cash on delivery%');
UPDATE orders SET payment_status = 'cheque_pending' WHERE payment_method ILIKE '%cheque%' AND payment_status != 'paid';
UPDATE orders SET payment_status = 'pending'      WHERE payment_status NOT IN ('paid', 'cod_pending', 'cheque_pending');

-- Mark UPI/Bank as paid since agent confirmed
UPDATE orders SET payment_status = 'paid'
WHERE payment_method IN ('UPI', 'Bank Transfer', 'upi', 'bank_transfer')
  AND payment_status != 'paid';
