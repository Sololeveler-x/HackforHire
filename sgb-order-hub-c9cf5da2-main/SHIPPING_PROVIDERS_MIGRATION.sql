-- ── Shipping Providers Migration ─────────────────────────────────────────────
-- Run this in Supabase SQL Editor

-- 0. Create shipping_rates table if it doesn't exist
CREATE TABLE IF NOT EXISTS shipping_rates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zone text NOT NULL,
  cities text[] NOT NULL DEFAULT '{}',
  rate_per_kg numeric NOT NULL DEFAULT 0,
  min_charge numeric NOT NULL DEFAULT 0,
  provider text NOT NULL DEFAULT 'India Post',
  created_at timestamptz DEFAULT now()
);

-- 1. Add shipping_provider column to inquiries (for agent order form)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS shipping_provider text DEFAULT 'India Post';

-- 2. Add shipping_providers to company_settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS shipping_providers text[] DEFAULT ARRAY['India Post', 'VRL Logistics'];

-- 3. Add weight_kg to products if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg numeric DEFAULT 1.0;

-- 4. VRL Logistics shipping rates
INSERT INTO shipping_rates (zone, cities, rate_per_kg, min_charge, provider)
VALUES
  ('VRL Local — Karnataka',
   ARRAY['Koppa','Chikmagalur','Shimoga','Shivamogga','Hassan','Mysuru','Mysore','Bangalore','Bengaluru','Mangalore','Udupi','Hubli','Dharwad','Tumkur','Mandya','Belagavi','Belgaum','Kadur','Mudigere'],
   35, 150, 'VRL Logistics'),
  ('VRL Zone 2 — South India',
   ARRAY['Chennai','Hyderabad','Coimbatore','Kochi','Thiruvananthapuram','Madurai','Vijayawada'],
   50, 250, 'VRL Logistics'),
  ('VRL Zone 3 — All India',
   ARRAY['Mumbai','Pune','Delhi','Kolkata','Ahmedabad','Jaipur','Lucknow','Bhopal','Nagpur'],
   70, 350, 'VRL Logistics')
ON CONFLICT DO NOTHING;

-- 5. India Post rates (if not already present)
INSERT INTO shipping_rates (zone, cities, rate_per_kg, min_charge, provider)
VALUES
  ('India Post — Karnataka',
   ARRAY['Koppa','Chikmagalur','Shimoga','Shivamogga','Hassan','Mysuru','Mysore','Bangalore','Bengaluru','Mangalore','Udupi','Hubli','Dharwad','Tumkur','Mandya','Belagavi','Belgaum','Kadur','Mudigere'],
   20, 80, 'India Post'),
  ('India Post — South India',
   ARRAY['Chennai','Hyderabad','Coimbatore','Kochi','Thiruvananthapuram','Madurai','Vijayawada'],
   30, 120, 'India Post'),
  ('India Post — All India',
   ARRAY['Mumbai','Pune','Delhi','Kolkata','Ahmedabad','Jaipur','Lucknow','Bhopal','Nagpur'],
   40, 150, 'India Post')
ON CONFLICT DO NOTHING;

-- 6. Update product weights (SGB website data)
UPDATE products SET weight_kg = 5.5 WHERE product_name LIKE '%BC-520%';
UPDATE products SET weight_kg = 4.5 WHERE product_name LIKE '%G45L%';
UPDATE products SET weight_kg = 3.2 WHERE product_name LIKE '%Cycle Weeder%';
UPDATE products SET weight_kg = 2.8 WHERE product_name LIKE '%Brush Cutter Trolley%';
UPDATE products SET weight_kg = 8.5 WHERE product_name LIKE '%Wheel Barrow%';
UPDATE products SET weight_kg = 15.0 WHERE product_name LIKE '%Carry Cart%';
