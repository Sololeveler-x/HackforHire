import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import OrderSearch from '@/components/OrderSearch';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useOrdersWithTracking, useMarkAsPacked, useOrderItems } from '@/hooks/useOrders';
import { useOrderSearch } from '@/hooks/useOrderSearch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, CheckCircle, AlertTriangle, Flame, ClipboardList, Warehouse, Loader2, Truck, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { planFulfillment, FulfillmentPlan } from '@/utils/fulfillmentPlanner';
import { notifyOrderPacked } from '@/utils/whatsappNotifications';
import { GlowingStatCard } from '@/components/ui/GlowingStatCard';
import { PageTransition } from '@/components/ui/PageTransition';

const db = supabase as any;

// ── AI Packing Checklist Dialog ───────────────────────────────────────────────
function PackingChecklistDialog({ order, onClose, onComplete }: {
  order: any;
  onClose: () => void;
  onComplete: (warehouseId: string) => void;
}) {
  const { data: rawItems = [] } = useOrderItems(order.id);
  const [plan, setPlan] = useState<FulfillmentPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState('');
  const [packedKeys, setPackedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!rawItems.length) return;
    setPlanLoading(true);
    setPlanError('');

    const items = rawItems.map((i: any) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      product_name: i.product_name,
    }));

    planFulfillment(order.id, order.city || order.delivery_city || 'Koppa', items)
      .then(p => setPlan(p))
      .catch(e => setPlanError(e.message ?? 'Failed to generate plan'))
      .finally(() => setPlanLoading(false));
  }, [rawItems.length, order.id]);

  const totalItems = plan?.shipments.reduce((s, sh) => s + sh.items.length, 0) ?? 0;
  const allPacked = packedKeys.size >= totalItems && totalItems > 0;

  const togglePacked = (key: string) => {
    setPackedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      // Save fulfillment plan to order
      await db.from('orders').update({
        is_split_order: plan.type === 'split',
        split_count: plan.shipments.length,
        fulfillment_plan: plan,
        assigned_warehouse_id: plan.shipments[0].warehouseId,
      }).eq('id', order.id);

      // Check if stock was already reserved at billing time
      const { data: alreadyReserved } = await db.rpc('has_stock_reservation', { p_order_id: order.id });

      // Create order_splits + items
      for (let i = 0; i < plan.shipments.length; i++) {
        const shipment = plan.shipments[i];
        const { data: splitRecord } = await db.from('order_splits').insert({
          order_id: order.id,
          warehouse_id: shipment.warehouseId,
          split_number: i + 1,
          status: 'pending',
          estimated_dispatch_date: new Date().toISOString().split('T')[0],
          estimated_delivery_date: shipment.estimatedDeliveryDate,
          distance_km: Math.round(shipment.distanceKm),
        }).select().single();

        for (const item of shipment.items) {
          await db.from('order_split_items').insert({
            split_id: splitRecord.id,
            product_id: item.productId,
            quantity: item.quantity,
          });
          // FIX 1: Only deduct stock if NOT already reserved at billing time
          // (prevents double-deduction)
          if (!alreadyReserved) {
            await db.rpc('deduct_warehouse_stock_specific', {
              p_warehouse_id: shipment.warehouseId,
              p_product_id: item.productId,
              p_quantity: item.quantity,
            });
          }
        }
      }

      // FIX 1: Mark reservations as fulfilled (stock was already deducted at billing)
      if (alreadyReserved) {
        await db.rpc('fulfill_stock_reservation', { p_order_id: order.id });
      }

      onComplete(plan.shipments[0].warehouseId);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to confirm plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Packing Checklist
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Order: <span className="font-medium">{order.customer_name}</span></p>

        {planLoading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <p className="text-sm text-muted-foreground">AI planning optimal fulfillment...</p>
          </div>
        )}

        {planError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{planError}</div>
        )}

        {!planLoading && plan && (
          <div className="space-y-4">
            {/* AI explanation banner */}
            <div className={`rounded-lg p-3 text-sm ${plan.type === 'single' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              <p className="font-medium mb-1">
                {plan.type === 'single' ? '✅ Single shipment' : `⚡ Split into ${plan.shipments.length} shipments`}
              </p>
              <p>{plan.explanation}</p>
            </div>

            {/* Shipment breakdown */}
            {plan.shipments.map((shipment, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1">
                      <Warehouse className="h-3.5 w-3.5" />
                      {plan.type === 'split' ? `Shipment ${i + 1}: ` : ''}{shipment.warehouseName}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {Math.round(shipment.distanceKm)}km · {shipment.deliveryDays} day(s) · Arrives {shipment.estimatedDeliveryDate}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">{shipment.warehouseCity}</Badge>
                </div>

                <div className="space-y-2">
                  {shipment.items.map((item, j) => {
                    const key = `${i}-${j}`;
                    return (
                      <div key={j} className="flex items-center justify-between bg-muted/30 rounded p-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={key}
                            checked={packedKeys.has(key)}
                            onCheckedChange={() => togglePacked(key)}
                          />
                          <label htmlFor={key} className="text-sm cursor-pointer">{item.productName}</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">× {item.quantity}</span>
                          {packedKeys.has(key) && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={!allPacked || saving}
              >
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Confirming...</>
                  : !allPacked
                    ? `Check all items (${packedKeys.size}/${totalItems})`
                    : '✅ Confirm Packing Plan'
                }
              </Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
            {!allPacked && totalItems > 0 && (
              <p className="text-xs text-amber-600 text-center">Check all {totalItems} item(s) to confirm</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const PackingDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'pending';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allPendingOrders } = useOrdersWithTracking('ready_for_packing');
  const { data: allPackedOrders } = useOrdersWithTracking('ready_for_shipping');
  const pendingOrders = useOrderSearch(allPendingOrders, searchQuery);
  const packedOrders = useOrderSearch(allPackedOrders, searchQuery);
  const markAsPacked = useMarkAsPacked();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { data: orderItems } = useOrderItems(selectedOrderId || '');

  const [damageOrder, setDamageOrder] = useState<any | null>(null);
  const [damageNote, setDamageNote] = useState('');
  const [damageLoading, setDamageLoading] = useState(false);
  const [checklistOrder, setChecklistOrder] = useState<any | null>(null);

  // Warehouse name map for display
  const [warehouses, setWarehouses] = useState<Record<string, string>>({});

  useEffect(() => { setActiveTab(tabFromUrl); }, [tabFromUrl]);

  useEffect(() => {
    db.from('warehouses').select('id, warehouse_name').then(({ data }: any) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((w: any) => { map[w.id] = w.warehouse_name; });
        setWarehouses(map);
      }
    });
  }, []);

  const priorityOrders = pendingOrders?.filter((o: any) => o.is_priority) ?? [];
  const normalOrders = pendingOrders?.filter((o: any) => !o.is_priority) ?? [];

  const handlePack = async (order: any, warehouseId?: string) => {
    try {
      await markAsPacked.mutateAsync({ orderId: order.id, warehouseId });
      await notifyOrderPacked(order.customer_name, order.phone, order.id);
      toast.success('Order marked as packed! Customer notified via WhatsApp.');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleChecklistComplete = async (order: any, warehouseId: string) => {
    setChecklistOrder(null);
    await handlePack(order, warehouseId);
  };

  const handleDamageReport = async () => {
    if (!damageNote.trim()) { toast.error('Please describe the damage'); return; }
    setDamageLoading(true);
    try {
      await supabase.from('orders').update({ damage_reported: true, damage_note: damageNote } as any).eq('id', damageOrder.id);
      toast.success('Damage reported and admin notified');
      setDamageOrder(null); setDamageNote('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDamageLoading(false);
    }
  };

  const OrderRow = ({ order }: { order: any }) => (
    <TableRow className={(order as any).is_priority ? 'bg-red-50/50' : ''}>
      <TableCell>
        <div className="flex items-center gap-2 flex-wrap">
          <div>
            <div className="font-medium">{order.customer_name}</div>
            <div className="text-xs text-muted-foreground">{order.phone}</div>
          </div>
          {(order as any).is_priority && <Badge className="bg-red-500 text-white text-xs">Priority</Badge>}
          {(order as any).damage_reported && <Badge className="bg-orange-500 text-white text-xs">⚠ Damage</Badge>}
        </div>
      </TableCell>
      <TableCell>
        {(order as any).assigned_warehouse_id ? (
          <Badge variant="outline" className="text-xs gap-1">
            📦 {warehouses[(order as any).assigned_warehouse_id] || 'Warehouse'}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">⚠️ No warehouse</Badge>
        )}
      </TableCell>
      <TableCell>₹{Number(order.total_amount).toLocaleString()}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1 flex-wrap">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedOrderId(order.id)}>View Items</Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setChecklistOrder(order)}>
            <ClipboardList className="h-3 w-3" /> Pack
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => { setDamageOrder(order); setDamageNote(''); }}>
            <AlertTriangle className="h-3 w-3 mr-1" /> Damage
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <DashboardLayout>
      <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <AnnouncementBanner role="packing" />

        {activeTab === 'dashboard' && (
          <ErrorBoundary>
            <PageTransition tabKey="dashboard">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <GlowingStatCard
                  title="Pending Packing"
                  value={allPendingOrders?.length || 0}
                  icon={Package}
                  color="amber"
                />
                <GlowingStatCard
                  title="Packed"
                  value={allPackedOrders?.length || 0}
                  icon={CheckCircle}
                  color="green"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Packing Progress (Last 7 Days)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={(() => {
                        const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().split('T')[0]; });
                        return last7.map(date => ({ date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), packed: allPackedOrders?.filter(o => o.created_at.startsWith(date)).length || 0, pending: allPendingOrders?.filter(o => o.created_at.startsWith(date)).length || 0 }));
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'white', border: '0.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '8px 12px' }} />
                        <Legend />
                        <Line type="monotone" dataKey="packed" stroke="#16a34a" strokeWidth={2} dot={false} name="Packed" />
                        <Line type="monotone" dataKey="pending" stroke="#d97706" strokeWidth={2} dot={false} name="Pending" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Daily Packing Volume</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={(() => {
                        const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().split('T')[0]; });
                        return last7.map(date => ({ date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), orders: (allPackedOrders?.filter(o => o.created_at.startsWith(date)).length || 0) + (allPendingOrders?.filter(o => o.created_at.startsWith(date)).length || 0) }));
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'white', border: '0.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '8px 12px' }} />
                        <Bar dataKey="orders" fill="#16a34a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
            </PageTransition>
          </ErrorBoundary>
        )}

        {activeTab === 'pending' && (
          <ErrorBoundary>
            <div className="space-y-4">
              {priorityOrders.length > 0 && (
                <Card className="border-red-200 bg-red-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <Flame className="h-5 w-5" /> Priority Orders
                      <Badge className="bg-red-500 text-white">{priorityOrders.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Customer</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Warehouse</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Amount</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Date</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>{priorityOrders.map((order: any) => <OrderRow key={order.id} order={order} />)}</TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle>Orders Ready for Packing</CardTitle>
                    <OrderSearch value={searchQuery} onChange={setSearchQuery} />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Customer</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Warehouse</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Amount</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Date</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {normalOrders.map((order: any) => <OrderRow key={order.id} order={order} />)}
                      {normalOrders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-16 text-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <Package className="h-8 w-8 opacity-30" />
                              <p className="font-medium">{searchQuery ? 'No orders found matching your search' : 'No pending orders'}</p>
                              {!searchQuery && <p className="text-xs">Orders will appear here once confirmed by billing</p>}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'packed' && (
          <ErrorBoundary>
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle>Packed Orders</CardTitle>
                  <OrderSearch value={searchQuery} onChange={setSearchQuery} />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Customer</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Amount</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Status</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packedOrders?.map(order => (
                      <TableRow key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm shrink-0">
                              {order.customer_name?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div className="font-medium text-sm">{order.customer_name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">₹{Number(order.total_amount).toLocaleString()}</TableCell>
                        <TableCell className="py-3"><span className="status-packed">Ready for Shipping</span></TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                    {(!packedOrders || packedOrders.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <CheckCircle className="h-8 w-8 opacity-30" />
                            <p className="font-medium">{searchQuery ? 'No orders found' : 'No packed orders yet'}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </ErrorBoundary>
        )}

        {/* Order Items Dialog */}
        <Dialog open={!!selectedOrderId} onOpenChange={() => setSelectedOrderId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Order Items</DialogTitle></DialogHeader>
            <Table>
              <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Price</TableHead></TableRow></TableHeader>
              <TableBody>
                {orderItems?.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>₹{Number(item.total_price).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>

        {/* AI Packing Checklist */}
        {checklistOrder && (
          <PackingChecklistDialog
            order={checklistOrder}
            onClose={() => setChecklistOrder(null)}
            onComplete={(warehouseId) => handleChecklistComplete(checklistOrder, warehouseId)}
          />
        )}

        {/* Damage Report Dialog */}
        <Dialog open={!!damageOrder} onOpenChange={open => !open && setDamageOrder(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-orange-600"><AlertTriangle className="h-5 w-5" /> Report Damage</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Order: <span className="font-medium">{damageOrder?.customer_name}</span></p>
              <div className="space-y-2">
                <Label>Damage Description <span className="text-destructive">*</span></Label>
                <Textarea value={damageNote} onChange={e => setDamageNote(e.target.value)} placeholder="Describe the damage..." rows={4} />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleDamageReport} disabled={damageLoading}>
                  {damageLoading ? 'Reporting...' : 'Submit Damage Report'}
                </Button>
                <Button variant="outline" onClick={() => setDamageOrder(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardLayout>
  );
};

export default PackingDashboard;
