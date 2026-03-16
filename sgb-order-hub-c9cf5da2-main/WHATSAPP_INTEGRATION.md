# 📱 WhatsApp Integration Guide

## 🎯 Overview
This guide shows how to add WhatsApp notifications when orders are shipped with tracking IDs.

## 🚀 Quick Setup (Twilio WhatsApp Sandbox)

### Step 1: Create Twilio Account (5 minutes)

1. Go to https://www.twilio.com/try-twilio
2. Sign up for free account
3. Verify your email and phone
4. You'll get **$15 free credit**

### Step 2: Set Up WhatsApp Sandbox (2 minutes)

1. In Twilio Console, go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. You'll see a sandbox number like: `+1 415 523 8886`
3. Join the sandbox:
   - Open WhatsApp on your phone
   - Send message to the sandbox number
   - Send the code shown (e.g., "join <code>")
   - You'll receive confirmation

### Step 3: Get Twilio Credentials

From Twilio Console Dashboard, copy:
- **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Auth Token**: `your_auth_token`
- **WhatsApp Number**: `+14155238886` (or your sandbox number)

### Step 4: Add to Environment Variables

Update `.env` file:
```env
# Existing Supabase vars
VITE_SUPABASE_PROJECT_ID="fwmnriafhdbdgtklheyy"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_xdgTOLxRK9umcQWpd_eCmA_mLBSASCi"
VITE_SUPABASE_URL="https://fwmnriafhdbdgtklheyy.supabase.co"

# Add Twilio credentials
VITE_TWILIO_ACCOUNT_SID="your_account_sid"
VITE_TWILIO_AUTH_TOKEN="your_auth_token"
VITE_TWILIO_WHATSAPP_NUMBER="+14155238886"
```

---

## 💻 Implementation

### Option 1: Frontend Implementation (Quick Demo)

Create `src/services/whatsapp.ts`:

```typescript
// WhatsApp notification service using Twilio
export const sendWhatsAppNotification = async (
  customerName: string,
  phone: string,
  courierName: string,
  trackingId: string
) => {
  const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
  const fromNumber = import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER;

  // Format phone number (must include country code)
  const toNumber = `whatsapp:+91${phone.replace(/\D/g, '')}`;
  const from = `whatsapp:${fromNumber}`;

  const message = `Hello ${customerName},

Your order has been shipped! 🚚

Courier: ${courierName}
Tracking ID: ${trackingId}

Thank you for choosing SGB Agro Industries!

- Team SGB`;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
        },
        body: new URLSearchParams({
          From: from,
          To: toNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send WhatsApp message');
    }

    return await response.json();
  } catch (error) {
    console.error('WhatsApp notification error:', error);
    throw error;
  }
};
```

### Option 2: Backend Implementation (Production Ready)

Create Supabase Edge Function:

```typescript
// supabase/functions/send-whatsapp/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { customerName, phone, courierName, trackingId } = await req.json();

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

  const toNumber = `whatsapp:+91${phone}`;
  const from = `whatsapp:${fromNumber}`;

  const message = `Hello ${customerName},

Your order has been shipped! 🚚

Courier: ${courierName}
Tracking ID: ${trackingId}

Thank you for choosing SGB Agro Industries!`;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
      body: new URLSearchParams({
        From: from,
        To: toNumber,
        Body: message,
      }),
    }
  );

  return new Response(JSON.stringify(await response.json()), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## 🔧 Integration with Shipping Dashboard

Update `src/hooks/useOrders.ts`:

```typescript
import { sendWhatsAppNotification } from '@/services/whatsapp';

