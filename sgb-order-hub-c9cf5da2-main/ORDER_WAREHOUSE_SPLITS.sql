-- Create order_warehouse_splits table for split fulfillment
CREATE TABLE IF NOT EXISTS order_warehouse_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id),
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookup by order
CREATE INDEX IF NOT EXISTS idx_ows_order_id ON order_warehouse_splits(order_id);
CREATE INDEX IF NOT EXISTS idx_ows_warehouse_id ON order_warehouse_splits(warehouse_id);

-- RLS
ALTER TABLE order_warehouse_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON order_warehouse_splits
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
