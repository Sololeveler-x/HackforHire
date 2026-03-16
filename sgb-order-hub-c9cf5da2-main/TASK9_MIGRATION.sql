-- ============================================================
-- TASK 9 MIGRATION — Run in Supabase SQL Editor
-- ============================================================

-- TASK 4: Delivery proof photo upload
ALTER TABLE shipping ADD COLUMN IF NOT EXISTS delivery_proof_url TEXT;
ALTER TABLE shipping ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE shipping ADD COLUMN IF NOT EXISTS delivered_by UUID REFERENCES auth.users(id);

-- TASK 5: Failed delivery flow
ALTER TABLE shipping ADD COLUMN IF NOT EXISTS failed_delivery_reason TEXT;
ALTER TABLE shipping ADD COLUMN IF NOT EXISTS failed_delivery_at TIMESTAMPTZ;
ALTER TABLE shipping ADD COLUMN IF NOT EXISTS reschedule_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_attempts INT DEFAULT 0;

-- TASK 6: COD cash collection
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_collected BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_collected_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_collected_by UUID REFERENCES auth.users(id);

-- TASK 7: Customer credits
CREATE TABLE IF NOT EXISTS customer_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  credit_limit NUMERIC(10,2) DEFAULT 50000,
  used_credit NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customer_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage credits" ON customer_credits;
CREATE POLICY "Authenticated users can manage credits" ON customer_credits FOR ALL USING (auth.role() = 'authenticated');

-- TASK 8: Packing checklist
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_checked BOOLEAN DEFAULT FALSE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS checked_by UUID REFERENCES auth.users(id);

-- TASK 9: Weight and dimensions on products
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(8,3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS length_cm NUMERIC(8,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS width_cm NUMERIC(8,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS height_cm NUMERIC(8,2);

-- TASK 10: Staff leaves
CREATE TABLE IF NOT EXISTS staff_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES auth.users(id),
  employee_name TEXT,
  leave_type TEXT DEFAULT 'casual', -- casual, sick, earned
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE staff_leaves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage leaves" ON staff_leaves;
CREATE POLICY "Authenticated users can manage leaves" ON staff_leaves FOR ALL USING (auth.role() = 'authenticated');

-- TASK 14: Customer portal OTP
CREATE TABLE IF NOT EXISTS customer_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customer_otps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage OTPs" ON customer_otps;
CREATE POLICY "Service role can manage OTPs" ON customer_otps FOR ALL USING (true);

-- Customer complaints
CREATE TABLE IF NOT EXISTS customer_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  order_id UUID REFERENCES orders(id),
  complaint_type TEXT DEFAULT 'general',
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- open, in_progress, resolved
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE customer_complaints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage complaints" ON customer_complaints;
CREATE POLICY "Authenticated users can manage complaints" ON customer_complaints FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Anyone can insert complaints" ON customer_complaints;
CREATE POLICY "Anyone can insert complaints" ON customer_complaints FOR INSERT WITH CHECK (true);

-- TASK 15: Loyalty points
CREATE TABLE IF NOT EXISTS customer_loyalty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  total_points INT DEFAULT 0,
  redeemed_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customer_loyalty ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage loyalty" ON customer_loyalty;
CREATE POLICY "Authenticated users can manage loyalty" ON customer_loyalty FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  order_id UUID REFERENCES orders(id),
  points INT NOT NULL,
  transaction_type TEXT DEFAULT 'earned', -- earned, redeemed
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage loyalty txns" ON loyalty_transactions;
CREATE POLICY "Authenticated users can manage loyalty txns" ON loyalty_transactions FOR ALL USING (auth.role() = 'authenticated');

-- TASK 16: GST and company settings
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT DEFAULT 'SGB Agro Industries',
  gstin TEXT,
  pan TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  gst_rate_cgst NUMERIC(5,2) DEFAULT 9.0,
  gst_rate_sgst NUMERIC(5,2) DEFAULT 9.0,
  gst_rate_igst NUMERIC(5,2) DEFAULT 18.0,
  bank_name TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  upi_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON company_settings;
CREATE POLICY "Authenticated users can manage settings" ON company_settings FOR ALL USING (auth.role() = 'authenticated');

-- Insert default company settings if not exists
INSERT INTO company_settings (company_name, gstin, address, phone, website)
VALUES (
  'SGB Agro Industries',
  '29XXXXX0000X1ZX',
  'Opp. Municipal Ground, Near JMJ Talkies, Koppa, Karnataka – 577126',
  '08277009667',
  'www.sgbagroindustries.com'
) ON CONFLICT DO NOTHING;

-- Supabase storage bucket for delivery proofs (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-proofs', 'delivery-proofs', true) ON CONFLICT DO NOTHING;
