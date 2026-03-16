# Product and Inventory Management Module

## Overview
Complete product management and inventory tracking system integrated into the SGB Order Hub application.

## Features Implemented

### 1. Admin Product Management
**Location**: Admin Dashboard → Products Tab

**Capabilities**:
- ✅ Add new products
- ✅ Edit existing products
- ✅ Delete products
- ✅ Search products by name or category
- ✅ View product images
- ✅ Manage stock quantities
- ✅ Set low stock thresholds

**Product Form Fields**:
- Product Name (required)
- Product Description
- Category (dropdown selection)
- Price (required)
- Stock Quantity
- Low Stock Threshold (default: 10)
- Image URL

### 2. Product Database Structure
**Table**: `products`

**Columns**:
- `id` - UUID primary key
- `product_name` - Product name
- `description` - Product description
- `category` - Product category
- `price` - Product price (decimal)
- `stock_quantity` - Current stock level
- `low_stock_threshold` - Alert threshold
- `image_url` - Product image URL
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### 3. Inventory Dashboard
**Location**: Admin Dashboard → Inventory Tab

**Features**:
- ✅ View all products with stock levels
- ✅ Low stock alerts at the top
- ✅ Color-coded status badges:
  - 🟢 Green: In Stock (stock > threshold)
  - 🟠 Orange: Low Stock (stock ≤ threshold)
  - 🔴 Red: Out of Stock (stock = 0)
- ✅ Product images displayed
- ✅ Sortable by stock quantity

### 4. Automatic Stock Management
**Trigger**: `trigger_reduce_stock`

**Behavior**:
- When an order is created, stock is automatically reduced
- Trigger fires on `order_items` INSERT
- Updates `products.stock_quantity` based on order quantity

**Example**:
```
Product Stock = 50
Customer orders 3 units
Updated Stock = 47
```

### 5. Low Stock Alerts
**View**: `low_stock_products`

**Criteria**: `stock_quantity <= low_stock_threshold`

**Display Locations**:
- Admin Dashboard (warning card)
- Inventory Tab (highlighted section)

### 6. Order Creation with Products
**Location**: Billing Dashboard → New Order Tab

**Process**:
1. Select product from dropdown
2. Choose quantity
3. Add to order cart
4. System calculates total automatically
5. Stock reduces when order is created

**Features**:
- ✅ Product search/selection
- ✅ Quantity input
- ✅ Add/remove items from cart
- ✅ Automatic price calculation
- ✅ Real-time total updates

### 7. Product Search
**Locations**:
- Product Management (Admin)
- Order Creation (Billing)

**Search By**:
- Product name
- Category

**Type**: Dynamic/instant filtering

## Database Schema Updates

### New Columns Added to `products`
```sql
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS image_url TEXT;
```

### New View Created
```sql
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
  id, product_name, category, price,
  stock_quantity, low_stock_threshold, image_url
FROM products
WHERE stock_quantity <= low_stock_threshold
ORDER BY stock_quantity ASC;
```

### New Trigger Created
```sql
CREATE TRIGGER trigger_reduce_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION reduce_product_stock();
```

## UI Components

### ProductManagement Component
**File**: `src/components/ProductManagement.tsx`

**Features**:
- Product table with images
- Add/Edit/Delete actions
- Search functionality
- Form validation
- Image preview
- Stock status badges

### InventoryTable Component
**File**: `src/components/InventoryTable.tsx`

**Features**:
- Low stock alert section
- Full inventory table
- Color-coded status badges
- Stock quantity display
- Threshold indicators

## Hooks

### useProducts
**File**: `src/hooks/useProducts.ts`

**Exports**:
- `useProducts()` - Fetch all products
- `useCreateProduct()` - Create new product
- `useUpdateProduct()` - Update existing product
- `useDeleteProduct()` - Delete product

### useInventory
**File**: `src/hooks/useInventory.ts`

**Exports**:
- `useInventory()` - Fetch inventory with stock info
- `useLowStockProducts()` - Fetch low stock products

## Security (RLS Policies)

### Products Table Policies
```sql
-- Anyone can view products
CREATE POLICY "Anyone can view products" 
  ON products FOR SELECT USING (true);

-- Only admins can manage products
CREATE POLICY "Admins can insert products" 
  ON products FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products" 
  ON products FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products" 
  ON products FOR DELETE 
  USING (has_role(auth.uid(), 'admin'));
```

