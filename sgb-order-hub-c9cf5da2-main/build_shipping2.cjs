const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, 'src/pages/ShippingDashboard.tsx');

const parts = [];

// PART 1 — imports
parts.push(`import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useOrdersWithTracking, useMarkAsShipped } from '@/hooks/useOrders';
import { useOrderSearch } from '@/hooks/useOrderSearch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Truck, Package, CheckCircle, Copy, MessageCircle, ExternalLink, AlertCircle, DollarSign, Loader2, MapPin, Navigation } from 'lucide-react';
import { generateShipmentWhatsAppMessage, generateWhatsAppUrl, copyToClipboard } from '@/services/whatsapp';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  sendShippedNotification,
  sendOutForDeliveryNotification,
  sendDeliveredNotification,
  sendPaymentReminderBeforeShipping,
  sendInvoiceWhatsApp,
  sendCODReminderNotification,
  InvoiceData,
} from '@/utils/whatsappNotifications';
import { PaymentBadge } from '@/components/PaymentBadge';
import { getCityCoords, haversineDistance, optimizeRoute, RouteStop } from '@/utils/geoUtils';

const db = supabase as any;
const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed'];
`);

// PART 2 — PaymentConfirmModal
parts.push(`
// ── Payment Confirmation Modal ────────────────────────────────────────────────
function PaymentConfirmModal({
  order,
  onClose,
  onProceed,
}: {
  order: any;
  onClose: () => void;
  onProceed: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  const total = Number(order.total_amount ?? 0);
  const paid = Number(order.total_paid ?? 0);
  const remaining = total - paid;
  const method = order.payment_method ?? order.payment_status ?? '';
  const isCOD = method === 'Cash on Delivery' || method === 'cod';
  const isFullyPaid = paid >= total && total > 0;

  const handleSendReminder = async () => {
    setSending(true);
    await sendPaymentReminderBeforeShipping(order.phone, order.customer_name, order.id, remaining, method);
    setSending(false);
    setReminderSent(true);
    toast.success('Payment reminder sent via WhatsApp');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Payment Check — {order.customer_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Order Total</span><span className="font-medium">₹{total.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount Paid</span><span className="font-medium text-green-700">₹{paid.toLocaleString()}</span></div>
            {remaining > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Remaining</span><span className="font-medium text-red-600">₹{remaining.toLocaleString()}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-medium capitalize">{method || '—'}</span></div>
          </div>
          {order.order_items?.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              {order.order_items.map((item: any, i: number) => (
                <div key={i}>{item.quantity}× {item.product_name ?? item.products?.name}</div>
              ))}
            </div>
          )}
          {isFullyPaid && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" /> Payment complete ✅ — ready to ship
            </div>
          )}
          {isCOD && !isFullyPaid && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> ₹{total.toLocaleString()} to be collected on delivery
            </div>
          )}
          {!isCOD && !isFullyPaid && remaining > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> Customer has not paid ₹{remaining.toLocaleString()} remaining
            </div>
          )}
          <div className="flex flex-col gap-2">
            {!isCOD && !isFullyPaid && remaining > 0 && (
              <Button variant="outline" className="w-full gap-2" onClick={handleSendReminder} disabled={sending || reminderSent}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                {reminderSent ? '✅ Reminder Sent' : 'Send Payment Reminder'}
              </Button>
            )}
            <Button className="w-full" onClick={onProceed}>
              {isCOD ? 'Proceed (COD)' : isFullyPaid ? 'Proceed to Ship ✅' : 'Proceed Anyway'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
`);

