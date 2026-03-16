import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package } from 'lucide-react';
import { useInventory, useLowStockProducts } from '@/hooks/useInventory';
import { StockDisplay } from '@/components/StockDisplay';

const InventoryTable = () => {
  const { data: inventory } = useInventory();
  const { data: lowStockProducts } = useLowStockProducts();

  return (
    <div className="space-y-6">
      {/* Low Stock Alert */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert ({lowStockProducts.length} item{lowStockProducts.length > 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-warning/10 rounded">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">{item.warehouse_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-warning">{item.stock_quantity} units left</p>
                    <p className="text-xs text-muted-foreground">Reorder level: {item.reorder_level}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Stock is auto-synced from warehouse inventory. Hover warehouse badges to see per-location breakdown.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Total Stock</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory?.map((product) => {
                const isLowStock = product.stock_quantity <= product.low_stock_threshold;
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>
                      <StockDisplay
                        productId={product.id}
                        totalStock={product.stock_quantity}
                        lowStockThreshold={product.low_stock_threshold}
                        showBreakdown={true}
                      />
                    </TableCell>
                    <TableCell>₹{product.price.toLocaleString()}</TableCell>
                    <TableCell>
                      {product.stock_quantity === 0 ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Out of Stock
                        </Badge>
                      ) : isLowStock ? (
                        <Badge variant="destructive" className="gap-1 bg-orange-500">
                          <AlertTriangle className="h-3 w-3" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-success">In Stock</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!inventory || inventory.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No products in inventory
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryTable;
