import { useState, useEffect } from 'react';
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
import { Truck, Package, CheckCircle, Copy, MessageCircle, ExternalLink, AlertCircle, DollarSign, Loader2, MapPin } from 'lucide-react';
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
import { GlowingStatCard } from '@/components/ui/GlowingStatCard';
import { PageTransition } from '@/components/ui/PageTransition';


const db = supabase as any;
const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed'];
const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function sendWhatsApp(phone: string, message: string) {
  try {
    await fetch(EDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ phone, message }),
    });
  } catch {}
}


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
      <DialogContent className="max-w-md rounded-2xl">
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


// ── Ship Order Modal ──────────────────────────────────────────────────────────
function generateTrackingId(provider: string): string {
  const prefix = provider === 'VRL Logistics' ? 'VRL' : provider === 'India Post' ? 'IP' : 'TRK';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${ts}${rand}`;
}

function ShipOrderModal({
  order,
  onClose,
  onShipped,
}: {
  order: any;
  onClose: () => void;
  onShipped: (provider: string, trackingId: string) => void;
}) {
  const initialProvider = order.shipping_provider ?? '';
  const [provider, setProvider] = useState(initialProvider);
  const [trackingId, setTrackingId] = useState(() => generateTrackingId(initialProvider || 'TRK'));

  // Regenerate tracking ID when provider changes (only if user hasn't manually edited it)
  const handleProviderChange = (val: string) => {
    setProvider(val);
    setTrackingId(generateTrackingId(val));
  };

  const handleSubmit = () => {
    if (!provider.trim()) { toast.error('Select a courier provider'); return; }
    if (!trackingId.trim()) { toast.error('Enter tracking ID'); return; }
    onShipped(provider.trim(), trackingId.trim());
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Ship Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Customer: <span className="font-medium">{order.customer_name}</span></p>
          <div className="space-y-1">
            <Label>Courier Provider *</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
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





// ── Pending Payments Tab ──────────────────────────────────────────────────────
function PendingPaymentsTab({ orders, onRefresh }: { orders: any[]; onRefresh: () => void }) {
  const codOrders = orders.filter(o =>
    (o.payment_method === 'Cash on Delivery' || o.payment_status === 'cod_pending') &&
    ['shipped', 'out_for_delivery', 'delivered'].includes(o.order_status) &&
    !o.cod_collected &&
    o.payment_status !== 'cod_collected' &&
    o.payment_status !== 'paid'
  );
  const chequeOrders = orders.filter(o =>
    (o.payment_method === 'Cheque' || o.payment_status === 'cheque_pending') &&
    ['shipped', 'out_for_delivery', 'delivered'].includes(o.order_status) &&
    o.payment_status !== 'cheque_received' &&
    o.payment_status !== 'paid'
  );

  const codTotal = codOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
  const chequeTotal = chequeOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);

  const handleMarkCashCollected = async (o: any) => {
    try {
      await db.from('orders').update({
        payment_status: 'cod_collected',
        cod_collected: true,
        cod_collected_at: new Date().toISOString(),
        total_paid: o.total_amount,
      }).eq('id', o.id);
      await sendWhatsApp(o.phone,
        `✅ Thank you! ₹${Number(o.total_amount).toLocaleString()} cash received for order #${o.id.slice(0, 8).toUpperCase()}.\n\nSGB Agro Industries | 📞 08277009667`
      );
      toast.success('Cash collected — order marked paid');
      onRefresh();
    } catch (e: any) { toast.error(e.message ?? 'Failed'); }
  };

  const handleMarkChequeReceived = async (o: any) => {
    try {
      await db.from('orders').update({
        payment_status: 'cheque_received',
        total_paid: o.total_amount,
      }).eq('id', o.id);
      await sendWhatsApp(o.phone,
        `✅ Your cheque has been received. Order #${o.id.slice(0, 8).toUpperCase()} confirmed.\n\nThank you for choosing SGB Agro Industries! 🌾\n📞 08277009667`
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
          <p className="text-xs text-muted-foreground">Shipped/delivered orders with cash not yet collected</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Customer</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Amount</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">City</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Delivery Date</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-7 w-7 opacity-30" />
                      <p className="text-sm">No COD collections pending</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {codOrders.map(o => (
                <TableRow key={o.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell className="py-3">
                    <div className="font-medium">{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{o.phone}</div>
                  </TableCell>
                  <TableCell className="py-3 font-medium text-amber-700">₹{Number(o.total_amount).toLocaleString()}</TableCell>
                  <TableCell className="py-3">{o.city ?? '—'}</TableCell>
                  <TableCell className="py-3 text-xs text-muted-foreground">
                    {o.updated_at ? new Date(o.updated_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="py-3">
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
          <p className="text-xs text-muted-foreground">Shipped/delivered orders where cheque is yet to be collected</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Customer</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Amount</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">City</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Order Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chequeOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-7 w-7 opacity-30" />
                      <p className="text-sm">No cheque collections pending</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {chequeOrders.map(o => (
                <TableRow key={o.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell className="py-3">
                    <div className="font-medium">{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{o.phone}</div>
                  </TableCell>
                  <TableCell className="py-3 font-medium text-blue-700">₹{Number(o.total_amount).toLocaleString()}</TableCell>
                  <TableCell className="py-3">{o.city ?? '—'}</TableCell>
                  <TableCell className="py-3">
                    <span className="text-xs capitalize text-muted-foreground">{(o.order_status ?? '').replace(/_/g, ' ')}</span>
                  </TableCell>
                  <TableCell className="py-3">
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
      const trackingUrl = `${window.location.origin}/track/${trackingId}`;
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
        invoiceNumber: `SGB/2024-25/${shipOrder.id.slice(0, 8).toUpperCase()}`,
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
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCopyTracking = async (trackingId: string) => {
    await copyToClipboard(trackingId);
    toast.success('Tracking ID copied!');
  };

  const handleWhatsAppShare = (order: any) => {
    const trackingUrl = `${window.location.origin}/track/${order.tracking_id ?? ''}`;
    const msg = generateShipmentWhatsAppMessage(order.customer_name, order.shipping_provider ?? 'Courier', order.tracking_id ?? '', trackingUrl);
    window.open(generateWhatsAppUrl(order.phone, msg), '_blank');
  };


  const carrierData = (() => {
    const counts: Record<string, number> = {};
    allOrders.forEach((o: any) => { const p = o.shipping_provider ?? 'Unknown'; counts[p] = (counts[p] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pending', label: `Pending (${pendingCount})` },
    { id: 'shipped', label: `Shipped (${shippedCount})` },
    { id: 'delivered', label: 'Delivered' },
    { id: 'failed', label: 'Failed' },
    { id: 'cod', label: 'Pending Payments' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <AnnouncementBanner />
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Shipping Dashboard</h1>
        </div>

        {activeTab === 'dashboard' && (
          <ErrorBoundary>
            <PageTransition tabKey="dashboard">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlowingStatCard title="Pending Shipments" value={pendingCount} icon={Package} color="amber" />
                <GlowingStatCard title="In Transit" value={shippedCount} icon={Truck} color="blue" />
                <GlowingStatCard title="Delivered" value={deliveredOrders.length} icon={CheckCircle} color="green" />
                <GlowingStatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={DollarSign} color="purple" />
              </div>
              {carrierData.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm font-semibold">Carrier Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={carrierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`}>
                          {carrierData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'white', border: '0.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '8px 12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </motion.div>
            </PageTransition>
          </ErrorBoundary>
        )}

        {activeTab === 'pending' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Input placeholder="Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-sm" />
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Customer</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Products</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Amount</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Payment</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">City</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPacked.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-16 text-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <Truck className="h-8 w-8 opacity-30" />
                              <p className="font-medium">{searchQuery ? 'No results found' : 'No orders ready for shipping'}</p>
                              {!searchQuery && <p className="text-xs">Orders will appear here once packed</p>}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredPacked.map((o: any) => (
                        <TableRow key={o.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm shrink-0">
                                {o.customer_name?.[0]?.toUpperCase() ?? '?'}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{o.customer_name}</div>
                                <div className="text-xs text-muted-foreground">{o.phone}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-xs max-w-[160px] truncate">
                            {o.order_items?.map((i: any) => `${i.product_name ?? i.products?.name} ×${i.quantity}`).join(', ') ?? '—'}
                          </TableCell>
                          <TableCell className="py-3 font-medium">₹{Number(o.total_amount).toLocaleString()}</TableCell>
                          <TableCell className="py-3"><PaymentBadge order={o} /></TableCell>
                          <TableCell className="py-3">{o.city ?? '—'}</TableCell>
                          <TableCell className="py-3">
                            <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => openPaymentCheck(o)} disabled={loadingOrderId === o.id}>
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


        {activeTab === 'shipped' && (
          <ErrorBoundary>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Input placeholder="Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-sm" />
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Customer</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Tracking</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Provider</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Payment</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Status</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShipped.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-16 text-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <Package className="h-8 w-8 opacity-30" />
                              <p className="font-medium">{searchQuery ? 'No results found' : 'No shipped orders'}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredShipped.map((o: any) => (
                        <TableRow key={o.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                                {o.customer_name?.[0]?.toUpperCase() ?? '?'}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{o.customer_name}</div>
                                <div className="text-xs text-muted-foreground">{o.phone}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono">{o.tracking_id ?? '—'}</span>
                              {o.tracking_id && (
                                <button onClick={() => handleCopyTracking(o.tracking_id)} className="text-muted-foreground hover:text-foreground">
                                  <Copy className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            {o.shipping_provider ? (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full border ${o.shipping_provider === 'VRL Logistics' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                {o.shipping_provider === 'VRL Logistics' ? '🚛 VRL' : '📮 India Post'}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="py-3"><PaymentBadge order={o} /></TableCell>
                          <TableCell className="py-3">
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
                          <TableCell className="py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleWhatsAppShare(o)}>
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                              {o.tracking_id && (
                                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => window.open(`${window.location.origin}/track/${o.tracking_id}`, '_blank')}>
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
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Customer</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Amount</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Payment</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Provider</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Tracking</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveredOrders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-16 text-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <CheckCircle className="h-8 w-8 opacity-30" />
                              <p className="font-medium">No delivered orders yet</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {deliveredOrders.map((o: any) => (
                        <TableRow key={o.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="py-3"><div className="font-medium">{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.phone}</div></TableCell>
                          <TableCell className="py-3 font-medium">₹{Number(o.total_amount).toLocaleString()}</TableCell>
                          <TableCell className="py-3"><PaymentBadge order={o} /></TableCell>
                          <TableCell className="py-3 text-xs">{o.shipping_provider ?? '—'}</TableCell>
                          <TableCell className="py-3 text-xs font-mono">{o.tracking_id ?? '—'}</TableCell>
                          <TableCell className="py-3 text-xs text-muted-foreground">{new Date(o.updated_at ?? o.created_at).toLocaleDateString()}</TableCell>
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
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Customer</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Amount</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Payment</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allOrders.filter((o: any) => o.order_status === 'failed').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-16 text-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <AlertCircle className="h-8 w-8 opacity-30" />
                              <p className="font-medium">No failed deliveries</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {allOrders.filter((o: any) => o.order_status === 'failed').map((o: any) => (
                        <TableRow key={o.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="py-3"><div className="font-medium">{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.phone}</div></TableCell>
                          <TableCell className="py-3 font-medium">₹{Number(o.total_amount).toLocaleString()}</TableCell>
                          <TableCell className="py-3"><PaymentBadge order={o} /></TableCell>
                          <TableCell className="py-3">
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
