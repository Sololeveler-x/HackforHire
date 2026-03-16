import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { useReturns, useUpdateReturnStatus, Return } from '@/hooks/useReturns';
import { supabase } from '@/integrations/supabase/client';

const statusBadge: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

export function ReturnsManagement() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data: returns = [], isLoading } = useReturns(statusFilter);
  const updateStatus = useUpdateReturnStatus();

  const [actionTarget, setActionTarget] = useState<{ ret: Return; action: 'approve' | 'reject' } | null>(null);
  const [notes, setNotes] = useState('');

  const handleAction = async () => {
    if (!actionTarget) return;
    try {
      let warehouseId: string | undefined;
      if (actionTarget.action === 'approve') {
        const { data: order } = await (supabase as any)
          .from('orders')
          .select('assigned_warehouse_id')
          .eq('id', actionTarget.ret.order_id)
          .single();
        warehouseId = order?.assigned_warehouse_id ?? undefined;
      }
      await updateStatus.mutateAsync({
        id: actionTarget.ret.id,
        status: actionTarget.action === 'approve' ? 'approved' : 'rejected',
        notes,
        order_id: actionTarget.ret.order_id,
        warehouse_id: warehouseId,
      });
      toast.success(actionTarget.action === 'approve' ? 'Return approved!' : 'Return rejected');
      setActionTarget(null);
      setNotes('');
    } catch (e: any) { toast.error(e.message ?? 'Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Returns Management</h2>
        </div>
        <Select value={statusFilter ?? 'all'} onValueChange={v => setStatusFilter(v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Returns</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
              {!isLoading && returns.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No returns found.</TableCell></TableRow>}
              {returns.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.order_id.slice(0, 8)}</code>
                    {r.order_amount && <div className="text-xs text-muted-foreground">₹{Number(r.order_amount).toLocaleString()}</div>}
                  </TableCell>
                  <TableCell className="font-medium">{r.customer_name}</TableCell>
                  <TableCell className="text-sm max-w-40 truncate">{r.reason}</TableCell>
                  <TableCell className="text-sm">{r.requester_name}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge[r.status] ?? ''}`}>
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                          onClick={() => { setActionTarget({ ret: r, action: 'approve' }); setNotes(''); }}>
                          <CheckCircle className="h-3 w-3" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-200"
                          onClick={() => { setActionTarget({ ret: r, action: 'reject' }); setNotes(''); }}>
                          <XCircle className="h-3 w-3" /> Reject
                        </Button>
                      </div>
                    )}
                    {r.status !== 'pending' && r.notes && (
                      <span className="text-xs text-muted-foreground italic">{r.notes}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!actionTarget} onOpenChange={o => !o && setActionTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{actionTarget?.action === 'approve' ? 'Approve Return' : 'Reject Return'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              {actionTarget?.action === 'approve'
                ? 'Approving this return will add stock back to the assigned warehouse.'
                : 'Rejecting this return will close the request.'}
            </p>
            <div className="space-y-1">
              <Label>Note (optional)</Label>
              <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a note..." />
            </div>
            <div className="flex gap-2">
              <Button
                className={`flex-1 ${actionTarget?.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={handleAction}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? 'Processing...' : actionTarget?.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </Button>
              <Button variant="outline" onClick={() => setActionTarget(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
