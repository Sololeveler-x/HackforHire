import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, PhoneCall, TrendingUp, Users, ShoppingCart, DollarSign, Package, MessageSquare, Clock, AlertCircle, Calendar, Phone, MessageCircle } from 'lucide-react';
import { useAgentLeads, useAgentStats, useUpdateCallStatus, useSubmitConfirmedOrder, useMarkNotInterested, useRescheduleCallback, AgentLead, NOT_INTERESTED_REASONS, isCallbackReason, isFollowUpReason } from '@/hooks/useSalesAgent';
import { useProducts } from '@/hooks/useProducts';
import { useOwnProfile, useCompleteProfile } from '@/hooks/useTeam';
import { useOwnTarget } from '@/hooks/useTargetsAndZones';
import { useAuth } from '@/contexts/AuthContext';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhone } from '@/utils/phoneUtils';
import { GlowingStatCard } from '@/components/ui/GlowingStatCard';
import { PageTransition } from '@/components/ui/PageTransition';


const callStatusConfig: Record<string, { label: string; variant: string }> = {
  not_called: { label: 'Not Called', variant: 'secondary' },
  called: { label: 'Called', variant: 'default' },
  callback_scheduled: { label: 'Callback Scheduled', variant: 'outline' },
  needs_follow_up: { label: 'Needs Follow-up', variant: 'outline' },
  not_interested: { label: 'Not Interested', variant: 'destructive' },
  submitted: { label: 'Submitted', variant: 'outline' },
};
const sourceConfig: Record<string, { label: string; className: string }> = {
  whatsapp_ad: { label: '📢 Ad', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  whatsapp_direct: { label: '💬 Direct', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  agent_confirmed: { label: '✅ Agent', className: 'bg-green-100 text-green-700 border-green-200' },
};
function callbackUrgency(dateStr: string | null): 'overdue' | 'today' | 'upcoming' | null {
  if (!dateStr) return null;
  const cb = new Date(dateStr), now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  if (cb < todayStart) return 'overdue';
  if (cb < todayEnd) return 'today';
  return 'upcoming';
}
const urgencyStyle = { overdue: 'text-red-600 font-semibold', today: 'text-amber-600 font-semibold', upcoming: 'text-green-600' };

// ProductPills
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

// OrderItem type
interface OrderItem {
  product_id: string; product_name: string; quantity: number;
  agreed_price: number; floor_price: number; target_price: number;
  mrp: number;
}

// Stock types
interface WarehouseStock { warehouse_id: string; stock_quantity: number; warehouses: { warehouse_name: string; city: string } | null; }
interface StockStatus { available: boolean; splitRequired: boolean; totalStock: number; message: string; warehouses: WarehouseStock[]; splits?: { warehouse_id: string; warehouse_name: string; quantity: number }[]; }

function calcSplit(warehouses: WarehouseStock[], needed: number) {
  const splits: { warehouse_id: string; warehouse_name: string; quantity: number }[] = [];
  let rem = needed;
  for (const w of warehouses) {
    if (rem <= 0) break;
    const take = Math.min(w.stock_quantity, rem);
    splits.push({ warehouse_id: w.warehouse_id, warehouse_name: w.warehouses?.warehouse_name ?? 'Unknown', quantity: take });
    rem -= take;
  }
  return splits;
}

async function checkStock(productId: string, quantity: number): Promise<StockStatus> {
  const { data } = await (supabase as any).from('warehouse_inventory')
    .select('stock_quantity, warehouse_id, warehouses(warehouse_name, city)')
    .eq('product_id', productId).gt('stock_quantity', 0).order('stock_quantity', { ascending: false });
  const wh: WarehouseStock[] = data ?? [];
  const total = wh.reduce((s, w) => s + w.stock_quantity, 0);
  if (quantity > total) return { available: false, splitRequired: false, totalStock: total, message: `Only ${total} units available`, warehouses: wh };
  const single = wh.find(w => w.stock_quantity >= quantity);
  if (single) return { available: true, splitRequired: false, totalStock: total, message: `${quantity} units at ${single.warehouses?.warehouse_name ?? 'warehouse'}`, warehouses: wh };
  const splits = calcSplit(wh, quantity);
  return { available: true, splitRequired: true, totalStock: total, message: splits.map(s => `${s.quantity} from ${s.warehouse_name}`).join(' + '), warehouses: wh, splits };
}
// NotInterested Modal
function NotInterestedModal({ lead, onClose }: { lead: AgentLead | null; onClose: () => void }) {
  const markNotInterested = useMarkNotInterested();
  const [reason, setReason] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const needsCallback = reason ? isCallbackReason(reason) : false;
  const needsFollowUp = reason ? isFollowUpReason(reason) : false;
  const isGenuine = reason === 'Genuinely not interested';
  const handleSave = async () => {
    if (!lead || !reason) { toast.error('Please select a reason'); return; }
    if (isGenuine && !confirmClose) { setConfirmClose(true); return; }
    let cbDatetime: string | null = null;
    if (needsCallback) {
      if (!callbackDate) { toast.error('Please set a callback date'); return; }
      cbDatetime = callbackTime ? new Date(`${callbackDate}T${callbackTime}`).toISOString() : new Date(`${callbackDate}T09:00`).toISOString();
    }
    try {
      await markNotInterested.mutateAsync({ id: lead.id, reason, call_notes: callNotes, callback_date: cbDatetime });
      toast.success(needsCallback ? 'Callback scheduled!' : needsFollowUp ? 'Marked for follow-up' : 'Lead closed');
      onClose();
    } catch (e: any) { toast.error(e.message ?? 'Failed'); }
  };
  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Not Interested — {lead?.customer_name}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={(v) => { setReason(v); setConfirmClose(false); }}>
              <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
              <SelectContent>{NOT_INTERESTED_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {needsCallback && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Callback Date *</Label><Input type="date" value={callbackDate} onChange={e => setCallbackDate(e.target.value)} min={new Date().toISOString().split('T')[0]} /></div>
              <div className="space-y-1"><Label>Callback Time</Label><Input type="time" value={callbackTime} onChange={e => setCallbackTime(e.target.value)} /></div>
            </div>
          )}
          {(needsCallback || needsFollowUp) && (
            <div className="space-y-1"><Label>What did customer say?</Label><Textarea rows={2} value={callNotes} onChange={e => setCallNotes(e.target.value)} placeholder="Notes from the call..." /></div>
          )}
          {isGenuine && confirmClose && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">Are you sure? This lead will be permanently closed.</div>}
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" variant={isGenuine ? 'destructive' : 'default'} onClick={handleSave} disabled={markNotInterested.isPending || !reason}>
              {markNotInterested.isPending ? 'Saving...' : isGenuine && !confirmClose ? 'Close Lead' : isGenuine ? 'Confirm Close' : needsCallback ? 'Schedule Callback' : 'Save'}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Reschedule Modal
function RescheduleModal({ lead, onClose }: { lead: AgentLead | null; onClose: () => void }) {
  const reschedule = useRescheduleCallback();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const handleSave = async () => {
    if (!lead || !date) { toast.error('Please pick a date'); return; }
    const dt = time ? new Date(`${date}T${time}`).toISOString() : new Date(`${date}T09:00`).toISOString();
    try { await reschedule.mutateAsync({ id: lead.id, callback_date: dt }); toast.success('Rescheduled!'); onClose(); }
    catch (e: any) { toast.error(e.message ?? 'Failed'); }
  };
  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Reschedule — {lead?.customer_name}</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Date *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} /></div>
            <div className="space-y-1"><Label>Time</Label><Input type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={reschedule.isPending || !date}>{reschedule.isPending ? 'Saving...' : 'Reschedule'}</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// FollowUpSection
function FollowUpSection({ leads, onMarkCalled, onReschedule }: { leads: AgentLead[]; onMarkCalled: (l: AgentLead) => void; onReschedule: (l: AgentLead) => void }) {
  const todayEnd = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1);
  const followUps = leads.filter(l => l.call_status === 'callback_scheduled' && l.callback_date && new Date(l.callback_date) < todayEnd)
    .sort((a, b) => new Date(a.callback_date!).getTime() - new Date(b.callback_date!).getTime());
  if (followUps.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-500" /><h3 className="font-semibold text-sm">Follow-ups Due ({followUps.length})</h3></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {followUps.map(lead => {
          const urgency = callbackUrgency(lead.callback_date);
          return (
            <div key={lead.id} className="rounded-lg border p-3 space-y-2 bg-card">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-medium text-sm">{lead.customer_name}</p><p className="text-xs text-muted-foreground">{lead.phone_number}</p></div>
                <span className={`text-xs ${urgency ? urgencyStyle[urgency] : ''}`}>{urgency === 'overdue' ? '🔴 Overdue' : urgency === 'today' ? '🟡 Today' : '🟢 Upcoming'}</span>
              </div>
              <ProductPills productsJson={lead.products_json} productName={lead.product_name} />
              {lead.callback_date && <p className={`text-xs flex items-center gap-1 ${urgency ? urgencyStyle[urgency] : ''}`}><Clock className="h-3 w-3" />{new Date(lead.callback_date).toLocaleString()}</p>}
              {lead.call_notes && <p className="text-xs text-muted-foreground italic">"{lead.call_notes}"</p>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => window.open(`tel:${lead.phone_number}`)}><Phone className="h-3 w-3" /> Call Now</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onMarkCalled(lead)}>Mark Called</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onReschedule(lead)}><Calendar className="h-3 w-3" /></Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// LeadRow
function LeadRow({ lead, onNotInterested, onSubmitOrder }: { lead: AgentLead; onNotInterested: (l: AgentLead) => void; onSubmitOrder: (l: AgentLead) => void }) {
  const updateCallStatus = useUpdateCallStatus();
  const src = sourceConfig[lead.source ?? ''] ?? { label: lead.source ?? '—', className: 'bg-gray-100 text-gray-700' };
  const cs = callStatusConfig[lead.call_status ?? 'not_called'];
  const { data: history } = useQuery({
    queryKey: ['customer_history', lead.phone_number],
    queryFn: async () => { const { data } = await (supabase as any).from('orders').select('id').eq('phone', lead.phone_number); return data ?? []; },
    enabled: !!lead.phone_number,
  });
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{lead.customer_name}</div>
        <div className="text-xs text-muted-foreground">{lead.phone_number}</div>
        {history && history.length > 0 ? <Badge className="text-xs mt-0.5 bg-blue-100 text-blue-700 border-blue-200">Returning ×{history.length}</Badge> : <Badge variant="outline" className="text-xs mt-0.5">New</Badge>}
      </TableCell>
      <TableCell><ProductPills productsJson={lead.products_json} productName={lead.product_name} /></TableCell>
      <TableCell>{lead.delivery_city ?? '—'}</TableCell>
      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full border ${src.className}`}>{src.label}</span></TableCell>
      <TableCell className="text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleString()}</TableCell>
      <TableCell>
        <Badge variant={cs.variant as any}>{cs.label}</Badge>
        {lead.callback_date && <div className={`text-xs mt-0.5 ${callbackUrgency(lead.callback_date) === 'overdue' ? 'text-red-500' : 'text-muted-foreground'}`}>{new Date(lead.callback_date).toLocaleDateString()}</div>}
      </TableCell>
      <TableCell>
        <div className="flex gap-1 flex-wrap">
          {lead.call_status !== 'submitted' && lead.call_status !== 'not_interested' && (
            <>
              {lead.call_status === 'not_called' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateCallStatus.mutateAsync({ id: lead.id, call_status: 'called' }).then(() => toast.success('Marked as called'))}>Mark Called</Button>}
              <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-green-600 border-green-200 hover:bg-green-50" onClick={() => window.open(`https://wa.me/91${lead.phone_number.replace(/\D/g, '')}`, '_blank')}><MessageCircle className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => onNotInterested(lead)}>Not Interested</Button>
              <Button size="sm" className="h-7 text-xs" onClick={() => onSubmitOrder(lead)}>Submit Order</Button>
            </>
          )}
          {lead.call_status === 'submitted' && <span className="text-xs text-muted-foreground">Sent to billing</span>}
          {lead.call_status === 'not_interested' && <span className="text-xs text-muted-foreground">Closed</span>}
        </div>
      </TableCell>
    </TableRow>
  );
}

// TabbedLeads
function TabbedLeads({ leads, onNotInterested, onSubmitOrder, onReschedule, onMarkCalled }: { leads: AgentLead[]; onNotInterested: (l: AgentLead) => void; onSubmitOrder: (l: AgentLead) => void; onReschedule: (l: AgentLead) => void; onMarkCalled: (l: AgentLead) => void }) {
  const todayEnd = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1);
  const tabs = [
    { id: 'followups', label: 'Follow Ups Today', leads: leads.filter(l => l.call_status === 'callback_scheduled' && l.callback_date && new Date(l.callback_date) < todayEnd), badgeClass: 'bg-red-500' },
    { id: 'new', label: 'New Leads', leads: leads.filter(l => l.status === 'assigned' && l.call_status === 'not_called'), badgeClass: 'bg-blue-500' },
    { id: 'inprogress', label: 'In Progress', leads: leads.filter(l => l.status === 'assigned' && (l.call_status === 'called' || l.call_status === 'needs_follow_up')), badgeClass: 'bg-amber-500' },
    { id: 'submitted', label: 'Submitted', leads: leads.filter(l => l.status === 'pending_billing' || l.call_status === 'submitted'), badgeClass: 'bg-green-500' },
    { id: 'upcoming', label: 'Upcoming Callbacks', leads: leads.filter(l => l.call_status === 'callback_scheduled' && l.callback_date && new Date(l.callback_date) >= todayEnd), badgeClass: 'bg-purple-500' },
  ];
  const [activeLeadTab, setActiveLeadTab] = useState(tabs[0].leads.length > 0 ? 'followups' : 'new');
  const current = tabs.find(t => t.id === activeLeadTab) ?? tabs[0];
  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap border-b pb-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveLeadTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeLeadTab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            {t.label}
            {t.leads.length > 0 && <span className={`text-xs text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${t.badgeClass}`}>{t.leads.length}</span>}
          </button>
        ))}
      </div>
      {activeLeadTab === 'followups' && <FollowUpSection leads={leads} onMarkCalled={onMarkCalled} onReschedule={onReschedule} />}
      {activeLeadTab !== 'followups' && (current.leads.length === 0 ? (
        <div className="py-16 text-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Users className="h-8 w-8 opacity-30" />
            <p className="font-medium">No leads in this category</p>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Customer</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Products</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">City</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Source</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Received</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{current.leads.map(lead => <LeadRow key={lead.id} lead={lead} onNotInterested={onNotInterested} onSubmitOrder={onSubmitOrder} />)}</TableBody>
        </Table>
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function SalesAgentDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const setTab = (t: string) => setSearchParams({ tab: t });
  const { user } = useAuth();
  const { data: ownProfile } = useOwnProfile(user?.id);
  const completeProfile = useCompleteProfile();
  const [profileForm, setProfileForm] = useState({ phone: '', city: '' });
  const [profileDismissed, setProfileDismissed] = useState(false);
  const showProfileBanner = ownProfile && !ownProfile.profile_completed && !profileDismissed;
  const ownTarget = useOwnTarget(user?.id);
  const { data: leads = [], isLoading } = useAgentLeads();
  const { data: stats } = useAgentStats();
  const { data: products = [] } = useProducts();
  const updateCallStatus = useUpdateCallStatus();
  const submitOrder = useSubmitConfirmedOrder();

  const [notInterestedLead, setNotInterestedLead] = useState<AgentLead | null>(null);
  const [rescheduleLead, setRescheduleLead] = useState<AgentLead | null>(null);
  const [selectedLead, setSelectedLead] = useState<AgentLead | null>(null);

  // Multi-product order state
  const emptyItem = (): OrderItem => ({ product_id: '', product_name: '', quantity: 1, agreed_price: 0, floor_price: 0, target_price: 0, mrp: 0 });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([emptyItem()]);
  const [orderMeta, setOrderMeta] = useState({ customer_name: '', phone_number: '', delivery_city: '', delivery_address: '', payment_method: '', notes: '' });
  const [upiId, setUpiId] = useState('');
  const [itemStockStatus, setItemStockStatus] = useState<Record<number, StockStatus | null>>({});
  const [itemStockLoading, setItemStockLoading] = useState<Record<number, boolean>>({});

  const urgentCount = leads.filter(l => l.call_status === 'callback_scheduled' && l.callback_date && new Date(l.callback_date) < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1)).length;

  const openForm = (lead: AgentLead) => {
    setSelectedLead(lead);
    setItemStockStatus({});
    setItemStockLoading({});
    const phone10 = normalizePhone(lead.phone_number);
    let parsedItems: OrderItem[] = [];
    try {
      const pj = lead.products_json;
      const arr: { product_name: string; quantity: number }[] = Array.isArray(pj) ? pj : (pj ? JSON.parse(pj as string) : []);
      parsedItems = arr.map(p => {
        const m = (products as any[]).find(x => x.product_name === p.product_name);
        return { product_id: m?.id ?? '', product_name: p.product_name, quantity: p.quantity, agreed_price: 0, floor_price: m?.floor_price ?? 0, target_price: m?.target_price ?? 0, mrp: m?.mrp ?? 0 };
      });
    } catch {}
    if (parsedItems.length === 0 && lead.product_name) {
      const m = (products as any[]).find(x => x.product_name === lead.product_name);
      parsedItems = [{ product_id: m?.id ?? '', product_name: lead.product_name, quantity: lead.quantity ?? 1, agreed_price: 0, floor_price: m?.floor_price ?? 0, target_price: m?.target_price ?? 0, mrp: m?.mrp ?? 0 }];
    }
    if (parsedItems.length === 0) parsedItems = [emptyItem()];
    setOrderItems(parsedItems);
    setOrderMeta({ customer_name: lead.customer_name, phone_number: phone10, delivery_city: lead.delivery_city ?? '', delivery_address: lead.delivery_address ?? '', payment_method: '', notes: lead.notes ?? '' });
    setUpiId('');
  };

  const updateItem = (idx: number, field: keyof OrderItem, value: any) => {
    setOrderItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'product_name') {
        const m = (products as any[]).find(x => x.product_name === value);
        return { ...item, product_name: value, product_id: m?.id ?? '', floor_price: m?.floor_price ?? 0, target_price: m?.target_price ?? 0, mrp: m?.mrp ?? 0, agreed_price: 0 };
      }
      return { ...item, [field]: value };
    }));
    if (field === 'quantity' || field === 'product_name') {
      const pid = field === 'product_name' ? ((products as any[]).find(x => x.product_name === value)?.id ?? '') : orderItems[idx].product_id;
      const qty = field === 'quantity' ? Number(value) : orderItems[idx].quantity;
      if (pid && qty > 0) {
        setItemStockLoading(prev => ({ ...prev, [idx]: true }));
        checkStock(pid, qty).then(s => { setItemStockStatus(prev => ({ ...prev, [idx]: s })); setItemStockLoading(prev => ({ ...prev, [idx]: false })); }).catch(() => setItemStockLoading(prev => ({ ...prev, [idx]: false })));
      } else { setItemStockStatus(prev => ({ ...prev, [idx]: null })); }
    }
  };

  const addItem = () => setOrderItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx: number) => {
    if (orderItems.length <= 1) return;
    setOrderItems(prev => prev.filter((_, i) => i !== idx));
    setItemStockStatus(prev => { const n = { ...prev }; delete n[idx]; return n; });
  };

  const orderTotal = orderItems.reduce((s, i) => s + (i.agreed_price * i.quantity), 0);

  const handleSubmitOrder = async () => {
    if (!selectedLead) return;
    if (!orderMeta.payment_method || !orderMeta.delivery_address) { toast.error('Please fill payment method and delivery address'); return; }
    if (orderItems.some(i => !i.product_name || i.quantity < 1)) { toast.error('Please fill all product rows'); return; }
    if (orderItems.some(i => i.floor_price > 0 && i.agreed_price > 0 && i.agreed_price < i.floor_price)) { toast.error('One or more prices are below floor price'); return; }
    if (Object.values(itemStockStatus).some(s => s && !s.available)) { toast.error('Insufficient stock for one or more products'); return; }

    const paymentStatus =
      orderMeta.payment_method === 'UPI' || orderMeta.payment_method === 'Bank Transfer' ? 'paid' :
      orderMeta.payment_method === 'Cash on Delivery' ? 'cod_pending' :
      orderMeta.payment_method === 'Cheque' ? 'cheque_pending' : 'pending';

    const productSummary = orderItems.map(i => `${i.quantity}x ${i.product_name}`).join(', ');
    try {
      await submitOrder.mutateAsync({
        id: selectedLead.id,
        customer_name: orderMeta.customer_name,
        phone_number: orderMeta.phone_number,
        product_name: productSummary,
        products_json: orderItems.map(i => ({ product_name: i.product_name, quantity: i.quantity, agreed_price: i.agreed_price })),
        quantity: orderItems.reduce((s, i) => s + i.quantity, 0),
        agreed_price: orderTotal,
        discount: 0,
        delivery_city: orderMeta.delivery_city,
        delivery_address: orderMeta.delivery_address,
        payment_method: orderMeta.payment_method,
        payment_status: paymentStatus,
        upi_id: upiId || null,
        notes: orderMeta.notes,
      });

      // Send UPI payment details via WhatsApp
      if (orderMeta.payment_method === 'UPI') {
        const upiLink = `upi://pay?pa=${upiId || 'sgbagroindustries@upi'}&pn=SGB%20Agro%20Industries&am=${orderTotal}&cu=INR`;
        const msg =
          `💳 Payment Details — SGB Agro Industries\n\n` +
          `Order Amount: ₹${orderTotal.toLocaleString()}\n` +
          `UPI ID: ${upiId || 'sgbagroindustries@upi'}\n\n` +
          `Pay via any UPI app:\n• Google Pay\n• PhonePe\n• Paytm\n• BHIM\n\n` +
          `Or use link: ${upiLink}\n\n` +
          `Once paid, your order will be processed immediately.\n` +
          `SGB Agro Industries | 📞 08277009667`;
        const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`;
        const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
        fetch(EDGE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` }, body: JSON.stringify({ phone: orderMeta.phone_number, message: msg }) }).catch(() => {});
      }

      toast.success('Order confirmed and sent to billing!');
      setSelectedLead(null);
      setOrderItems([emptyItem()]);
      setItemStockStatus({});
      setUpiId('');
      setOrderMeta({ customer_name: '', phone_number: '', delivery_city: '', delivery_address: '', payment_method: '', notes: '' });
    } catch { toast.error('Failed to submit order. Please try again.'); }
  };

  const handleMarkCalled = async (lead: AgentLead) => {
    await updateCallStatus.mutateAsync({ id: lead.id, call_status: 'called' });
    toast.success('Marked as called');
  };

  const statCards = [
    { title: 'Leads Today', value: stats?.leadsToday ?? 0, icon: Users, color: 'blue' as const },
    { title: 'Calls Made', value: stats?.callsMade ?? 0, icon: PhoneCall, color: 'green' as const },
    { title: 'Orders Submitted', value: stats?.ordersSubmitted ?? 0, icon: ShoppingCart, color: 'purple' as const },
    { title: 'Revenue Closed', value: `₹${(stats?.totalValue ?? 0).toLocaleString()}`, icon: DollarSign, color: 'green' as const },
  ];

  return (
    <DashboardLayout>
      <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <AnnouncementBanner role="sales_agent" />

        {showProfileBanner && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div><p className="font-semibold text-amber-800 mb-1">Complete your profile to receive leads</p><p className="text-xs text-amber-700">Your city is used for smart lead assignment.</p></div>
              <Button size="sm" variant="ghost" className="text-amber-600 shrink-0" onClick={() => setProfileDismissed(true)}>Dismiss</Button>
            </div>
            <div className="mt-3 flex items-end gap-3 flex-wrap">
              <div className="space-y-1"><Label className="text-xs text-amber-800">Phone</Label><Input className="h-8 text-sm w-44" placeholder="+91 98765 43210" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs text-amber-800">City *</Label><Input className="h-8 text-sm w-36" placeholder="Mysuru" value={profileForm.city} onChange={e => setProfileForm(f => ({ ...f, city: e.target.value }))} /></div>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 h-8" onClick={async () => {
                if (!profileForm.city.trim()) { toast.error('City is required'); return; }
                if (!user?.id) return;
                try { await completeProfile.mutateAsync({ user_id: user.id, phone: profileForm.phone, city: profileForm.city }); toast.success('Profile completed!'); }
                catch (e: any) { toast.error(e.message ?? 'Failed'); }
              }} disabled={completeProfile.isPending}>{completeProfile.isPending ? 'Saving...' : 'Save Profile'}</Button>
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <PageTransition tabKey="dashboard">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map(s => (
                <GlowingStatCard key={s.title} title={s.title} value={s.value} icon={s.icon} color={s.color} />
              ))}
            </div>
            {ownTarget.data && ownTarget.data.target_amount > 0 && (() => {
              const tgt = ownTarget.data!;
              const achieved = stats?.totalValue ?? 0;
              const pct = Math.min(100, Math.round((achieved / tgt.target_amount) * 100));
              const barColor = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
              const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
              return (
                <Card><CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Monthly Target Progress</p><span className="text-xs text-muted-foreground">{daysLeft} days left</span></div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>₹{achieved.toLocaleString()} achieved</span><span>₹{Number(tgt.target_amount).toLocaleString()} target — {pct}%</span></div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} /></div>
                </CardContent></Card>
              );
            })()}

            <Card>
              <CardHeader><CardTitle className="text-lg">Recent Leads</CardTitle></CardHeader>
              <CardContent>
                {leads.slice(0, 5).length === 0 ? <p className="text-center text-muted-foreground py-6">No leads assigned yet.</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Products</TableHead><TableHead>City</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {leads.slice(0, 5).map(lead => {
                        const src = sourceConfig[lead.source ?? ''] ?? { label: lead.source ?? '—', className: 'bg-gray-100 text-gray-700' };
                        const cs = callStatusConfig[lead.call_status ?? 'not_called'];
                        return (
                          <TableRow key={lead.id}>
                            <TableCell><div className="font-medium">{lead.customer_name}</div><div className="text-xs text-muted-foreground">{lead.phone_number}</div></TableCell>
                            <TableCell><ProductPills productsJson={lead.products_json} productName={lead.product_name} /></TableCell>
                            <TableCell>{lead.delivery_city ?? '—'}</TableCell>
                            <TableCell><span className={`text-xs px-2 py-0.5 rounded-full border ${src.className}`}>{src.label}</span></TableCell>
                            <TableCell><Badge variant={cs.variant as any}>{cs.label}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
          </PageTransition>
        )}

        {/* My Leads Tab */}
        {activeTab === 'leads' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">My Leads ({leads.length}){urgentCount > 0 && <Badge className="bg-red-500 text-white">{urgentCount} follow-up{urgentCount > 1 ? 's' : ''} due</Badge>}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <p className="text-center py-8 text-muted-foreground">Loading leads...</p> : leads.length === 0 ? <p className="text-center py-8 text-muted-foreground">No leads assigned yet.</p> : (
                <TabbedLeads leads={leads} onNotInterested={setNotInterestedLead} onSubmitOrder={openForm} onReschedule={setRescheduleLead} onMarkCalled={handleMarkCalled} />
              )}
            </CardContent>
          </Card>
        )}

        {/* Follow Ups Tab */}
        {activeTab === 'followups' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Follow Ups
                {urgentCount > 0 && <Badge className="bg-red-500 text-white">{urgentCount} due</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> : (
                <FollowUpSection leads={leads} onMarkCalled={handleMarkCalled} onReschedule={setRescheduleLead} />
              )}
              {!isLoading && urgentCount === 0 && (
                <p className="text-center py-8 text-muted-foreground">No follow-ups due today</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Product Catalogue</h2><Badge variant="outline">Read Only</Badge></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(products as any[]).map((p) => {
                const stock = p.stock ?? p.stock_quantity ?? 0;
                const sb = stock > 10 ? { label: 'In Stock', className: 'bg-green-100 text-green-700' } : stock > 0 ? { label: 'Low Stock', className: 'bg-orange-100 text-orange-700' } : { label: 'Out of Stock', className: 'bg-red-100 text-red-700' };
                return (
                  <Card key={p.id}><CardContent className="p-4">
                    {p.image_url ? <img src={p.image_url} alt={p.product_name} className="w-full h-32 object-cover rounded-md mb-3" /> : <div className="w-full h-32 bg-muted rounded-md mb-3 flex items-center justify-center"><Package className="h-10 w-10 text-muted-foreground" /></div>}
                    <div className="font-medium text-sm mb-1">{p.product_name}</div>
                    {p.category && <div className="text-xs text-muted-foreground mb-2">{p.category}</div>}
                    <div className="flex items-center justify-between">
                      <span className="text-primary font-bold">₹{p.price?.toLocaleString()}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sb.className}`}>{sb.label} ({stock})</span>
                    </div>
                  </CardContent></Card>
                );
              })}
              {products.length === 0 && <p className="col-span-full text-center py-8 text-muted-foreground">No products found</p>}
            </div>
          </div>
        )}

        {/* My Earnings Tab — removed (salary-based company) */}
      </motion.div>

      <NotInterestedModal lead={notInterestedLead} onClose={() => setNotInterestedLead(null)} />
      <RescheduleModal lead={rescheduleLead} onClose={() => setRescheduleLead(null)} />

      {/* Submit Confirmed Order Modal — Multi-Product */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Confirmed Order — {selectedLead?.customer_name}</DialogTitle>
            {selectedLead && <ProductPills productsJson={selectedLead.products_json} productName={selectedLead.product_name} />}
          </DialogHeader>
          <div className="space-y-4 pt-2">

            {/* Customer info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Customer Name *</Label><Input value={orderMeta.customer_name} onChange={e => setOrderMeta(m => ({ ...m, customer_name: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Phone *</Label><Input value={orderMeta.phone_number} onChange={e => setOrderMeta(m => ({ ...m, phone_number: e.target.value }))} placeholder="10-digit number" /></div>
            </div>

            {/* Product rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Products *</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addItem}><Plus className="h-3 w-3" /> Add Product</Button>
              </div>
              {orderItems.map((item, idx) => {
                const stock = (products as any[]).find(p => p.product_name === item.product_name);
                const stockVal = stock?.stock ?? stock?.stock_quantity ?? 0;
                const ss = itemStockStatus[idx];
                const sl = itemStockLoading[idx];
                const priceState: 'below_floor' | 'below_target' | 'good' | null = (() => {
                  if (item.agreed_price > 0 && item.floor_price > 0) {
                    if (item.agreed_price < item.floor_price) return 'below_floor';
                    if (item.target_price > 0 && item.agreed_price < item.target_price) return 'below_target';
                    return 'good';
                  }
                  return null;
                })();
                return (
                  <div key={idx} className="rounded-md border p-3 space-y-2 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground w-5">{idx + 1}.</span>
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        {/* Product select */}
                        <div className="col-span-2 space-y-1">
                          <Select value={item.product_name} onValueChange={v => updateItem(idx, 'product_name', v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select product" /></SelectTrigger>
                            <SelectContent>
                              {(products as any[]).map((p) => {
                                const s = p.stock ?? p.stock_quantity ?? 0;
                                return (
                                  <SelectItem key={p.id} value={p.product_name} disabled={s === 0}>
                                    {p.product_name} <span className={s === 0 ? 'text-red-500' : s <= 5 ? 'text-amber-500' : 'text-green-600'}>[{s === 0 ? '0 ❌' : s <= 5 ? `${s} ⚠️` : `${s} ✅`}]</span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Qty */}
                        <div className="space-y-1">
                          <Input type="number" min="1" className="h-8 text-xs" placeholder="Qty" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                        </div>
                      </div>
                      {orderItems.length > 1 && <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 shrink-0" onClick={() => removeItem(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>

                    {/* Pricing reference */}
                    {item.product_id && (item.mrp > 0 || item.floor_price > 0 || item.target_price > 0) && (
                      <div className="flex gap-3 text-xs flex-wrap pl-7">
                        {item.mrp > 0 && <span className="text-gray-500">MRP: ₹{item.mrp.toLocaleString()}</span>}
                        {item.floor_price > 0 && <span className="text-red-600">Min: ₹{item.floor_price.toLocaleString()}</span>}
                        {item.target_price > 0 && <span className="text-green-600">Target: ₹{item.target_price.toLocaleString()}</span>}
                      </div>
                    )}

                    {/* Agreed price */}
                    <div className="pl-7">
                      <Input type="number" min="0" className="h-8 text-xs" placeholder="Agreed price (₹)" value={item.agreed_price || ''} onChange={e => updateItem(idx, 'agreed_price', parseFloat(e.target.value) || 0)} />
                      {priceState === 'below_floor' && <p className="text-xs text-red-600 mt-1">❌ Below minimum ₹{item.floor_price.toLocaleString()}. Negotiate higher.</p>}
                      {priceState === 'below_target' && <p className="text-xs text-amber-600 mt-1">⚠️ Below target. Try to negotiate higher.</p>}
                      {priceState === 'good' && <p className="text-xs text-green-600 mt-1">✅ Great price!</p>}
                    </div>

                    {/* Stock status */}
                    {sl && <p className="text-xs text-muted-foreground pl-7">Checking stock...</p>}
                    {ss && !sl && (
                      <div className={`text-xs pl-7 p-1.5 rounded ${!ss.available ? 'text-red-600' : ss.splitRequired ? 'text-amber-700' : 'text-green-700'}`}>
                        {!ss.available ? `❌ ${ss.message}` : ss.splitRequired ? `⚠️ ${ss.message}` : `✅ ${ss.message}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Order summary */}
            {orderTotal > 0 && (
              <div className="rounded-md bg-muted/30 border p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal ({orderItems.reduce((s,i)=>s+i.quantity,0)} items)</span><span className="font-medium">₹{orderTotal.toLocaleString()}</span></div>
              </div>
            )}

            {/* Payment method — 4 card selector */}
            <div className="space-y-3">
              <Label>Payment Method *</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['UPI', 'Bank Transfer', 'Cheque', 'Cash on Delivery'] as const).map(method => {
                  const icons: Record<string, string> = { 'UPI': '📱', 'Bank Transfer': '🏦', 'Cheque': '📃', 'Cash on Delivery': '💵' };
                  const descs: Record<string, string> = { 'UPI': 'QR sent to customer WhatsApp', 'Bank Transfer': 'Marked as paid immediately', 'Cheque': 'Confirmed after cheque received', 'Cash on Delivery': 'Collected on delivery' };
                  const isSelected = orderMeta.payment_method === method;
                  return (
                    <button key={method} type="button" onClick={() => setOrderMeta(m => ({ ...m, payment_method: method }))}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{icons[method]}</span>
                        <div>
                          <p className="text-sm font-medium">{method}</p>
                          <p className="text-xs text-muted-foreground">{descs[method]}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {orderMeta.payment_method === 'UPI' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-green-700">UPI Payment</p>
                  <Input placeholder="Enter UPI ID (e.g. sgb@upi)" value={upiId} onChange={e => setUpiId(e.target.value)} />
                  <p className="text-xs text-green-600">✅ Agent confirms customer paid via UPI — order marked as PAID</p>
                </div>
              )}
              {orderMeta.payment_method === 'Bank Transfer' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">🏦 Bank details: SGB Agro Industries | A/C: XXXXXXXXXX | IFSC: XXXXXXXX</p>
                  <p className="text-xs text-blue-600 mt-1">✅ Agent confirms transfer done — order marked as PAID</p>
                </div>
              )}
              {orderMeta.payment_method === 'Cheque' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm text-purple-700">📃 Cheque will be collected at delivery. Shipping staff confirms receipt.</p>
                  <p className="text-xs text-purple-600 mt-1">Status updates to PAID after shipping marks cheque received.</p>
                </div>
              )}
              {orderMeta.payment_method === 'Cash on Delivery' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-700">💵 Cash ₹{orderTotal.toLocaleString()} to be collected on delivery.</p>
                  <p className="text-xs text-amber-600 mt-1">Status updates to PAID after shipping marks cash collected.</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>City</Label><Input value={orderMeta.delivery_city} onChange={e => setOrderMeta(m => ({ ...m, delivery_city: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Delivery Address *</Label><Input value={orderMeta.delivery_address} onChange={e => setOrderMeta(m => ({ ...m, delivery_address: e.target.value }))} placeholder="Street / Area" /></div>
            </div>
            <div className="space-y-1"><Label>Notes from Call</Label><Textarea rows={2} value={orderMeta.notes} onChange={e => setOrderMeta(m => ({ ...m, notes: e.target.value }))} placeholder="Any special instructions..." /></div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleSubmitOrder} disabled={submitOrder.isPending || Object.values(itemStockStatus).some(s => s && !s.available)}>
                {submitOrder.isPending ? 'Submitting...' : `Submit Order (₹${orderTotal.toLocaleString()})`}
              </Button>
              <Button variant="outline" onClick={() => setSelectedLead(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
