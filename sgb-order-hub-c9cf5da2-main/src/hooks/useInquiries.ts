import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Inquiry {
  id: string;
  customer_name: string;
  phone_number: string;
  product_name: string | null;
  quantity: number | null;
  delivery_city: string | null;
  raw_message: string;
  status: 'pending' | 'converted' | 'rejected';
  created_by: string;
  created_at: string;
  updated_at: string;
  converted_order_id: string | null;
}

const db = supabase as any;

export function useInquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInquiries(data || []);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const createInquiry = async (inquiryData: {
    customer_name: string;
    phone_number: string;
    product_name?: string;
    quantity?: number;
    delivery_city?: string;
    raw_message: string;
  }) => {
    try {
      const { data, error } = await db
        .from('inquiries')
        .insert([{ ...inquiryData, created_by: user?.id, status: 'pending' }])
        .select()
        .single();

      if (error) throw error;
      await fetchInquiries();
      return { success: true, data };
    } catch (error) {
      console.error('Error creating inquiry:', error);
      return { success: false, error };
    }
  };

  const updateInquiryStatus = async (id: string, status: 'pending' | 'converted' | 'rejected', orderId?: string) => {
    try {
      const updateData: any = { status };
      if (orderId) updateData.converted_order_id = orderId;

      const { error } = await db.from('inquiries').update(updateData).eq('id', id);
      if (error) throw error;
      await fetchInquiries();
      return { success: true };
    } catch (error) {
      console.error('Error updating inquiry:', error);
      return { success: false, error };
    }
  };

  const deleteInquiry = async (id: string) => {
    try {
      const { error } = await db.from('inquiries').delete().eq('id', id);
      if (error) throw error;
      await fetchInquiries();
      return { success: true };
    } catch (error) {
      console.error('Error deleting inquiry:', error);
      return { success: false, error };
    }
  };

  return { inquiries, loading, createInquiry, updateInquiryStatus, deleteInquiry, refetch: fetchInquiries };
}
