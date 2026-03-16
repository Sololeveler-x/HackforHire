# Bulk Order Upload Guide

## How It Works

The bulk upload feature allows you to upload multiple orders at once using a CSV file. The system will automatically match product names from your CSV with products in your inventory.

## Setup Steps

### 1. Add Products First (Important!)

Before uploading CSV, make sure these products exist in your system:

Go to **Admin Dashboard → Products** and add:
- Garden Spade (₹450)
- Steel Hammer (₹850)
- Fertilizer Bag (₹320)
- Water Pump (₹12,500)
- Garden Hose (₹280)
- Pruning Shears (₹550)
- Wheelbarrow (₹2,800)
- Rake Tool (₹180)
- Shovel (₹620)
- Garden Fork (₹480)

### 2. Upload CSV File

1. Go to **Admin Dashboard → WhatsApp → Bulk Upload** tab
2. Click "Download CSV Template" to get the format
3. Or use the `test_bulk_orders.csv` file included in the project
4. Click "Choose CSV File" and select your file
5. Review the preview table
6. Click "Create All Orders"

## CSV Format

```csv
Customer Name,Phone,Street Address,City,State,Pincode,Payment Status,Product Name,Quantity,Unit Price
Rajesh Kumar,9110404193,123 MG Road,Hubli,Karnataka,580001,paid,Garden Spade,2,450
```

### Column Details:
1. **Customer Name**: Full name
2. **Phone**: 10-digit number (all using 9110404193 for testing)
3. **Street Address**: House/flat number, street, area
4. **City**: City name (e.g., Hubli, Dharwad, Belgaum)
5. **State**: State name (Karnataka)
6. **Pincode**: 6-digit pincode
7. **Payment Status**: paid, unpaid, or partial
8. **Product Name**: Must match product in your system (case-insensitive)
9. **Quantity**: Number of items
10. **Unit Price**: Price per item

## Smart Product Matching

The system will:
- ✅ Try exact name match first (e.g., "Garden Spade" = "Garden Spade")
- ✅ Try partial match if exact fails (e.g., "Spade" matches "Garden Spade")
- ✅ Case-insensitive matching
- ⚠️ Show warning if product not found (but still creates order)
- ✅ Link to product for inventory tracking

## Test Data Included

The `test_bulk_orders.csv` file contains 10 sample orders:
- All using phone: 9110404193
- Mix of paid/unpaid/partial payment statuses
- Various Karnataka cities (Hubli, Dharwad, Belgaum)
- Different products and quantities
- Total value: ₹21,180

## After Upload

Orders will appear in:
- **Billing Dashboard → Order History**
- **Packing Dashboard** (ready for packing)
- Inventory will be tracked if products matched
- When shipped, inventory will auto-deduct

## Troubleshooting

**Error: "Failed to create order"**
- Make sure products exist in system first
- Check CSV format matches template exactly
- Verify pincode is 6 digits
- Ensure payment status is: paid, unpaid, or partial

**Warning: "Products not found in system"**
- Orders still created but without product link
- Add missing products to system
- Re-upload if you need inventory tracking
