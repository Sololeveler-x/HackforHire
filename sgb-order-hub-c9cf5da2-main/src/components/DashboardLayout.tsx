import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, Package, Truck, FileText, BarChart3, ShoppingCart, Box,
  LogOut, Warehouse, AlertTriangle, MessageSquare, ChevronDown, Users, Clock,
  CheckSquare, PackageCheck, PlusCircle, ClipboardList, UserCog, Inbox,
  RotateCcw, ChevronLeft, Menu,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  billing: 'bg-blue-100 text-blue-700',
  packing: 'bg-amber-100 text-amber-700',
  shipping: 'bg-teal-100 text-teal-700',
  sales_agent: 'bg-green-100 text-green-700',
};

const roleMenus: Record<string, { title: string; url: string; icon: React.ComponentType<any> }[]> = {
  admin: [
    { title: 'Dashboard', url: '/admin?tab=dashboard', icon: LayoutDashboard },
    { title: 'Orders', url: '/admin?tab=orders', icon: ShoppingCart },
    { title: 'Products', url: '/admin?tab=products', icon: Package },
    { title: 'Warehouses', url: '/admin?tab=warehouses', icon: Warehouse },
    { title: 'Inventory', url: '/admin?tab=inventory', icon: AlertTriangle },
    { title: 'Leads', url: '/admin?tab=leads', icon: Inbox },
    { title: 'Team', url: '/admin?tab=team', icon: UserCog },
    { title: 'Announcements', url: '/admin?tab=announcements', icon: MessageSquare },
    { title: 'Returns', url: '/admin?tab=returns', icon: RotateCcw },
    { title: 'Analytics', url: '/admin?tab=analytics', icon: BarChart3 },
    { title: 'Complaints', url: '/admin?tab=complaints', icon: MessageSquare },
    { title: 'Settings', url: '/admin?tab=settings', icon: UserCog },
    { title: 'WhatsApp', url: '/admin?tab=whatsapp', icon: MessageSquare },
  ],
  billing: [
    { title: 'Dashboard', url: '/billing?tab=dashboard', icon: LayoutDashboard },
    { title: 'New Order', url: '/billing?tab=new-order', icon: PlusCircle },
    { title: 'Order History', url: '/billing?tab=history', icon: ClipboardList },
    { title: 'Inquiries', url: '/billing?tab=inquiries', icon: MessageSquare },
  ],
  packing: [
    { title: 'Dashboard', url: '/packing?tab=dashboard', icon: LayoutDashboard },
    { title: 'Pending Packing', url: '/packing?tab=pending', icon: Clock },
    { title: 'Packed Orders', url: '/packing?tab=packed', icon: CheckSquare },
  ],
  shipping: [
    { title: 'Dashboard', url: '/shipping?tab=dashboard', icon: LayoutDashboard },
    { title: 'Pending', url: '/shipping?tab=pending', icon: Box },
    { title: 'In Transit', url: '/shipping?tab=shipped', icon: PackageCheck },
    { title: 'Delivered', url: '/shipping?tab=delivered', icon: CheckSquare },
    { title: 'Failed', url: '/shipping?tab=failed', icon: AlertTriangle },
    { title: 'Pending Payments', url: '/shipping?tab=cod', icon: FileText },
  ],
  sales_agent: [
    { title: 'Dashboard', url: '/sales-agent?tab=dashboard', icon: LayoutDashboard },
    { title: 'My Leads', url: '/sales-agent?tab=leads', icon: Users },
    { title: 'Follow Ups', url: '/sales-agent?tab=followups', icon: Clock },
    { title: 'Products', url: '/sales-agent?tab=products', icon: Package },
  ],
};

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { role, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const getActiveRole = () => {
    const path = location.pathname;
    if (path.startsWith('/billing')) return 'billing';
    if (path.startsWith('/packing')) return 'packing';
    if (path.startsWith('/shipping')) return 'shipping';
    if (path.startsWith('/sales-agent')) return 'sales_agent';
    return role || 'admin';
  };

  const activeRole = getActiveRole();
  const items = roleMenus[activeRole] || [];
  const activeTab = searchParams.get('tab') || 'dashboard';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = (role || 'U').slice(0, 2).toUpperCase();

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 min-h-[56px]">
        <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          S
        </div>
        <AnimatePresence>
          {(!collapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden whitespace-nowrap flex-1"
            >
              <p className="text-sm font-bold text-gray-900 leading-tight">SGB Agro</p>
              <p className="text-[10px] text-gray-400">Industries</p>
            </motion.div>
          )}
        </AnimatePresence>
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronLeft className="h-3 w-3 text-gray-500" />
            </motion.div>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 px-2">
        {items.map((item, i) => {
          const tabId = item.url.split('tab=')[1] || 'dashboard';
          const isActive = activeTab === tabId;
          return (
            <motion.button
              key={item.url}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => { navigate(item.url); if (isMobile) setMobileOpen(false); }}
              className={`
                relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all duration-150
                ${isActive ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1 bottom-1 w-[3px] bg-green-600 rounded-r-full"
                />
              )}
              <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
              <AnimatePresence>
                {(!collapsed || isMobile) && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.12 }}
                    className="text-sm whitespace-nowrap overflow-hidden"
                  >
                    {item.title}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <AnimatePresence>
            {(!collapsed || isMobile) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-semibold text-gray-900 truncate capitalize">{role?.replace('_', ' ')}</p>
                <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {(!collapsed || isMobile) && (
          <button
            onClick={handleSignOut}
            className="mt-2 w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50 py-1.5 rounded-lg transition-colors text-left px-2 flex items-center gap-2"
          >
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f1f5f9] overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        className="hidden md:flex flex-col h-full bg-white border-r border-gray-100 overflow-hidden flex-shrink-0 relative z-20"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 z-40 flex flex-col md:hidden"
          >
            <SidebarContent isMobile />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-[52px] bg-white border-b border-gray-100 flex items-center justify-between px-4 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <Menu className="h-4 w-4 text-gray-500" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span>SGB</span>
              <span>/</span>
              <span className="text-gray-700 font-medium capitalize">{activeTab.replace(/-/g, ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${roleColors[activeRole] || 'bg-gray-100 text-gray-600'}`}>
              {activeRole.replace('_', ' ').toUpperCase()}
            </span>

            {role === 'admin' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Switch</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs">Quick Access</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin?tab=dashboard')} className="text-xs cursor-pointer">
                    <LayoutDashboard className="mr-2 h-3.5 w-3.5" /> Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/billing?tab=dashboard')} className="text-xs cursor-pointer">
                    <FileText className="mr-2 h-3.5 w-3.5" /> Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/packing?tab=dashboard')} className="text-xs cursor-pointer">
                    <Box className="mr-2 h-3.5 w-3.5" /> Packing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/shipping?tab=dashboard')} className="text-xs cursor-pointer">
                    <Truck className="mr-2 h-3.5 w-3.5" /> Shipping
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="w-8 h-8 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-5 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
