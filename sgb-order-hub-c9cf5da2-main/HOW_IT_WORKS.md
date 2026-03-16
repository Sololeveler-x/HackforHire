# How the System Works - Complete Guide

## 1. Login Flow (FIXED!)

### Problem You Had
After login, users were redirected to the landing page and had to click their role button again.

### How It Works Now ✅

#### Step-by-Step Login Process:
1. User enters email and password
2. System authenticates with Supabase
3. System fetches user's role from database
4. **User is automatically redirected to their dashboard**
   - Admin → `/admin`
   - Billing → `/billing`
   - Packing → `/packing`
   - Shipping → `/shipping`

#### Example:
```
User: admin@sgb.com
Password: ••••••••
↓
Login successful
↓
System checks role: "admin"
↓
Automatically redirects to: /admin
↓
User sees Admin Dashboard immediately!
```

### No More Extra Clicks!
Users now go directly to their dashboard after login. No need to click role buttons on the landing page.

---

## 2. WhatsApp Tracking Link System

### How Tracking Links Are Generated

#### When Shipping Team Ships an Order:

**Step 1: Shipping Team Actions**
```
1. Go to Shipping Dashboard
2. Click "Pending Shipments" tab
3. Click "Ship Order" button
4. Select Courier Partner (e.g., "Sugama Transport")
5. Click "Generate" to create Tracking ID
   → System generates: SGM1A2B3C4D5
6. Click "Confirm Shipment"
```

**Step 2: System Automatically Creates Tracking URL**
```javascript
// In useMarkAsShipped hook
const trackingUrl = `${window.location.origin}/track/${trackingId}`;

// Example result:
// https://your-domain.com/track/SGM1A2B3C4D5
```

**Step 3: System Saves to Database**
```sql
INSERT INTO shipping (
  order_id,
  shipping_provider,
  tracking_id,
  tracking_url,  -- ← Saved here!
  shipped_at
) VALUES (
  'order-uuid',
  'Sugama Transport',
  'SGM1A2B3C4D5',
  'https://your-domain.com/track/SGM1A2B3C4D5',
  NOW()
);
```

### How to Send Tracking Link via WhatsApp

#### Method 1: Using WhatsApp Button (Recommended)

**In Shipping Dashboard → Shipped Orders Tab:**

1. Find the shipped order
2. You'll see 3 buttons:
   - 📋 **Copy Link** - Copies tracking URL to clipboard
   - 🔗 **Open Tracking** - Opens tracking page in new tab
   - 💬 **WhatsApp** - Opens WhatsApp with pre-filled message

3. Click the **WhatsApp button** (green button with message icon)

**What Happens:**
```javascript
// System generates this message:
Hello [Customer Name],

Your order has been shipped! 🚚

Courier Partner: Sugama Transport
Tracking ID: SGM1A2B3C4D5

Track your shipment here: https://your-domain.com/track/SGM1A2B3C4D5

Thank you for shopping with us.
- SGB Agro Industries
```

4. WhatsApp opens with:
   - Customer's phone number pre-filled
   - Message pre-filled with tracking details
   - Just click "Send"!

#### Method 2: Copy and Paste

1. Click **"Copy Link"** button
2. Tracking URL is copied to clipboard
3. Open WhatsApp manually
4. Paste the link and send

#### Method 3: Automatic WhatsApp API (Optional)

If you configure Twilio credentials in `.env`:
```env
VITE_TWILIO_ACCOUNT_SID=your_account_sid
VITE_TWILIO_AUTH_TOKEN=your_auth_token
VITE_TWILIO_WHATSAPP_NUMBER=+14155238886
```

Then the system can send WhatsApp messages automatically when orders are shipped.

---

## 3. Complete Order Workflow

### Visual Flow:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BILLING CREATES ORDER                                    │
│    - Select products from dropdown                          │
│    - Add customer details                                   │
│    - System calculates total                                │
│    - Stock reduces automatically                            │
│    Status: ready_for_packing                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. PACKING TEAM PACKS ORDER                                 │
│    - View order items                                       │
│    - Click "Mark as Packed"                                 │
│    Status: ready_for_shipping                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SHIPPING TEAM SHIPS ORDER                                │
│    - Select courier partner                                 │
│    - Generate tracking ID                                   │
│    - System creates tracking URL automatically              │
│    - Click "Confirm Shipment"                               │
│    Status: shipped                                          │
│    Tracking URL: https://domain.com/track/SGM1A2B3C4D5     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SEND TRACKING LINK TO CUSTOMER                           │
│    Option A: Click WhatsApp button → Opens WhatsApp        │
│    Option B: Copy link → Paste in WhatsApp manually        │
│    Option C: Automatic (if Twilio configured)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. CUSTOMER TRACKS ORDER                                    │
│    - Customer clicks tracking link                          │
│    - Opens: https://domain.com/track/SGM1A2B3C4D5          │
│    - Sees order details, status, timeline                   │
│    - No login required!                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Tracking URL Structure

### URL Format:
```
https://your-domain.com/track/{trackingId}
```

### Examples:
```
Sugama Transport:  https://your-domain.com/track/SGM1A2B3C4D5
VRL Logistics:     https://your-domain.com/track/VRL1A2B3C4D5
Indian Post:       https://your-domain.com/track/INP1A2B3C4D5
```

### What Customers See:
When they click the link, they see:
- Customer name
- Order items
- Order status (Created → Packed → Shipped)
- Courier partner
- Tracking ID
- Shipment date
- Visual timeline

