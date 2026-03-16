import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import OrderSearch from '@/components/OrderSearch';
import InventoryTable from '@/components/InventoryTable';
import WarehouseManagement from '@/components/WarehouseManagement';
import ProductManagement from '@/components/ProductManagement';
import { TeamManagement } from '@/components/TeamManagement';
import { AdminLeads } from '@/components/AdminLeads';
import { AdminAnnouncements } from '@/components/AdminAnnouncements';
import { TerritoryAndTargets } from '@/components/TerritoryAndTargets';
import { ReturnsManagement } from '@/components/ReturnsManagement';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOrderStats, useOrdersWithTracking } from '@/hooks/useOrders';
import { useOrderSearch } from '@/hooks/useOrderSearch';
import { useProductStats, useShippingStats, useMonthlyRevenue } from '@/hooks/useAdmin';
import { useEmployees } from '@/hooks/useTeam';
import { useLowStockProducts } from '@/hooks/useInventory';
import {
  ShoppingCart,
  DollarSign,
  Package,
  Truck,
  Clock,
  TrendingUp,
  Download,
  Box,
  AlertTriangle,
  Warehouse,
  MessageSquare,
  BarChart3,
  Megaphone,
  RotateCcw,
  Users,
  UserCheck,
  Settings,
  LineChart as LineChartIcon,
  AlertOctagon,
  MessageCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, FunnelChart, Funnel, LabelList } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PaymentBadge } from '@/components/PaymentBadge';
import { GlowingStatCard } from '@/components/ui/GlowingStatCard';
import { PageTransition } from '@/components/ui/PageTransition';

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#0d9488', '#7c3aed', '#ef4444'];

