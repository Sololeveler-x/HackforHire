import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import OrderSearch from '@/components/OrderSearch';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useProducts, useCreateOrder, useOrdersWithTracking, useCancelOrder, usePaymentTransactions, useRecordPayment } from '@/hooks/useOrders';
import { useOrderSearch } from '@/hooks/useOrderSearch';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, FileText, LayoutDashboard, MessageSquare, CheckCircle, XCircle, DollarSign, Printer, AlertCircle, Calculator, ShoppingCart, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { notifyOrderCancelled, notifyCODReminder } from '@/utils/whatsappNotifications';
import { PaymentBadge } from '@/components/PaymentBadge';
import { getCityCoords, haversineDistance } from '@/utils/geoUtils';
import { GlowingStatCard } from '@/components/ui/GlowingStatCard';
import { PageTransition } from '@/components/ui/PageTransition';

// ── AI Warehouse Selector ────────────────────────────────────────────────────
async function selectBestWarehouse(city: string): Promise<string | null> {
  try {
    const { data: warehouses } = await (supabase as any).from('warehouses').select('id, name, city, state');
    if (!warehouses || warehouses.length === 0) return null;
    const prompt = `You are a warehouse selector for SGB Agro Industries. Pick the best warehouse to fulfill an order for a customer in "${city}".
Warehouses: ${JSON.stringify(warehouses)}
Return ONLY the warehouse id as plain text, nothing else.`;
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 50 }),
    });
    const data = await res.json();
    const id = data.choices?.[0]?.message?.content?.trim();
    return warehouses.find(w => w.id === id) ? id : warehouses[0].id;
  } catch { return null; }
}

import { planFulfillment, FulfillmentPlan } from '@/utils/fulfillmentPlanner';

// ── Warehouse hook ────────────────────────────────────────────────────────────
function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('warehouses').select('id, warehouse_name, city, state');
      if (error) throw error;
      return (data ?? []) as { id: string; warehouse_name: string; city: string; state: string }[];
    },
  });
}

