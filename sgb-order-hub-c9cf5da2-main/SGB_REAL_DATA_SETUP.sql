-- ============================================================
-- SGB Agro Industries — Real Data Setup
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- PART 2: Replace demo products with real SGB products
-- -------------------------------------------------------
DELETE FROM order_items WHERE product_id IN (SELECT id FROM products);
DELETE FROM products;

INSERT INTO products (product_name, description, category, price, stock, low_stock_threshold) VALUES
('Brush Cutter (Petrol)',
 'High-performance petrol brush cutter for clearing dense vegetation, weeds, and small shrubs. Ideal for farm boundaries and fields. 52cc engine, anti-vibration handle, 2-in-1 blade and nylon head.',
 'Cutting Equipment', 18500, 25, 5),

('Brush Cutter (Electric)',
 'Eco-friendly electric brush cutter suitable for small to medium farms. Low maintenance and zero emissions. 1800W motor, lightweight 4.2kg, telescopic shaft.',
 'Cutting Equipment', 12500, 20, 5),

('Power Weeder (4-stroke)',
 '4-stroke power weeder for efficient inter-crop cultivation. Reduces weeding time by 80% vs manual. 5.5HP Honda engine, adjustable tilling width 300-500mm, forward and reverse gear.',
 'Weeding Equipment', 32000, 15, 3),

('Power Weeder (2-stroke)',
 'Lightweight 2-stroke power weeder for small farms and vegetable gardens. Easy to maneuver in narrow rows. 2.5HP engine, weight only 18kg.',
 'Weeding Equipment', 22000, 20, 5),

('Agriculture Robot — Weeding Bot',
 'AI-powered autonomous weeding robot. Navigates between crop rows automatically and removes weeds without human intervention. Autonomous navigation, AI weed detection, 4-hour battery, 1 acre/day.',
 'Agriculture Robots', 185000, 5, 2),

('Agriculture Robot — Spraying Bot',
 'Automated crop spraying robot with precision nozzles. Reduces chemical usage by 40% with targeted spraying. 20L tank, GPS precision, 2 acres/hour.',
 'Agriculture Robots', 225000, 3, 1),

('Paddy Cutter (Reaper)',
 'Self-propelled paddy reaper for fast and efficient rice harvesting. Cuts and lays paddy in neat rows. 5HP engine, 1.2m cutting width, 0.5 acre/hour.',
 'Harvesting Equipment', 95000, 8, 2),

('Maize Sheller (Electric)',
 'High-capacity electric maize sheller. Shells 500kg of maize per hour with minimal grain damage. 2HP motor, 95% shelling efficiency.',
 'Processing Equipment', 28000, 12, 3),

('Mini Tiller (Rotavator)',
 'Compact rotary tiller for small farms and gardens. Prepares seedbed quickly with uniform soil breaking. 7HP diesel engine, 900mm tilling width.',
 'Tillage Equipment', 45000, 10, 3),

('Knapsack Power Sprayer',
 'Battery-powered knapsack sprayer for pesticide and fertilizer application. 16L tank, 12V rechargeable battery, 6-8 hours per charge, adjustable nozzle.',
 'Spraying Equipment', 8500, 30, 8),

('Coconut Tree Climber Machine',
 'Motorized coconut tree climbing machine. Reduces climbing risk and effort for coconut harvesting. Fits trees 30-90cm diameter, motorized belt drive, safety harness included.',
 'Specialty Equipment', 15000, 15, 4),

('Paddy Transplanter (Manual)',
 'Manual paddy transplanter for uniform seedling placement. Reduces transplanting time by 60%. 8 rows per pass, adjustable row spacing, lightweight 12kg.',
 'Planting Equipment', 12000, 18, 5);


-- PART 7: Add real SGB warehouse
-- -------------------------------------------------------
INSERT INTO warehouses (name, address, city, state, pincode, capacity, status)
VALUES (
  'SGB Main Warehouse — Koppa',
  'Opposite Municipal Ground, Near JMJ Talkies, Koppa',
  'Koppa',
  'Karnataka',
  '577126',
  500,
  'active'
) ON CONFLICT DO NOTHING;


-- PART 8: Add real territory zones
-- -------------------------------------------------------
INSERT INTO territory_zones (zone_name, cities) VALUES
('Karnataka Zone 1 — Malnad',
 ARRAY['Koppa', 'Chikmagalur', 'Shimoga', 'Hassan', 'Kadur', 'Mudigere', 'Sringeri', 'Thirthahalli']),

('Karnataka Zone 2 — Mysuru Region',
 ARRAY['Mysuru', 'Mysore', 'Mandya', 'Chamarajanagar', 'Kodagu', 'Madikeri', 'Hunsur']),

('Karnataka Zone 3 — Bangalore Region',
 ARRAY['Bangalore', 'Bengaluru', 'Tumkur', 'Kolar', 'Ramanagara', 'Chikkaballapur']),

('Karnataka Zone 4 — North Karnataka',
 ARRAY['Hubli', 'Dharwad', 'Belagavi', 'Belgaum', 'Gadag', 'Haveri', 'Sirsi', 'Uttara Kannada']),

('Kerala Border Zone',
 ARRAY['Mangalore', 'Udupi', 'Kasaragod', 'Kannur', 'Kozhikode'])

ON CONFLICT DO NOTHING;
