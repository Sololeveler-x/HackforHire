import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Megaphone, Plus, Edit, PowerOff, Trash2 } from 'lucide-react';
import { useAllAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeactivateAnnouncement, useDeleteAnnouncement, Announcement } from '@/hooks/useAnnouncements';

const ALL_ROLES = ['all', 'sales_agent', 'billing', 'packing', 'shipping'];

const roleLabel: Record<string, string> = {
  all: 'All',
  sales_agent: 'Sales Agent',
  billing: 'Billing',
  packing: 'Packing',
  shipping: 'Shipping',
};

function AnnouncementForm({ initial, onSave, onCancel }: {
  initial?: Partial<Announcement>;
  onSave: (data: Omit<Announcement, 'id' | 'created_at' | 'created_by'>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [message, setMessage] = useState(initial?.message ?? '');
  const [targetRoles, setTargetRoles] = useState<string[]>(initial?.target_roles ?? ['all']);
  const [isUrgent, setIsUrgent] = useState(initial?.is_urgent ?? false);
  const [expiresAt, setExpiresAt] = useState(initial?.expires_at ? initial.expires_at.split('T')[0] : '');
  const [isActive] = useState(initial?.is_active ?? true);

  const toggleRole = (r: string) => {
    if (r === 'all') { setTargetRoles(['all']); return; }
    setTargetRoles(prev => {
      const without = prev.filter(x => x !== 'all' && x !== r);
      return prev.includes(r) ? (without.length ? without : ['all']) : [...without, r];
    });
  };

  const handleSave = () => {
    if (!title.trim() || !message.trim()) { toast.error('Title and message required'); return; }
    onSave({
      title: title.trim(),
      message: message.trim(),
      target_roles: targetRoles,
      is_urgent: isUrgent,
      expires_at: expiresAt ? new Date(expiresAt + 'T23:59:59').toISOString() : null,
      is_active: isActive,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Title *</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" />
      </div>
      <div className="space-y-1">
        <Label>Message *</Label>
        <Textarea rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Announcement message..." />
      </div>
      <div className="space-y-2">
        <Label>Target Roles</Label>
        <div className="flex gap-2 flex-wrap">
          {ALL_ROLES.map(r => (
            <button
              key={r}
              onClick={() => toggleRole(r)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                targetRoles.includes(r)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
              }`}
            >
              {roleLabel[r]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={isUrgent} onCheckedChange={setIsUrgent} id="urgent" />
        <Label htmlFor="urgent" className="cursor-pointer">Mark as Urgent 🚨</Label>
      </div>
      <div className="space-y-1">
        <Label>Expiry Date (optional)</Label>
        <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} min={new Date().toISOString().split('T')[0]} />
      </div>

      {/* Preview */}
      {title && (
        <div className={`rounded-lg px-4 py-3 border ${isUrgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`font-semibold text-sm ${isUrgent ? 'text-red-800' : 'text-amber-800'}`}>
            {isUrgent && '🚨 '}{title}
          </p>
          <p className={`text-xs mt-0.5 ${isUrgent ? 'text-red-700' : 'text-amber-700'}`}>{message}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button className="flex-1" onClick={handleSave}>Save Announcement</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export function AdminAnnouncements() {
  const { data: announcements = [], isLoading } = useAllAnnouncements();
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();
  const deactivate = useDeactivateAnnouncement();
  const deleteAnn = useDeleteAnnouncement();

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);

  const handleCreate = async (data: Omit<Announcement, 'id' | 'created_at' | 'created_by'>) => {
    try {
      await create.mutateAsync(data);
      toast.success('Announcement created!');
      setShowCreate(false);
    } catch (e: any) { toast.error(e.message ?? 'Failed'); }
  };

  const handleEdit = async (data: Omit<Announcement, 'id' | 'created_at' | 'created_by'>) => {
    if (!editTarget) return;
    try {
      await update.mutateAsync({ id: editTarget.id, ...data });
      toast.success('Announcement updated!');
      setEditTarget(null);
    } catch (e: any) { toast.error(e.message ?? 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Announcements</h2>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Announcement
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Urgent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              )}
              {!isLoading && announcements.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No announcements yet.</TableCell></TableRow>
              )}
              {announcements.map(a => (
                <TableRow key={a.id} className={!a.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium max-w-48 truncate">{a.title}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {a.target_roles.map(r => (
                        <Badge key={r} variant="outline" className="text-xs">{roleLabel[r] ?? r}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{a.is_urgent ? '🚨 Yes' : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={a.is_active ? 'default' : 'secondary'}>{a.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.expires_at ? new Date(a.expires_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {a.is_active && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditTarget(a)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {a.is_active && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600"
                          onClick={() => deactivate.mutate(a.id)}>
                          <PowerOff className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {!a.is_active && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500"
                          onClick={() => deleteAnn.mutate(a.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <AnnouncementForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Announcement</DialogTitle></DialogHeader>
          {editTarget && (
            <AnnouncementForm initial={editTarget} onSave={handleEdit} onCancel={() => setEditTarget(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