const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: stats } = useOrderStats();
  const { data: orders } = useOrdersWithTracking();
  const filteredOrders = useOrderSearch(orders, searchQuery);
  const { data: productStats } = useProductStats();
  const { data: shippingStats } = useShippingStats();
  const { data: monthlyRevenue } = useMonthlyRevenue();
  const { data: lowStockProducts } = useLowStockProducts();

  // Sync activeTab with URL
  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const exportToCSV = () => {
    if (!orders || orders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const headers = ['Order ID', 'Customer Name', 'Phone', 'Address', 'Amount', 'Status', 'Payment', 'Date'];
    const csvData = orders.map(order => [
      order.id.substring(0, 8),
      order.customer_name,
      order.phone,
      order.address.replace(/,/g, ';'),
      order.total_amount,
      order.order_status,
      order.payment_status,
      new Date(order.created_at).toLocaleDateString()
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Orders exported successfully!');
  };

  const statusData = [
    { name: 'Pending', value: stats?.pending || 0 },
    { name: 'Packed', value: stats?.packed || 0 },
    { name: 'Shipped', value: stats?.shipped || 0 },
  ];

  const statCards = [
    { title: 'Total Orders', value: stats?.total || 0, icon: ShoppingCart, color: 'green' as const, trend: '+12%', trendUp: true },
    { title: 'Revenue', value: `₹${(stats?.revenue || 0).toLocaleString()}`, icon: DollarSign, color: 'green' as const, trend: '+8%', trendUp: true },
    { title: 'Pending Packing', value: stats?.pending || 0, icon: Clock, color: 'amber' as const, trend: '-5%', trendUp: false },
    { title: 'Packed', value: stats?.packed || 0, icon: Package, color: 'blue' as const, trend: '+15%', trendUp: true },
    { title: 'Shipped', value: stats?.shipped || 0, icon: Truck, color: 'purple' as const, trend: '+20%', trendUp: true },
  ];

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: ShoppingCart },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'products', label: 'Products', icon: Box },
    { id: 'warehouses', label: 'Warehouses', icon: Warehouse },
    { id: 'inventory', label: 'Inventory', icon: AlertTriangle },
    { id: 'leads', label: 'Leads', icon: MessageSquare },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'performance', label: 'Performance', icon: UserCheck },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'returns', label: 'Returns', icon: RotateCcw },
    { id: 'complaints', label: 'Complaints', icon: AlertOctagon },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  ];

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      ready_for_packing: 'status-pending',
      ready_for_shipping: 'status-packed',
      shipped: 'status-shipped',
      pending: 'status-pending',
      billed: 'status-billed',
    };
    return map[status] || 'status-pending';
  };

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <AnnouncementBanner role="admin" />

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <PageTransition tabKey="dashboard">
          <div className="space-y-6">
            {/* Low Stock Alert */}
            {lowStockProducts && lowStockProducts.length > 0 && (
              <Card className="border-warning bg-warning/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium">Low Stock Alert — {lowStockProducts.length} item{lowStockProducts.length > 1 ? 's' : ''} need restocking</p>
                      <ul className="space-y-0.5">
                        {lowStockProducts.map((item: any, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            {item.product_name} at {item.warehouse_name} — {item.stock_quantity} unit{item.stock_quantity !== 1 ? 's' : ''} left
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {statCards.map((stat) => (
                <GlowingStatCard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                  trend={stat.trend}
                  trendUp={stat.trendUp}
                  color={stat.color}
                />
              ))}
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Monthly Revenue */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyRevenue}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: 'white', border: '0.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '8px 12px' }} formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                      <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={false} name="Revenue" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Status Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4}>
                        {statusData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'white', border: '0.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '8px 12px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
          </PageTransition>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <PageTransition tabKey="orders">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">All Orders</CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <OrderSearch value={searchQuery} onChange={setSearchQuery} />
                  <Button onClick={exportToCSV} size="sm" variant="outline" className="shrink-0">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Courier</TableHead>
                    <TableHead>Tracking ID</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.map((order) => (
                    <TableRow key={order.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                            {order.customer_name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
                            <p className="text-xs text-gray-400">{order.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>₹{Number(order.total_amount).toLocaleString()}</TableCell>
                      <TableCell><PaymentBadge order={order as any} /></TableCell>
                      <TableCell>
                        {order.shipping_provider ? (
                          <span className="text-sm">{order.shipping_provider}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Not shipped yet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.tracking_id ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">{order.tracking_id}</code>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={getStatusBadge(order.order_status)}>
                            {order.order_status.replace(/_/g, ' ')}
                          </span>
                          {order.tracking_id && order.tracking_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(order.tracking_url, '_blank')}
                              className="h-7 text-xs"
                            >
                              Track
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!filteredOrders || filteredOrders.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-16">
                          <div className="text-4xl mb-3 opacity-20">📦</div>
                          <p className="text-sm font-semibold text-gray-500 mb-1">No orders yet</p>
                          <p className="text-xs text-gray-400">{searchQuery ? 'No orders found matching your search' : 'Orders will appear here once created'}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          </PageTransition>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <PageTransition tabKey="analytics">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productStats?.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'white', border: '0.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '8px 12px' }} formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="#16a34a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Shipping Providers */}
            <Card>
              <CardHeader>
                <CardTitle>Shipping Provider Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={shippingStats} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4}>
                      {shippingStats?.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'white', border: '0.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '8px 12px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          </PageTransition>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && <ProductManagement />}

        {/* Warehouses Tab */}
        {activeTab === 'warehouses' && <WarehouseManagement />}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && <InventoryTable />}

        {/* Leads Tab */}
        {activeTab === 'leads' && <AdminLeads />}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="space-y-8">
            <TeamManagement />
            <TerritoryAndTargets />
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && <AdminAnnouncements />}

        {/* Returns Tab */}
        {activeTab === 'returns' && <ReturnsManagement />}

        {/* Analytics Tab (Task 13) */}
        {activeTab === 'analytics' && <AdvancedAnalyticsTab orders={orders} />}

        {/* Complaints Tab (Task 14) */}
        {activeTab === 'complaints' && <ComplaintsTab />}

        {/* Settings Tab (Task 16) */}
        {activeTab === 'settings' && <CompanySettingsTab />}

        {/* WhatsApp Tab */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  WhatsApp Automation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-medium text-green-700">✅ Webhook Active</p>
                    <p className="text-sm text-green-600">Twilio sandbox connected</p>
                    <p className="text-xs text-gray-500 mt-1">+14155238886</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-medium text-green-700">✅ Groq AI Active</p>
                    <p className="text-sm text-green-600">llama-3.3-70b-versatile</p>
                    <p className="text-xs text-gray-500 mt-1">Auto-extracts order details</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium mb-2 text-sm">Demo — Scan to join WhatsApp sandbox</p>
                  <p className="text-sm text-gray-600 mb-2">
                    Send <code className="bg-gray-200 px-1 rounded text-xs">join wing-mad</code> to <strong>+1 415 523 8886</strong>
                  </p>
                  <QRCodeSVG value="https://wa.me/14155238886?text=join%20wing-mad" size={100} />
                </div>
                <div>
                  <p className="font-medium text-sm mb-2">Recent WhatsApp Inquiries</p>
                  <RecentWhatsAppInquiriesInline />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </motion.div>
    </DashboardLayout>
  );
}

// ── Advanced Analytics Tab (Task 13) ─────────────────────────────────────────
function AdvancedAnalyticsTab({ orders }: { orders: any[] | undefined }) {
  const { data: inquiries = [] } = useQuery({
    queryKey: ['all-inquiries-analytics'],
    queryFn: async () => { const { data } = await (supabase as any).from('inquiries').select('*'); return data ?? []; },
  });

  const allOrders = orders ?? [];

  // Customer analytics
  const customerMap = new Map<string, { name: string; phone: string; total: number; count: number }>();
  allOrders.forEach(o => {
    const key = o.phone;
    const existing = customerMap.get(key);
    if (existing) { existing.total += Number(o.total_amount); existing.count++; }
    else customerMap.set(key, { name: o.customer_name, phone: o.phone, total: Number(o.total_amount), count: 1 });
  });
  const customers = Array.from(customerMap.values());
  const repeatCustomers = customers.filter(c => c.count > 1).length;
  const newCustomers = customers.filter(c => c.count === 1).length;
  const top10 = [...customers].sort((a, b) => b.total - a.total).slice(0, 10);

  // City distribution
  const cityMap = new Map<string, number>();
  allOrders.forEach(o => { const c = o.city || 'Unknown'; cityMap.set(c, (cityMap.get(c) || 0) + 1); });
  const cityData = Array.from(cityMap.entries()).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 8);

  // Monthly avg order value
  const monthMap = new Map<string, { total: number; count: number }>();
  allOrders.forEach(o => {
    const m = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const ex = monthMap.get(m);
    if (ex) { ex.total += Number(o.total_amount); ex.count++; }
    else monthMap.set(m, { total: Number(o.total_amount), count: 1 });
  });
  const avgOrderData = Array.from(monthMap.entries()).map(([month, v]) => ({ month, avg: Math.round(v.total / v.count) }));

  // Product analytics
  const productMap = new Map<string, number>();
  allOrders.forEach(o => { /* product revenue from order_items not available here, use total */ });

  // Sales funnel
  const funnelData = [
    { name: 'WhatsApp Leads', value: inquiries.length, fill: '#16a34a' },
    { name: 'Assigned', value: inquiries.filter((i: any) => i.assigned_to).length, fill: '#22c55e' },
    { name: 'Called', value: inquiries.filter((i: any) => i.call_status === 'called').length, fill: '#4ade80' },
    { name: 'Submitted', value: inquiries.filter((i: any) => ['pending_billing', 'converted'].includes(i.status)).length, fill: '#86efac' },
    { name: 'Converted', value: inquiries.filter((i: any) => i.status === 'converted').length, fill: '#bbf7d0' },
    { name: 'Delivered', value: allOrders.filter(o => o.order_status === 'delivered').length, fill: '#dcfce7' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Repeat vs New Customers</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={[{ name: 'Repeat', value: repeatCustomers }, { name: 'New', value: newCustomers }]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                  <Cell fill="#16a34a" /><Cell fill="#86efac" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Avg Order Value Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={avgOrderData}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Line type="monotone" dataKey="avg" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Top 10 Customers by Revenue</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={top10} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={120} />
              <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
              <Bar dataKey="total" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Customer City Distribution</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cityData}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="city" /><YAxis />
              <Tooltip /><Bar dataKey="count" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Sales Funnel — WhatsApp to Delivery</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {funnelData.map((stage, i) => {
              const pct = funnelData[0].value > 0 ? Math.round((stage.value / funnelData[0].value) * 100) : 0;
              return (
                <div key={stage.name} className="flex items-center gap-3">
                  <span className="text-sm w-32 text-muted-foreground">{stage.name}</span>
                  <div className="flex-1 h-7 bg-gray-100 rounded overflow-hidden">
                    <div className="h-full bg-green-500 flex items-center px-2 text-white text-xs font-medium transition-all" style={{ width: `${Math.max(pct, 5)}%`, opacity: 1 - i * 0.1 }}>
                      {stage.value}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-10">{pct}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Complaints Tab (Task 14) ──────────────────────────────────────────────────
function ComplaintsTab() {
  const qc = useQueryClient();
  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['admin-complaints'],
    queryFn: async () => { const { data } = await (supabase as any).from('customer_complaints').select('*').order('created_at', { ascending: false }); return data ?? []; },
  });
  const [resolveDialog, setResolveDialog] = useState<any | null>(null);
  const [resolution, setResolution] = useState('');

  const handleResolve = async () => {
    await (supabase as any).from('customer_complaints').update({ status: 'resolved' }).eq('id', resolveDialog.id);
    toast.success('Complaint resolved');
    setResolveDialog(null); setResolution('');
    qc.invalidateQueries({ queryKey: ['admin-complaints'] });
  };

  const statusColor = (s: string) => s === 'resolved' ? 'bg-green-100 text-green-700' : s === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Customer Complaints</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
              {!isLoading && complaints.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No complaints yet</TableCell></TableRow>}
              {complaints.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell><div className="font-medium">{c.customer_name || 'Unknown'}</div><div className="text-xs text-muted-foreground">{c.customer_phone}</div></TableCell>
                  <TableCell className="capitalize">{c.complaint_type?.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="max-w-48 truncate text-sm">{c.description}</TableCell>
                  <TableCell><Badge className={statusColor(c.status)}>{c.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {c.status !== 'resolved' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setResolveDialog(c); setResolution(''); }}>Resolve</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Complaint</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{resolveDialog?.description}</p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleResolve}>Mark Resolved</Button>
              <Button variant="outline" className="flex-1" onClick={() => setResolveDialog(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Company Settings Tab (Task 16) ────────────────────────────────────────────
function CompanySettingsTab() {
  const { data: settings, refetch } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => { const { data } = await (supabase as any).from('company_settings').select('*').single(); return data; },
  });
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await (supabase as any).from('company_settings').update({ ...form, updated_at: new Date().toISOString() }).eq('id', form.id);
    toast.success('Settings saved');
    setSaving(false);
    refetch();
  };

  const field = (key: string, label: string, type = 'text') => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={form[key] ?? ''} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))} />
    </div>
  );

  return (
    <Card>
      <CardHeader><CardTitle>Company Settings</CardTitle><p className="text-sm text-muted-foreground">Used in GST invoices and system-wide</p></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {field('company_name', 'Company Name')}
          {field('gstin', 'GSTIN')}
          {field('pan', 'PAN')}
          {field('phone', 'Phone')}
          {field('email', 'Email', 'email')}
          {field('website', 'Website')}
          {field('invoice_prefix', 'Invoice Prefix')}
          {field('default_gst_rate', 'Default GST Rate (%)', 'number')}
          {field('bank_name', 'Bank Name')}
          {field('bank_account', 'Bank Account')}
          {field('bank_ifsc', 'Bank IFSC')}
          {field('upi_id', 'UPI ID')}
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={form.address ?? ''} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} />
        </div>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
      </CardContent>
    </Card>
  );
}

// ── Recent WhatsApp Inquiries (inline) ───────────────────────────────────────
function RecentWhatsAppInquiriesInline() {
  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ['whatsapp-inquiries-recent'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('inquiries').select('*').ilike('source', '%whatsapp%').order('created_at', { ascending: false }).limit(10);
      return data ?? [];
    },
  });
  if (isLoading) return <p className="text-xs text-muted-foreground">Loading...</p>;
  if (inquiries.length === 0) return <p className="text-xs text-muted-foreground">No WhatsApp inquiries yet</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Customer</TableHead>
          <TableHead className="text-xs">Product</TableHead>
          <TableHead className="text-xs">City</TableHead>
          <TableHead className="text-xs">Received</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {inquiries.map((inq: any) => (
          <TableRow key={inq.id}>
            <TableCell className="text-xs font-medium">{inq.customer_name ?? '—'}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{inq.product_name ?? '—'}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{inq.delivery_city ?? '—'}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{new Date(inq.created_at).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default AdminDashboard;