export const useMarkAsShipped = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      provider,
      trackingId,
    }: {
      orderId: string;
      provider: string;
      trackingId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get order details for WhatsApp notification
      const { data: order } = await supabase
        .from('orders')
        .select('customer_name, phone')
        .eq('id', orderId)
        .single();

      // Update shipping table
      await supabase.from('shipping').upsert({
        order_id: orderId,
        shipping_provider: provider,
        tracking_id: trackingId,
        shipping_status: 'shipped',
        shipped_by: user?.id,
        shipped_at: new Date().toISOString(),
      });

      // Update order status
      await supabase.from('orders')
        .update({ order_status: 'shipped' })
        .eq('id', orderId);

      // Send WhatsApp notification
      if (order) {
        try {
          await sendWhatsAppNotification(
            order.customer_name,
            order.phone,
            provider,
            trackingId
          );
          console.log('WhatsApp notification sent successfully');
        } catch (error) {
          console.error('Failed to send WhatsApp notification:', error);
          // Don't fail the whole operation if WhatsApp fails
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
};
```

---

## 🧪 Testing

### Test in Sandbox

1. **Join Sandbox:**
   - Send WhatsApp message to Twilio sandbox number
   - Send the join code

2. **Create Test Order:**
   - Login as Billing
   - Create order with your phone number
   - Use format: `8867724616` (without +91)

3. **Ship Order:**
   - Login as Shipping
   - Select the order
   - Add courier and tracking ID
   - Click "Confirm Shipment"

4. **Check WhatsApp:**
   - You should receive notification on WhatsApp
   - Message includes tracking details

### Test Message Format

```
Hello Veerendra B,

Your order has been shipped! 🚚

Courier: VRL Logistics
Tracking ID: VRL1234567890

Thank you for choosing SGB Agro Industries!

- Team SGB
```

---

## 📊 Message Template Variations

### Basic Template
```
Hello [Name],
Your order has been shipped!
Courier: [Provider]
Tracking: [ID]
- SGB Agro Industries
```

### Detailed Template
```
🎉 Order Shipped!

Dear [Name],

Your order #[OrderID] has been dispatched.

📦 Courier: [Provider]
🔢 Tracking ID: [TrackingID]
📅 Shipped on: [Date]

Track your order: [TrackingLink]

Thank you for choosing SGB Agro Industries!
Contact: 8867724616
```

### With Product Details
```
Hello [Name],

Great news! Your order has been shipped! 🚚

Order Details:
• [Product 1] x [Qty]
• [Product 2] x [Qty]

Shipping Info:
Courier: [Provider]
Tracking ID: [TrackingID]

Expected Delivery: 3-5 business days

- SGB Agro Industries
```

---

## 🔒 Security Best Practices

### 1. Never Expose Credentials
```typescript
// ❌ Bad
const authToken = "your_token_here";

// ✅ Good
const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
```

### 2. Validate Phone Numbers
```typescript
const validatePhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10; // Indian mobile
};
```

### 3. Rate Limiting
```typescript
// Limit notifications per user
const canSendNotification = async (orderId: string) => {
  const { data } = await supabase
    .from('notification_log')
    .select('sent_at')
    .eq('order_id', orderId)
    .single();
  
  return !data; // Only send once per order
};
```

---

## 💰 Cost Estimation

### Twilio Pricing (as of 2024)
- WhatsApp messages: $0.005 per message
- Free trial credit: $15 (3000 messages)
- Perfect for hackathon and initial testing

### For Production
- Consider WhatsApp Business API
- Or use alternative services:
  - Gupshup
  - MessageBird
  - Vonage

---

## 🐛 Troubleshooting

### Issue: Message not received
**Check:**
- Phone number format (+91XXXXXXXXXX)
- Recipient joined sandbox
- Twilio credentials correct
- Account has credit

### Issue: CORS error
**Solution:**
Use Supabase Edge Function instead of direct API call

### Issue: Invalid phone number
**Solution:**
```typescript
// Format phone properly
const formatPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  return `+91${cleaned}`;
};
```

---

## 🎯 Hackathon Demo Tips

1. **Pre-join Sandbox:**
   - Join sandbox before demo
   - Test with your phone

2. **Have Backup:**
   - Show console logs if WhatsApp fails
   - Have screenshots ready

3. **Explain Sandbox:**
   - Mention it's test environment
   - Production would use Business API

4. **Show Message:**
   - Display sent message on screen
   - Show WhatsApp notification

---

## ✅ Checklist

- [ ] Created Twilio account
- [ ] Joined WhatsApp sandbox
- [ ] Added credentials to `.env`
- [ ] Created `whatsapp.ts` service
- [ ] Updated `useMarkAsShipped` hook
- [ ] Tested with your phone number
- [ ] Received test notification
- [ ] Ready for demo!

---

**For Hackathon Support:**  
Veerendra.B.  
Email: veerendra4560@gmail.com  
Phone: 8867724616
