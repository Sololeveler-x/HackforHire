import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch all logistics nodes
export const useLogisticsNodes = () => {
  return useQuery({
    queryKey: ['logistics_nodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_nodes')
        .select('*')
        .eq('is_active', true)
        .order('city');
      if (error) throw error;
      return data;
    },
  });
};

// Fetch all logistics routes
export const useLogisticsRoutes = () => {
  return useQuery({
    queryKey: ['logistics_routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_routes')
        .select(`
          *,
          from_node:logistics_nodes!logistics_routes_from_node_id_fkey(*),
          to_node:logistics_nodes!logistics_routes_to_node_id_fkey(*)
        `)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });
};

// Fetch warehouses
export const useWarehouses = () => {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('is_active', true)
        .order('warehouse_name');
      if (error) throw error;
      return data;
    },
  });
};

// Calculate route from warehouse to destination city
export const calculateShipmentRoute = (
  warehouseCity: string,
  destinationCity: string,
  nodes: any[],
  routes: any[]
) => {
  // Find warehouse node
  const warehouseNode = nodes.find(
    n => n.node_type === 'warehouse' && n.city.toLowerCase().includes(warehouseCity.toLowerCase())
  );

  // Find delivery center for destination
  const deliveryNode = nodes.find(
    n => n.node_type === 'delivery_center' && n.city.toLowerCase().includes(destinationCity.toLowerCase())
  );

  // Find main hub (usually Bangalore)
  const mainHub = nodes.find(
    n => n.node_type === 'transit_hub' && n.city.toLowerCase().includes('bangalore')
  );

  // Build route: Warehouse → Main Hub → Delivery Center
  const routeNodes = [];

  if (warehouseNode) {
    routeNodes.push(warehouseNode);
  }

  // Add intermediate hubs if they exist in routes
  if (mainHub && warehouseNode?.id !== mainHub.id) {
    routeNodes.push(mainHub);
  }

  // Add sorting center if exists for destination
  const sortingCenter = nodes.find(
    n => n.node_type === 'sorting_center' && 
    routes.some(r => r.to_node?.city === n.city && r.from_node?.city === mainHub?.city)
  );
  if (sortingCenter && sortingCenter.id !== mainHub?.id) {
    routeNodes.push(sortingCenter);
  }

  if (deliveryNode) {
    routeNodes.push(deliveryNode);
  }

  // If no specific delivery center found, use main hub as final destination
  if (routeNodes.length === 1 && mainHub) {
    routeNodes.push(mainHub);
  }

  return routeNodes;
};

// Get nearest warehouse with stock for a product
export const useNearestWarehouse = (productId: string, customerCity: string) => {
  return useQuery({
    queryKey: ['nearest_warehouse', productId, customerCity],
    queryFn: async () => {
      // For demo, return first warehouse with stock
      const { data, error } = await supabase
        .from('warehouse_inventory')
        .select(`
          *,
          warehouse:warehouses(*)
        `)
        .eq('product_id', productId)
        .gt('available_quantity', 0)
        .limit(1)
        .single();
      
      if (error) throw error;
      return data?.warehouse;
    },
    enabled: !!productId && !!customerCity,
  });
};

// Simulate shipment status based on time elapsed
export const simulateShipmentStatus = (shippedAt: string, routeNodes: any[]) => {
  const shippedTime = new Date(shippedAt).getTime();
  const now = Date.now();
  const hoursElapsed = (now - shippedTime) / (1000 * 60 * 60);

  // Define status progression based on hours
  if (hoursElapsed < 2) {
    return {
      status: 'dispatched_from_warehouse',
      currentNodeIndex: 0,
      message: 'Package has been dispatched from warehouse',
    };
  } else if (hoursElapsed < 12) {
    return {
      status: 'in_transit',
      currentNodeIndex: Math.min(1, routeNodes.length - 1),
      message: 'Package is in transit to destination',
    };
  } else if (hoursElapsed < 24) {
    return {
      status: 'arrived_at_hub',
      currentNodeIndex: Math.min(routeNodes.length - 2, routeNodes.length - 1),
      message: 'Package has arrived at destination hub',
    };
  } else if (hoursElapsed < 36) {
    return {
      status: 'out_for_delivery',
      currentNodeIndex: routeNodes.length - 1,
      message: 'Package is out for delivery',
    };
  } else {
    return {
      status: 'delivered',
      currentNodeIndex: routeNodes.length - 1,
      message: 'Package has been delivered',
    };
  }
};