---

## 5. WhatsApp Integration Details

### Click-to-Chat URL Format:
```
https://wa.me/{phone}?text={encoded_message}
```

### Example:
```javascript
// Phone: 8867724616
// Message: "Hello John, your order has been shipped..."

// Generated URL:
https://wa.me/918867724616?text=Hello%20John%2C%20your%20order%20has%20been%20shipped...
```

### How It Works:
1. System generates WhatsApp URL with:
   - Customer's phone number (with +91 country code)
   - Pre-filled message with tracking details
2. When clicked, opens WhatsApp:
   - On mobile: Opens WhatsApp app
   - On desktop: Opens WhatsApp Web
3. Message is pre-filled, just click send!

---

## 6. Database Structure

### Shipping Table:
```sql
CREATE TABLE shipping (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  shipping_provider TEXT,        -- "Sugama Transport"
  tracking_id TEXT,               -- "SGM1A2B3C4D5"
  tracking_url TEXT,              -- "https://domain.com/track/SGM1A2B3C4D5"
  shipping_status TEXT,           -- "shipped"
  shipped_by UUID,                -- User who shipped
  shipped_at TIMESTAMPTZ          -- When shipped
);
```

### How Data Flows:
```
Order Created
    ↓
order_items table → Reduces product stock
    ↓
Marked as Packed
    ↓
packing table → Records packing details
    ↓
Marked as Shipped
    ↓
shipping table → Saves tracking_id and tracking_url
    ↓
orders table → Updates status to "shipped"
```

---

## 7. Key Features

### Automatic Features:
- ✅ Stock reduction when order created
- ✅ Tracking URL generation when shipped
- ✅ Low stock alerts
- ✅ Order status updates
- ✅ Activity logging

### Manual Features:
- ✅ Select courier partner
- ✅ Generate tracking ID
- ✅ Send WhatsApp message
- ✅ Copy tracking link

---

## 8. Testing the System

### Test Scenario:

**1. Create Order (as Billing)**
```
Login: billing@sgb.com
Go to: New Order tab
Add: Test Product (qty: 2)
Customer: John Doe
Phone: 8867724616
Address: Test Address
Click: Create Order
```

**2. Pack Order (as Packing)**
```
Login: packing@sgb.com
Go to: Pending Packing tab
Find: John Doe's order
Click: Mark as Packed
```

**3. Ship Order (as Shipping)**
```
Login: shipping@sgb.com
Go to: Pending Shipments tab
Find: John Doe's order
Click: Ship Order
Select: Sugama Transport
Click: Generate (tracking ID)
Click: Confirm Shipment
```

**4. Send Tracking Link**
```
Go to: Shipped Orders tab
Find: John Doe's order
See: Tracking ID (SGM...)
Click: WhatsApp button (green)
WhatsApp opens with pre-filled message
Click: Send in WhatsApp
```

**5. Customer Tracks Order**
```
Customer receives WhatsApp message
Clicks: Tracking link
Opens: https://your-domain.com/track/SGM...
Sees: Order details and status
```

---

## 9. Important URLs

### Internal URLs (Require Login):
```
/admin      - Admin Dashboard
/billing    - Billing Dashboard
/packing    - Packing Dashboard
/shipping   - Shipping Dashboard
```

### Public URLs (No Login Required):
```
/track/{trackingId}  - Order tracking page
```

### Authentication URLs:
```
/login      - Login page
/register   - Registration page
/           - Landing page (role selection)
```

---

## 10. Common Questions

### Q: Where is the tracking link stored?
**A:** In the `shipping` table, `tracking_url` column.

### Q: How is the tracking ID generated?
**A:** Based on courier partner prefix + timestamp:
- Sugama Transport → SGM + timestamp
- VRL Logistics → VRL + timestamp
- Indian Post → INP + timestamp

### Q: Can customers track without login?
**A:** Yes! The `/track/{trackingId}` page is public.

### Q: What if WhatsApp button doesn't work?
**A:** Use "Copy Link" button and paste manually in WhatsApp.

### Q: How to change the domain in tracking URL?
**A:** It uses `window.location.origin` automatically. When deployed, it will use your production domain.

### Q: Can I customize the WhatsApp message?
**A:** Yes! Edit the `generateShipmentWhatsAppMessage` function in `src/services/whatsapp.ts`.

---

## 11. Troubleshooting

### Issue: Login redirects to home page
**Solution:** Already fixed! Now redirects to role-specific dashboard.

### Issue: Tracking link not generated
**Solution:** Check if `tracking_url` column exists in shipping table. Run `FIX_PRODUCT_SCHEMA.sql`.

### Issue: WhatsApp button not working
**Solution:** 
1. Check if order has `tracking_url`
2. Check browser console for errors
3. Try "Copy Link" button instead

### Issue: Customer can't access tracking page
**Solution:**
1. Verify tracking ID is correct
2. Check if order exists in database
3. Ensure tracking page route is configured

---

## 12. Summary

### Login Flow:
✅ Login → Auto-redirect to dashboard (no extra clicks!)

### Tracking Link Flow:
✅ Ship order → System generates tracking URL → Save to database → Send via WhatsApp

### WhatsApp Flow:
✅ Click WhatsApp button → Opens with pre-filled message → Customer receives link → Customer tracks order

Everything is automated and streamlined for maximum efficiency!
