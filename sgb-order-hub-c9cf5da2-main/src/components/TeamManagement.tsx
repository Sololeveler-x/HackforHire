import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { UserPlus, Copy, Check, Pencil, KeyRound, UserX, Trash2 } from 'lucide-react';
import {
  useEmployees, useCreateEmployee, useUpdateEmployee,
  useResetPassword, useDeactivateEmployee, useDeleteEmployee,
  generatePassword, Employee, EmployeeRole,
} from '@/hooks/useTeam';

const roleBadge: Record<string, { label: string; className: string }> = {
  admin:       { label: 'Admin',       className: 'bg-purple-100 text-purple-700 border-purple-200' },
  billing:     { label: 'Billing',     className: 'bg-blue-100 text-blue-700 border-blue-200' },
  packing:     { label: 'Packing',     className: 'bg-amber-100 text-amber-700 border-amber-200' },
  shipping:    { label: 'Shipping',    className: 'bg-teal-100 text-teal-700 border-teal-200' },
  sales_agent: { label: 'Sales Agent', className: 'bg-orange-100 text-orange-700 border-orange-200' },
};

function CredentialsModal({ email, password, role, onClose }: { email: string; password: string; role: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `Email: ${email}\nPassword: ${password}\nRole: ${role}`;

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-green-600">Employee Created!</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">Share these credentials with the employee via WhatsApp or call.</p>
        <div className="rounded-lg border bg-muted p-4 space-y-2 font-mono text-sm">
          <div><span className="text-muted-foreground">Email: </span>{email}</div>
          <div><span className="text-muted-foreground">Password: </span><span className="font-bold text-primary">{password}</span></div>
          <div><span className="text-muted-foreground">Role: </span>{roleBadge[role]?.label ?? role}</div>
        </div>
        <Button onClick={copy} variant="outline" className="w-full gap-2 mt-2">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </Button>
        <Button onClick={onClose} className="w-full">Done</Button>
      </DialogContent>
    </Dialog>
  );
}

export function TeamManagement() {
  const { data: employees = [], isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const resetPassword = useResetPassword();
  const deactivate = useDeactivateEmployee();
  const deleteEmp = useDeleteEmployee();

  const [showAdd, setShowAdd] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string; role: string } | null>(null);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'billing' as EmployeeRole, city: '', department_notes: '' });
  const [editForm, setEditForm] = useState({ name: '', phone: '', city: '', department_notes: '', status: 'active', role: 'billing' as EmployeeRole | 'admin' });

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.role) { toast.error('Name, email and role are required'); return; }
    const password = generatePassword();
    try {
      await createEmployee.mutateAsync({ ...form, password });
      setCredentials({ email: form.email, password, role: form.role });
      setShowAdd(false);
      setForm({ name: '', email: '', phone: '', role: 'billing', city: '', department_notes: '' });
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create employee');
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    try {
      await updateEmployee.mutateAsync({ user_id: editTarget.user_id, ...editForm });
      toast.success('Employee updated');
      setEditTarget(null);
    } catch (e: any) {
      toast.error(e.message ?? 'Update failed');
    }
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    const pwd = generatePassword();
    setNewPassword(pwd);
    try {
      await resetPassword.mutateAsync({ user_id: resetTarget.user_id, password: pwd });
    } catch (e: any) {
      toast.error(e.message ?? 'Reset failed');
    }
  };

  const handleDeactivate = async (emp: Employee) => {
    if (!confirm(`Deactivate ${emp.name}? Their leads will be unassigned.`)) return;
    try {
      await deactivate.mutateAsync(emp.user_id);
      toast.success('Employee deactivated');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed');
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    try {
      await deleteEmp.mutateAsync(emp.user_id);
      toast.success('Employee deleted');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Team Management</h2>
          <p className="text-sm text-muted-foreground">{employees.length} team members</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              )}
              {!isLoading && employees.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No employees yet. Add your first team member.</TableCell></TableRow>
              )}
              {employees.map(emp => {
                const rb = roleBadge[emp.role ?? ''] ?? { label: emp.role ?? '—', className: 'bg-gray-100 text-gray-700' };
                return (
                  <TableRow key={emp.user_id} className={emp.status === 'inactive' ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{emp.email}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${rb.className}`}>{rb.label}</span>
                    </TableCell>
                    <TableCell>{emp.city ?? '—'}</TableCell>
                    <TableCell>{emp.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                        {emp.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(emp.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit"
                          onClick={() => {
                            setEditTarget(emp);
                            setEditForm({ name: emp.name, phone: emp.phone ?? '', city: emp.city ?? '', department_notes: emp.department_notes ?? '', status: emp.status, role: (emp.role ?? 'billing') as any });
                          }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Reset Password"
                          onClick={() => { setResetTarget(emp); setNewPassword(''); }}>
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        {emp.status === 'active' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600" title="Deactivate"
                            onClick={() => handleDeactivate(emp)}>
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete"
                          onClick={() => handleDelete(emp)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Employee Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" />
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-1">
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Mysuru" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as EmployeeRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="packing">Packing</SelectItem>
                  <SelectItem value="shipping">Shipping</SelectItem>
                  <SelectItem value="sales_agent">Sales Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Department Notes</Label>
              <Textarea rows={2} value={form.department_notes} onChange={e => setForm(f => ({ ...f, department_notes: e.target.value }))} placeholder="Any notes about this employee..." />
            </div>
            <p className="text-xs text-muted-foreground">A password will be auto-generated (SGB@XXXX format) and shown to you after creation.</p>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleCreate} disabled={createEmployee.isPending}>
                {createEmployee.isPending ? 'Creating...' : 'Create Employee'}
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Modal */}
      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Email (cannot change)</Label>
              <Input value={editTarget?.email ?? ''} disabled className="opacity-60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>City</Label>
                <Input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="packing">Packing</SelectItem>
                  <SelectItem value="shipping">Shipping</SelectItem>
                  <SelectItem value="sales_agent">Sales Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={editForm.department_notes} onChange={e => setEditForm(f => ({ ...f, department_notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleEdit} disabled={updateEmployee.isPending}>
                {updateEmployee.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={!!resetTarget} onOpenChange={open => !open && setResetTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          {!newPassword ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Generate a new password for <strong>{resetTarget?.name}</strong>. Share it with them after.</p>
              <Button className="w-full" onClick={handleReset} disabled={resetPassword.isPending}>
                {resetPassword.isPending ? 'Generating...' : 'Generate New Password'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted p-4 font-mono text-center">
                <div className="text-xs text-muted-foreground mb-1">New Password</div>
                <div className="text-xl font-bold text-primary">{newPassword}</div>
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => { navigator.clipboard.writeText(newPassword); toast.success('Copied!'); }}>
                <Copy className="h-4 w-4" /> Copy Password
              </Button>
              <Button className="w-full" onClick={() => setResetTarget(null)}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Credentials Modal after creation */}
      {credentials && (
        <CredentialsModal
          email={credentials.email}
          password={credentials.password}
          role={credentials.role}
          onClose={() => setCredentials(null)}
        />
      )}
    </div>
  );
}
