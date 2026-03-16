-- ============================================================
-- COMPLETE MIGRATION — Tasks 1-11, 13-16 (NO Task 12 dealer)
-- Run in Supabase SQL Editor
-- ============================================================

-- TASK 4: Delivery proof
ALTER TABLE shipping ADD COLUMN IF NOT EXISTS delivery_proof_url text;
ALTER TABLE shipping ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE shipping ADD COLUMN IF NOT EXISTS delivery_notes text;

-- TASK 5: Failed delivery
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_attempts integer DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reschedule_date date;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS failure_reason text;

-- TASK 6: COD cash collection
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_collected boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_collected_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_collected_by uuid REFERENCES profiles(id);

-- TASK 7: Customer credits
CREATE TABLE IF NOT EXISTS customer_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  credit_limit numeric DEFAULT 0,
  current_outstanding numeric DEFAULT 0,
  last_payment_date timestamptz,
  created_at timestamptz DEFAULT now(),
  notes text
);
ALTER TABLE customer_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage credits" ON customer_credits;
CREATE POLICY "Authenticated users can manage credits" ON customer_credits FOR ALL USING (auth.role() = 'authenticated');

-- TASK 8: Packing checklist
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS packed_quantity integer DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS packing_notes text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_packed boolean DEFAULT false;

-- TASK 9: Weight and dimensions
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS length_cm numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS width_cm numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS height_cm numeric DEFAULT 0;

-- TASK 10: Staff leaves
CREATE TABLE IF NOT EXISTS staff_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES profiles(id),
  staff_name text,
  leave_date date NOT NULL,
  leave_type text DEFAULT 'casual',
  reason text,
  status text DEFAULT 'pending',
  approved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE staff_leaves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage leaves" ON staff_leaves;
CREATE POLICY "Authenticated users can manage leaves" ON staff_leaves FOR ALL USING (auth.role() = 'authenticated');

-- TASK 14: Customer OTPs and complaints
CREATE TABLE IF NOT EXISTS customer_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customer_otps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage OTPs" ON customer_otps;
CREATE POLICY "Service role can manage OTPs" ON customer_otps FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS customer_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  customer_name text,
  order_id uuid REFERENCES orders(id),
  complaint_type text NOT NULL,
  description text,
  status text DEFAULT 'open',
  resolved_by uuid REFERENCES profiles(id),
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customer_complaints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage complaints" ON customer_complaints;
CREATE POLICY "Authenticated users can manage complaints" ON customer_complaints FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Anyone can insert complaints" ON customer_complaints;
CREATE POLICY "Anyone can insert complaints" ON customer_complaints FOR INSERT WITH CHECK (true);

-- TASK 15: Loyalty points
CREATE TABLE IF NOT EXISTS customer_loyalty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL UNIQUE,
  customer_name text,
  total_points integer DEFAULT 0,
  redeemed_points integer DEFAULT 0,
  tier text DEFAULT 'bronze',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE customer_loyalty ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage loyalty" ON customer_loyalty;
CREATE POLICY "Authenticated users can manage loyalty" ON customer_loyalty FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Anyone can view loyalty" ON customer_loyalty;
CREATE POLICY "Anyone can view loyalty" ON customer_loyalty FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  order_id uuid REFERENCES orders(id),
  points_earned integer DEFAULT 0,
  points_redeemed integer DEFAULT 0,
  transaction_type text DEFAULT 'earned',
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage loyalty txns" ON loyalty_transactions;
CREATE POLICY "Authenticated users can manage loyalty txns" ON loyalty_transactions FOR ALL USING (auth.role() = 'authenticated');

-- TASK 16: GST invoice
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gst_number text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_rate numeric DEFAULT 18;

CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text DEFAULT 'SGB Agro Industries',
  gstin text DEFAULT '',
  pan text DEFAULT '',
  address text DEFAULT 'Opp. Municipal Ground, Near JMJ Talkies, Koppa, Karnataka – 577126',
  phone text DEFAULT '08277009667',
  email text DEFAULT '',
  website text DEFAULT 'www.sgbagroindustries.com',
  logo_url text,
  default_gst_rate numeric DEFAULT 18,
  invoice_prefix text DEFAULT 'SGB/2024-25/',
  invoice_counter integer DEFAULT 1,
  bank_name text,
  bank_account text,
  bank_ifsc text,
  upi_id text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON company_settings;