// PART 3 — ShipOrderModal
parts.push(`
// ── Ship Order Modal ──────────────────────────────────────────────────────────
function ShipOrderModal({
  order,
  onClose,
  onShipped,
}: {
  order: any;
  onClose: () => void;
  onShipped: (provider: string, trackingId: string) => void;
}) {
  const [provider, setProvider] = useState('');
  const [trackingId, setTrackingId] = useState('');

  const handleSubmit = () => {
    if (!provider.trim()) { toast.error('Select a courier provider'); return; }
    if (!trackingId.trim()) { toast.error('Enter tracking ID'); return; }
    onShipped(provider.trim(), trackingId.trim());
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Ship Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Customer: <span className="font-medium">{order.customer_name}</span></p>
          <div className="space-y-1">
            <Label>Courier Provider *</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger><SelectValue placeholder="Select courier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="VRL Logistics">🚛 VRL Logistics</SelectItem>
                <SelectItem value="India Post">📮 India Post</SelectItem>
                <SelectItem value="DTDC">DTDC</SelectItem>
                <SelectItem value="Blue Dart">Blue Dart</SelectItem>
                <SelectItem value="Delhivery">Delhivery</SelectItem>
                <SelectItem value="Ekart">Ekart</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tracking ID *</Label>
            <Input value={trackingId} onChange={e => setTrackingId(e.target.value)} placeholder="e.g. VRL123456789" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={handleSubmit}>Confirm Shipment</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
`);

// PART 4 — RoutePlannerTab (plain Leaflet via useEffect)
parts.push(`
// ── Route Planner Tab ─────────────────────────────────────────────────────────
function RoutePlannerTab({ orders }: { orders: any[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  const stops: RouteStop[] = orders
    .filter(o => o.city)
    .map(o => {
      const coords = getCityCoords(o.city) ?? [15.3647, 75.1240] as [number, number];
      return { id: o.id, name: o.customer_name || 'Customer', city: o.city, lat: coords[0], lng: coords[1], provider: o.shipping_provider ?? null } as RouteStop & { provider: string | null };
    });

  const optimized = optimizeRoute(stops);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;
    // Dynamically load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    import('leaflet').then(L => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      const map = L.map(mapRef.current!).setView([13.5333, 75.3667], 7);
      leafletMapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      if (optimized.length > 1) {
        const latlngs = optimized.map(s => [s.lat, s.lng] as [number, number]);
        L.polyline(latlngs, { color: '#16a34a', weight: 3, dashArray: '6,4' }).addTo(map);
      }

      optimized.forEach((stop: any, i: number) => {
        const icon = L.divIcon({
          html: \`<div style="background:#16a34a;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">\${i + 1}</div>\`,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const providerBadge = (stop as any).provider === 'VRL Logistics' ? '🚛 VRL' : '📮 India Post';
        L.marker([stop.lat, stop.lng], { icon })
          .addTo(map)
          .bindPopup(\`<b>\${stop.name}</b><br/>\${stop.city}<br/>\${providerBadge}\`);
      });
    });
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [orders]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" /> Route Planner
            <Badge variant="outline">{optimized.length} stops</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div ref={mapRef} style={{ height: 380, borderRadius: 8, zIndex: 0 }} />
          <div className="space-y-2">
            {optimized.map((stop: any, i: number) => (
              <div key={stop.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                <div className="flex-1">
                  <span className="font-medium text-sm">{stop.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{stop.city}</span>
                  {stop.provider && (
                    <span className={\`ml-2 text-xs px-1.5 py-0.5 rounded-full border \${stop.provider === 'VRL Logistics' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'}\`}>
                      {stop.provider === 'VRL Logistics' ? '🚛 VRL' : '📮 India Post'}
                    </span>
                  )}
                </div>
                {stop.distance && <span className="text-xs text-muted-foreground">+{Math.round(stop.distance)} km</span>}
              </div>
            ))}
            {optimized.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No orders with city data to plot</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`);

