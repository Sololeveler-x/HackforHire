-- Run this in Supabase SQL Editor

-- 1. Add new columns to inquiries table
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'whatsapp_direct',
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS agreed_price NUMERIC,
  ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS call_status TEXT DEFAULT 'not_called',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- 2. Update status constraint to allow new values
ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_status_check;
ALTER TABLE inquiries ADD CONSTRAINT inquiries_status_check
  CHECK (status IN ('pending', 'converted', 'rejected', 'new', 'pending_billing', 'agent_confirmed'));

-- 3. RLS Policies for sales agents (drop first, then create)
DROP POLICY IF EXISTS "sales_agent_select_own_inquiries" ON inquiries;
CREATE POLICY "sales_agent_select_own_inquiries"
  ON inquiries FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'billing')
    )
  );

DROP POLICY IF EXISTS "sales_agent_update_own_inquiries" ON inquiries;
CREATE POLICY "sales_agent_update_own_inquiries"
  ON inquiries FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_to ON inquiries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
