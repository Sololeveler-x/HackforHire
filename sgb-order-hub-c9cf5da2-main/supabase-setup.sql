-- SGB Order Hub Database Setup
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE app_role AS ENUM ('admin', 'billing', 'packing', 'shipping');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role app_role NOT NULL
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
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

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
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

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL
);

-- Create packing table
CREATE TABLE IF NOT EXISTS packing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE NOT NULL,
  packing_status TEXT DEFAULT 'pending',
  packed_by UUID REFERENCES auth.users(id),
  packed_at TIMESTAMPTZ
);

-- Create shipping table
CREATE TABLE IF NOT EXISTS shipping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE NOT NULL,
  shipping_provider TEXT,
  tracking_id TEXT,
  shipping_status TEXT DEFAULT 'pending',
  shipped_by UUID REFERENCES auth.users(id),
  shipped_at TIMESTAMPTZ
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  payment_date TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to get user role
CREATE OR REPLACE FUNCTION get_user_role(_user_id UUID)
RETURNS app_role AS $$
  SELECT role FROM user_roles WHERE user_id = _user_id;
$$ LANGUAGE SQL STABLE;

-- Create function to check if user has role
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role);
$$ LANGUAGE SQL STABLE;

-- Insert sample products (inspired by SGB Agro Industries)
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

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for products
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON products FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Users can view orders" ON orders FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'billing') OR 
  has_role(auth.uid(), 'packing') OR 
  has_role(auth.uid(), 'shipping')
);
CREATE POLICY "Billing can create orders" ON orders FOR INSERT WITH CHECK (has_role(auth.uid(), 'billing') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update orders" ON orders FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'billing') OR 
  has_role(auth.uid(), 'packing') OR 
  has_role(auth.uid(), 'shipping')
);

-- RLS Policies for order_items
CREATE POLICY "Users can view order items" ON order_items FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'billing') OR 
  has_role(auth.uid(), 'packing') OR 
  has_role(auth.uid(), 'shipping')
);
CREATE POLICY "Billing can create order items" ON order_items FOR INSERT WITH CHECK (has_role(auth.uid(), 'billing') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for packing
CREATE POLICY "Users can view packing" ON packing FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'packing') OR 
  has_role(auth.uid(), 'shipping')
);
CREATE POLICY "Packing can manage packing" ON packing FOR ALL USING (has_role(auth.uid(), 'packing') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for shipping
CREATE POLICY "Users can view shipping" ON shipping FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'shipping')
);
CREATE POLICY "Shipping can manage shipping" ON shipping FOR ALL USING (has_role(auth.uid(), 'shipping') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for transactions
CREATE POLICY "Users can view transactions" ON transactions FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'billing')
);
CREATE POLICY "Billing can create transactions" ON transactions FOR INSERT WITH CHECK (has_role(auth.uid(), 'billing') OR has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_packing_order_id ON packing(order_id);
CREATE INDEX idx_shipping_order_id ON shipping(order_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
