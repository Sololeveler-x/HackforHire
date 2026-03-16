import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Warehouse } from 'lucide-react';

interface StockDisplayProps {
  productId: string;
  totalStock: number;
  lowStockThreshold?: number;
  showBreakdown?: boolean;
}

export function StockDisplay({ productId, totalStock, lowStockThreshold = 10, showBreakdown = false }: StockDisplayProps) {
  const { data: warehouseBreakdown = [] } = useQuery({
    queryKey: ['warehouse_stock_breakdown', productId],
    enabled: showBreakdown,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('warehouse_inventory')
        .select('stock_quantity, warehouses(warehouse_name)')
        .eq('product_id', productId);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        name: r.warehouses?.warehouse_name ?? 'Unknown',
        qty: r.stock_quantity,
      }));
    },
  });

  const isOut = totalStock === 0;
  const isLow = !isOut && totalStock <= lowStockThreshold;

  const stockColor = isOut
    ? 'text-red-600 font-bold'
    : isLow
    ? 'text-amber-600 font-bold'
    : 'text-foreground';

  if (!showBreakdown) {
    return <span className={stockColor}>{totalStock}</span>;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`text-sm font-medium ${stockColor}`}>{totalStock}</span>
      {warehouseBreakdown.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex gap-1 flex-wrap cursor-default">
                {warehouseBreakdown.map((w: { name: string; qty: number }, i: number) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className={`text-xs gap-1 font-normal ${w.qty === 0 ? 'border-red-300 text-red-600' : w.qty <= 10 ? 'border-amber-300 text-amber-700' : 'border-green-300 text-green-700'}`}
                  >
                    <Warehouse className="h-2.5 w-2.5" />
                    {w.qty}
                  </Badge>
                ))}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="space-y-1 min-w-[160px]">
              <p className="text-xs font-semibold mb-1">Per Warehouse</p>
              {warehouseBreakdown.map((w: { name: string; qty: number }, i: number) => (
                <div key={i} className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-muted-foreground">{w.name}</span>
                  <span className="font-bold">{w.qty} units</span>
                </div>
              ))}
              <div className="border-t pt-1 mt-1 flex justify-between text-xs font-semibold">
                <span>Total</span>
                <span>{totalStock} units</span>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
