import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Phone, Package, AlertCircle, Star, CheckCircle } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits.slice(-10);
}

async function sendOTP(phone: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({ phone }),
    });
    return res.ok;
  } catch { return false; }
}

async function verifyOTP(phone: string, otp: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const { data } = await (supabase as any)
    .from('customer_otps').select('*').eq('phone', normalized).eq('otp', otp).eq('used', false)
    .gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).single();
  if (!data) return false;
  await (supabase as any).from('customer_otps').update({ used: true }).eq('id', data.id);
  return true;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  packed: 'bg-blue-100 text-blue-700 border-blue-200',
  shipped: 'bg-purple-100 text-purple-700 border-purple-200',
  out_for_delivery: 'bg-orange-100 text-orange-700 border-orange-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

export default function CustomerPortal() {
  const [step, setStep] = useState<'phone' | 'otp' | 'portal'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [complaintDialog, setComplaintDialog] = useState<any>(null);
  const [complaintType, setComplaintType] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');

  const handleSendOTP = async () => {
    if (!phone.trim() || phone.length < 10) { toast.error('Enter a valid 10-digit phone number'); return; }
    setLoading(true);
    const sent = await sendOTP(phone.trim());
    setLoading(false);
    if (sent) { toast.success('OTP sent to your WhatsApp'); setStep('otp'); }
    else toast.error('Failed to send OTP. Please try again.');
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length !== 4) { toast.error('Enter the 4-digit OTP'); return; }
    setLoading(true);
    const normalized = normalizePhone(phone.trim());
    const valid = await verifyOTP(phone.trim(), otp.trim());
    if (!valid) { setLoading(false); toast.error('Invalid or expired OTP'); return; }
    // Fetch orders via edge function to bypass RLS
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-customer-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({ phone: normalized }),
    });
    const resJson = res.ok ? await res.json() : {};
    console.log('get-customer-orders response:', resJson);
    const { orders: orderData = [], loyalty: loyaltyData = null } = resJson;
    setOrders(orderData ?? []);
    setLoyalty(loyaltyData);
    setLoading(false);
    setStep('portal');
  };

  const handleComplaint = async () => {
    if (!complaintType || !complaintDesc.trim()) { toast.error('Fill all fields'); return; }
    const { error } = await (supabase as any).from('customer_complaints').insert({
      customer_phone: phone,
      customer_name: orders[0]?.customer_name ?? 'Customer',
      order_id: complaintDialog?.id ?? null,
      complaint_type: complaintType,
      description: complaintDesc,
      status: 'open',
    });
    if (error) { toast.error('Failed to submit complaint'); return; }
    toast.success('Complaint submitted. We will contact you shortly.');
    setComplaintDialog(null); setComplaintType(''); setComplaintDesc('');
  };

  const tierStyle = (tier: string) => {
    if (tier === 'gold') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (tier === 'silver') return 'bg-gray-100 text-gray-600 border-gray-200';
    return 'bg-amber-100 text-amber-700 border-amber-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-10 px-4">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Brand header */}
        <div className="text-center space-y-1 mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-green-600 text-white text-2xl font-bold mx-auto mb-3">S</div>
          <h1 className="text-2xl font-bold text-gray-900">SGB Agro Industries</h1>
          <p className="text-sm text-gray-500">Customer Self-Service Portal</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'phone' && (
            <motion.div key="phone" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Enter Your Phone Number</p>
                  <p className="text-xs text-gray-500">We'll send a verification code to your WhatsApp</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Phone Number</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number" maxLength={10} className="h-11 text-base" />
              </div>
              <Button className="w-full h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl" onClick={handleSendOTP} disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP via WhatsApp'}
              </Button>
              <p className="text-xs text-center text-gray-400">You must have previously ordered from SGB Agro Industries</p>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div key="otp" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Enter OTP</p>
                  <p className="text-xs text-gray-500">Check your WhatsApp for the 4-digit code sent to {phone}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">4-Digit OTP</Label>
                <Input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="• • • •" maxLength={4} className="h-14 text-center text-3xl tracking-[0.5em] font-bold" />
              </div>
              <Button className="w-full h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl" onClick={handleVerifyOTP} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & View Orders'}
              </Button>
              <Button variant="ghost" className="w-full text-sm text-gray-500" onClick={() => setStep('phone')}>
                ← Change Phone Number
              </Button>
            </motion.div>
          )}

          {step === 'portal' && (
            <motion.div key="portal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Loyalty card */}
              {loyalty && (
                <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Star className="h-6 w-6 text-yellow-300" />
                    <div>
                      <p className="font-semibold">{loyalty.customer_name}</p>
                      <p className="text-sm text-green-100">{loyalty.total_points - loyalty.redeemed_points} points available</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${tierStyle(loyalty.tier)}`}>
                    {loyalty.tier?.toUpperCase()} Member
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Your Orders ({orders.length})</h2>
                <Button variant="outline" size="sm" className="text-xs rounded-full" onClick={() => { setStep('phone'); setPhone(''); setOtp(''); }}>
                  Sign Out
                </Button>
              </div>

              {orders.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-2">
                  <Package className="h-10 w-10 mx-auto text-gray-300" />
                  <p className="text-gray-500 text-sm">No orders found for this phone number.</p>
                </div>
              )}

              {orders.map((order: any) => (
                <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{order.customer_name}</p>
                      <p className="text-xs text-gray-400">#{order.id.substring(0, 8).toUpperCase()} • {new Date(order.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusStyles[order.order_status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {order.order_status?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="text-sm space-y-0.5">
                    <p className="text-gray-500 text-xs">{order.address}</p>
                    <p className="font-medium text-gray-900">₹{Number(order.total_amount).toLocaleString()} <span className="text-xs text-gray-400 font-normal">• {order.payment_status}</span></p>
                  </div>

                  {order.order_items?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {order.order_items.map((item: any) => (
                        <span key={item.id} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                          {item.product_name} × {item.quantity}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap pt-1">
                    {order.shipping?.[0]?.tracking_id && (
                      <Link to={`/track/${order.shipping[0].tracking_id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 rounded-full">
                          <Package className="h-3 w-3" /> Track Order
                        </Button>
                      </Link>
                    )}
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 rounded-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => setComplaintDialog(order)}>
                      <AlertCircle className="h-3 w-3" /> Raise Complaint
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center pt-2">
          <Link to="/" className="text-sm text-green-600 hover:underline">← Back to Home</Link>
        </div>
      </div>

      {/* Complaint Dialog */}
      <Dialog open={!!complaintDialog} onOpenChange={() => setComplaintDialog(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" /> Raise a Complaint
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {complaintDialog && (
              <p className="text-sm text-gray-500">Order #{complaintDialog.id.substring(0, 8).toUpperCase()}</p>
            )}
            <div className="space-y-1.5">
              <Label>Complaint Type</Label>
              <Select value={complaintType} onValueChange={setComplaintType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged_product">Damaged Product</SelectItem>
                  <SelectItem value="wrong_product">Wrong Product</SelectItem>
                  <SelectItem value="missing_item">Missing Item</SelectItem>
                  <SelectItem value="delivery_issue">Delivery Issue</SelectItem>
                  <SelectItem value="quality_issue">Quality Issue</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={complaintDesc} onChange={e => setComplaintDesc(e.target.value)}
                placeholder="Describe your issue..." rows={3} />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleComplaint}>Submit Complaint</Button>
              <Button variant="outline" className="flex-1" onClick={() => setComplaintDialog(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
