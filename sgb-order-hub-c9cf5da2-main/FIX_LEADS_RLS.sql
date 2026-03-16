-- Fix RLS for inquiries table
-- Run this in Supabase SQL Editor

-- Drop all existing policies on inquiries to start clean
DROP POLICY IF EXISTS "Agents can read assigned leads" ON public.inquiries;
DROP POLICY IF EXISTS "Agents can update assigned leads" ON public.inquiries;
DROP POLICY IF EXISTS "Agents can insert leads" ON public.inquiries;
DROP POLICY IF EXISTS "Users can read own inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Users can insert inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Users can update own inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.inquiries;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.inquiries;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.inquiries;

-- Admin: full access to everything
CREATE POLICY "Admin full access"
  ON public.inquiries FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Agents: read leads assigned to them
CREATE POLICY "Agent read assigned leads"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

-- Agents: update their own assigned leads (call status, submit order)
CREATE POLICY "Agent update assigned leads"
  ON public.inquiries FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Agents: insert new leads (simulate button)
CREATE POLICY "Agent insert leads"
  ON public.inquiries FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'billing'))
  );

-- Also manually reassign the Ramesh Kumar lead to Kohli
-- First find Kohli's user_id, then update:
-- UPDATE public.inquiries 
-- SET assigned_to = '<kohli_user_id>', status = 'assigned'
-- WHERE customer_name = 'Ramesh Kumar';
