import { useMemo } from 'react';

interface Order {
  id: string;
  customer_name: string;
  phone: string;
  [key: string]: any;
}

interface SearchableOrder extends Order {
  tracking_id?: string;
}

export const useOrderSearch = (orders: SearchableOrder[] | undefined, searchQuery: string) => {
  return useMemo(() => {
    if (!orders || !searchQuery.trim()) {
      return orders || [];
    }

    const query = searchQuery.toLowerCase().trim();

    return orders.filter((order) => {
      // Search by Order ID (first 8 characters)
      const shortOrderId = order.id.substring(0, 8).toLowerCase();
      if (shortOrderId.includes(query)) return true;

      // Search by full Order ID
      if (order.id.toLowerCase().includes(query)) return true;

      // Search by Customer Name
      if (order.customer_name.toLowerCase().includes(query)) return true;

      // Search by Phone
      if (order.phone.includes(query)) return true;

      // Search by Tracking ID (if available)
      if (order.tracking_id && order.tracking_id.toLowerCase().includes(query)) return true;

      return false;
    });
  }, [orders, searchQuery]);
};
