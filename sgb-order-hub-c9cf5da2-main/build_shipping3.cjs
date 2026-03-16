const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, 'src/pages/ShippingDashboard.tsx');

const parts = [];

// PART 1 — imports + constants
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
  sendInvoiceWhatsApp,
  sendCODReminderNotification,
  InvoiceData,
} from '@/utils/whatsappNotifications';
import { PaymentBadge } from '@/components/PaymentBadge';
import { getCityCoords, haversineDistance, optimizeRoute, RouteStop } from '@/utils/geoUtils';

const db = supabase as any;
const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed'];
const EDGE_URL = \`\${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp\`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function sendWhatsApp(phone: string, message: string) {
  try {
    await fetch(EDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${ANON_KEY}\` },
      body: JSON.stringify({ phone, message }),
    });
  } catch {}
}
`);

// PART 2 — PaymentConfirmModal (new 4-method logic)
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
  const total = Number(order.total_amount ?? 0);
  const method = (order.payment_method ?? '').toLowerCase();
  const status = (order.payment_status ?? '').toLowerCase();
  const isUPIOrBank = method === 'upi' || method === 'bank transfer';
  const isCOD = method === 'cash on delivery' || method === 'cod' || status === 'cod_pending';
  const isCheque = method === 'cheque' || status === 'cheque_pending';

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
            <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-medium capitalize">{order.payment_method || '—'}</span></div>
          </div>
          {order.order_items?.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              {order.order_items.map((item: any, i: number) => (
                <div key={i}>{item.quantity}× {item.product_name ?? item.products?.name}</div>
              ))}
            </div>
          )}
          {isUPIOrBank && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              ✅ Payment confirmed via {order.payment_method}. Ready to ship!
            </div>
          )}
          {isCOD && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              💵 ₹{total.toLocaleString()} to collect on delivery. Proceed to ship.
            </div>
          )}
          {isCheque && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              📃 Collect cheque of ₹{total.toLocaleString()} on delivery. Proceed to ship.
            </div>
          )}
          {!isUPIOrBank && !isCOD && !isCheque && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
              Payment method: {order.payment_method || 'Not specified'}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={onProceed}>Proceed to Ship</Button>
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

// PART 4 — RoutePlannerTab
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
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    import('leaflet').then(L => {
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }
      const map = L.map(mapRef.current!).setView([13.5333, 75.3667], 7);
      leafletMapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
      if (optimized.length > 1) {
        L.polyline(optimized.map(s => [s.lat, s.lng] as [number, number]), { color: '#16a34a', weight: 3, dashArray: '6,4' }).addTo(map);
      }
      optimized.forEach((stop: any, i: number) => {
        const icon = L.divIcon({
          html: \`<div style="background:#16a34a;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">\${i + 1}</div>\`,
          className: '', iconSize: [28, 28], iconAnchor: [14, 14],
        });
        L.marker([stop.lat, stop.lng], { icon }).addTo(map)
          .bindPopup(\`<b>\${stop.name}</b><br/>\${stop.city}<br/>\${(stop as any).provider === 'VRL Logistics' ? '🚛 VRL' : '📮 India Post'}\`);
      });
    });
    return () => { if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; } };
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
            {optimized.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No orders with city data to plot</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`);

// PART 5 — PendingPaymentsTab (replaces CODCollectionTab)
parts.push(`
// ── Pending Payments Tab ──────────────────────────────────────────────────────
function PendingPaymentsTab({ orders, onRefresh }: { orders: any[]; onRefresh: () => void }) {
  const codOrders = orders.filter(o =>
    (o.payment_status === 'cod_pending' || o.payment_method === 'Cash on Delivery' || o.payment_method === 'cod') &&
    o.order_status === 'delivered'
  );
  const chequeOrders = orders.filter(o =>
    o.payment_status === 'cheque_pending' || o.payment_method === 'cheque' || o.payment_method === 'Cheque'
  );

  const codTotal = codOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
  const chequeTotal = chequeOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);

  const handleMarkCashCollected = async (o: any) => {
    try {
      await db.from('orders').update({ payment_status: 'paid', cod_collected: true }).eq('id', o.id);
      await sendWhatsApp(o.phone,
        \`✅ Thank you! ₹\${Number(o.total_amount).toLocaleString()} cash received for order #\${o.id.slice(0, 8).toUpperCase()}.\\n\\nSGB Agro Industries | 📞 08277009667\`
      );
      toast.success('Cash collected — order marked paid');
      onRefresh();
    } catch (e: any) { toast.error(e.message ?? 'Failed'); }
  };

  const handleMarkChequeReceived = async (o: any) => {
    try {
      await db.from('orders').update({ payment_status: 'paid' }).eq('id', o.id);
      await sendWhatsApp(o.phone,
        \`✅ Your cheque has been received. Order #\${o.id.slice(0, 8).toUpperCase()} confirmed.\\n\\nThank you for choosing SGB Agro Industries! 🌾\\n📞 08277009667\`
      );
      toast.success('Cheque received — order marked paid');
      onRefresh();
    } catch (e: any) { toast.error(e.message ?? 'Failed'); }
  };

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">COD Pending</p>
            <p className="text-2xl font-bold text-amber-600">₹{codTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{codOrders.length} order{codOrders.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Cheque Pending</p>
            <p className="text-2xl font-bold text-blue-600">₹{chequeTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{chequeOrders.length} order{chequeOrders.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: COD Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            💵 COD Pending — Delivered Orders
            {codOrders.length > 0 && <Badge className="bg-amber-500 text-white">{codOrders.length}</Badge>}
          </CardTitle>
          <p className="text-xs text-muted-foreground">Orders delivered but cash not yet collected</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codOrders.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No COD collections pending</TableCell></TableRow>
              )}
              {codOrders.map(o => (
                <TableRow key={o.id}>
                  <TableCell>
                    <div className="font-medium">{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{o.phone}</div>
                  </TableCell>
                  <TableCell className="font-medium text-amber-700">₹{Number(o.total_amount).toLocaleString()}</TableCell>
                  <TableCell>{o.city ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {o.updated_at ? new Date(o.updated_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" className="gap-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleMarkCashCollected(o)}>
                      <CheckCircle className="h-3 w-3" /> Mark Cash Collected
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 2: Cheque Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            📃 Cheque Pending
            {chequeOrders.length > 0 && <Badge className="bg-blue-500 text-white">{chequeOrders.length}</Badge>}
          </CardTitle>
          <p className="text-xs text-muted-foreground">Orders where cheque is yet to be collected</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Order Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chequeOrders.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No cheque collections pending</TableCell></TableRow>
              )}
              {chequeOrders.map(o => (
                <TableRow key={o.id}>
                  <TableCell>
                    <div className="font-medium">{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{o.phone}</div>
                  </TableCell>
                  <TableCell className="font-medium text-blue-700">₹{Number(o.total_amount).toLocaleString()}</TableCell>
                  <TableCell>{o.city ?? '—'}</TableCell>
                  <TableCell>
                    <span className="text-xs capitalize text-muted-foreground">{(o.order_status ?? '').replace(/_/g, ' ')}</span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleMarkChequeReceived(o)}>
                      <CheckCircle className="h-3 w-3" /> Mark Cheque Received
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
`);

// PART 6 — Main ShippingDashboard component (state + handlers)
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

  const { data: allOrders = [], refetch } = useOrdersWithTracking();
  const markAsShipped = useMarkAsShipped();
  const filteredPacked = useOrderSearch(
    allOrders.filter((o: any) => o.order_status === 'ready_for_shipping'),
    searchQuery
  );
  const filteredShipped = useOrderSearch(
    allOrders.filter((o: any) => ['shipped', 'out_for_delivery'].includes(o.order_status)),
    searchQuery
  );

  useEffect(() => { setActiveTab(tabFromUrl); }, [tabFromUrl]);

  const pendingOrders = allOrders.filter((o: any) => o.order_status === 'ready_for_shipping');
  const shippedOrders = allOrders.filter((o: any) => ['shipped', 'out_for_delivery'].includes(o.order_status));
  const deliveredOrders = allOrders.filter((o: any) => o.order_status === 'delivered');
  const pendingCount = pendingOrders.length;
  const shippedCount = shippedOrders.length;
  const totalRevenue = allOrders.reduce((s: number, o: any) => s + Number(o.total_amount ?? 0), 0);

  const openPaymentCheck = async (order: any) => {
    setLoadingOrderId(order.id);
    try {
      const { data } = await db.from('orders')
        .select('*, order_items(*, products(product_name, price))')
        .eq('id', order.id).single();
      setPaymentCheckOrder(data ?? order);
    } catch { setPaymentCheckOrder(order); }
    finally { setLoadingOrderId(null); }
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
        paymentStatus: shipOrder.payment_status ?? 'pending',
        upiId: shipOrder.upi_id ?? undefined,
        trackingId,
        trackingUrl,
        shippingProvider: provider,
        shippingCharge,
        estimatedDays: provider === 'VRL Logistics' ? '2–3 days' : '3–5 days',
      };
      await sendInvoiceWhatsApp(shipOrder.phone, invoiceData);
      toast.success('Order shipped! Invoice sent via WhatsApp.');
      setShipOrder(null);
    } catch (e: any) { toast.error(e.message ?? 'Failed to ship order'); }
  };

  const handleStatusUpdate = async (order: any, newStatus: string) => {
    try {
      await db.from('orders').update({ order_status: newStatus }).eq('id', order.id);
      const tid = order.tracking_id ?? order.id.slice(0, 8);
      if (newStatus === 'out_for_delivery') await sendOutForDeliveryNotification(order.phone, order.customer_name, tid);
      if (newStatus === 'delivered') await sendDeliveredNotification(order.phone, order.customer_name, tid);
      toast.success(\`Status updated to \${newStatus.replace(/_/g, ' ')}\`);
      refetch();
    } catch (e: any) { toast.error(e.message); }
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

// PART 7 — JSX: carrier data, tabs, dashboard tab, pending tab
parts.push(`
  const carrierData = (() => {
    const counts: Record<string, number> = {};
    allOrders.forEach((o: any) => { const p = o.shipping_provider ?? 'Unknown'; counts[p] = (counts[p] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pending', label: \`Pending (\${pendingCount})\` },
    { id: 'shipped', label: \`Shipped (\${shippedCount})\` },
    { id: 'delivered', label: 'Delivered' },
    { id: 'failed', label: 'Failed' },
    { id: 'route', label: 'Route Planner' },
    { id: 'cod', label: 'Pending Payments' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <AnnouncementBanner />
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Shipping Dashboard</h1>
        </div>

        <div className="flex gap-1 flex-wrap border-b pb-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={\`px-4 py-2 text-sm font-medium border-b-2 transition-colors \${activeTab === t.id ? 'border-green-600 text-green-700' : 'border-transparent text-muted-foreground hover:text-foreground'}\`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending Shipments</p><p className="text-2xl font-bold text-amber-600">{pendingCount}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">In Transit</p><p className="text-2xl font-bold text-blue-600">{shippedCount}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Delivered</p><p className="text-2xl font-bold text-green-600">{deliveredOrders.length}</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p></CardContent></Card>
              </div>
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

        {activeTab === 'pending' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Input placeholder="Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-sm" />
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead><TableHead>Products</TableHead><TableHead>Amount</TableHead>
                        <TableHead>Payment</TableHead><TableHead>City</TableHead><TableHead>Action</TableHead>
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
                          <TableCell><div className="font-medium">{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.phone}</div></TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                            {o.order_items?.map((i: any) => i.product_name ?? i.products?.name).join(', ') ?? '—'}
                          </TableCell>
                          <TableCell className="font-medium">₹{Number(o.total_amount).toLocaleString()}</TableCell>
                          <TableCell><PaymentBadge order={o} /></TableCell>
                          <TableCell>{o.city ?? '—'}</TableCell>
                          <TableCell>
                            <Button size="sm" className="gap-1" onClick={() => openPaymentCheck(o)} disabled={loadingOrderId === o.id}>
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
`);

// PART 8 — JSX: shipped tab, delivered tab, failed tab
parts.push(`
        {activeTab === 'shipped' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Input placeholder="Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-sm" />
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead><TableHead>Tracking</TableHead><TableHead>Provider</TableHead>
                        <TableHead>Payment</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
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
                          <TableCell><div className="font-medium">{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.phone}</div></TableCell>
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
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleWhatsAppShare(o)}>
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                              {o.tracking_id && (
                                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => window.open(\`\${window.location.origin}/track/\${o.tracking_id}\`, '_blank')}>
                                  <ExternalLink className="h-3 w-3" />
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

        {activeTab === 'delivered' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Payment</TableHead>
                        <TableHead>Provider</TableHead><TableHead>Tracking</TableHead><TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveredOrders.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No delivered orders</TableCell></TableRow>
                      )}
                      {deliveredOrders.map((o: any) => (
                        <TableRow key={o.id}>
                          <TableCell><div className="font-medium">{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.phone}</div></TableCell>
                          <TableCell className="font-medium">₹{Number(o.total_amount).toLocaleString()}</TableCell>
                          <TableCell><PaymentBadge order={o} /></TableCell>
                          <TableCell className="text-xs">{o.shipping_provider ?? '—'}</TableCell>
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

        {activeTab === 'failed' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Payment</TableHead><TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allOrders.filter((o: any) => o.order_status === 'failed').length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No failed orders</TableCell></TableRow>
                      )}
                      {allOrders.filter((o: any) => o.order_status === 'failed').map((o: any) => (
                        <TableRow key={o.id}>
                          <TableCell><div className="font-medium">{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.phone}</div></TableCell>
                          <TableCell className="font-medium">₹{Number(o.total_amount).toLocaleString()}</TableCell>
                          <TableCell><PaymentBadge order={o} /></TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusUpdate(o, 'shipped')}>Retry Ship</Button>
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

        {activeTab === 'route' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <RoutePlannerTab orders={shippedOrders} />
            </motion.div>
          </ErrorBoundary>
        )}

        {activeTab === 'cod' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <PendingPaymentsTab orders={allOrders} onRefresh={refetch} />
            </motion.div>
          </ErrorBoundary>
        )}

        {paymentCheckOrder && (
          <PaymentConfirmModal order={paymentCheckOrder} onClose={() => setPaymentCheckOrder(null)} onProceed={handlePaymentProceed} />
        )}
        {shipOrder && (
          <ShipOrderModal order={shipOrder} onClose={() => setShipOrder(null)} onShipped={handleShipConfirm} />
        )}
      </div>
    </DashboardLayout>
  );
}
`);

// Write file
fs.writeFileSync(out, parts.join('\n'), 'utf8');
console.log('✅ ShippingDashboard.tsx written —', fs.statSync(out).size, 'bytes');