## Setup Instructions

### 1. Run Database Migration
Execute the SQL script in Supabase SQL Editor:
```bash
sgb-order-hub-c9cf5da2-main/PRODUCT_INVENTORY_SCHEMA.sql
```

### 2. Verify Installation
Check that:
- ✅ Products table has new columns
- ✅ low_stock_products view exists
- ✅ trigger_reduce_stock trigger is active
- ✅ RLS policies are in place

### 3. Test Features
1. Login as Admin
2. Navigate to Products tab
3. Add a test product
4. Check Inventory tab
5. Login as Billing
6. Create order with the product
7. Verify stock reduced automatically

## Product Categories

Default categories included:
- Brush Cutters
- Garden Tools
- Sprayers
- Tillers
- Chainsaws
- Lawn Equipment

## Sample Products

20 sample products are pre-loaded:
- Brush Cutters (2 products)
- Garden Tools (10 products)
- Sprayers (2 products)
- Tillers (2 products)
- Chainsaws (2 products)
- Lawn Equipment (2 products)

## Image Handling

**Current Implementation**: URL-based
- Admin enters direct image URL
- Images displayed in product table
- Image preview in form
- Fallback icon for missing images

**Future Enhancement**: File upload to Supabase Storage

## Stock Management Flow

```
1. Admin adds product with initial stock
   ↓
2. Product appears in inventory
   ↓
3. Billing creates order with product
   ↓
4. Trigger automatically reduces stock
   ↓
5. If stock ≤ threshold → Low stock alert
   ↓
6. If stock = 0 → Out of stock badge
```

## Testing Checklist

- [x] Admin can add products
- [x] Admin can edit products
- [x] Admin can delete products
- [x] Product search works
- [x] Images display correctly
- [x] Inventory tab shows all products
- [x] Low stock alerts appear
- [x] Stock badges show correct colors
- [x] Billing can select products for orders
- [x] Stock reduces automatically on order creation
- [x] Low stock products appear in admin dashboard
- [x] Product management respects RLS policies

## Integration Points

### With Existing Features
- ✅ Admin Dashboard - Products & Inventory tabs
- ✅ Billing Dashboard - Order creation with products
- ✅ Order Items - Linked to products table
- ✅ Analytics - Product stats and revenue

### Data Flow
```
Products → Order Items → Orders → Packing → Shipping
    ↓
Stock Reduction (automatic)
    ↓
Low Stock Alerts
```

## Performance Considerations

- Indexed queries for fast product lookup
- Efficient stock reduction trigger
- Cached product list in React Query
- Optimistic UI updates

## Future Enhancements

1. **Image Upload**: Direct file upload to Supabase Storage
2. **Bulk Import**: CSV import for products
3. **Product Variants**: Size, color options
4. **Stock History**: Track stock changes over time
5. **Reorder Alerts**: Automatic purchase order generation
6. **Barcode Support**: Scan products for quick selection
7. **Product Categories Management**: Dynamic category creation
8. **Multi-image Support**: Multiple product images

## Troubleshooting

### Stock not reducing
- Check if trigger is active: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_reduce_stock'`
- Verify order_items are being inserted correctly

### Low stock alerts not showing
- Check if view exists: `SELECT * FROM low_stock_products`
- Verify threshold values are set correctly

### Products not visible
- Check RLS policies
- Verify user authentication
- Check browser console for errors

## API Endpoints (via Supabase)

### Products
- `GET /products` - List all products
- `POST /products` - Create product (admin only)
- `PATCH /products/:id` - Update product (admin only)
- `DELETE /products/:id` - Delete product (admin only)

### Inventory
- `GET /low_stock_products` - Get low stock products
- `GET /products?select=*&order=stock_quantity.asc` - Get inventory sorted by stock

## Success Metrics

✅ Complete product CRUD operations
✅ Automatic stock management
✅ Real-time low stock alerts
✅ Integrated order creation workflow
✅ Admin-only product management
✅ Image support for products
✅ Search and filter capabilities
✅ Mobile-responsive UI

## Conclusion

The Product and Inventory Management module is fully integrated and production-ready. It provides comprehensive product management, automatic stock tracking, and seamless integration with the existing order workflow.