CREATE POLICY "Authenticated users can manage settings" ON company_settings FOR ALL USING (auth.role() = 'authenticated');

INSERT INTO company_settings (company_name, gstin, address, phone, website)
VALUES (
  'SGB Agro Industries',
  '29XXXXX0000X1ZX',
  'Opp. Municipal Ground, Near JMJ Talkies, Koppa, Karnataka – 577126',
  '08277009667',
  'www.sgbagroindustries.com'
) ON CONFLICT DO NOTHING;

-- ============================================================
-- REAL PRODUCT DATA
-- ============================================================

-- Add extra product columns if they don't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS target_price numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS floor_price numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS agent_commission_percent numeric DEFAULT 3;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level integer DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS key_features text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS common_objections text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5;

DELETE FROM order_items WHERE product_id IN (SELECT id FROM products);
DELETE FROM products;

INSERT INTO products (product_name, description, category, price, mrp, target_price, floor_price, cost_price, agent_commission_percent, stock_quantity, reorder_level, key_features, common_objections, weight_kg, length_cm, width_cm, height_cm, hsn_code, gst_rate)
VALUES
('Brush Cutter — Petrol 52cc', 'High-performance petrol brush cutter for clearing dense vegetation, weeds and shrubs on farm boundaries.', 'Cutting Equipment', 18500, 21000, 19000, 17000, 14000, 3.0, 25, 5, '52cc engine, Anti-vibration handle, 2-in-1 blade and nylon head, Easy start, Lightweight', 'Too expensive — explain fuel savings vs manual labor. Heavy — anti-vibration reduces fatigue.', 9.5, 180, 30, 35, '8467', 18),
('Brush Cutter — Electric 1800W', 'Eco-friendly electric brush cutter for small to medium farms.', 'Cutting Equipment', 12500, 14500, 13000, 11500, 9500, 3.0, 20, 5, '1800W motor, 4.2kg lightweight, Telescopic shaft, Safety guard, No fuel cost', 'Battery life — corded runs continuously. Vs petrol — lower maintenance.', 4.2, 160, 25, 25, '8467', 18),
('Power Weeder — 4-stroke 5.5HP', '4-stroke power weeder for inter-crop cultivation. Reduces weeding time by 80%.', 'Weeding Equipment', 32000, 36000, 33500, 30000, 25000, 2.5, 15, 3, '5.5HP Honda engine, 300-500mm tilling width, Forward reverse gear, Foldable handle', 'High price — ROI in one season vs labor. Difficult to use — 30 min training.', 65, 120, 60, 80, '8432', 18),
('Power Weeder — 2-stroke 2.5HP', 'Lightweight 2-stroke power weeder for small farms and vegetable gardens.', 'Weeding Equipment', 22000, 25000, 23000, 20500, 17000, 2.5, 20, 5, '2.5HP engine, 18kg weight, 15cm tilling depth, Low fuel consumption', '2-stroke vs 4-stroke — lighter cheaper for small farms.', 18, 110, 50, 70, '8432', 18),
('Agriculture Robot — Weeding Bot', 'AI-powered autonomous weeding robot. Navigates between crop rows automatically.', 'Agriculture Robots', 185000, 210000, 195000, 175000, 140000, 2.0, 5, 2, 'Autonomous navigation, AI weed detection, 4-hour battery, 1 acre per day, GPS guided', 'Expensive — replaces 10 laborers ROI in 2 seasons. Works offline.', 45, 120, 80, 60, '8479', 18),
('Agriculture Robot — Spraying Bot', 'Automated crop spraying robot. Reduces chemical usage by 40%.', 'Agriculture Robots', 225000, 250000, 235000, 210000, 170000, 2.0, 3, 1, '20L tank, GPS precision, 4 adjustable nozzles, 2 acres per hour', 'Chemical savings — 40% proven. Battery — 6 hours.', 52, 130, 90, 65, '8479', 18),
('Paddy Reaper — Self Propelled', 'Self-propelled paddy reaper for fast rice harvesting.', 'Harvesting Equipment', 95000, 108000, 99000, 89000, 72000, 2.5, 8, 2, 'Self-propelled, 5HP engine, 1.2m cutting width, 0.5 acre per hour', 'Wet fields — specially designed. Blades — available locally.', 180, 200, 120, 110, '8433', 18),
('Maize Sheller — Electric 500kg/hr', 'High-capacity electric maize sheller. 500kg per hour with minimal grain damage.', 'Processing Equipment', 28000, 32000, 29500, 26000, 21000, 3.0, 12, 3, '500kg per hour, 2HP motor, 95% efficiency, Under 2% grain damage', 'Power — single phase. Large farm — multiple units.', 85, 90, 70, 80, '8433', 18),
('Mini Tiller — Rotavator 7HP', 'Compact rotary tiller for small farms and gardens.', 'Tillage Equipment', 45000, 52000, 47500, 42000, 35000, 2.5, 10, 3, '7HP diesel, 900mm width, 150mm depth, 3 forward gears', 'Hard soil — handles all conditions. Fuel — 1 liter per hour.', 120, 150, 90, 100, '8432', 18),
('Knapsack Power Sprayer — Battery', 'Battery-powered knapsack sprayer for pesticide and fertilizer application.', 'Spraying Equipment', 8500, 10000, 9000, 7800, 6200, 3.5, 30, 8, '16L tank, 12V battery, 6-8 hours per charge, Adjustable nozzle', 'Battery enough — 1 acre per charge. Vs manual — 5x faster.', 5.5, 50, 30, 55, '8424', 18),
('Coconut Tree Climber Machine', 'Motorized coconut tree climber. Reduces climbing risk for coconut harvesting.', 'Specialty Equipment', 15000, 17500, 15800, 13500, 10500, 3.0, 15, 4, 'Fits 30-90cm trees, Motorized belt, Safety harness, 2 min climb', 'Tree size — adjustable. Safety — tested to 200kg.', 8, 60, 40, 20, '8479', 18),
('Paddy Transplanter — Manual 8-row', 'Manual paddy transplanter for uniform seedling placement. 60% faster than manual.', 'Planting Equipment', 12000, 14000, 12800, 11000, 8500, 3.0, 18, 5, '8 rows per pass, Adjustable spacing, 12kg lightweight, Floating pontoon', 'All varieties — short and medium duration. Muddy — floating design.', 12, 140, 80, 40, '8432', 18);

