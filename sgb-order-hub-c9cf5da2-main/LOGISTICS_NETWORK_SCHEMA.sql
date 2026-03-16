-- =====================================================
-- ADVANCED LOGISTICS NETWORK AND SHIPMENT TRACKING
-- =====================================================

-- 1. WAREHOUSES TABLE
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_name TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WAREHOUSE INVENTORY TABLE (Per-warehouse stock)
CREATE TABLE IF NOT EXISTS warehouse_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER GENERATED ALWAYS AS (stock_quantity - reserved_quantity) STORED,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);

-- 3. LOGISTICS NODES TABLE
CREATE TABLE IF NOT EXISTS logistics_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_name TEXT NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('warehouse', 'transit_hub', 'sorting_center', 'delivery_center')),
  city TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. LOGISTICS ROUTES TABLE (Network connections)
CREATE TABLE IF NOT EXISTS logistics_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID NOT NULL REFERENCES logistics_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES logistics_nodes(id) ON DELETE CASCADE,
  distance_km DECIMAL(10, 2),
  estimated_hours DECIMAL(5, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_node_id, to_node_id)
);

-- 5. SHIPMENT TRACKING TABLE
CREATE TABLE IF NOT EXISTS shipment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipping(id) ON DELETE CASCADE,
  current_node_id UUID REFERENCES logistics_nodes(id),
  status TEXT NOT NULL CHECK (status IN (
    'order_created', 'packed', 'dispatched_from_warehouse',
    'arrived_at_hub', 'in_transit', 'out_for_delivery', 'delivered'
  )),
  location_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SHIPMENT ROUTES TABLE (Planned route for each shipment)
CREATE TABLE IF NOT EXISTS shipment_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipping(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES logistics_nodes(id),
  sequence_order INTEGER NOT NULL,
  estimated_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reached', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_routes ENABLE ROW LEVEL SECURITY;

ALTER TABLE shipment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_routes ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow authenticated users to read, admin to write)
CREATE POLICY "Allow read access to warehouses" ON warehouses FOR SELECT USING (true);
CREATE POLICY "Allow admin to manage warehouses" ON warehouses FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow read access to warehouse_inventory" ON warehouse_inventory FOR SELECT USING (true);
CREATE POLICY "Allow admin to manage warehouse_inventory" ON warehouse_inventory FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow read access to logistics_nodes" ON logistics_nodes FOR SELECT USING (true);
CREATE POLICY "Allow admin to manage logistics_nodes" ON logistics_nodes FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow read access to logistics_routes" ON logistics_routes FOR SELECT USING (true);
CREATE POLICY "Allow admin to manage logistics_routes" ON logistics_routes FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow public read access to shipment_tracking" ON shipment_tracking FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to manage shipment_tracking" ON shipment_tracking FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow public read access to shipment_routes" ON shipment_routes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to manage shipment_routes" ON shipment_routes FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- DEMO DATA: Karnataka Logistics Network
-- =====================================================

-- Insert Logistics Nodes
INSERT INTO logistics_nodes (node_name, node_type, city, latitude, longitude) VALUES
('Koppa Main Warehouse', 'warehouse', 'Koppa', 13.5449, 75.3547),
('Bangalore Central Hub', 'transit_hub', 'Bangalore', 12.9716, 77.5946),
('Mangalore Sorting Center', 'sorting_center', 'Mangalore', 12.9141, 74.8560),
('Hubli Transit Hub', 'transit_hub', 'Hubli', 15.3647, 75.1240),
('Mysore Delivery Center', 'delivery_center', 'Mysore', 12.2958, 76.6394),
('Shivamogga Delivery Center', 'delivery_center', 'Shivamogga', 13.9299, 75.5681),
('Udupi Delivery Center', 'delivery_center', 'Udupi', 13.3409, 74.7421),
('Belgaum Delivery Center', 'delivery_center', 'Belgaum', 15.8497, 74.4977);

-- Insert Logistics Routes (Network connections)
INSERT INTO logistics_routes (from_node_id, to_node_id, distance_km, estimated_hours)
SELECT 
  (SELECT id FROM logistics_nodes WHERE node_name = 'Koppa Main Warehouse'),
  (SELECT id FROM logistics_nodes WHERE node_name = 'Bangalore Central Hub'),
  280, 6
UNION ALL SELECT
  (SELECT id FROM logistics_nodes WHERE node_name = 'Koppa Main Warehouse'),
  (SELECT id FROM logistics_nodes WHERE node_name = 'Mangalore Sorting Center'),
  120, 3
UNION ALL SELECT
  (SELECT id FROM logistics_nodes WHERE node_name = 'Bangalore Central Hub'),
  (SELECT id FROM logistics_nodes WHERE node_name = 'Mysore Delivery Center'),
  145, 3
