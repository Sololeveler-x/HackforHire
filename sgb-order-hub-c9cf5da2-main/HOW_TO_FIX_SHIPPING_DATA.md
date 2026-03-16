# How to Fix Missing Shipping Data

## Problem
Orders are marked as "shipped" but showing:
- Courier: "Not assigned"
- Tracking ID: "No tracking"
- Actions: "No actions"

## Root Cause
The `shipping` table doesn't have records for these orders. When an order is marked as "shipped", a corresponding record must be created in the `shipping` table with:
- `shipping_provider` (courier name)
- `tracking_id` (tracking number)
- `tracking_url` (tracking link)

## Quick Fix (2 Minutes)

### Step 1: Open Supabase
1. Go to your Supabase project
2. Click "SQL Editor" in the left sidebar

### Step 2: Run the Fix Script
1. Open the file: `ADD_SHIPPING_DATA_COMPLETE_FIX.sql`
2. Copy ALL the SQL code
3. Paste it into Supabase SQL Editor
4. Click "Run" button

### Step 3: Refresh Your App
1. Go back to your application
2. Refresh the page (F5)
3. Go to Shipping Dashboard → Shipped Orders
4. You should now see:
   - ✅ Courier names (Sugama Transport, VRL Logistics, India Post)
   - ✅ Tracking IDs (SGM123ABC, VRL456DEF, etc.)
   - ✅ Action buttons (Copy, Track, WhatsApp)

## What the Script Does

### 1. Adds Missing Column
```sql
ALTER TABLE shipping ADD COLUMN IF NOT EXISTS tracking_url TEXT;
```

### 2. Creates Shipping Records
For each shipped order without shipping data:
- Assigns courier based on order amount:
  - < ₹1,000 → India Post
  - ₹1,000 - ₹10,000 → VRL Logistics
  - > ₹10,000 → Sugama Transport
- Generates unique tracking ID
- Creates tracking URL

### 3. Updates Existing Records
Adds tracking URLs to any existing shipping records that are missing them.

## Courier Assignment Logic

The script automatically assigns couriers based on order value:

| Order Amount | Courier | Tracking Prefix |
|--------------|---------|-----------------|
| < ₹1,000 | India Post | INP |
| ₹1,000 - ₹10,000 | VRL Logistics | VRL |
| > ₹10,000 | Sugama Transport | SGM |

## Tracking ID Format

Generated tracking IDs look like:
- `SGM8A3F9B2C` (Sugama Transport)
- `VRL4D7E1A5F` (VRL Logistics)
- `INP2B6C8D9E` (India Post)

Format: `[PREFIX][9 RANDOM CHARS]`

## Tracking URL Format

```
http://localhost:8080/track/[TRACKING_ID]
```

Example:
```
http://localhost:8080/track/SGM8A3F9B2C
```

## Verify It Worked

After running the script, you should see output like:

```
Total shipped orders: 5
Shipped orders with tracking data: 5
Shipped orders with tracking URL: 5
```

All numbers should match!

## Manual Courier Assignment (Optional)

If you want to assign specific couriers manually, uncomment and modify the optional section at the end of the SQL script:

```sql
-- Assign Sugama to specific order
UPDATE shipping s
SET shipping_provider = 'Sugama Transport'
FROM orders o
WHERE s.order_id = o.id
  AND o.customer_name = 'JEEVAN';
```

## Future Prevention

To prevent this issue in the future, make sure:

1. **When marking order as shipped**, always create shipping record:
   ```sql
   INSERT INTO shipping (order_id, shipping_provider, tracking_id, tracking_url)
   VALUES (...);
   ```

2. **Use the Shipping Dashboard** properly:
   - Go to "Pending Shipments"
   - Click "Ship Order"
   - Select courier and generate tracking
   - This automatically creates the shipping record

## Troubleshooting

### Still showing "Not assigned"?
- Hard refresh browser: `Ctrl + Shift + R`
- Check if script ran successfully
- Verify data in Supabase: `SELECT * FROM shipping;`

### Tracking URLs not working?
- Make sure your app is running on `localhost:8080`
- Or update the URL in the script to match your port

### Want different courier assignments?
- Edit the CASE statement in the script
- Change the amount thresholds
- Or manually assign after running the script

## Summary

1. ✅ Run `ADD_SHIPPING_DATA_COMPLETE_FIX.sql` in Supabase
2. ✅ Refresh your application
3. ✅ All shipped orders now have courier and tracking data
4. ✅ Action buttons will appear and work

The fix is automatic and takes less than 2 minutes!