-- ============================================================
-- WAREHOUSES
-- ============================================================
DELETE FROM warehouses WHERE warehouse_name LIKE '%Demo%' OR warehouse_name LIKE '%Test%';

INSERT INTO warehouses (warehouse_name, city, latitude, longitude, capacity, is_active)
VALUES
('SGB Main Warehouse — Koppa', 'Koppa', 13.5449, 75.3547, 500, true),
('SGB Distribution Center — Shimoga', 'Shimoga', 13.9299, 75.5681, 300, true),
('SGB Depot — Bangalore', 'Bangalore', 12.9716, 77.5946, 200, true)
ON CONFLICT (warehouse_name) DO NOTHING;

-- ============================================================
-- TERRITORY ZONES
-- ============================================================
DELETE FROM territory_zones;
INSERT INTO territory_zones (zone_name, cities) VALUES
('Malnad Zone — Home Region', ARRAY['Koppa', 'Chikmagalur', 'Shimoga', 'Shivamogga', 'Hassan', 'Kadur', 'Mudigere', 'Sringeri', 'Thirthahalli']),
('Mysuru Zone', ARRAY['Mysuru', 'Mysore', 'Mandya', 'Chamarajanagar', 'Kodagu', 'Madikeri', 'Hunsur']),
('Bangalore Zone', ARRAY['Bangalore', 'Bengaluru', 'Tumkur', 'Kolar', 'Ramanagara', 'Chikkaballapur']),
('North Karnataka Zone', ARRAY['Hubli', 'Dharwad', 'Belagavi', 'Belgaum', 'Gadag', 'Haveri', 'Sirsi']),
('Coastal Karnataka Zone', ARRAY['Mangalore', 'Udupi', 'Kundapur', 'Karwar', 'Uttara Kannada']);


-- ============================================================
-- STORAGE BUCKET: delivery-proofs (Task 5)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated uploads to delivery-proofs" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to delivery-proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery-proofs');

DROP POLICY IF EXISTS "Allow public read of delivery-proofs" ON storage.objects;
CREATE POLICY "Allow public read of delivery-proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'delivery-proofs');
