# Test WhatsApp to Order Workflow

## Quick Test Guide

### Prerequisites
1. Database schema must be set up (run `WHATSAPP_INQUIRY_SCHEMA.sql`)
2. At least one product must exist in the products table
3. Two user accounts: one Admin, one Billing

### Test Steps

#### 1. Test as Admin (WhatsApp Message Extraction)

**Login as Admin**
- Navigate to Admin Dashboard
- Click on "WhatsApp" tab

**Test Message 1 (Complete Information)**
```
Hi I need 20 steel pipes delivered to Shivamogga.
Name: Ramesh Kumar
Phone: 9876543210
```

**Expected Results:**
- Click "Extract Details"
- Customer Name: "Ramesh Kumar"
- Phone Number: "9876543210"
- Product Name: "steel pipes" (or matching product from database)
- Quantity: "20"
- Delivery City: "Shivamogga"

**Test Message 2 (Minimal Information)**
```
My name is Priya
9988776655
I need cement
```

**Expected Results:**
- Customer Name: "Priya"
- Phone Number: "9988776655"
- Product Name: "cement"
- Quantity: empty (can be filled manually)
- Delivery City: empty (can be filled manually)

**Test Message 3 (Complex Format)**
```
Hello, this is Suresh from Bangalore.
Contact: 8877665544
Need 50 bags of cement urgently
Deliver to Hubli
```

**Expected Results:**
- Customer Name: "Suresh"
- Phone Number: "8877665544"
- Product Name: "cement"
- Quantity: "50"
- Delivery City: "Hubli"

**Actions:**
1. Paste message
2. Click "Extract Details"
3. Review extracted data
4. Edit if needed
5. Click "Create Inquiry"
6. Verify success message
7. Verify inquiry appears in database

#### 2. Test as Billing (View Inquiries)

**Login as Billing**
- Navigate to Billing Dashboard
- Click on "Inquiries" tab

**Expected Results:**
- See list of all pending inquiries
- Each inquiry shows:
  - Customer name
  - Phone number
  - Product name
  - Quantity
  - City
  - Date
  - Status badge (yellow "Pending")

**Actions:**
1. Click eye icon on any inquiry
2. Verify dialog opens with full details
3. Verify original WhatsApp message is shown
4. Verify all extracted fields are displayed

#### 3. Test Convert to Order

**In Inquiry Details Dialog:**
1. Click "Convert to Order" button

**Expected Results:**
- Dialog closes
- Automatically switches to "New Order" tab
- Form is pre-filled with:
  - Customer Name (from inquiry)
  - Phone (from inquiry)
  - City (from inquiry)
  - Product added to items list (if product exists)
  - Quantity set correctly
- Toast message: "Order form pre-filled from inquiry"

**Complete the Order:**
1. Fill in missing required fields:
   - Street Address: "123 Main Street"
   - State: "Karnataka"
   - Pincode: "580001"
2. Review pre-filled product and quantity
3. Add more products if needed
4. Select payment status
5. Click "Create Order & Send to Packing"

**Expected Results:**
- Success message: "Order created and sent to packing!"
- Form resets to empty
- Order appears in Order History
- Inquiry is marked as "converted" in database

#### 4. Verify Inquiry Status

**Go back to Inquiries tab**

**Expected Results:**
- The converted inquiry should NOT appear in the pending list
- Only unconverted inquiries should be visible

**Check in Database (Optional):**
```sql
SELECT * FROM inquiries WHERE status = 'converted';
```
- Should show the converted inquiry
- `converted_order_id` should be populated with the order ID

### Edge Cases to Test

#### Test 1: Extract Without Database Connection
1. Disconnect from internet
2. Paste WhatsApp message
3. Click "Extract Details"
4. **Expected:** Extraction still works using pattern matching
5. **Expected:** Can review and edit data
6. **Expected:** "Create Inquiry" will fail (requires database)

#### Test 2: Product Not in Database
1. Paste message with product not in database: "I need 10 widgets"
2. Extract details
3. **Expected:** Product name extracted as "widgets"
4. **Expected:** When converting to order, product won't be auto-added
5. **Expected:** Billing staff must manually select product

#### Test 3: Multiple Inquiries from Same Customer
1. Create 2 inquiries with same phone number
2. Convert first inquiry to order
3. **Expected:** Only first inquiry marked as converted
4. **Expected:** Second inquiry still shows as pending

#### Test 4: Reject Inquiry
1. View inquiry details
2. Click "Reject Inquiry" button
3. **Expected:** Inquiry marked as rejected
4. **Expected:** Inquiry disappears from pending list
5. **Expected:** Cannot be converted to order

### Success Criteria

✅ Admin can paste and extract WhatsApp messages
✅ Extraction works offline (pattern matching)
✅ Admin can create inquiries
✅ Billing can view all pending inquiries
✅ Billing can view inquiry details
✅ Convert to Order pre-fills the form correctly
✅ Product is auto-added if it exists in database
✅ Order creation marks inquiry as converted
✅ Converted inquiries disappear from pending list
✅ All required fields are validated
✅ Success/error messages are shown appropriately

### Common Issues

**Issue:** Extract Details button not working
- **Solution:** Check browser console for errors
- **Solution:** Verify products are loaded from database

**Issue:** Form not pre-filling after Convert to Order
- **Solution:** Check sessionStorage in browser dev tools
- **Solution:** Verify inquiryToConvert key exists temporarily

**Issue:** Inquiry not marked as converted
- **Solution:** Check database connection
- **Solution:** Verify inquiry ID is being passed correctly
- **Solution:** Check browser console for errors

**Issue:** Product not auto-added to order
- **Solution:** Verify product exists in database
- **Solution:** Check product name matching logic
- **Solution:** Product name must partially match database entry

### Database Verification Queries

**Check all inquiries:**
```sql
SELECT id, customer_name, phone_number, product_name, status, created_at 
FROM inquiries 
ORDER BY created_at DESC;
```

**Check converted inquiries:**
```sql
SELECT i.*, o.order_number 
FROM inquiries i
LEFT JOIN orders o ON i.converted_order_id = o.id
WHERE i.status = 'converted';
```

**Check pending inquiries:**
```sql
SELECT * FROM inquiries WHERE status = 'pending';
```

## Performance Testing

### Load Test
1. Create 50 inquiries rapidly
2. Verify all appear in Billing dashboard
3. Convert 10 inquiries to orders
4. Verify performance remains good

### Concurrent Users
1. Have Admin create inquiry while Billing views inquiries
2. Verify real-time updates (may need page refresh)
3. Verify no data conflicts

## Demo Script

For hackathon demo, follow this script:

1. **Show WhatsApp message on phone/screen**
2. **Admin extracts:** "Watch how we extract customer info automatically"
3. **Show extracted data:** "All fields populated from the message"
4. **Create inquiry:** "Saved for billing team"
5. **Switch to Billing:** "Billing sees all pending inquiries"
6. **Convert to order:** "One click to start the order"
7. **Show pre-filled form:** "All customer data already there"
8. **Complete order:** "Just add address details and create"
9. **Show success:** "Order created and inquiry marked as done"

Total demo time: 2-3 minutes