UNION ALL SELECT
  (SELECT id FROM logistics_nodes WHERE node_name = 'Bangalore Central Hub'),
  (SELECT id FROM logistics_nodes WHERE node_name = 'Hubli Transit Hub'),
  410, 8
UNION ALL SELECT
  (SELECT id FROM logistics_nodes WHERE node_name = 'Mangalore Sorting Center'),
  (SELECT id FROM logistics_nodes WHERE node_name = 'Udupi Delivery Center'),
  60, 1.5
UNION ALL SELECT
  (SELECT id FROM logistics_nodes WHERE node_name = 'Hubli Transit Hub'),
  (SELECT id FROM logistics_nodes WHERE node_name = 'Belgaum Delivery Center'),
  100, 2
UNION ALL SELECT
  (SELECT id FROM logistics_nodes WHERE node_name = 'Bangalore Central Hub'),
  (SELECT id FROM logistics_nodes WHERE node_name = 'Shivamogga Delivery Center'),
  270, 5.5;

-- Insert Demo Warehouse
INSERT INTO warehouses (warehouse_name, city, latitude, longitude, capacity) VALUES
('Koppa Main Warehouse', 'Koppa', 13.5449, 75.3547, 5000),
('Bangalore Fulfillment Center', 'Bangalore', 12.9716, 77.5946, 10000);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_warehouse_inventory_product ON warehouse_inventory(product_id);
CREATE INDEX idx_warehouse_inventory_warehouse ON warehouse_inventory(warehouse_id);
CREATE INDEX idx_shipment_tracking_shipment ON shipment_tracking(shipment_id);
CREATE INDEX idx_shipment_routes_shipment ON shipment_routes(shipment_id);
CREATE INDEX idx_logistics_routes_from ON logistics_routes(from_node_id);
CREATE INDEX idx_logistics_routes_to ON logistics_routes(to_node_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get nearest warehouse with stock
CREATE OR REPLACE FUNCTION get_nearest_warehouse_with_stock(
  p_product_id UUID,
  p_customer_city TEXT,
  p_quantity INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_warehouse_id UUID;
BEGIN
  -- For demo, return first warehouse with available stock
  SELECT wi.warehouse_id INTO v_warehouse_id
  FROM warehouse_inventory wi
  WHERE wi.product_id = p_product_id
    AND wi.available_quantity >= p_quantity
  LIMIT 1;
  
  RETURN v_warehouse_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate shipment route
CREATE OR REPLACE FUNCTION generate_shipment_route(
  p_shipment_id UUID,
  p_warehouse_id UUID,
  p_destination_city TEXT
)
RETURNS VOID AS $$
DECLARE
  v_sequence INTEGER := 1;
  v_warehouse_node_id UUID;
  v_hub_node_id UUID;
  v_delivery_node_id UUID;
BEGIN
  -- Get warehouse node
  SELECT ln.id INTO v_warehouse_node_id
  FROM logistics_nodes ln
  JOIN warehouses w ON w.city = ln.city AND ln.node_type = 'warehouse'
  WHERE w.id = p_warehouse_id
  LIMIT 1;
  
  -- Get main hub (Bangalore)
  SELECT id INTO v_hub_node_id
  FROM logistics_nodes
  WHERE node_type = 'transit_hub' AND city = 'Bangalore'
  LIMIT 1;
  
  -- Get delivery center for destination city
  SELECT id INTO v_delivery_node_id
  FROM logistics_nodes
  WHERE node_type = 'delivery_center' AND city ILIKE '%' || p_destination_city || '%'
  LIMIT 1;
  
  -- Insert route nodes
  IF v_warehouse_node_id IS NOT NULL THEN
    INSERT INTO shipment_routes (shipment_id, node_id, sequence_order, estimated_arrival)
    VALUES (p_shipment_id, v_warehouse_node_id, v_sequence, NOW() + INTERVAL '1 hour');
    v_sequence := v_sequence + 1;
  END IF;
  
  IF v_hub_node_id IS NOT NULL THEN
    INSERT INTO shipment_routes (shipment_id, node_id, sequence_order, estimated_arrival)
    VALUES (p_shipment_id, v_hub_node_id, v_sequence, NOW() + INTERVAL '12 hours');
    v_sequence := v_sequence + 1;
  END IF;
  
  IF v_delivery_node_id IS NOT NULL THEN
    INSERT INTO shipment_routes (shipment_id, node_id, sequence_order, estimated_arrival)
    VALUES (p_shipment_id, v_delivery_node_id, v_sequence, NOW() + INTERVAL '24 hours');
  END IF;
END;
$$ LANGUAGE plpgsql;
