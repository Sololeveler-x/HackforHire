# Actions Column - What It Does

## Overview
The Actions column in the Shipped Orders table provides quick access to important shipment operations.

## Actions Available

### 1. 📋 Copy Tracking Link
- **Icon:** Copy icon
- **What it does:** Copies the tracking URL to your clipboard
- **Use case:** Quickly share tracking link via email, SMS, or other channels
- **Feedback:** Shows "Tracking link copied!" toast message

### 2. 🔗 Track Shipment
- **Icon:** External link icon
- **What it does:** Opens the tracking page in a new browser tab
- **Use case:** View real-time shipment status and location
- **Opens:** Courier's official tracking website

### 3. 💬 Send via WhatsApp
- **Icon:** WhatsApp/Message icon (green button)
- **What it does:** Opens WhatsApp with pre-filled tracking message
- **Use case:** Instantly notify customer about their shipment
- **Message includes:**
  - Customer name
  - Courier name
  - Tracking ID
  - Tracking link
  - Professional greeting

## When Actions Appear

### ✅ Actions Show When:
- Order has been shipped
- Tracking ID has been generated
- Tracking URL is available
- All three buttons appear together

### ❌ Actions Don't Show When:
- Order not yet shipped
- No tracking ID assigned
- Shows "No actions" text instead

## Visual Design

### Button Layout
```
[📋 Copy] [🔗 Track] [💬 WhatsApp]
```

### Button Styles
- **Copy & Track:** Outline buttons (subtle)
- **WhatsApp:** Green filled button (prominent)
- **Size:** Small, compact icons
- **Spacing:** Minimal gap between buttons

## How Data Flows

### Order Lifecycle
1. **Billing** → Creates order
2. **Packing** → Marks as packed
3. **Shipping** → Assigns courier + generates tracking
4. **Actions appear** → All three buttons now available

### Data Required
- `shipping_provider` → Shows in Courier column
- `tracking_id` → Shows in Tracking ID column
- `tracking_url` → Enables all action buttons

## Why "N/A" Was Showing

### Problem
Orders were showing "N/A" because:
- Data wasn't being fetched from database
- Or orders weren't actually shipped yet

### Solution
Now shows:
- **Courier:** "Not assigned" (if no courier)
- **Tracking ID:** "No tracking" (if no ID)
- **Actions:** "No actions" (if no tracking URL)

Much more user-friendly!

## Improved Display

### Courier Column
- ✅ Shows truck icon + courier name
- ✅ Bold, easy to read
- ✅ "Not assigned" if missing

### Tracking ID Column
- ✅ Monospace font (code style)
- ✅ Highlighted background
- ✅ Easy to copy manually
- ✅ "No tracking" if missing

### Actions Column
- ✅ Three icon buttons
- ✅ Tooltips on hover
- ✅ Clear visual feedback
- ✅ "No actions" if not available

## Usage Examples

### For Shipped Orders
```
Customer: John Doe
Courier: Sugama Transport 🚚
Tracking: SGM123ABC
Actions: [📋] [🔗] [💬]
```

### For Unshipped Orders
```
Customer: Jane Smith
Courier: Not assigned
Tracking: No tracking
Actions: No actions
```

## Benefits

### For Staff
- Quick access to tracking info
- One-click customer notifications
- Easy link sharing
- Professional communication

### For Customers
- Instant tracking updates
- WhatsApp notifications
- Real-time shipment status
- Better experience

## Technical Details

### Button Functions
```typescript
// Copy tracking link
handleCopyTrackingLink(order.tracking_url)

// Open tracking page
window.open(order.tracking_url, '_blank')

// Send WhatsApp
handleSendWhatsApp(order)
```

### WhatsApp Message Format
```
Hello [Customer Name],

Your order has been shipped!

Courier: [Provider Name]
Tracking ID: [Tracking Number]

Track your shipment: [Tracking URL]

Thank you for your order!
- SGB Pvt. Ltd.
```

## Demo Script

For hackathon presentation:

1. **Show Shipped Orders table**
   - "Here are all shipped orders with tracking"

2. **Point to Courier column**
   - "We can see which logistics partner is handling delivery"

3. **Point to Tracking ID**
   - "Each shipment has a unique tracking number"

4. **Click Copy button**
   - "Staff can quickly copy the tracking link"

5. **Click Track button**
   - "Or open the tracking page directly"

6. **Click WhatsApp button**
   - "Best part - instant customer notification via WhatsApp"
   - "Message is pre-filled, just click send"

## Summary

The Actions column provides three essential operations:
1. **Copy** - Share tracking link anywhere
2. **Track** - View shipment status
3. **WhatsApp** - Notify customer instantly

All designed for maximum efficiency and better customer service!
