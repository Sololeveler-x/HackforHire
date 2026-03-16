import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Package, Plus, Save, AlertTriangle, Bell } from 'lucide-react';
import { useWarehouseInventory, useUpsertWarehouseInventory, useAddProductToWarehouse } from '@/hooks/useWarehouseInventory';

const db = supabase as any;

interface Props {
  warehouseId: string;
  warehouseName: string;
}

export function WarehouseInventoryManager({ warehouseId, warehouseName }: Props) {
  const { data: items = [], isLoading } = useWarehouseInventory(warehouseId);
  const upsert = useUpsertWarehouseInventory();
  const addProduct = useAddProductToWarehouse();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('products').select('id, product_name').order('product_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Local edits state
  const [edits, setEdits] = useState<Record<string, { stock_quantity: number; reorder_level: number }>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newProductId, setNewProductId] = useState('');
  const [newQty, setNewQty] = useState(0);
  const [newReorder, setNewReorder] = useState(10);
  const [checkingAlerts, setCheckingAlerts] = useState(false);

  // Transfer stock state — removed

  const getEdit = (id: string, field: 'stock_quantity' | 'reorder_level', fallback: number) =>
    edits[id]?.[field] ?? fallback;

  const setEdit = (id: string, field: 'stock_quantity' | 'reorder_level', value: number) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const handleSave = async () => {
    const toSave = items
      .filter(item => edits[item.id])
      .map(item => ({
        warehouse_id: warehouseId,
        product_id: item.product_id,
        stock_quantity: getEdit(item.id, 'stock_quantity', item.stock_quantity),
        reorder_level: getEdit(item.id, 'reorder_level', item.reorder_level),
      }));
    if (toSave.length === 0) { toast.info('No changes to save'); return; }
    try {
      await upsert.mutateAsync(toSave);
      setEdits({});
      toast.success('Inventory saved!');
    } catch (e: any) {
      toast.error(e.message ?? 'Save failed');
    }
  };

  const handleAdd = async () => {
    if (!newProductId) { toast.error('Select a product'); return; }
    try {
      await addProduct.mutateAsync({ warehouse_id: warehouseId, product_id: newProductId, stock_quantity: newQty, reorder_level: newReorder });
      toast.success('Product added to warehouse!');
      setShowAdd(false);
      setNewProductId('');
      setNewQty(0);
      setNewReorder(10);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed');
    }
  };

  const handleCheckAlerts = async () => {
    setCheckingAlerts(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-stock-alerts`,
        { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}` } },
      );
      const json = await res.json();
      if (json.alerts?.length > 0) {
        toast.success(`Sent ${json.alerts.length} WhatsApp alert(s)!`);
      } else {
        toast.info(json.message ?? 'All stock levels OK');
      }
    } catch (e: any) {
      toast.error('Failed to check alerts');
    } finally {
      setCheckingAlerts(false);
    }
  };

  const lowStockCount = items.filter(i => {
    const qty = getEdit(i.id, 'stock_quantity', i.stock_quantity);
    const reorder = getEdit(i.id, 'reorder_level', i.reorder_level);
    return qty <= reorder;
  }).length;

  const existingProductIds = new Set(items.map(i => i.product_id));
  const availableProducts = (products as any[]).filter(p => !existingProductIds.has(p.id));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Products</p>
            <p className="text-xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Low Stock</p>
            <p className={`text-xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Units</p>
            <p className="text-xl font-bold">{items.reduce((s, i) => s + i.stock_quantity, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold">{warehouseName} — Inventory</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={handleCheckAlerts} disabled={checkingAlerts}>
            <Bell className="h-3.5 w-3.5" />
            {checkingAlerts ? 'Checking...' : 'Check Stock Alerts'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Product
          </Button>
          {Object.keys(edits).length > 0 && (
            <Button size="sm" className="gap-1" onClick={handleSave} disabled={upsert.isPending}>
              <Save className="h-3.5 w-3.5" />
              {upsert.isPending ? 'Saving...' : `Save Changes (${Object.keys(edits).length})`}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Stock Qty</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              )}
              {!isLoading && items.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No products in this warehouse yet.</TableCell></TableRow>
              )}
              {items.map(item => {
                const qty = getEdit(item.id, 'stock_quantity', item.stock_quantity);
                const reorder = getEdit(item.id, 'reorder_level', item.reorder_level);
                const isLow = qty <= reorder;
                return (
                  <TableRow key={item.id} className={isLow ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        {item.product_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={e => setEdit(item.id, 'stock_quantity', parseInt(e.target.value) || 0)}
                        className={`w-24 h-8 text-sm ${isLow ? 'border-red-400' : ''}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={reorder}
                        onChange={e => setEdit(item.id, 'reorder_level', parseInt(e.target.value) || 0)}
                        className="w-24 h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      {isLow
                        ? <Badge className="bg-red-100 text-red-700 border-red-200">Low Stock</Badge>
                        : <Badge className="bg-green-100 text-green-700 border-green-200">OK</Badge>
                      }
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Product Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Product to {warehouseName}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Product *</Label>
              <Select value={newProductId} onValueChange={setNewProductId}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {availableProducts.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Initial Quantity</Label>
                <Input type="number" min={0} value={newQty} onChange={e => setNewQty(parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-1">
                <Label>Reorder Level</Label>
                <Input type="number" min={0} value={newReorder} onChange={e => setNewReorder(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleAdd} disabled={addProduct.isPending}>
                {addProduct.isPending ? 'Adding...' : 'Add Product'}
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
