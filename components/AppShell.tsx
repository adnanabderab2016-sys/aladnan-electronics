import { useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter, type RouteName } from '@/context/RouterContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';
import {
  Cpu,
  LayoutDashboard,
  Package,
  Warehouse,
  Tag,
  ShoppingCart,
  Users,
  Truck,
  ClipboardList,
  ShieldCheck,
  Wrench,
  RotateCcw,
  Upload,
  BarChart3,
  Settings,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  Bell,
  Smartphone,
  FileText,
  Radio,
  Activity,
  Code2,
  Search,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';

interface NavItem {
  route: RouteName;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'الرئيسية',
    items: [
      { route: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
      { route: 'control_tower', label: 'مركز العمليات', icon: Radio },
      { route: 'search', label: 'البحث الشامل', icon: Search },
      { route: 'notifications', label: 'الإشعارات', icon: Bell },
    ],
  },
  {
    title: 'الكتالوج والمخزون',
    items: [
      { route: 'products', label: 'المنتجات', icon: Package },
      { route: 'serials', label: 'الأجهزة التسلسلية', icon: Smartphone },
      { route: 'inventory', label: 'المخزون', icon: Warehouse },
      { route: 'pricing', label: 'التسعير', icon: Tag },
    ],
  },
  {
    title: 'المبيعات',
    items: [
      { route: 'orders', label: 'الطلبات', icon: ShoppingCart },
      { route: 'invoices', label: 'الفواتير', icon: FileText },
      { route: 'customers', label: 'العملاء', icon: Users },
    ],
  },
  {
    title: 'المشتريات',
    items: [
      { route: 'suppliers', label: 'الموردون', icon: Truck },
      { route: 'purchasing', label: 'أوامر الشراء', icon: ClipboardList },
    ],
  },
  {
    title: 'الخدمات',
    items: [
      { route: 'warranty', label: 'الضمان', icon: ShieldCheck },
      { route: 'repairs', label: 'الإصلاحات', icon: Wrench },
      { route: 'rma', label: 'المرتجعات', icon: RotateCcw },
    ],
  },
  {
    title: 'الأدوات والمراقبة',
    items: [
      { route: 'import', label: 'الاستيراد', icon: Upload },
      { route: 'analytics', label: 'التحليلات', icon: BarChart3 },
      { route: 'data_quality', label: 'جودة البيانات', icon: Activity },
      { route: 'developer_center', label: 'مركز المطورين', icon: Code2 },
      { route: 'settings', label: 'الإعدادات', icon: Settings },
    ],
  },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { route, navigate } = useRouter();
  const online = useOnlineStatus();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNav = (r: RouteName) => {
    navigate(r);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-app flex">
      {/* Offline indicator */}
      {!online && (
        <div className="fixed top-0 inset-x-0 z-[60] bg-warning-500 text-white text-center text-sm py-1.5 font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          وضع عدم الاتصال — يتم حفظ تغييراتك ومزامنتها لاحقاً
        </div>
      )}

      {/* Sidebar — Desktop */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 right-0 z-40 h-screen w-72 bg-surface border-l border-app',
          'transition-transform duration-300 ease-smooth',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
          !online && 'mt-9'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 h-16 border-b border-app shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0">
              <Cpu className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-app text-sm truncate">إنجاز للإلكترونيات</p>
              <p className="text-muted text-xs">منصة الإدارة المتكاملة</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 no-scrollbar">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="px-3 mb-2 text-xs font-semibold text-muted uppercase tracking-wider">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = route === item.route;
                    return (
                      <button
                        key={item.route}
                        onClick={() => handleNav(item.route)}
                        className={cn('nav-item w-full', active && 'nav-item-active')}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User */}
          <div className="border-t border-app p-3 shrink-0">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm shrink-0">
                {(profile?.full_name || profile?.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-app truncate">
                  {profile?.full_name || 'مستخدم'}
                </p>
                <p className="text-xs text-muted truncate">{profile?.email}</p>
              </div>
              <button
                onClick={signOut}
                className="btn-ghost p-2"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 bg-surface/80 backdrop-blur-md border-b border-app flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="btn-ghost p-2 lg:hidden"
              aria-label="القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-app">
              {NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.route === route)?.label ?? ''}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('search')}
              className="btn-ghost p-2"
              aria-label="البحث"
              title="البحث الشامل"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('notifications')}
              className="btn-ghost p-2 relative"
              aria-label="الإشعارات"
              title="الإشعارات"
            >
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTheme}
              className="btn-ghost p-2"
              aria-label="تبديل الوضع الليلي"
              title="الوضع الليلي / النهاري"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile close button — visible when sidebar open */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-4 left-4 z-50 lg:hidden btn-ghost p-2 bg-surface rounded-xl shadow-elevated"
          aria-label="إغلاق القائمة"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