// PART 5 — CODCollectionTab
parts.push(`
// ── COD Collection Tab ────────────────────────────────────────────────────────
function CODCollectionTab({ orders }: { orders: any[] }) {
  const codOrders = orders.filter(o =>
    (o.payment_method === 'Cash on Delivery' || o.payment_method === 'cod') &&
    o.order_status === 'shipped'
  );

  const handleSendReminder = async (o: any) => {
    const amount = Number(o.total_amount ?? 0);
    const shipping = Number(o.shipping_charge ?? 0);
    await sendCODReminderNotification(o.phone, o.customer_name, amount, o.id, shipping, o.shipping_provider ?? 'India Post');
    toast.success('COD reminder sent via WhatsApp');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" /> COD Collection Pending
          {codOrders.length > 0 && <Badge className="bg-amber-500 text-white">{codOrders.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codOrders.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No pending COD collections</TableCell></TableRow>
            )}
            {codOrders.map(o => (
              <TableRow key={o.id}>
                <TableCell>
                  <div className="font-medium">{o.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{o.phone}</div>
                </TableCell>
                <TableCell className="font-medium">₹{Number(o.total_amount).toLocaleString()}</TableCell>
                <TableCell>{o.city ?? '—'}</TableCell>
                <TableCell>
                  {o.shipping_provider ? (
                    <span className={\`text-xs px-1.5 py-0.5 rounded-full border \${o.shipping_provider === 'VRL Logistics' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'}\`}>
                      {o.shipping_provider === 'VRL Logistics' ? '🚛 VRL' : '📮 India Post'}
                    </span>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => handleSendReminder(o)}>
                    <MessageCircle className="h-3 w-3" /> Remind
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
`);

// PART 6 — ShippingDashboard main component (state + handlers)
parts.push(`
// ── Main ShippingDashboard ────────────────────────────────────────────────────
export default function ShippingDashboard() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentCheckOrder, setPaymentCheckOrder] = useState<any>(null);
  const [shipOrder, setShipOrder] = useState<any>(null);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);

  const { data: allOrders = [] } = useOrdersWithTracking();
  const markAsShipped = useMarkAsShipped();
  const { filteredOrders: filteredPacked } = useOrderSearch(
    allOrders.filter((o: any) => o.order_status === 'ready_for_shipping'),
    searchQuery
  );
  const { filteredOrders: filteredShipped } = useOrderSearch(
    allOrders.filter((o: any) => ['shipped', 'out_for_delivery'].includes(o.order_status)),
    searchQuery
  );

  useEffect(() => { setActiveTab(tabFromUrl); }, [tabFromUrl]);

  const pendingOrders = allOrders.filter((o: any) => o.order_status === 'ready_for_shipping');
  const shippedOrders = allOrders.filter((o: any) => ['shipped', 'out_for_delivery'].includes(o.order_status));
  const deliveredOrders = allOrders.filter((o: any) => o.order_status === 'delivered');
  const failedOrders = allOrders.filter((o: any) => o.order_status === 'failed');
  const pendingCount = pendingOrders.length;
  const shippedCount = shippedOrders.length;
  const totalRevenue = allOrders.reduce((s: number, o: any) => s + Number(o.total_amount ?? 0), 0);

  const openPaymentCheck = async (order: any) => {
    setLoadingOrderId(order.id);
    try {
      const { data } = await db.from('orders')
        .select('*, order_items(*, products(product_name, price))')
        .eq('id', order.id)
        .single();
      setPaymentCheckOrder(data ?? order);
    } catch {
      setPaymentCheckOrder(order);
    } finally {
      setLoadingOrderId(null);
    }
  };

  const handlePaymentProceed = () => {
    setShipOrder(paymentCheckOrder);
    setPaymentCheckOrder(null);
  };

  const handleShipConfirm = async (provider: string, trackingId: string) => {
    if (!shipOrder) return;
    try {
      await markAsShipped.mutateAsync({ orderId: shipOrder.id, provider, trackingId });
      await sendShippedNotification(shipOrder.phone, shipOrder.customer_name, trackingId, provider);
      const trackingUrl = \`\${window.location.origin}/track/\${trackingId}\`;
      const items = (shipOrder.order_items ?? []).map((item: any) => ({
        name: item.product_name ?? item.products?.product_name ?? 'Product',
        qty: item.quantity,
        price: Number(item.unit_price ?? item.products?.price ?? 0),
        total: Number(item.total_price ?? (item.quantity * (item.unit_price ?? 0))),
      }));
      const total = Number(shipOrder.total_amount ?? 0);
      const discount = Number(shipOrder.discount ?? 0);
      const paid = Number(shipOrder.total_paid ?? 0);
      const shippingCharge = Number(shipOrder.shipping_charge ?? 0);
      const invoiceData: InvoiceData = {
        invoiceNumber: \`SGB/2024-25/\${shipOrder.id.slice(0, 8).toUpperCase()}\`,
        date: new Date().toLocaleDateString('en-IN'),
        customerName: shipOrder.customer_name,
        phone: shipOrder.phone,
        address: shipOrder.address ?? '',
        items,
        subtotal: total,
        discount,
        grandTotal: total - discount,
        paymentMethod: shipOrder.payment_method ?? shipOrder.payment_status ?? 'Not specified',
        totalPaid: paid,
        remaining: (total - discount) - paid,
        trackingId,
        trackingUrl,
        shippingProvider: provider,
        shippingCharge,
        estimatedDays: provider === 'VRL Logistics' ? '2–3 days' : '3–5 days',
      };
      await sendInvoiceWhatsApp(shipOrder.phone, invoiceData);
      toast.success('Order shipped! Invoice sent via WhatsApp.');
      setShipOrder(null);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to ship order');
    }
  };

  const handleStatusUpdate = async (order: any, newStatus: string) => {
    try {
      await db.from('orders').update({ order_status: newStatus }).eq('id', order.id);
      const tid = order.tracking_id ?? order.id.slice(0, 8);
      if (newStatus === 'out_for_delivery') await sendOutForDeliveryNotification(order.phone, order.customer_name, tid);
      if (newStatus === 'delivered') await sendDeliveredNotification(order.phone, order.customer_name, tid);
      toast.success(\`Status updated to \${newStatus.replace(/_/g, ' ')}\`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCopyTracking = async (trackingId: string) => {
    await copyToClipboard(trackingId);
    toast.success('Tracking ID copied!');
  };

  const handleWhatsAppShare = (order: any) => {
    const trackingUrl = \`\${window.location.origin}/track/\${order.tracking_id ?? ''}\`;
    const msg = generateShipmentWhatsAppMessage(order.customer_name, order.shipping_provider ?? 'Courier', order.tracking_id ?? '', trackingUrl);
    window.open(generateWhatsAppUrl(order.phone, msg), '_blank');
  };
`);

