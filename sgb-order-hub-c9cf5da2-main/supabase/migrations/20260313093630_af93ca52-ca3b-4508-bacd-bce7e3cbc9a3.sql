
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'billing', 'packing', 'shipping');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'billed', 'ready_for_packing', 'packed', 'ready_for_shipping', 'shipped')),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partial')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Billing can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'billing') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authorized roles can update orders" ON public.orders FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'billing') OR 
  public.has_role(auth.uid(), 'packing') OR 
  public.has_role(auth.uid(), 'shipping')
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view order items" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Billing can create order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'billing') OR public.has_role(auth.uid(), 'admin'));

-- Packing table
CREATE TABLE public.packing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL UNIQUE,
  packing_status TEXT NOT NULL DEFAULT 'pending' CHECK (packing_status IN ('pending', 'packed')),
  packed_by UUID REFERENCES auth.users(id),
  packed_at TIMESTAMPTZ
);

ALTER TABLE public.packing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view packing" ON public.packing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Packing can manage packing" ON public.packing FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'packing') OR public.has_role(auth.uid(), 'admin'));

-- Shipping table
CREATE TABLE public.shipping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL UNIQUE,
  shipping_provider TEXT CHECK (shipping_provider IN ('Sugama Transport', 'VRL Logistics', 'Indian Post')),
  tracking_id TEXT,
  shipping_status TEXT NOT NULL DEFAULT 'pending' CHECK (shipping_status IN ('pending', 'shipped')),
  shipped_by UUID REFERENCES auth.users(id),
  shipped_at TIMESTAMPTZ
);

ALTER TABLE public.shipping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view shipping" ON public.shipping FOR SELECT TO authenticated USING (true);
CREATE POLICY "Shipping can manage shipping" ON public.shipping FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'shipping') OR public.has_role(auth.uid(), 'admin'));

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view transactions" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Billing can create transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'billing') OR public.has_role(auth.uid(), 'admin'));

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
