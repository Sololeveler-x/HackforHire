# WhatsApp to Order Complete Workflow

## Overview
This document explains the complete workflow for converting WhatsApp inquiries into orders in the SGB Order Hub system.

## Workflow Steps

### Step 1: Admin Receives WhatsApp Message
- Customer sends a WhatsApp message with order details
- Example message:
  ```
  Hi I need 20 steel pipes delivered to Shivamogga.
  Name: Ramesh
  Phone: 9876543210
  ```

### Step 2: Admin Extracts Information
1. Admin logs into the system and goes to Admin Dashboard
2. Clicks on the "WhatsApp" tab in the navigation
3. Pastes the WhatsApp message into the text area
4. Clicks "Extract Details" button
5. System automatically extracts:
   - Customer Name (e.g., "Ramesh")
   - Phone Number (e.g., "9876543210")
   - Product Name (e.g., "steel pipes")
   - Quantity (e.g., "20")
   - Delivery City (e.g., "Shivamogga")
6. Admin reviews the extracted data and edits if needed
7. Admin clicks "Create Inquiry" button
8. Inquiry is saved to database with status "pending"

### Step 3: Billing Views Inquiry
1. Billing staff logs into the system
2. Goes to Billing Dashboard
3. Clicks on "Inquiries" tab
4. Sees list of all pending inquiries with:
   - Customer name
   - Phone number
   - Product requested
   - Quantity
   - Delivery city
   - Date received

### Step 4: Convert Inquiry to Order
1. Billing staff clicks "View Details" (eye icon) on an inquiry
2. Reviews the complete inquiry information including original WhatsApp message
3. Clicks "Convert to Order" button
4. System automatically:
   - Switches to "New Order" tab
   - Pre-fills customer name
   - Pre-fills phone number
   - Pre-fills city
   - Adds the requested product to order items (if product exists in database)
   - Stores inquiry ID for later marking as converted

### Step 5: Complete Order Details
1. Billing staff completes remaining required fields:
   - Street Address
   - State
   - Pincode (6 digits)
2. Reviews the pre-filled product and quantity
3. Can add more products if needed
4. Selects payment status (Paid/Unpaid/Partial)
5. Clicks "Create Order & Send to Packing" button

### Step 6: Order Created & Inquiry Marked
1. System creates the order in the database
2. Order is automatically sent to packing queue
3. System automatically marks the inquiry as "converted"
4. Inquiry disappears from pending list
5. Success message shown to billing staff
6. Order form is reset for next order

## Technical Implementation

### Data Flow
```
WhatsApp Message
    ↓
Admin Dashboard (WhatsApp Tab)
    ↓
Extract Details (messageExtractor.ts)
    ↓
Create Inquiry (inquiries table)
    ↓
Billing Dashboard (Inquiries Tab)
    ↓
Convert to Order (sessionStorage)
    ↓
New Order Form (Auto-filled)
    ↓
Create Order (orders table)
    ↓
Mark Inquiry as Converted
```

### Key Components
- **WhatsAppInquiry.tsx**: Admin interface for pasting and extracting messages
- **InquiryList.tsx**: Billing interface for viewing and converting inquiries
- **BillingDashboard.tsx**: Main billing interface with auto-fill logic
- **messageExtractor.ts**: Utility functions for parsing WhatsApp messages
- **useInquiries.ts**: React hooks for inquiry CRUD operations

### Database Tables
- **inquiries**: Stores all WhatsApp inquiries
  - Fields: customer_name, phone_number, product_name, quantity, delivery_city, raw_message, status, converted_order_id
  - Status values: 'pending', 'converted', 'rejected'
- **orders**: Stores all orders
  - Linked to inquiries via converted_order_id

### SessionStorage Keys
- **inquiryToConvert**: Temporary storage for inquiry data during conversion
  - Contains: inquiryId, customerName, phone, city, productName, quantity
  - Cleared after form is pre-filled

## Features

### Smart Extraction
- **Phone Numbers**: Detects 10-digit numbers
- **Names**: Recognizes patterns like "Name: X" or "My name is X"
- **Quantities**: Finds numbers followed by product keywords
- **Products**: Matches against database products and common keywords
- **Cities**: Identifies known cities from logistics network

### Offline Capability
- Extract Details button works even when database is offline
- Uses local pattern matching and keyword detection
- Database connection only needed for creating inquiries

### Auto-Fill Intelligence
- Matches product names using fuzzy matching
- Handles partial product name matches
- Pre-fills all available information
- Allows manual editing before order creation

### Status Tracking
- Inquiries start as "pending"
- Automatically marked "converted" when order is created
- Can be manually marked "rejected" if not valid
- Converted inquiries linked to their orders via converted_order_id

## User Roles

### Admin
- Access to WhatsApp tab
- Can paste and extract messages
- Can create inquiries
- Cannot convert to orders

### Billing
- Access to Inquiries tab
- Can view all inquiries
- Can convert inquiries to orders
- Can complete order details
- Can create final orders

## Error Handling
- Validates all required fields before order creation
- Shows specific error messages for missing data
- Handles database connection issues gracefully
- Provides user feedback at each step

## Success Indicators
- ✓ Toast notification when data is extracted
- ✓ Toast notification when inquiry is created
- ✓ Toast notification when form is pre-filled
- ✓ Toast notification when order is created
- ✓ Inquiry disappears from pending list after conversion
