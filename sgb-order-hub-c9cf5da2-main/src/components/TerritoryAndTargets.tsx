import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { MapPin, Target, Plus, Edit, Trash2, Save } from 'lucide-react';
import {
  useTerritoryZones, useUpsertTerritoryZone, useDeleteTerritoryZone,
  useAgentTargets, useUpsertAgentTargets, TerritoryZone,
} from '@/hooks/useTargetsAndZones';

const db = supabase as any;

function useSalesAgents() {
  return useQuery({
    queryKey: ['sales_agents'],
    queryFn: async () => {
      const { data: roles } = await db.from('user_roles').select('user_id').eq('role', 'sales_agent');
      const ids = (roles ?? []).map((r: any) => r.user_id);
      if (!ids.length) return [];
      const { data } = await db.from('profiles').select('user_id, name').in('user_id', ids);
      return (data ?? []) as { user_id: string; name: string }[];
    },
  });
}

// ── Territory Zones ──────────────────────────────────────────────────────────
function TerritoryZonesSection() {
  const { data: zones = [], isLoading } = useTerritoryZones();
  const { data: agents = [] } = useSalesAgents();
  const upsert = useUpsertTerritoryZone();
  const del = useDeleteTerritoryZone();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<TerritoryZone | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [citiesInput, setCitiesInput] = useState('');
  const [agentId, setAgentId] = useState('');

  const openCreate = () => { setEditTarget(null); setZoneName(''); setCitiesInput(''); setAgentId(''); setShowForm(true); };
  const openEdit = (z: TerritoryZone) => { setEditTarget(z); setZoneName(z.zone_name); setCitiesInput(z.cities.join(', ')); setAgentId(z.assigned_agent_id ?? ''); setShowForm(true); };

  const handleSave = async () => {
    if (!zoneName.trim()) { toast.error('Zone name required'); return; }
    const cities = citiesInput.split(',').map(c => c.trim()).filter(Boolean);
    if (!cities.length) { toast.error('Add at least one city'); return; }
    try {
      await upsert.mutateAsync({ id: editTarget?.id, zone_name: zoneName, cities, assigned_agent_id: agentId || null });
      toast.success(editTarget ? 'Zone updated!' : 'Zone created!');
      setShowForm(false);
    } catch (e: any) { toast.error(e.message ?? 'Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <h3 className="font-semibold">Territory Zones</h3>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Zone</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone Name</TableHead>
                <TableHead>Cities</TableHead>
                <TableHead>Assigned Agent</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>}
              {!isLoading && zones.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No zones yet.</TableCell></TableRow>}
              {zones.map(z => (
                <TableRow key={z.id}>
                  <TableCell className="font-medium">{z.zone_name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap max-w-64">
                      {z.cities.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>{z.agent_name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(z)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del.mutate(z.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTarget ? 'Edit Zone' : 'New Territory Zone'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Zone Name *</Label>
              <Input value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="e.g., North Karnataka" />
            </div>
            <div className="space-y-1">
              <Label>Cities (comma separated) *</Label>
              <Input value={citiesInput} onChange={e => setCitiesInput(e.target.value)} placeholder="Hubli, Dharwad, Belgaum" />
              {citiesInput && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {citiesInput.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                    <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Assign to Agent</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger><SelectValue placeholder="Select agent (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Unassigned —</SelectItem>
                  {agents.map(a => <SelectItem key={a.user_id} value={a.user_id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? 'Saving...' : 'Save Zone'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Monthly Targets ──────────────────────────────────────────────────────────
function MonthlyTargetsSection() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data: targets = [], isLoading } = useAgentTargets(month, year);
  const upsert = useUpsertAgentTargets();

  const [edits, setEdits] = useState<Record<string, { target_amount: number; target_orders: number }>>({});

  const getEdit = (agentId: string, field: 'target_amount' | 'target_orders', fallback: number) =>
    edits[agentId]?.[field] ?? fallback;

  const setEdit = (agentId: string, field: 'target_amount' | 'target_orders', value: number) =>
    setEdits(prev => ({ ...prev, [agentId]: { ...prev[agentId], [field]: value } }));

  const handleSave = async () => {
    const toSave = targets.map(t => ({
      agent_id: t.agent_id,
      month,
      year,
      target_amount: getEdit(t.agent_id, 'target_amount', t.target_amount),
      target_orders: getEdit(t.agent_id, 'target_orders', t.target_orders),
    })).filter(t => t.target_amount > 0 || t.target_orders > 0);

    if (!toSave.length) { toast.info('No targets to save'); return; }
    try {
      await upsert.mutateAsync(toSave);
      setEdits({});
      toast.success('Targets saved!');
    } catch (e: any) { toast.error(e.message ?? 'Failed'); }
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          <h3 className="font-semibold">Monthly Targets</h3>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={v => { setMonth(Number(v)); setEdits({}); }}>
            <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => { setYear(Number(v)); setEdits({}); }}>
            <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          {Object.keys(edits).length > 0 && (
            <Button size="sm" className="gap-1 h-8" onClick={handleSave} disabled={upsert.isPending}>
              <Save className="h-3.5 w-3.5" />
              {upsert.isPending ? 'Saving...' : 'Save All'}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Target Amount (₹)</TableHead>
                <TableHead>Target Orders</TableHead>
                <TableHead>Achievement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>}
              {!isLoading && targets.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No sales agents found.</TableCell></TableRow>}
              {targets.map(t => {
                const targetAmt = getEdit(t.agent_id, 'target_amount', t.target_amount);
                const pct = targetAmt > 0 ? Math.min(100, Math.round(((t.achieved_amount ?? 0) / targetAmt) * 100)) : 0;
                const barColor = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
                return (
                  <TableRow key={t.agent_id}>
                    <TableCell className="font-medium">{t.agent_name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={getEdit(t.agent_id, 'target_amount', t.target_amount)}
                        onChange={e => setEdit(t.agent_id, 'target_amount', parseFloat(e.target.value) || 0)}
                        className="w-32 h-8 text-sm"
                        placeholder="₹0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={getEdit(t.agent_id, 'target_orders', t.target_orders)}
                        onChange={e => setEdit(t.agent_id, 'target_orders', parseInt(e.target.value) || 0)}
                        className="w-24 h-8 text-sm"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="min-w-48">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>₹{(t.achieved_amount ?? 0).toLocaleString()} / ₹{targetAmt.toLocaleString()}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground">{t.achieved_orders ?? 0} / {getEdit(t.agent_id, 'target_orders', t.target_orders)} orders</p>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function TerritoryAndTargets() {
  return (
    <div className="space-y-8">
      <TerritoryZonesSection />
      <MonthlyTargetsSection />
    </div>
  );
}
