-- ── Payment Transactions Table ───────────────────────────────────────────────
-- Run this in Supabase SQL Editor to fix the billing payment panel error

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  transaction_ref TEXT,
  notes TEXT,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by order
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);

-- RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Billing and admin can read/write
CREATE POLICY "billing_admin_manage_payments" ON payment_transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'billing')
    )
  );

-- After inserting a payment, update orders.total_paid automatically
CREATE OR REPLACE FUNCTION sync_order_total_paid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
  SET total_paid = (
    SELECT COALESCE(SUM(amount), 0)
    FROM payment_transactions
    WHERE order_id = NEW.order_id
  )
  WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_total_paid ON payment_transactions;
CREATE TRIGGER trg_sync_total_paid
  AFTER INSERT OR UPDATE OR DELETE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION sync_order_total_paid();