// ── Split-aware VRL Calculator Dialog ────────────────────────────────────────
interface VRLCalcProps {
  open: boolean;
  onClose: () => void;
  plan: FulfillmentPlan | null;
  customerCity: string;
  products: any[];
  items: { product_id: string; quantity: number }[];
  onApply: (charge: number) => void;
}
function VRLCalculator({ open, onClose, plan, customerCity, products, items, onApply }: VRLCalcProps) {
  const [ratePerKg, setRatePerKg] = useState('');
  const [freeShipping, setFreeShipping] = useState(false);

  // Build per-leg data from fulfillment plan
  const legs = (plan?.shipments ?? []).map(shipment => {
    const wCoords = getCityCoords(shipment.warehouseCity);
    const cCoords = getCityCoords(customerCity);
    const distanceKm = wCoords && cCoords
      ? Math.round(haversineDistance(wCoords[0], wCoords[1], cCoords[0], cCoords[1]))
      : null;
    const weightKg = shipment.items.reduce((s, si) => {
      const prod = products.find(p => p.id === si.productId);
      return s + ((prod as any)?.weight_kg ?? 1) * si.quantity;
    }, 0);
    return { warehouseName: shipment.warehouseName, warehouseCity: shipment.warehouseCity, distanceKm, weightKg, items: shipment.items };
  });

  // Fallback: single leg from total weight if no plan
  const fallbackWeightKg = items.reduce((s, i) => {
    const prod = products.find(p => p.id === i.product_id);
    return s + ((prod as any)?.weight_kg ?? 1) * i.quantity;
  }, 0);

  const displayLegs = legs.length > 0 ? legs : [{ warehouseName: '—', warehouseCity: '—', distanceKm: null, weightKg: fallbackWeightKg, items: [] }];

  const rate = parseFloat(ratePerKg) || 0;
  const legCharges = displayLegs.map(l => freeShipping ? 0 : (rate > 0 ? Math.round(l.weightKg * rate) : null));
  const totalCharge = freeShipping ? 0 : (legCharges.every(c => c != null) ? legCharges.reduce((s, c) => s! + c!, 0) : null);

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>VRL Shipping Calculator</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Per-leg table */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 text-xs font-medium">From → To</th>
                  <th className="text-right p-2 text-xs font-medium">Distance</th>
                  <th className="text-right p-2 text-xs font-medium">Weight</th>
                  <th className="text-right p-2 text-xs font-medium">Charge</th>
                </tr>
              </thead>
              <tbody>
                {displayLegs.map((leg, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">
                      <span className="font-medium">{leg.warehouseCity}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="font-medium">{customerCity || '—'}</span>
                      <div className="text-xs text-muted-foreground">{leg.warehouseName}</div>
                    </td>
                    <td className="p-2 text-right text-muted-foreground">
                      {leg.distanceKm != null ? `${leg.distanceKm} km` : '—'}
                    </td>
                    <td className="p-2 text-right text-muted-foreground">{leg.weightKg.toFixed(1)} kg</td>
                    <td className="p-2 text-right font-medium">
                      {freeShipping ? '₹0' : legCharges[i] != null ? `₹${legCharges[i]!.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
                {displayLegs.length > 1 && (
                  <tr className="border-t bg-muted/30 font-bold">
                    <td className="p-2" colSpan={3}>Total Shipping</td>
                    <td className="p-2 text-right text-green-700">
                      {freeShipping ? '₹0' : totalCharge != null ? `₹${totalCharge.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-1">
            <Label>Rate per kg (₹) — applies to all legs</Label>
            <Input type="number" min="0" placeholder="e.g. 45" value={ratePerKg} onChange={e => setRatePerKg(e.target.value)} disabled={freeShipping} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={freeShipping} onCheckedChange={setFreeShipping} id="free-shipping" />
            <Label htmlFor="free-shipping">Free Shipping (₹0)</Label>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={totalCharge == null} onClick={() => { onApply(totalCharge!); onClose(); }}>
              Apply ₹{totalCharge != null ? totalCharge.toLocaleString() : '—'}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── ProductPills (shared) ─────────────────────────────────────────────────────
function ProductPills({ productsJson, productName }: { productsJson?: any; productName?: string | null }) {
  let prods: { product_name: string; quantity: number }[] = [];
  try {
    if (productsJson) prods = Array.isArray(productsJson) ? productsJson : JSON.parse(productsJson as string);
    else if (productName) prods = [{ product_name: productName, quantity: 1 }];
  } catch { prods = productName ? [{ product_name: productName, quantity: 1 }] : []; }
  if (prods.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {prods.map((p, i) => (
        <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
          {p.quantity}× {p.product_name}
        </span>
      ))}
    </div>
  );
}

// ── ProductCell (robust display for Agent Confirmed Orders) ───────────────────
function ProductCell({ inquiry }: { inquiry: any }) {
  const products = (() => {
    try {
      if (inquiry.products_json) {
        const parsed = typeof inquiry.products_json === 'string'
          ? JSON.parse(inquiry.products_json)
          : inquiry.products_json;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    if (inquiry.product_name) {
      return [{ product_name: inquiry.product_name, quantity: inquiry.quantity ?? 1 }];
    }
    return [];
  })();
  if (products.length === 0) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {products.map((p: any, i: number) => (
        <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200 whitespace-nowrap">
          {p.quantity}× {p.product_name}
        </span>
      ))}
    </div>
  );
}

// ── Agent Confirmed Leads ────────────────────────────────────────────────────
function AgentConfirmedLeads({ onNavigateToOrder }: { onNavigateToOrder: (inquiryId: string) => void }) {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['pending-billing-leads'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('inquiries').select('*').eq('status', 'pending_billing').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Agent Confirmed Orders
          {leads.length > 0 && <Badge className="bg-amber-500 text-white">{leads.length} pending</Badge>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">Orders confirmed by sales agents — ready to bill</p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Customer</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Product</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Agreed Price</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">City</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Payment</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Notes</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
            {!isLoading && leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 opacity-30" />
                    <p className="font-medium">No confirmed orders from agents yet</p>
                    <p className="text-xs">Orders confirmed by agents will appear here</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {leads.map((lead: any) => (
              <TableRow key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm shrink-0">
                      {lead.customer_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{lead.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{lead.phone_number}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3"><ProductCell inquiry={lead} /></TableCell>
                <TableCell className="py-3 font-medium">
                  {lead.agreed_price ? `₹${Number(lead.agreed_price).toLocaleString()}` : '—'}
                  {lead.discount > 0 && <span className="text-xs text-green-600 ml-1">-₹{lead.discount}</span>}
                </TableCell>
                <TableCell className="py-3">{lead.delivery_city ?? '—'}</TableCell>
                <TableCell className="py-3">
                  <PaymentBadge order={{ payment_method: lead.payment_method, payment_status: lead.payment_status ?? 'pending' }} />
                </TableCell>
                <TableCell className="py-3 text-xs text-muted-foreground max-w-32 truncate">{lead.notes ?? '—'}</TableCell>
                <TableCell className="py-3">
                  <Button size="sm" className="gap-1 h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => onNavigateToOrder(lead.id)}>
                    <CheckCircle className="h-3.5 w-3.5" /> Create Order
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

// ── Payment History Panel ────────────────────────────────────────────────────
function PaymentPanel({ orderId, totalAmount, onClose }: { orderId: string; totalAmount: number; onClose: () => void }) {
  const { data: txns = [], isLoading } = usePaymentTransactions(orderId);
  const recordPayment = useRecordPayment();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('');

  const totalPaid = txns.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const remaining = totalAmount - totalPaid;

  const handleRecord = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    try {
      await recordPayment.mutateAsync({ order_id: orderId, amount: amt, payment_method: method, notes, transaction_ref: ref });
      toast.success('Payment recorded');
      setAmount(''); setRef(''); setNotes('');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-bold">₹{totalAmount.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-3">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="font-bold text-green-700">₹{totalPaid.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="font-bold text-red-700">₹{remaining.toLocaleString()}</p>
        </div>
      </div>

      <div className="border rounded-lg p-3 space-y-3">
        <p className="text-sm font-medium">Record Payment</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Amount</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Input value={ref} onChange={e => setRef(e.target.value)} placeholder="Transaction ref (optional)" className="h-8" />
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="h-8" />
        <Button size="sm" className="w-full" onClick={handleRecord} disabled={recordPayment.isPending}>
          {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading history...</p> : (
        <div className="space-y-2">
          <p className="text-sm font-medium">Payment History</p>
          {txns.length === 0 ? <p className="text-xs text-muted-foreground">No payments recorded yet</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Method</TableHead>
                  <TableHead className="text-xs">Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{new Date(t.payment_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs font-medium">₹{Number(t.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs capitalize">{t.payment_method}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.transaction_ref ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
      <Button variant="outline" size="sm" className="w-full" onClick={onClose}>Close</Button>
    </div>
  );
}

// ── GST Invoice Generator (Task 16) ─────────────────────────────────────────
function generateInvoiceHTML(order: any, items: any[], settings?: any): string {
  const subtotal = items.reduce((s, i) => s + Number(i.total_price), 0);
  const isKarnataka = (order.state || '').toLowerCase().includes('karnatak');
  const gstRate = settings?.default_gst_rate ?? 18;
  const cgst = isKarnataka ? subtotal * (gstRate / 2) / 100 : 0;
  const sgst = isKarnataka ? subtotal * (gstRate / 2) / 100 : 0;
  const igst = !isKarnataka ? subtotal * gstRate / 100 : 0;
  const grandTotal = subtotal + cgst + sgst + igst;
  const invoiceNo = settings?.invoice_prefix ? `${settings.invoice_prefix}${String(settings.invoice_counter || 1).padStart(3, '0')}` : `SGB/2024-25/${order.id.substring(0, 6).toUpperCase()}`;

  const itemRows = items.map(i => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${i.product_name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${Number(i.unit_price).toLocaleString()}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${Number(i.total_price).toLocaleString()}</td>
    </tr>`).join('');

  const gstRows = isKarnataka
    ? `<tr><td colspan="3" style="padding:6px 8px;text-align:right;color:#666">CGST (${gstRate / 2}%)</td><td style="padding:6px 8px;text-align:right">₹${cgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>
       <tr><td colspan="3" style="padding:6px 8px;text-align:right;color:#666">SGST (${gstRate / 2}%)</td><td style="padding:6px 8px;text-align:right">₹${sgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>`
    : `<tr><td colspan="3" style="padding:6px 8px;text-align:right;color:#666">IGST (${gstRate}%)</td><td style="padding:6px 8px;text-align:right">₹${igst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>`;

  return `<!DOCTYPE html><html><head><title>Invoice - ${invoiceNo}</title>
  <style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#333}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px}
  .logo{font-size:22px;font-weight:bold;color:#16a34a}
  table{width:100%;border-collapse:collapse}th{background:#f9fafb;padding:10px;text-align:left;border-bottom:2px solid #e5e7eb}
  .total-row{font-weight:bold;font-size:16px}.btn{background:#16a34a;color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;margin-right:10px}
  @media print{.no-print{display:none}}</style></head>
  <body>
  <div class="no-print" style="margin-bottom:20px">
    <button class="btn" onclick="window.print()">🖨️ Print Invoice</button>
  </div>
  <div class="header">
    <div>
      <div class="logo">SGB Agro Industries</div>
      <div style="color:#555;font-size:11px">A unit of Sri Gowri Bhargava Pvt. Ltd.</div>
      <div style="color:#16a34a;font-size:12px;font-style:italic;margin-top:2px">Smart Machines. Simple Farming. Stronger Farmers.</div>
      <div style="color:#666;font-size:12px;margin-top:6px">Opp. Municipal Ground, Near JMJ Talkies<br>Koppa, Karnataka – 577126</div>
      <div style="color:#666;font-size:12px;margin-top:2px">📞 08277009667 | 🌐 www.sgbagroindustries.com</div>
      ${settings?.gstin ? `<div style="color:#666;font-size:11px;margin-top:2px">GSTIN: ${settings.gstin}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div style="font-size:20px;font-weight:bold">TAX INVOICE</div>
      <div style="color:#666;font-size:13px">${invoiceNo}</div>
      <div style="color:#666;font-size:13px">${new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
    <div style="background:#f9fafb;padding:16px;border-radius:8px">
      <div style="font-weight:bold;margin-bottom:8px">Bill To</div>
      <div>${order.customer_name}</div>
      <div style="color:#666;font-size:13px">${order.phone}</div>
      <div style="color:#666;font-size:13px">${order.address}</div>
      ${order.gst_number ? `<div style="color:#666;font-size:12px;margin-top:4px">GSTIN: ${order.gst_number}</div>` : ''}
    </div>
    <div style="background:#f9fafb;padding:16px;border-radius:8px">
      <div style="font-weight:bold;margin-bottom:8px">Payment Info</div>
      <div>Status: <span style="color:${order.payment_status === 'paid' ? '#16a34a' : '#dc2626'};font-weight:bold;text-transform:capitalize">${order.payment_status}</span></div>
      <div style="color:#666;font-size:13px">Order Status: ${order.order_status.replace(/_/g, ' ')}</div>
      <div style="color:#666;font-size:12px;margin-top:4px">Supply Type: ${isKarnataka ? 'Intra-State (Karnataka)' : 'Inter-State'}</div>
    </div>
  </div>
  <table><thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${itemRows}
  <tr><td colspan="3" style="padding:8px;text-align:right;color:#666">Subtotal</td><td style="padding:8px;text-align:right">₹${subtotal.toLocaleString()}</td></tr>
  ${gstRows}
  <tr class="total-row"><td colspan="3" style="padding:12px;text-align:right;border-top:2px solid #e5e7eb">Grand Total</td>
  <td style="padding:12px;text-align:right;border-top:2px solid #e5e7eb">₹${grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>
  </tbody></table>
  <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;color:#666;font-size:12px;text-align:center">
    Thank you for choosing SGB Agro Industries! 🌾<br>
    Smart Machines. Simple Farming. Stronger Farmers.<br>
    📞 08277009667 | www.sgbagroindustries.com
  </div></body></html>`;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const BillingDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabFromUrl = searchParams.get('tab') || 'new-order';
  const fromInquiryId = searchParams.get('from_inquiry');
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: products } = useProducts();
  const { data: orders } = useOrdersWithTracking();
  const filteredOrders = useOrderSearch(orders, searchQuery);
  const createOrder = useCreateOrder();
  const cancelOrder = useCancelOrder();

  // New order form state
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('cod_pending');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [convertingInquiryId, setConvertingInquiryId] = useState<string | null>(null);
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [prefillData, setPrefillData] = useState<any | null>(null);

  // Warehouse + shipping state
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [shippingProvider, setShippingProvider] = useState('');
  const [shippingCharge, setShippingCharge] = useState<number | null>(null);
  const [showVRLCalc, setShowVRLCalc] = useState(false);

  // Fulfillment plan state
  const [fulfillmentPlan, setFulfillmentPlan] = useState<FulfillmentPlan | null>(null);
  const [fulfillmentLoading, setFulfillmentLoading] = useState(false);
  const [fulfillmentError, setFulfillmentError] = useState<string | null>(null);

  // Cancel order state
  const [cancelDialog, setCancelDialog] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Sync activeTab with URL
  useEffect(() => { setActiveTab(tabFromUrl); }, [tabFromUrl]);

  // FIX 3: Load prefill from inquiry ID in URL — survives refresh, no sessionStorage
  useEffect(() => {
    if (!fromInquiryId || activeTab !== 'new-order') return;
    async function loadFromInquiry() {
      const { data: inquiry } = await (supabase as any)
        .from('inquiries')
        .select('*')
        .eq('id', fromInquiryId)
        .single();
      if (!inquiry) return;
      const normalised = {
        customer_name: inquiry.customer_name ?? '',
        phone: inquiry.phone_number ?? '',
        street_address: inquiry.delivery_address ?? '',
        city: inquiry.delivery_city ?? '',
        state: 'Karnataka',
        payment_method: inquiry.payment_method ?? 'Cash on Delivery',
        agreed_price: inquiry.agreed_price ?? 0,
        discount: inquiry.discount ?? 0,
        notes: inquiry.notes ?? '',
        inquiry_id: inquiry.id,
        products: (() => {
          try {
            const pj = inquiry.products_json;
            const arr = Array.isArray(pj) ? pj : (pj ? JSON.parse(pj) : []);
            if (arr.length > 0) return arr;
          } catch {}
          return inquiry.product_name ? [{ product_name: inquiry.product_name, quantity: inquiry.quantity ?? 1 }] : [];
        })(),
      };
      setPrefillData(normalised);
      setPrefillApplied(false);
    }
    loadFromInquiry();
  }, [fromInquiryId, activeTab]);

  // Phase 2: Apply prefill only after products are loaded
  useEffect(() => {
    if (!prefillData || prefillApplied || !products || products.length === 0) return;

    if (prefillData.inquiry_id) setConvertingInquiryId(prefillData.inquiry_id);
    if (prefillData.customer_name) setCustomerName(prefillData.customer_name);
    if (prefillData.phone) setPhone(prefillData.phone);
    if (prefillData.street_address) setAddress(prefillData.street_address);
    if (prefillData.city) setCity(prefillData.city);
    if (prefillData.state) setState(prefillData.state);
    if (prefillData.payment_method) {
      setPaymentMethod(prefillData.payment_method);
      // Also derive the correct payment status
      const m = prefillData.payment_method;
      if (m === 'UPI' || m === 'Bank Transfer') setPaymentStatus('paid');
      else if (m === 'Cash on Delivery') setPaymentStatus('cod_pending');
      else if (m === 'Cheque') setPaymentStatus('cheque_pending');
      else setPaymentStatus(m); // fallback (e.g. 'unpaid')
    }

    if (prefillData.products?.length > 0) {
      const matched: OrderItem[] = prefillData.products
        .map((p: any) => {
          const pName = (p.product_name ?? '').toLowerCase();
          const words = pName.split(' ').slice(0, 2).join(' ');
          const found = products.find(prod => {
            const dName = prod.product_name.toLowerCase();
            return dName.includes(words) || pName.includes(dName.split(' ').slice(0, 2).join(' '));
          });
          if (!found) return null;
          const price = prefillData.agreed_price && prefillData.products.length === 1
            ? prefillData.agreed_price
            : found.price;
          return {
            product_id: found.id,
            product_name: found.product_name,
            quantity: p.quantity ?? 1,
            unit_price: price,
            total_price: price * (p.quantity ?? 1),
          };
        })
        .filter(Boolean) as OrderItem[];
      if (matched.length > 0) setItems(matched);
    }

    setPrefillApplied(true);
    toast.success(`✅ Order pre-filled from sales agent inquiry`);
  }, [prefillData, prefillApplied, products]);

  // Auto-compute fulfillment plan when items or city changes
  useEffect(() => {
    const validItems = items.filter(i => i.product_id);
    if (validItems.length === 0 || !city.trim()) {
      setFulfillmentPlan(null);
      setFulfillmentError(null);
      return;
    }
    setFulfillmentLoading(true);
    setFulfillmentError(null);
    planFulfillment(
      '',
      city.trim(),
      validItems.map(i => ({ product_id: i.product_id, quantity: i.quantity, product_name: i.product_name }))
    )
      .then(plan => {
        setFulfillmentPlan(plan);
        // Auto-set primary warehouse from plan
        if (plan.shipments.length > 0) setSelectedWarehouseId(plan.shipments[0].warehouseId);
      })
      .catch(e => setFulfillmentError(e.message ?? 'Could not compute fulfillment plan'))
      .finally(() => setFulfillmentLoading(false));
  }, [items, city]);

  const addItem = () => {
    const product = products?.find(p => p.id === selectedProduct);
    if (!product) return;
    const existing = items.find(i => i.product_id === selectedProduct);
    if (existing) {
      setItems(items.map(i => i.product_id === selectedProduct ? { ...i, quantity: i.quantity + quantity, total_price: (i.quantity + quantity) * i.unit_price } : i));
    } else {
      setItems([...items, { product_id: product.id, product_name: product.product_name, quantity, unit_price: product.price, total_price: product.price * quantity }]);
    }
    setSelectedProduct(''); setQuantity(1);
  };

  const updateItemQuantity = (productId: string, newQty: number) => {
    if (newQty < 1) return;
    setItems(items.map(i => i.product_id === productId ? { ...i, quantity: newQty, total_price: newQty * i.unit_price } : i));
  };

  const removeItem = (productId: string) => setItems(items.filter(i => i.product_id !== productId));
  const totalAmount = items.reduce((sum, i) => sum + i.total_price, 0);

  const handleSubmit = async () => {
    if (!customerName.trim()) { toast.error('Please enter customer name'); return; }
    if (!phone.trim()) { toast.error('Please enter phone number'); return; }
    if (!address.trim()) { toast.error('Please enter street address'); return; }
    if (!city.trim()) { toast.error('Please enter city'); return; }
    if (!state.trim()) { toast.error('Please enter state'); return; }
    if (!pincode.trim()) { toast.error('Please enter pincode'); return; }
    if (!/^\d{6}$/.test(pincode.trim())) { toast.error('Pincode must be exactly 6 digits'); return; }
    if (items.length === 0) { toast.error('Please add at least one product'); return; }
    try {
      const fullAddress = `${address.trim()}, ${city.trim()}, ${state.trim()} - ${pincode.trim()}`;
      const order = await createOrder.mutateAsync({
        customer_name: customerName.trim(), phone: phone.trim(), address: fullAddress,
        city: city.trim(), state: state.trim(), pincode: pincode.trim(),
        total_amount: totalAmount,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        total_paid: prefillData?.total_paid ?? undefined,
        upi_id: prefillData?.upi_id ?? undefined,
        shipping_provider: shippingProvider || undefined,
        shipping_charge: shippingCharge ?? undefined,
        // FIX 1: Pass warehouse splits so stock is reserved atomically at billing time
        warehouseSplits: fulfillmentPlan?.shipments.flatMap(s =>
          s.items.map(item => ({
            warehouse_id: s.warehouseId,
            product_id: item.productId,
            quantity: item.quantity,
          }))
        ) ?? [],
        items,
      });
      // Assign selected warehouse (manual selection takes priority over AI)
      if (order) {
        const warehouseId = selectedWarehouseId || await selectBestWarehouse(city.trim());
        if (warehouseId) {
          await supabase.from('orders').update({ assigned_warehouse_id: warehouseId } as any).eq('id', order.id);
        }
        // Save split plan to order_warehouse_splits
        if (fulfillmentPlan && fulfillmentPlan.shipments.length > 0) {
          const splitRows = fulfillmentPlan.shipments.flatMap(shipment =>
            shipment.items.map(item => ({
              order_id: order.id,
              warehouse_id: shipment.warehouseId,
              product_id: item.productId,
              quantity: item.quantity,
              status: 'pending',
            }))
          );
          await (supabase as any).from('order_warehouse_splits').insert(splitRows);
        }
      }
      if (convertingInquiryId) {
        await (supabase as any).from('inquiries').update({ status: 'converted' }).eq('id', convertingInquiryId);
        setConvertingInquiryId(null);
      }
      toast.success('Order created and sent to packing!');
      setCustomerName(''); setPhone(''); setAddress(''); setCity(''); setState(''); setPincode('');
      setItems([]); setPaymentStatus('cod_pending'); setPaymentMethod('Cash on Delivery');
      setSelectedWarehouseId(''); setShippingProvider(''); setShippingCharge(null);
      setPrefillData(null); setPrefillApplied(false);
      setFulfillmentPlan(null); setFulfillmentError(null);
    } catch (e: any) { toast.error(e.message || 'Failed to create order'); }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { toast.error('Please enter a cancellation reason'); return; }
    try {
      await cancelOrder.mutateAsync({ orderId: cancelDialog.id, reason: cancelReason });
      await notifyOrderCancelled(cancelDialog.customer_name, cancelDialog.phone, cancelReason);
      toast.success('Order cancelled');
      setCancelDialog(null); setCancelReason('');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleGenerateInvoice = async (order: any) => {
    const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    const { data: settings } = await (supabase as any).from('company_settings').select('*').single();
    const html = generateInvoiceHTML(order, orderItems ?? [], settings);
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const handleCODReminder = async (order: any) => {
    await notifyCODReminder(order.customer_name, order.phone, Number(order.total_amount));
    toast.success('COD reminder sent via WhatsApp');
  };

  // FIX 3: Navigate to new-order tab with inquiry ID in URL
  const handleNavigateToOrder = (inquiryId: string) => {
    navigate(`/billing?tab=new-order&from_inquiry=${inquiryId}`);
  };

  // COD delivered but unpaid orders
  const codPendingOrders = orders?.filter(o => o.order_status === 'shipped' && o.payment_status === 'unpaid') ?? [];

  const paymentStatusColor = (s: string) => {
    if (s === 'paid') return 'bg-green-100 text-green-700';
    if (s === 'partial') return 'bg-amber-100 text-amber-700';
    if (s === 'cancelled') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <DashboardLayout>
      <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <AnnouncementBanner role="billing" />

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <ErrorBoundary>
            <PageTransition tabKey="dashboard">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <GlowingStatCard title="Total Orders" value={orders?.length || 0} icon={ShoppingCart} color="green" />
                <GlowingStatCard title="Total Revenue" value={`₹${(orders?.reduce((s, o) => s + Number(o.total_amount), 0) || 0).toLocaleString()}`} icon={DollarSign} color="green" />
                <GlowingStatCard title="Pending Orders" value={orders?.filter(o => o.order_status !== 'shipped').length || 0} icon={Clock} color="amber" />
              </div>

              {/* COD Pending Section */}
              {codPendingOrders.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-700">
                      <AlertCircle className="h-5 w-5" /> Pending COD Payments
                      <Badge className="bg-amber-500 text-white">{codPendingOrders.length}</Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Delivered orders with unpaid COD</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Customer</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Amount</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Date</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {codPendingOrders.map(o => (
                          <TableRow key={o.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="py-3">
                              <div className="font-medium">{o.customer_name}</div>
                              <div className="text-xs text-muted-foreground">{o.phone}</div>
                            </TableCell>
                            <TableCell className="py-3 font-medium">₹{Number(o.total_amount).toLocaleString()}</TableCell>
                            <TableCell className="py-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="py-3">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs gap-1" onClick={() => handleCODReminder(o)}>
                                <MessageSquare className="h-3 w-3" /> Send Reminder
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Payment Status</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={[
                          { name: 'Paid', value: orders?.filter(o => o.payment_status === 'paid').length || 0 },
                          { name: 'COD Pending', value: orders?.filter(o => o.payment_status === 'cod_pending').length || 0 },
                          { name: 'Cheque Pending', value: orders?.filter(o => o.payment_status === 'cheque_pending').length || 0 },
                          { name: 'Pending', value: orders?.filter(o => o.payment_status === 'pending').length || 0 },
                        ]} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} innerRadius={35} paddingAngle={3} dataKey="value">
                          <Cell fill="#16a34a" /><Cell fill="#d97706" /><Cell fill="#2563eb" /><Cell fill="#dc2626" />
                        </Pie>
                        <Tooltip contentStyle={{ background: 'white', border: '0.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '8px 12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Daily Revenue (Last 7 Days)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={(() => {
                        const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().split('T')[0]; });
                        return last7.map(date => ({ date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: orders?.filter(o => o.created_at.startsWith(date)).reduce((s, o) => s + Number(o.total_amount), 0) || 0 }));
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis />
                        <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                        <Bar dataKey="revenue" fill="hsl(145, 63%, 42%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
            </PageTransition>
          </ErrorBoundary>
        )}

        {/* New Order Tab */}
        {activeTab === 'new-order' && (
          <ErrorBoundary>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Create New Order</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Customer Name <span className="text-destructive">*</span></Label>
                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Enter customer name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone <span className="text-destructive">*</span></Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="8867724616" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Street Address <span className="text-destructive">*</span></Label>
                  <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="House/Flat No., Street, Area" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>City <span className="text-destructive">*</span></Label>
                    <Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g., Hubli" />
                  </div>
                  <div className="space-y-2">
                    <Label>State <span className="text-destructive">*</span></Label>
                    <Input value={state} onChange={e => setState(e.target.value)} placeholder="e.g., Karnataka" />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode <span className="text-destructive">*</span></Label>
                    <Input value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="580001" maxLength={6} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Method <span className="text-destructive">*</span></Label>
                  {prefillData ? (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                      <span className="text-sm font-medium">{paymentMethod}</span>
                      <Badge variant="outline" className="text-xs">Set by agent</Badge>
                    </div>
                  ) : (
                    <Select value={paymentMethod} onValueChange={(val) => {
                      setPaymentMethod(val);
                      if (val === 'UPI' || val === 'Bank Transfer') setPaymentStatus('paid');
                      else if (val === 'Cash on Delivery') setPaymentStatus('cod_pending');
                      else if (val === 'Cheque') setPaymentStatus('cheque_pending');
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPI">UPI — Paid immediately</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer — Paid immediately</SelectItem>
                        <SelectItem value="Cheque">Cheque — Collect at delivery</SelectItem>
                        <SelectItem value="Cash on Delivery">Cash on Delivery — Collect on delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Fulfillment Plan Panel — replaces static warehouse dropdown */}
                <div className="space-y-2">
                  <Label>Fulfillment Plan</Label>
                  {!city.trim() || items.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                      Add products and enter city to see fulfillment plan
                    </div>
                  ) : fulfillmentLoading ? (
                    <div className="rounded-lg border p-3 text-xs text-muted-foreground animate-pulse">
                      Checking warehouse stock...
                    </div>
                  ) : fulfillmentError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                      ❌ {fulfillmentError}
                    </div>
                  ) : fulfillmentPlan ? (
                    <div className={`rounded-lg border p-3 space-y-2 ${fulfillmentPlan.type === 'single' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {fulfillmentPlan.type === 'single' ? '✅ Single Shipment' : `⚠️ Split Shipment — ${fulfillmentPlan.shipments.length} warehouses`}
                        </span>
                        <Badge variant="outline" className="text-xs">{fulfillmentPlan.totalDeliveryDays}d delivery</Badge>
                      </div>
                      <div className="space-y-1.5">
                        {fulfillmentPlan.shipments.map((s, i) => (
                          <div key={i} className="rounded-md bg-white/70 border px-3 py-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">🏭 {s.warehouseName}</span>
                              <span className="text-muted-foreground">{Math.round(s.distanceKm)} km · {s.deliveryDays}d</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {s.items.map((item, j) => (
                                <span key={j} className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                                  {item.quantity}× {item.productName}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{fulfillmentPlan.explanation}</p>
                    </div>
                  ) : null}
                </div>

                {/* Shipping Provider */}
                <div className="space-y-2">
                  <Label>Shipping Provider</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['VRL Logistics', 'India Post'] as const).map(p => {
                      const icons: Record<string, string> = { 'VRL Logistics': '🚛', 'India Post': '📮' };
                      const descs: Record<string, string> = { 'VRL Logistics': 'Door-to-door, faster', 'India Post': 'Nearest post office' };
                      const isSelected = shippingProvider === p;
                      return (
                        <button key={p} type="button" onClick={() => setShippingProvider(p)}
                          className={`p-3 border-2 rounded-lg text-left transition-all ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{icons[p]}</span>
                            <div>
                              <p className="text-sm font-medium">{p}</p>
                              <p className="text-xs text-muted-foreground">{descs[p]}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* VRL Calculator — split-aware */}
                  {shippingProvider === 'VRL Logistics' && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-blue-700">
                          VRL Shipping Charge
                          {fulfillmentPlan?.type === 'split' && <span className="ml-1 text-xs text-blue-500">(split — {fulfillmentPlan.shipments.length} legs)</span>}
                        </p>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowVRLCalc(true)}>
                          <Calculator className="h-3 w-3" /> Calculate
                        </Button>
                      </div>
                      {shippingCharge != null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-blue-700">₹{shippingCharge.toLocaleString()}</span>
                          <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground" onClick={() => setShippingCharge(null)}>Clear</Button>
                        </div>
                      ) : (
                        <p className="text-xs text-blue-600">Click Calculate to compute charge based on distance and weight</p>
                      )}
                    </div>
                  )}
                  {shippingProvider === 'India Post' && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-sm text-gray-700">📮 India Post — standard rates apply</p>
                      <p className="text-xs text-muted-foreground mt-1">Enter shipping charge manually</p>
                      <Input type="number" min="0" placeholder="Shipping charge ₹ (optional)" className="mt-2 h-8"
                        value={shippingCharge ?? ''} onChange={e => setShippingCharge(e.target.value ? parseFloat(e.target.value) : null)} />
                    </div>
                  )}
                </div>
                <div className="border-t pt-4">
                  <Label className="mb-2 block">Add Products <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.product_name} — ₹{p.price.toLocaleString()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-20" />
                    <Button onClick={addItem} size="icon" disabled={!selectedProduct}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
                {items.length > 0 && (
                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.product_id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="flex-1">{item.product_name}</span>
                          <span className="text-muted-foreground">×</span>
                          <Input type="number" min={1} value={item.quantity} onChange={e => updateItemQuantity(item.product_id, Number(e.target.value))} className="w-16 h-8 text-center" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">₹{item.total_price.toLocaleString()}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(item.product_id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                    <div className="space-y-1 border-t pt-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span><span>₹{totalAmount.toLocaleString()}</span>
                      </div>
                      {shippingCharge != null && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Shipping ({shippingProvider})</span>
                          <span>{shippingCharge === 0 ? 'Free' : `₹${shippingCharge.toLocaleString()}`}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-heading font-bold border-t pt-1">
                        <span>Grand Total</span>
                        <span>₹{(totalAmount + (shippingCharge ?? 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* VRL Calculator — split-aware */}
                {(() => {
                  return (
                    <VRLCalculator
                      open={showVRLCalc}
                      onClose={() => setShowVRLCalc(false)}
                      plan={fulfillmentPlan}
                      customerCity={city}
                      products={products ?? []}
                      items={items.map(i => ({ product_id: i.product_id, quantity: i.quantity }))}
                      onApply={(charge) => setShippingCharge(charge)}
                    />
                  );
                })()}
                <Button className="w-full" onClick={handleSubmit} disabled={createOrder.isPending || !customerName || !phone || !address || !city || !state || !pincode || items.length === 0}>
                  {createOrder.isPending ? 'Creating Order...' : 'Create Order & Send to Packing'}
                </Button>
              </CardContent>
            </Card>
          </ErrorBoundary>
        )}

        {/* Order History Tab */}
        {activeTab === 'history' && (
          <ErrorBoundary>
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle>Billing History</CardTitle>
                  <OrderSearch value={searchQuery} onChange={setSearchQuery} />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Customer</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Amount</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Payment</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Status</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Date</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders?.map(order => (
                      <TableRow key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm shrink-0">
                              {order.customer_name?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{order.customer_name}</div>
                              <div className="text-xs text-muted-foreground">{order.phone}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">₹{Number(order.total_amount).toLocaleString()}</TableCell>
                        <TableCell className="py-3">
                          <PaymentBadge order={order as any} />
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={order.order_status === 'shipped' ? 'status-shipped' : order.order_status.includes('packing') ? 'status-pending' : 'status-packed'}>
                            {order.order_status.replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleGenerateInvoice(order)}>
                              <Printer className="h-3 w-3" /> Invoice
                            </Button>
                            {order.order_status !== 'shipped' && order.order_status !== 'cancelled' && (
                              <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => { setCancelDialog(order); setCancelReason(''); }}>
                                <XCircle className="h-3 w-3" /> Cancel
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!filteredOrders || filteredOrders.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <ShoppingCart className="h-8 w-8 opacity-30" />
                            <p className="font-medium">{searchQuery ? 'No orders found matching your search' : 'No orders yet'}</p>
                            {!searchQuery && <p className="text-xs">Create your first order using the New Order tab</p>}
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

        {/* Inquiries Tab */}
        {activeTab === 'inquiries' && <ErrorBoundary><AgentConfirmedLeads onNavigateToOrder={handleNavigateToOrder} /></ErrorBoundary>}

        {/* Cancel Order Dialog */}
        <Dialog open={!!cancelDialog} onOpenChange={open => !open && setCancelDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-destructive" /> Cancel Order</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cancel order for <span className="font-medium">{cancelDialog?.customer_name}</span> — ₹{Number(cancelDialog?.total_amount ?? 0).toLocaleString()}?
              </p>
              <div className="space-y-2">
                <Label>Cancellation Reason <span className="text-destructive">*</span></Label>
                <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="e.g., Customer requested cancellation, Out of stock..." rows={3} />
              </div>
              <p className="text-xs text-muted-foreground">Stock will be restored and customer will be notified via WhatsApp.</p>
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1" onClick={handleCancel} disabled={cancelOrder.isPending}>
                  {cancelOrder.isPending ? 'Cancelling...' : 'Confirm Cancel'}
                </Button>
                <Button variant="outline" onClick={() => setCancelDialog(null)}>Back</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Panel Dialog — removed, payment is set by agent */}
      </motion.div>
    </DashboardLayout>
  );
};

export default BillingDashboard;
