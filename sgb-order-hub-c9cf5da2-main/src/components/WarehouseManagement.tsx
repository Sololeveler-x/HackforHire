import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Warehouse, Plus, Edit, Trash2, MapPin, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { WarehouseInventoryManager } from '@/components/WarehouseInventoryManager';

interface WarehouseData {
  id?: string;
  warehouse_name: string;
  city: string;
  latitude: number;
  longitude: number;
  capacity: number;
}

const WarehouseManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseData | null>(null);
  const [expandedWarehouse, setExpandedWarehouse] = useState<string | null>(null);
  const [formData, setFormData] = useState<WarehouseData>({
    warehouse_name: '',
    city: '',
    latitude: 0,
    longitude: 0,
    capacity: 1000,
  });

  const queryClient = useQueryClient();

  // Fetch warehouses
  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('warehouses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch total stock per warehouse (sum of all product stock_quantity)
  const { data: warehouseStockTotals } = useQuery({
    queryKey: ['warehouse_stock_totals'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('warehouse_inventory')
        .select('warehouse_id, stock_quantity');
      if (error) throw error;
      const totals: Record<string, number> = {};
      for (const row of data ?? []) {
        totals[row.warehouse_id] = (totals[row.warehouse_id] ?? 0) + row.stock_quantity;
      }
      return totals;
    },
  });

  // Create/Update warehouse
  const saveMutation = useMutation({
    mutationFn: async (data: WarehouseData) => {
      if (data.id) {
        const { error } = await (supabase as any)
          .from('warehouses')
          .update(data)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('warehouses').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success(editingWarehouse ? 'Warehouse updated!' : 'Warehouse created!');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save warehouse');
    },
  });

  // Delete warehouse
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('warehouses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse deleted!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete warehouse');
    },
  });

  const resetForm = () => {
    setFormData({
      warehouse_name: '',
      city: '',
      latitude: 0,
      longitude: 0,
      capacity: 1000,
    });
    setEditingWarehouse(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (warehouse: any) => {
    setEditingWarehouse(warehouse);
    setFormData(warehouse);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Warehouse Management
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Warehouse
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Warehouse Name *</Label>
                  <Input
                    value={formData.warehouse_name}
                    onChange={(e) => setFormData({ ...formData, warehouse_name: e.target.value })}
                    placeholder="e.g., Koppa Main Warehouse"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g., Bangalore"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latitude *</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                      placeholder="12.9716"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude *</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                      placeholder="77.5946"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Capacity *</Label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    placeholder="1000"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : editingWarehouse ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading warehouses...</p>
        ) : warehouses && warehouses.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Warehouse Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((warehouse) => (
                <>
                  <TableRow key={warehouse.id}>
                    <TableCell className="font-medium">{warehouse.warehouse_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {warehouse.city}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {warehouse.latitude.toFixed(4)}, {warehouse.longitude.toFixed(4)}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const used = warehouseStockTotals?.[warehouse.id] ?? 0;
                        const cap = warehouse.capacity ?? 0;
                        const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
                        const color = pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-green-500';
                        return (
                          <div className="space-y-1 min-w-[120px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium">{used.toLocaleString()} / {cap.toLocaleString()}</span>
                              <Badge variant="outline" className="text-xs px-1 py-0">{pct}%</Badge>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => setExpandedWarehouse(expandedWarehouse === warehouse.id ? null : warehouse.id)}
                        >
                          <Package className="h-3.5 w-3.5" />
                          Inventory
                          {expandedWarehouse === warehouse.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(warehouse)}
                          title="Edit warehouse"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this warehouse?')) {
                              deleteMutation.mutate(warehouse.id);
                            }
                          }}
                          title="Delete warehouse"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedWarehouse === warehouse.id && (
                    <TableRow key={`${warehouse.id}-inv`}>
                      <TableCell colSpan={5} className="bg-muted/30 p-4">
                        <WarehouseInventoryManager warehouseId={warehouse.id} warehouseName={warehouse.warehouse_name} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <Warehouse className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No warehouses yet</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Warehouse
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WarehouseManagement;
