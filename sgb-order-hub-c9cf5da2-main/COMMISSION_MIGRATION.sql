-- ============================================================
-- COMMISSION MIGRATION — Run in Supabase SQL Editor
-- ============================================================

-- 1. Product commission rates
ALTER TABLE products ADD COLUMN IF NOT EXISTS agent_commission_percent numeric DEFAULT 5.0;

UPDATE products SET agent_commission_percent = 8.0 WHERE product_name LIKE '%Robot%';
UPDATE products SET agent_commission_percent = 7.0 WHERE product_name LIKE '%Reaper%' OR product_name LIKE '%Tiller%';
UPDATE products SET agent_commission_percent = 6.0 WHERE product_name LIKE '%Weeder%' OR product_name LIKE '%Cutter%';
UPDATE products SET agent_commission_percent = 5.0 WHERE product_name LIKE '%Sprayer%' OR product_name LIKE '%Sheller%' OR product_name LIKE '%Transplanter%' OR product_name LIKE '%Climber%';
UPDATE products SET agent_commission_percent = 5.5 WHERE product_name LIKE '%Barrow%' OR product_name LIKE '%Cart%' OR product_name LIKE '%Trolley%';

-- 2. Add columns to inquiries
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS agent_commission_amount numeric DEFAULT 0;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS total_paid numeric DEFAULT 0;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS upi_id text;

-- 3. Add columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agent_commission_amount numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_paid boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_paid_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS upi_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_collected boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_collected_at timestamptz;

-- 4. Create agent_commissions table
CREATE TABLE IF NOT EXISTS agent_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES profiles(id),
  order_id uuid REFERENCES orders(id),
  inquiry_id uuid REFERENCES inquiries(id),
  customer_name text,
  products_summary text,
  sale_amount numeric NOT NULL,
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  paid_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 5. RLS for agent_commissions
ALTER TABLE agent_commissions ENABLE ROW LEVEL SECURITY;

-- Agents can read their own commissions
DROP POLICY IF EXISTS "agents_read_own_commissions" ON agent_commissions;
CREATE POLICY "agents_read_own_commissions" ON agent_commissions
  FOR SELECT USING (
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Agents can insert their own commissions
DROP POLICY IF EXISTS "agents_insert_own_commissions" ON agent_commissions;
CREATE POLICY "agents_insert_own_commissions" ON agent_commissions
  FOR INSERT WITH CHECK (agent_id = auth.uid());

-- Admins can update (mark as paid)
DROP POLICY IF EXISTS "admins_update_commissions" ON agent_commissions;
CREATE POLICY "admins_update_commissions" ON agent_commissions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
