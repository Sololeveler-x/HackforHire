-- ============================================
-- SGB Order Hub - COMPLETE Database Setup
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP EXISTING TABLES (if re-running)
-- ============================================
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS shipping CASCADE;
DROP TABLE IF EXISTS packing CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop existing type
DROP TYPE IF EXISTS app_role CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS has_role(UUID, app_role);

-- ============================================
-- CREATE ENUM TYPE
-- ============================================
CREATE TYPE app_role AS ENUM ('admin', 'billing', 'packing', 'shipping');

-- ============================================
-- CREATE TABLES
-- ============================================

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role app_role NOT NULL
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  order_status TEXT DEFAULT 'ready_for_packing',
  payment_status TEXT DEFAULT 'unpaid',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL
);

-- Packing table
CREATE TABLE packing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE NOT NULL,
  packing_status TEXT DEFAULT 'pending',
  packed_by UUID REFERENCES auth.users(id),
  packed_at TIMESTAMPTZ
);

-- Shipping table
CREATE TABLE shipping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE NOT NULL,
  shipping_provider TEXT,
  tracking_id TEXT,
  shipping_status TEXT DEFAULT 'pending',
  shipped_by UUID REFERENCES auth.users(id),
  shipped_at TIMESTAMPTZ
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  payment_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREATE FUNCTIONS
-- ============================================

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(_user_id UUID)
RETURNS app_role AS $$
  SELECT role FROM user_roles WHERE user_id = _user_id;
$$ LANGUAGE SQL STABLE;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role);
$$ LANGUAGE SQL STABLE;

-- ============================================
-- INSERT SAMPLE PRODUCTS
-- ============================================

INSERT INTO products (product_name, category, price, description, stock) VALUES
('Brush Cutter BC-520', 'Brush Cutters', 8500.00, 'Professional 52cc brush cutter with metal blade', 25),
('Brush Cutter BC-430', 'Brush Cutters', 7200.00, '43cc brush cutter ideal for medium gardens', 30),
('Garden Pruning Shears', 'Garden Tools', 450.00, 'Heavy-duty pruning shears with ergonomic grip', 100),
('Garden Rake', 'Garden Tools', 320.00, 'Steel garden rake for soil leveling', 80),
('Manual Sprayer 16L', 'Sprayers', 1200.00, '16 liter manual knapsack sprayer', 40),
('Power Sprayer PS-768', 'Sprayers', 5500.00, 'Petrol-powered sprayer for large farms', 15),
('Mini Tiller MT-200', 'Tillers', 12000.00, 'Compact tiller for small to medium gardens', 10),
('Heavy Duty Tiller', 'Tillers', 18500.00, 'Professional tiller with 6HP engine', 8),
('Chainsaw CS-5200', 'Chainsaws', 9800.00, '52cc chainsaw with 20-inch bar', 12),
('Electric Chainsaw', 'Chainsaws', 6500.00, '2000W electric chainsaw for home use', 20),
('Lawn Mower LM-400', 'Lawn Equipment', 8900.00, 'Self-propelled lawn mower', 18),
('Grass Trimmer GT-260', 'Lawn Equipment', 3200.00, 'Electric grass trimmer', 35),
('Hedge Trimmer', 'Garden Tools', 2800.00, 'Electric hedge trimmer 550W', 25),
('Garden Hoe', 'Garden Tools', 280.00, 'Traditional garden hoe', 90),
('Watering Can 10L', 'Garden Tools', 180.00, 'Plastic watering can', 120),
('Garden Gloves', 'Garden Tools', 120.00, 'Protective garden gloves', 200),
('Wheelbarrow', 'Garden Tools', 1800.00, 'Heavy-duty wheelbarrow 100kg capacity', 30),
('Spade', 'Garden Tools', 380.00, 'Steel spade with wooden handle', 75),
('Garden Fork', 'Garden Tools', 420.00, 'Four-prong garden fork', 60),
('Secateurs', 'Garden Tools', 350.00, 'Professional secateurs', 85);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (if re-running)
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;

DROP POLICY IF EXISTS "Users can view orders" ON orders;
DROP POLICY IF EXISTS "Billing can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders" ON orders;

DROP POLICY IF EXISTS "Users can view order items" ON order_items;
DROP POLICY IF EXISTS "Billing can create order items" ON order_items;

DROP POLICY IF EXISTS "Users can view packing" ON packing;
DROP POLICY IF EXISTS "Packing can manage packing" ON packing;

DROP POLICY IF EXISTS "Users can view shipping" ON shipping;
DROP POLICY IF EXISTS "Shipping can manage shipping" ON shipping;

DROP POLICY IF EXISTS "Users can view transactions" ON transactions;
DROP POLICY IF EXISTS "Billing can create transactions" ON transactions;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Profiles policies
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- User roles policies - CRITICAL FIX
CREATE POLICY "Users can view own role" 
  ON user_roles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role" 
  ON user_roles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
  ON user_roles FOR SELECT 
  USING (has_role(auth.uid(), 'admin'));

-- Products policies
CREATE POLICY "Anyone can view products" 
  ON products FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage products" 
  ON products FOR ALL 
  USING (has_role(auth.uid(), 'admin'));

-- Orders policies
CREATE POLICY "Users can view orders" 
  ON orders FOR SELECT 
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'billing') OR 
    has_role(auth.uid(), 'packing') OR 
    has_role(auth.uid(), 'shipping')
  );

CREATE POLICY "Billing can create orders" 
  ON orders FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'billing') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update orders" 
  ON orders FOR UPDATE 
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'billing') OR 
    has_role(auth.uid(), 'packing') OR 
    has_role(auth.uid(), 'shipping')
  );

-- Order items policies
CREATE POLICY "Users can view order items" 
  ON order_items FOR SELECT 
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'billing') OR 
    has_role(auth.uid(), 'packing') OR 
    has_role(auth.uid(), 'shipping')
  );

CREATE POLICY "Billing can create order items" 
  ON order_items FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'billing') OR has_role(auth.uid(), 'admin'));

-- Packing policies
CREATE POLICY "Users can view packing" 
  ON packing FOR SELECT 
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'packing') OR 
    has_role(auth.uid(), 'shipping')
  );

CREATE POLICY "Packing can manage packing" 
  ON packing FOR ALL 
  USING (has_role(auth.uid(), 'packing') OR has_role(auth.uid(), 'admin'));

-- Shipping policies
CREATE POLICY "Users can view shipping" 
  ON shipping FOR SELECT 
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'shipping')
  );

CREATE POLICY "Shipping can manage shipping" 
  ON shipping FOR ALL 
  USING (has_role(auth.uid(), 'shipping') OR has_role(auth.uid(), 'admin'));

-- Transactions policies
CREATE POLICY "Users can view transactions" 
  ON transactions FOR SELECT 
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'billing')
  );

CREATE POLICY "Billing can create transactions" 
  ON transactions FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'billing') OR has_role(auth.uid(), 'admin'));

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_packing_order_id ON packing(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_order_id ON shipping(order_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if products were inserted
SELECT COUNT(*) as product_count FROM products;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database setup completed successfully!';
  RAISE NOTICE '✅ Created 8 tables';
  RAISE NOTICE '✅ Inserted 20 sample products';
  RAISE NOTICE '✅ Enabled Row Level Security';
  RAISE NOTICE '✅ Created all policies';
  RAISE NOTICE '✅ Created indexes';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 You can now register users and start using the application!';
END $$;
