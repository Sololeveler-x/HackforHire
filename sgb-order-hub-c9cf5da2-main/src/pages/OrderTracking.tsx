import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, MapPin, Navigation, Calendar, AlertCircle, CheckCircle, Truck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const statusColors: Record<string, string> = {
  'Order Placed': 'bg-gray-100 text-gray-600',
  'Packed': 'bg-blue-100 text-blue-700',
  'Shipped': 'bg-purple-100 text-purple-700',
  'In Transit': 'bg-amber-100 text-amber-700',
  'Reached Destination City': 'bg-orange-100 text-orange-700',
  'Out for Delivery': 'bg-green-100 text-green-700',
  'Delivered': 'bg-green-100 text-green-700',
};

function TrackingTimeline({ journey }: { journey: { status: string; location: string; description: string; timestamp: string | null }[] }) {
  return (
    <div className="relative">
      {journey.map((update, index) => {
        const isFirst = index === 0;
        const isLast = index === journey.length - 1;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="flex items-start gap-4 mb-0 last:mb-0"
          >
            {/* Timeline line + dot */}
            <div className="relative flex flex-col items-center">
              <div className={`h-4 w-4 rounded-full border-2 z-10 mt-1 shrink-0 ${isFirst ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`} />
              {!isLast && <div className="w-0.5 bg-gray-200 flex-1 min-h-[40px]" />}
            </div>
            {/* Content */}
            <div className={`pb-6 flex-1 ${isLast ? 'pb-0' : ''}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[update.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {update.status}
                  </span>
                  <p className={`mt-1.5 text-sm ${isFirst ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{update.description}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <MapPin className="h-3 w-3" /><span>{update.location}</span>
                  </div>
                </div>
                {update.timestamp && (
                  <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(update.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

const OrderTracking = () => {
  const { trackingId } = useParams<{ trackingId: string }>();

  const { data: trackingData, isLoading, error } = useQuery({
    queryKey: ['tracking', trackingId],
    queryFn: async () => {
      const { data: shipping, error: shippingError } = await supabase
        .from('shipping').select('*').eq('tracking_id', trackingId).single();
      if (shippingError) throw shippingError;
      if (!shipping) throw new Error('Tracking ID not found');

      const { data: order } = await supabase
        .from('orders').select('*').eq('id', shipping.order_id).single();
      const { data: orderItems } = await supabase
        .from('order_items').select('*').eq('order_id', shipping.order_id);
      const { data: packing } = await supabase
        .from('packing').select('*').eq('order_id', shipping.order_id).single();

      return { ...shipping, order: { ...order, order_items: orderItems || [] }, packing: packing ? [packing] : [] };
    },
    enabled: !!trackingId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Package className="h-6 w-6 text-green-600 animate-pulse" />
          </div>
          <p className="text-gray-500 text-sm">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (error || !trackingData) {
    return <DemoTrackingView trackingId={trackingId!} />;
  }

  return <RealTrackingView trackingData={trackingData} trackingId={trackingId!} />;
};


const DemoTrackingView = ({ trackingId }: { trackingId: string }) => {
  const mockJourney = [
    { status: 'Out for Delivery', location: 'Hubli Local Delivery Hub', description: 'Your order is out for delivery and will reach you today', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
    { status: 'Reached Destination City', location: 'Hubli Main Hub', description: 'Package has arrived at destination city', timestamp: new Date(Date.now() - 8 * 3600000).toISOString() },
    { status: 'In Transit', location: 'Bangalore-Hubli Highway', description: 'Your order is on the way to destination', timestamp: new Date(Date.now() - 86400000).toISOString() },
    { status: 'Shipped', location: 'Koppa Warehouse', description: 'Your order has been shipped via VRL Logistics', timestamp: new Date(Date.now() - 2 * 86400000).toISOString() },
    { status: 'Packed', location: 'Koppa Warehouse', description: 'Your order has been packed and ready for dispatch', timestamp: new Date(Date.now() - 2.5 * 86400000).toISOString() },
    { status: 'Order Placed', location: 'SGB Agro Industries', description: 'Your order has been placed successfully', timestamp: new Date(Date.now() - 3 * 86400000).toISOString() },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm text-gray-500 shadow-sm mb-3">
            <Package className="h-4 w-4" /> Tracking ID: <span className="font-mono font-semibold text-gray-800">{trackingId}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
          <p className="text-sm text-gray-500">SGB Agro Industries</p>
        </motion.div>

        {/* Demo notice */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Demo tracking view — shipment movement is simulated for demonstration purposes.</span>
        </motion.div>

        {/* Status card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <Navigation className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Out for Delivery</span>
              <h3 className="font-semibold text-gray-900 mt-1.5">Your order is out for delivery and will reach you today</h3>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                <MapPin className="h-3.5 w-3.5" /><span>Hubli Local Delivery Hub</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                <Calendar className="h-3.5 w-3.5" /><span>Expected delivery: Today within 4 hours</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-green-600" /> Shipment Journey
          </h3>
          <TrackingTimeline journey={mockJourney} />
        </motion.div>

        <div className="text-center">
          <Link to="/"><Button variant="outline" className="rounded-full">← Back to Home</Button></Link>
        </div>
      </div>
    </div>
  );
};


const RealTrackingView = ({ trackingData, trackingId }: { trackingData: any; trackingId: string }) => {
  const order = trackingData.order;
  const city = order?.city || 'Hubli';
  const status = order?.order_status || 'shipped';
  const isDelivered = status === 'delivered';

  const { data: splits } = useQuery({
    queryKey: ['order-splits', order?.id],
    queryFn: async () => {
      if (!order?.is_split_order) return null;
      const { data } = await (supabase as any)
        .from('order_splits')
        .select('*, order_split_items(*, products(product_name))')
        .eq('order_id', order.id)
        .order('split_number');
      return data ?? null;
    },
    enabled: !!order?.is_split_order && !!order?.id,
  });

  const journey = [
    isDelivered && { status: 'Delivered', location: city, description: 'Your order has been delivered successfully', timestamp: trackingData.delivered_at || trackingData.shipped_at },
    { status: 'Shipped', location: 'Koppa Warehouse', description: `Shipped via ${trackingData.shipping_provider || 'Courier'}`, timestamp: trackingData.shipped_at },
    { status: 'Packed', location: 'Koppa Warehouse', description: 'Order packed and ready for dispatch', timestamp: trackingData.packing?.[0]?.packed_at },
    { status: 'Order Placed', location: 'SGB Agro Industries', description: 'Order placed successfully', timestamp: order?.created_at },
  ].filter(Boolean) as any[];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm text-gray-500 shadow-sm mb-3">
            <Package className="h-4 w-4" /> Tracking ID: <span className="font-mono font-semibold text-gray-800">{trackingId}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
          <p className="text-sm text-gray-500">SGB Agro Industries</p>
        </motion.div>

        {/* Status card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${isDelivered ? 'bg-green-100' : 'bg-blue-100'}`}>
              {isDelivered
                ? <CheckCircle className="h-6 w-6 text-green-600" />
                : <Navigation className="h-6 w-6 text-blue-600" />}
            </div>
            <div className="flex-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDelivered ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {status.replace(/_/g, ' ')}
              </span>
              <h3 className="font-semibold text-gray-900 mt-1.5">{order?.customer_name}</h3>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                <MapPin className="h-3.5 w-3.5" /><span>{order?.address}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                <Package className="h-3.5 w-3.5" />
                <span>₹{Number(order?.total_amount || 0).toLocaleString()} • {trackingData.shipping_provider}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Split shipments */}
        {order?.is_split_order && splits && splits.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" /> Your order is arriving in {splits.length} shipments
            </h3>
            <div className="space-y-3">
              {splits.map((split: any, i: number) => (
                <div key={split.id} className="border border-gray-100 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-gray-900">Shipment {i + 1}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{split.status}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {split.order_split_items?.map((item: any) =>
                      `${item.quantity}× ${item.products?.product_name ?? 'Product'}`
                    ).join(', ')}
                  </p>
                  {split.estimated_delivery_date && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Est. delivery: {split.estimated_delivery_date}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Delivery proof */}
        {trackingData.delivery_proof_url && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Delivery Proof</h3>
            <img src={trackingData.delivery_proof_url} alt="Delivery proof" className="rounded-xl max-h-48 object-cover" />
          </motion.div>
        )}

        {/* Timeline */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-green-600" /> Shipment Journey
          </h3>
          <TrackingTimeline journey={journey} />
        </motion.div>

        <div className="text-center">
          <Link to="/"><Button variant="outline" className="rounded-full">← Back to Home</Button></Link>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