// PART 7 — Dashboard JSX (stats cards + tabs + tables)
parts.push(`
  // Carrier distribution for pie chart
  const carrierData = (() => {
    const counts: Record<string, number> = {};
    allOrders.forEach((o: any) => {
      const p = o.shipping_provider ?? 'Unknown';
      counts[p] = (counts[p] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pending', label: \`Pending (\${pendingCount})\` },
    { id: 'shipped', label: \`Shipped (\${shippedCount})\` },
    { id: 'delivered', label: 'Delivered' },
    { id: 'failed', label: 'Failed' },
    { id: 'route', label: 'Route Planner' },
    { id: 'cod', label: 'COD Collection' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <AnnouncementBanner />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Shipping Dashboard</h1>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 flex-wrap border-b pb-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={\`px-4 py-2 text-sm font-medium border-b-2 transition-colors \${activeTab === t.id ? 'border-green-600 text-green-700' : 'border-transparent text-muted-foreground hover:text-foreground'}\`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending Shipments</p><p className="text-2xl font-bold text-amber-600">{pendingCount}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">In Transit</p><p className="text-2xl font-bold text-blue-600">{shippedCount}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Delivered</p><p className="text-2xl font-bold text-green-600">{deliveredOrders.length}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p></CardContent></Card>
              </div>

              {/* Carrier distribution */}
              {carrierData.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Carrier Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={carrierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => \`\${name}: \${value}\`}>
                          {carrierData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </ErrorBoundary>
        )}

        {/* ── PENDING TAB ── */}
        {activeTab === 'pending' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Input placeholder="Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-sm" />
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Products</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPacked.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? 'No results' : 'No orders ready for shipping'}
                        </TableCell></TableRow>
                      )}
                      {filteredPacked.map((o: any) => (
                        <TableRow key={o.id}>
                          <TableCell>
                            <div className="font-medium">{o.customer_name}</div>
                            <div className="text-xs text-muted-foreground">{o.phone}</div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                            {o.order_items?.map((i: any) => i.product_name ?? i.products?.name).join(', ') ?? '—'}
                          </TableCell>
                          <TableCell className="font-medium">₹{Number(o.total_amount).toLocaleString()}</TableCell>
                          <TableCell><PaymentBadge order={o} /></TableCell>
                          <TableCell>{o.city ?? '—'}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              className="gap-1"
                              onClick={() => openPaymentCheck(o)}
                              disabled={loadingOrderId === o.id}
                            >
                              {loadingOrderId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Truck className="h-3 w-3" />}
                              Ship
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </ErrorBoundary>
        )}

        {/* ── SHIPPED TAB ── */}
        {activeTab === 'shipped' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Input placeholder="Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-sm" />
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Tracking</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShipped.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? 'No results' : 'No shipped orders'}
                        </TableCell></TableRow>
                      )}
                      {filteredShipped.map((o: any) => (
                        <TableRow key={o.id}>
                          <TableCell>
                            <div className="font-medium">{o.customer_name}</div>
                            <div className="text-xs text-muted-foreground">{o.phone}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono">{o.tracking_id ?? '—'}</span>
                              {o.tracking_id && (
                                <button onClick={() => handleCopyTracking(o.tracking_id)} className="text-muted-foreground hover:text-foreground">
                                  <Copy className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {o.shipping_provider ? (
                              <span className={\`text-xs px-1.5 py-0.5 rounded-full border \${o.shipping_provider === 'VRL Logistics' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'}\`}>
                                {o.shipping_provider === 'VRL Logistics' ? '🚛 VRL' : '📮 India Post'}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell><PaymentBadge order={o} /></TableCell>
                          <TableCell>
                            <Select value={o.order_status} onValueChange={v => handleStatusUpdate(o, v)}>
                              <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleWhatsAppShare(o)} title="Share via WhatsApp">
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                              {o.tracking_id && (
                                <Button size="sm" variant="ghost" asChild>
                                  <a href={\`/track/\${o.tracking_id}\`} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </ErrorBoundary>
        )}

        {/* ── DELIVERED TAB ── */}
        {activeTab === 'delivered' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Tracking</TableHead><TableHead>Date</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveredOrders.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No delivered orders</TableCell></TableRow>}
                      {deliveredOrders.map((o: any) => (
                        <TableRow key={o.id}>
                          <TableCell><div className="font-medium">{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.phone}</div></TableCell>
                          <TableCell>₹{Number(o.total_amount).toLocaleString()}</TableCell>
                          <TableCell className="text-xs font-mono">{o.tracking_id ?? '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(o.updated_at ?? o.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </ErrorBoundary>
        )}

        {/* ── FAILED TAB ── */}
        {activeTab === 'failed' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>City</TableHead><TableHead>Action</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedOrders.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No failed deliveries</TableCell></TableRow>}
                      {failedOrders.map((o: any) => (
                        <TableRow key={o.id}>
                          <TableCell><div className="font-medium">{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.phone}</div></TableCell>
                          <TableCell>₹{Number(o.total_amount).toLocaleString()}</TableCell>
                          <TableCell>{o.city ?? '—'}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(o, 'shipped')}>Retry</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </ErrorBoundary>
        )}

        {/* ── ROUTE PLANNER TAB ── */}
        {activeTab === 'route' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <RoutePlannerTab orders={[...pendingOrders, ...shippedOrders]} />
            </motion.div>
          </ErrorBoundary>
        )}

        {/* ── COD COLLECTION TAB ── */}
        {activeTab === 'cod' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <CODCollectionTab orders={allOrders} />
            </motion.div>
          </ErrorBoundary>
        )}

        {/* ── MODALS ── */}
        {paymentCheckOrder && (
          <PaymentConfirmModal
            order={paymentCheckOrder}
            onClose={() => setPaymentCheckOrder(null)}
            onProceed={handlePaymentProceed}
          />
        )}
        {shipOrder && (
          <ShipOrderModal
            order={shipOrder}
            onClose={() => setShipOrder(null)}
            onShipped={handleShipConfirm}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
`);

// Write the file
fs.writeFileSync(out, parts.join('\n'), 'utf8');
console.log('✅ ShippingDashboard.tsx written — ' + fs.statSync(out).size + ' bytes');
