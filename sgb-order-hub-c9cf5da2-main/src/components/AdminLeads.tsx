import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Sparkles, Users, Trash2, UserCheck, AlertTriangle, Filter } from 'lucide-react';
import { useAdminLeads, useAgentWorkloads, useBulkAssignLeads, useMarkSpam } from '@/hooks/useLeads';
import { useEmployees } from '@/hooks/useTeam';
import { getCityCoords, haversineDistance } from '@/utils/geoUtils';

// ── ProductPills ──────────────────────────────────────────────────────────────
function ProductPills({ productsJson, productName }: { productsJson?: any; productName?: string }) {
  let products: { product_name: string; quantity: number }[] = [];
  try {
    if (productsJson) {
      products = Array.isArray(productsJson) ? productsJson : JSON.parse(productsJson as string);
    } else if (productName) {
      products = [{ product_name: productName, quantity: 1 }];
    }
  } catch { products = productName ? [{ product_name: productName, quantity: 1 }] : []; }
  if (products.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {products.map((p, i) => (
        <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
          {p.quantity}× {p.product_name}
        </span>
      ))}
    </div>
  );
}

const sourceBadge: Record<string, { label: string; className: string }> = {
  whatsapp_ad:     { label: '📢 Ad',     className: 'bg-blue-100 text-blue-700 border-blue-200' },
  whatsapp_direct: { label: '💬 Direct', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  agent_confirmed: { label: '✅ Agent',  className: 'bg-green-100 text-green-700 border-green-200' },
};

const statusBadge: Record<string, { label: string; className: string }> = {
  new:             { label: 'New',             className: 'bg-gray-100 text-gray-700 border-gray-200' },
  assigned:        { label: 'Assigned',        className: 'bg-blue-100 text-blue-700 border-blue-200' },
  pending_billing: { label: 'Pending Billing', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  submitted:       { label: 'Submitted',       className: 'bg-green-100 text-green-700 border-green-200' },
};

interface Assignment { lead_id: string; agent_id: string; reason: string; agent_name: string; }

export function AdminLeads() {
  const { data: leads = [], isLoading } = useAdminLeads();
  const { data: workloads = [] } = useAgentWorkloads();
  const { data: employees = [] } = useEmployees();
  const bulkAssign = useBulkAssignLeads();
  const markSpam = useMarkSpam();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [aiLoading, setAiLoading] = useState(false);
  const [preview, setPreview] = useState<Assignment[] | null>(null);
  const [editedAssignments, setEditedAssignments] = useState<Assignment[]>([]);
  const [showStaleOnly, setShowStaleOnly] = useState(false);

  const agents = employees.filter(e => e.role === 'sales_agent' && e.status === 'active');
  const agentMap = useMemo(() => {
    const m: Record<string, string> = {};
    employees.forEach(a => { if (a.name) m[a.user_id] = a.name; });
    return m;
  }, [employees]);

  // FIX 7: Stale lead detection
  const now = Date.now();
  const getStaleDays = (createdAt: string) => Math.floor((now - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));

  // FIX 3: Duplicate phone detection
  const phoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      const p = l.phone_number?.replace(/\D/g, '') ?? '';
      if (p) counts[p] = (counts[p] ?? 0) + 1;
    });
    return counts;
  }, [leads]);

  const displayedLeads = useMemo(() => {
    if (!showStaleOnly) return leads;
    return leads.filter(l => l.call_status === 'not_called' && getStaleDays(l.created_at) >= 3);
  }, [leads, showStaleOnly]);

  const unassignedCount = leads.filter(l => l.status === 'new').length;

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(leads.map(l => l.id)));
    else setSelected(new Set());
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSmartAssign = async () => {
    if (selected.size === 0) { toast.error('Select at least one lead'); return; }
    if (agents.length === 0) { toast.error('No active sales agents found'); return; }

    const selectedLeads = leads.filter(l => selected.has(l.id));

    const agentList = agents.map(a => {
      const wl = workloads.find(w => w.user_id === a.user_id);
      return { id: a.user_id, name: a.name ?? 'Unknown', city: a.city ?? '', active_leads: wl?.active_leads ?? 0 };
    });

    // Local proximity-based assignment using haversine distance
    const localAssignments: Assignment[] = selectedLeads.map(lead => {
      const leadCity = lead.delivery_city ?? '';
      const leadCoords = getCityCoords(leadCity);

      const scored = agentList
        .filter(a => a.active_leads <= 10)
        .map(a => {
          const agentCoords = getCityCoords(a.city);
          let distKm = 9999;
          if (leadCoords && agentCoords) {
            distKm = haversineDistance(leadCoords[0], leadCoords[1], agentCoords[0], agentCoords[1]);
          } else if (leadCity && a.city && leadCity.toLowerCase() === a.city.toLowerCase()) {
            distKm = 0;
          }
          return { ...a, distKm };
        })
        .sort((a, b) => {
          if (Math.abs(a.distKm - b.distKm) < 50) return a.active_leads - b.active_leads;
          return a.distKm - b.distKm;
        });

      if (scored.length === 0) {
        const fallback = [...agentList].sort((a, b) => a.active_leads - b.active_leads)[0];
        return { lead_id: lead.id, agent_id: fallback.id, agent_name: fallback.name, reason: `Fallback (all agents busy) — ${fallback.city}` };
      }

      const best = scored[0];
      const distLabel = best.distKm < 9999 ? `${Math.round(best.distKm)} km away` : 'nearest available';
      const reason = best.distKm === 0
        ? `Same city (${best.city}) — ${best.active_leads} active leads`
        : `Closest to ${leadCity} (${distLabel}) — ${best.active_leads} active leads`;

      return { lead_id: lead.id, agent_id: best.id, agent_name: best.name, reason };
    });

    // If GROQ key available, optionally enhance with AI
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    if (groqKey) {
      setAiLoading(true);
      try {
        const prompt = `You are a lead assignment reviewer for SGB Agro Industries in Karnataka, India.
The system has already computed proximity-based assignments. Review and confirm or improve them.

Leads with proposed assignments:
${JSON.stringify(localAssignments.map(a => {
  const lead = selectedLeads.find(l => l.id === a.lead_id);
  return { lead_id: a.lead_id, customer_city: lead?.delivery_city, proposed_agent: a.agent_name, proposed_reason: a.reason };
}), null, 2)}

All agents (with city and workload):
${JSON.stringify(agentList, null, 2)}

Rules:
- Prefer agents in the same city or nearest city
- Sagara/Sagar is near Shivamogga (Shimoga) — assign to Shivamogga agent
- Agents with >10 active leads should be skipped unless no alternative
- Return ONLY valid JSON array, no markdown:
[{"lead_id":"...","agent_id":"...","reason":"..."}]`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 1000 }),
        });
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
        const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
        const parsed: { lead_id: string; agent_id: string; reason: string }[] = JSON.parse(cleaned);
        if (parsed.length > 0) {
          const withNames = parsed.map(a => ({ ...a, agent_name: agentMap[a.agent_id] ?? 'Unknown' }));
          setEditedAssignments(withNames);
          setPreview(withNames);
          return;
        }
      } catch {
        // AI failed — fall through to local assignments
      } finally {
        setAiLoading(false);
      }
    }

    setEditedAssignments(localAssignments);
    setPreview(localAssignments);
  };


  const handleManualAssign = async (agentId: string) => {
    if (selected.size === 0) { toast.error('Select at least one lead'); return; }
    const assignments = Array.from(selected).map(id => ({ lead_id: id, agent_id: agentId }));
    try {
      await bulkAssign.mutateAsync(assignments);
      toast.success(`${assignments.length} leads assigned`);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e.message ?? 'Assignment failed');
    }
  };

  const handleConfirmAssignments = async () => {
    try {
      await bulkAssign.mutateAsync(editedAssignments.map(a => ({ lead_id: a.lead_id, agent_id: a.agent_id })));
      toast.success(`${editedAssignments.length} leads assigned successfully`);
      setPreview(null);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e.message ?? 'Failed');
    }
  };

  const handleMarkSpam = async () => {
    if (selected.size === 0) { toast.error('Select leads first'); return; }
    if (!confirm(`Delete ${selected.size} leads?`)) return;
    try {
      await markSpam.mutateAsync(Array.from(selected));
      toast.success('Leads removed');
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e.message ?? 'Failed');
    }
  };

  const stats = {
    total_new: leads.filter(l => l.status === 'new').length,
    unassigned: leads.filter(l => l.status === 'new' && !l.assigned_to).length,
    assigned_today: leads.filter(l => l.status === 'assigned' && new Date(l.created_at).toDateString() === new Date().toDateString()).length,
    pending_billing: leads.filter(l => l.status === 'pending_billing').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total New', value: stats.total_new, color: 'text-gray-700' },
          { label: 'Unassigned', value: stats.unassigned, color: 'text-red-600' },
          { label: 'Assigned Today', value: stats.assigned_today, color: 'text-blue-600' },
          { label: 'Pending Billing', value: stats.pending_billing, color: 'text-amber-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leads table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              All Leads
              {unassignedCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">{unassignedCount}</span>
              )}
            </CardTitle>

            {/* Bulk actions */}
            {selected.size > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">{selected.size} selected</span>
                <Button size="sm" className="gap-2 bg-purple-600 hover:bg-purple-700" onClick={handleSmartAssign} disabled={aiLoading}>
                  <Sparkles className="h-4 w-4" />
                  {aiLoading ? 'Thinking...' : 'Smart Assign with AI'}
                </Button>
                <Select onValueChange={handleManualAssign}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    <SelectValue placeholder="Manual Assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(a => (
                      <SelectItem key={a.user_id} value={a.user_id}>{a.name} ({a.city ?? '—'})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="destructive" className="gap-2" onClick={handleMarkSpam}>
                  <Trash2 className="h-4 w-4" /> Spam
                </Button>
              </div>
            )}
            {selected.size === 0 && (
              <Button
                size="sm"
                variant={showStaleOnly ? 'default' : 'outline'}
                className="gap-2"
                onClick={() => setShowStaleOnly(v => !v)}
              >
                <Filter className="h-3.5 w-3.5" />
                {showStaleOnly ? 'Show All' : 'Show Stale Only'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === leads.length && leads.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading leads...</TableCell></TableRow>
              )}
              {!isLoading && displayedLeads.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No leads yet. They'll appear here when WhatsApp messages come in.</TableCell></TableRow>
              )}
              {displayedLeads.map(lead => {
                const src = sourceBadge[lead.source ?? ''] ?? { label: lead.source ?? '—', className: 'bg-gray-100 text-gray-700 border-gray-200' };
                const st = statusBadge[lead.status] ?? { label: lead.status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
                const assignedName = lead.assigned_to ? (agentMap[lead.assigned_to] ?? lead.assigned_to.substring(0, 8)) : null;
                const staleDays = getStaleDays(lead.created_at);
                const isStale3 = staleDays >= 3 && staleDays < 7 && lead.call_status === 'not_called';
                const isStale7 = staleDays >= 7 && lead.call_status === 'not_called';
                const phoneDigits = lead.phone_number?.replace(/\D/g, '') ?? '';
                const isDuplicate = phoneCounts[phoneDigits] > 1;
                return (
                  <TableRow key={lead.id} className={selected.has(lead.id) ? 'bg-muted/50' : ''}>
                    <TableCell><Checkbox checked={selected.has(lead.id)} onCheckedChange={() => toggleOne(lead.id)} /></TableCell>
                    <TableCell>
                      <div className="font-medium flex items-center gap-1.5 flex-wrap">
                        {lead.customer_name}
                        {isDuplicate && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300" title="Duplicate phone number">⚠ Dup</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{lead.phone_number}</div>
                    </TableCell>
                    <TableCell>
                      <ProductPills productsJson={lead.products_json} productName={lead.product_name ?? undefined} />
                    </TableCell>
                    <TableCell>{lead.delivery_city ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{new Date(lead.created_at).toLocaleString()}</div>
                      {isStale7 && (
                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 mt-1">
                          <AlertTriangle className="h-3 w-3" /> {staleDays}d stale
                        </span>
                      )}
                      {isStale3 && !isStale7 && (
                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 mt-1">
                          <AlertTriangle className="h-3 w-3" /> {staleDays}d stale
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${st.className}`}>{st.label}</span>
                    </TableCell>
                    <TableCell className="text-sm">{assignedName ?? <span className="text-muted-foreground italic">Unassigned</span>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Agent Workload Cards */}
      {workloads.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Agent Workload</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {workloads.map(w => {
              const pct = Math.min((w.active_leads / 10) * 100, 100);
              const barColor = w.active_leads < 5 ? 'bg-green-500' : w.active_leads <= 10 ? 'bg-amber-500' : 'bg-red-500';
              return (
                <Card key={w.user_id}>
                  <CardContent className="p-4">
                    <div className="font-medium mb-0.5">{w.name}</div>
                    <div className="text-xs text-muted-foreground mb-3">{w.city ?? 'No city set'}</div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Active leads</span>
                      <span className="font-bold">{w.active_leads}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-muted-foreground">Submitted today<br /><span className="font-bold text-foreground">{w.submitted_today}</span></div>
                      <div className="text-muted-foreground">Revenue today<br /><span className="font-bold text-foreground">₹{w.revenue_today.toLocaleString()}</span></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Assignment Preview Modal */}
      <Dialog open={!!preview} onOpenChange={open => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-500" /> AI Assignment Preview</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">Review and override assignments before confirming.</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Assigned Agent</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedAssignments.map((a, i) => {
                const lead = leads.find(l => l.id === a.lead_id);
                return (
                  <TableRow key={a.lead_id}>
                    <TableCell>
                      <div className="font-medium">{lead?.customer_name ?? a.lead_id.substring(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{lead?.delivery_city ?? '—'}</div>
                    </TableCell>
                    <TableCell>
                      <Select value={a.agent_id} onValueChange={val => {
                        setEditedAssignments(prev => prev.map((x, j) => j === i ? { ...x, agent_id: val, agent_name: agentMap[val] ?? val } : x));
                      }}>
                        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {agents.map(ag => <SelectItem key={ag.user_id} value={ag.user_id}>{ag.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.reason}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex gap-2 pt-3">
            <Button className="flex-1" onClick={handleConfirmAssignments} disabled={bulkAssign.isPending}>
              {bulkAssign.isPending ? 'Assigning...' : `Confirm All (${editedAssignments.length})`}
            </Button>
            <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
