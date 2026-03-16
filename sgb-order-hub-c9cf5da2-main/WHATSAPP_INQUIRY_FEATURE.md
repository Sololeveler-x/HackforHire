# WhatsApp Message Information Extraction System

## Overview
The WhatsApp Inquiry system allows admins to paste customer messages from WhatsApp and automatically extract structured information to create inquiries that billing staff can process.

## Workflow

### 1. Admin Creates Inquiry (Admin Dashboard)
1. Navigate to Admin Dashboard → WhatsApp tab
2. Paste the WhatsApp message from customer in the text area
3. Click "Extract Details" button
4. System automatically extracts:
   - Customer Name
   - Phone Number (10-digit)
   - Product Name
   - Quantity
   - Delivery City
5. Review and edit the extracted information if needed
6. Click "Create Inquiry" to save

### 2. Billing Processes Inquiry (Billing Dashboard)
1. Navigate to Billing Dashboard → Inquiries tab
2. View all pending customer inquiries
3. Click on an inquiry to view full details including original message
4. Take action:
   - Mark as "Converted" after creating an order
   - Mark as "Rejected" if inquiry cannot be processed

## Extraction Patterns

### Phone Number
- Detects 10-digit numbers: `9876543210`

### Customer Name
- Pattern 1: `Name: Ramesh` or `name: ramesh`
- Pattern 2: `My name is Ramesh` or `I am Ramesh`

### Quantity
- Detects numbers followed by product keywords
- Examples: `20 pipes`, `50 cement bags`, `10 brush cutters`

### Product Name
- Matches against products in database first
- Falls back to common keywords: pipes, cement, steel, rods, brush cutter, etc.

### Delivery City
- Detects cities from logistics database
- Looks for patterns like: `delivered to Shivamogga`, `delivery at Bangalore`
- Known cities: Bangalore, Mangalore, Hubli, Mysore, Shivamogga, Koppa, etc.

## Example Messages

### Example 1
```
Hi I need 20 steel pipes delivered to Shivamogga.
Name: Ramesh
Phone: 9876543210
```

Extracted:
- Name: Ramesh
- Phone: 9876543210
- Product: steel pipes
- Quantity: 20
- City: Shivamogga

### Example 2
```
Hello, my name is Suresh and I want to order 50 bags of cement.
Please deliver to Bangalore.
Contact: 9123456789
```

Extracted:
- Name: Suresh
- Phone: 9123456789
- Product: cement
- Quantity: 50
- City: Bangalore

## Database Setup

Run the SQL schema to create the inquiries table:

```bash
# In Supabase SQL Editor, run:
sgb-order-hub-c9cf5da2-main/WHATSAPP_INQUIRY_SCHEMA.sql
```

## Features

- **Smart Extraction**: Automatically parses unstructured text
- **Editable Fields**: All extracted data can be manually corrected
- **Status Tracking**: Track inquiry status (pending, converted, rejected)
- **Original Message**: Stores raw message for reference
- **Role-Based Access**:
  - Admin: Create inquiries
  - Billing: View and process inquiries

## Benefits

1. **Time Saving**: No manual data entry from WhatsApp messages
2. **Accuracy**: Reduces human error in transcription
3. **Traceability**: Original message preserved for verification
4. **Workflow**: Clear handoff from admin to billing team
5. **Flexibility**: All fields remain editable before saving
