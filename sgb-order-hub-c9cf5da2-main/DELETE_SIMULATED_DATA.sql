-- Delete simulated/demo leads and orders
-- These were created via the "Simulate Lead" button (raw_message = 'Demo lead created for presentation')
-- Also removes Ram and Sanjay who were simulated customers

-- Step 1: Delete orders linked to simulated customers (by phone number)
-- First check what will be deleted:
-- SELECT * FROM orders WHERE phone IN ('9110404193') OR customer_name IN ('Ram', 'Ramesh Kumar', 'Sanjay');

-- Delete order items for simulated orders
DELETE FROM order_items
WHERE order_id IN (
  SELECT id FROM orders
  WHERE phone IN ('9110404193')
     OR customer_name ILIKE 'Ram%'
     OR customer_name ILIKE 'Sanjay%'
);

-- Delete the simulated orders
DELETE FROM orders
WHERE phone IN ('9110404193')
   OR customer_name ILIKE 'Ram%'
   OR customer_name ILIKE 'Sanjay%';

-- Step 2: Delete simulated inquiries/leads
-- Leads created by simulate function have raw_message = 'Demo lead created for presentation'
DELETE FROM inquiries
WHERE raw_message = 'Demo lead created for presentation';

-- Also delete any leads for the simulated phone numbers
DELETE FROM inquiries
WHERE phone_number IN ('9110404193');

-- Step 3: Verify nothing simulated remains
-- SELECT id, customer_name, phone_number, raw_message FROM inquiries WHERE raw_message = 'Demo lead created for presentation';
-- SELECT id, customer_name, phone FROM orders WHERE phone = '9110404193';
