import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useAgentPerformance } from '@/hooks/useLeads';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type Period = 'today' | 'week' | 'month';

const medals = ['🥇', '🥈', '🥉'];
const rankBg = ['bg-yellow-50 border-yellow-200', 'bg-gray-50 border-gray-200', 'bg-orange-50 border-orange-200'];

export function AdminPerformance() {
  const [period, setPeriod] = useState<Period>('today');
  const { data: agents = [], isLoading } = useAgentPerformance(period);

  const exportCSV = () => {
    if (agents.length === 0) { toast.error('No data to export'); return; }
    const headers = ['Rank', 'Name', 'City', 'Leads Assigned', 'Called', 'Submitted', 'Revenue (₹)', 'Conversion %'];
    const rows = agents.map((a, i) => [i + 1, a.name, a.city ?? '', a.leads_assigned, a.called, a.submitted, a.revenue, a.conversion_rate]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Exported!');
  };

  return (
    <div className="space-y-6">
      {/* Header + filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Agent Performance</h2>
        <div className="flex items-center gap-2">
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <Button key={p} size="sm" variant={period === p ? 'default' : 'outline'} onClick={() => setPeriod(p)} className="capitalize">{p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}</Button>
          ))}
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Leaderboard</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Called</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Conversion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              )}
              {!isLoading && agents.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No performance data for this period.</TableCell></TableRow>
              )}
              {agents.map((a, i) => (
                <TableRow key={a.user_id} className={i < 3 ? `${rankBg[i]} border-l-4` : ''}>
                  <TableCell className="text-lg font-bold">{i < 3 ? medals[i] : `#${i + 1}`}</TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-muted-foreground">{a.city ?? '—'}</TableCell>
                  <TableCell>{a.leads_assigned}</TableCell>
                  <TableCell>{a.called}</TableCell>
                  <TableCell>{a.submitted}</TableCell>
                  <TableCell className="font-medium text-green-600">₹{a.revenue.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.conversion_rate >= 50 ? 'bg-green-100 text-green-700' : a.conversion_rate >= 25 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {a.conversion_rate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Charts */}
      {agents.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Orders Submitted per Agent</CardTitle></CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agents} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="submitted" fill="hsl(145, 63%, 32%)" radius={[0, 4, 4, 0]} name="Submitted" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Revenue Closed per Agent</CardTitle></CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agents} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="hsl(210, 80%, 52%)" radius={[0, 4, 4, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <CommissionPayoutsSection />
    </div>
  );
}

// ── Commission Payouts Section ────────────────────────────────────────────────
function CommissionPayoutsSection() {
  const qc = useQueryClient();
  const { data: agentSummaries = [], isLoading } = useQuery({
    queryKey: ['commission_payouts_summary'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agent_commissions')
        .select('agent_id, commission_amount, status, profiles(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const map = new Map<string, { agent_id: string; name: string; pending: number; paid: number }>();
      for (const row of data ?? []) {
        const id = row.agent_id;
        if (!map.has(id)) map.set(id, { agent_id: id, name: row.profiles?.name ?? 'Unknown', pending: 0, paid: 0 });
        const entry = map.get(id)!;
        if (row.status === 'pending') entry.pending += Number(row.commission_amount);
        else if (row.status === 'paid') entry.paid += Number(row.commission_amount);
      }
      return Array.from(map.values()).filter(a => a.pending > 0 || a.paid > 0);
    },
  });

  const handlePayCommission = async (agentId: string, agentName: string) => {
    const { data: { user } } = await (supabase as any).auth.getUser();
    const { error } = await (supabase as any)
      .from('agent_commissions')
      .update({ status: 'paid', paid_at: new Date().toISOString(), paid_by: user?.id })
      .eq('agent_id', agentId)
      .eq('status', 'pending');
    if (error) { toast.error('Failed to mark commissions as paid'); return; }
    toast.success(`Commission paid to ${agentName}`);
    qc.invalidateQueries({ queryKey: ['commission_payouts_summary'] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" /> Commission Payouts
        </CardTitle>
        <p className="text-sm text-muted-foreground">Pending commissions owed to sales agents</p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Pending Commission</TableHead>
              <TableHead>Total Paid (All Time)</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
            {!isLoading && agentSummaries.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No commission records yet</TableCell></TableRow>}
            {agentSummaries.map(a => (
              <TableRow key={a.agent_id}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell>
                  <span className={`font-bold ${a.pending > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    ₹{a.pending.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell className="text-green-600">₹{a.paid.toLocaleString()}</TableCell>
                <TableCell>
                  {a.pending > 0 ? (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => handlePayCommission(a.agent_id, a.name)}
                    >
                      Pay ₹{a.pending.toLocaleString()}
                    </Button>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 text-xs">All Paid</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
