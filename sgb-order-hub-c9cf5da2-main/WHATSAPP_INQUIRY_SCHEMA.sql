-- WhatsApp Inquiry System Schema
-- This table stores customer inquiries extracted from WhatsApp messages

CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  product_name TEXT,
  quantity INTEGER,
  delivery_city TEXT,
  raw_message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'rejected')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted_order_id UUID REFERENCES orders(id)
);

-- Enable RLS
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all inquiries
CREATE POLICY "Users can view inquiries"
  ON inquiries
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admin can insert inquiries
CREATE POLICY "Admin can insert inquiries"
  ON inquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Admin and billing can update inquiries
CREATE POLICY "Admin and billing can update inquiries"
  ON inquiries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'billing')
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inquiries_timestamp
  BEFORE UPDATE ON inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_inquiries_updated_at();
