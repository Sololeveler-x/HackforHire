-- =====================================================
-- CREATE WAREHOUSES TABLE AND INSERT DATA
-- =====================================================
-- Run this SQL in Supabase SQL Editor

-- 1. Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_name TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
CREATE POLICY "Allow read access to warehouses" ON warehouses FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to manage warehouses" ON warehouses FOR ALL USING (auth.role() = 'authenticated');

-- 4. Insert warehouses
INSERT INTO warehouses (warehouse_name, city, latitude, longitude, capacity) VALUES
('Koppa Warehouse', 'Koppa', 13.5300, 75.3600, 5000),
('Bangalore Fulfillment Center', 'Bangalore', 12.9716, 77.5946, 10000),
('Mangalore Logistics Hub', 'Mangalore', 12.9141, 74.8560, 7000),
('Hubli Distribution Hub', 'Hubli', 15.3647, 75.1240, 6000),
('Mysore Delivery Center', 'Mysore', 12.2958, 76.6394, 4000),
('Shivamogga Distribution Center', 'Shivamogga', 13.9299, 75.5681, 5000)
ON CONFLICT (warehouse_name) DO NOTHING;

-- 5. Verify insertion
SELECT 
  warehouse_name,
  city,
  latitude,
  longitude,
  capacity,
  is_active
FROM warehouses
ORDER BY city;
