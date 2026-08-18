import { lazy, Suspense, useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { RouterProvider, useRouter } from '@/context/RouterContext';
import { StoreRouterProvider, useStoreRouter } from '@/context/StoreRouterContext';
import { CartProvider } from '@/context/CartContext';
import AppShell from '@/components/AppShell';
import AuthPage from '@/pages/AuthPage';
import StoreLayout from '@/components/store/StoreLayout';
import { Loader as Loader2, Store, LayoutDashboard } from 'lucide-react';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ProductsPage = lazy(() => import('@/pages/ProductsPage'));
const InventoryPage = lazy(() => import('@/pages/InventoryPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const CustomersPage = lazy(() => import('@/pages/CustomersPage'));
const SuppliersPage = lazy(() => import('@/pages/SuppliersPage'));
const PurchasingPage = lazy(() => import('@/pages/PurchasingPage'));
const WarrantyPage = lazy(() => import('@/pages/WarrantyPage'));
const RepairsPage = lazy(() => import('@/pages/RepairsPage'));
const RmaPage = lazy(() => import('@/pages/RmaPage'));
const ImportPage = lazy(() => import('@/pages/ImportPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const SerialsPage = lazy(() => import('@/pages/SerialsPage'));
const InvoicesPage = lazy(() => import('@/pages/InvoicesPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const ControlTowerPage = lazy(() => import('@/pages/ControlTowerPage'));
const DataQualityPage = lazy(() => import('@/pages/DataQualityPage'));
const DeveloperCenterPage = lazy(() => import('@/pages/DeveloperCenterPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));

// Store pages
const StoreHomePage = lazy(() => import('@/pages/store/StoreHomePage'));
const StoreCategoriesPage = lazy(() => import('@/pages/store/StoreCategoriesPage'));
const StoreCategoryPage = lazy(() => import('@/pages/store/StoreCategoryPage'));
const StoreProductPage = lazy(() => import('@/pages/store/StoreProductPage'));
const StoreCartPage = lazy(() => import('@/pages/store/StoreCartPage'));
const StoreOrdersPage = lazy(() => import('@/pages/store/StoreOrdersPage'));
const StoreOrderDetailPage = lazy(() => import('@/pages/store/StoreOrderDetailPage'));
const StoreSearchPage = lazy(() => import('@/pages/store/StoreSearchPage'));
const StoreAccountPage = lazy(() => import('@/pages/store/StoreAccountPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
    </div>
  );
}

const ADMIN_ROLES = ['system_admin', 'manager', 'warehouse', 'accountant', 'viewer'];

function AdminApp() {
  const { route } = useRouter();

  const pages: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
    dashboard: DashboardPage,
    products: ProductsPage,
    inventory: InventoryPage,
    pricing: PricingPage,
    orders: OrdersPage,
    customers: CustomersPage,
    suppliers: SuppliersPage,
    purchasing: PurchasingPage,
    warranty: WarrantyPage,
    repairs: RepairsPage,
    rma: RmaPage,
    import: ImportPage,
    analytics: AnalyticsPage,
    settings: SettingsPage,
    serials: SerialsPage,
    invoices: InvoicesPage,
    notifications: NotificationsPage,
    control_tower: ControlTowerPage,
    data_quality: DataQualityPage,
    developer_center: DeveloperCenterPage,
    search: SearchPage,
  };

  const Page = pages[route] ?? DashboardPage;

  return (
    <AppShell>
      <Suspense fallback={<PageLoader />}>
        <Page />
      </Suspense>
    </AppShell>
  );
}

function StoreApp() {
  const { route } = useStoreRouter();

  const pages: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
    home: StoreHomePage,
    categories: StoreCategoriesPage,
    category: StoreCategoryPage,
    product: StoreProductPage,
    cart: StoreCartPage,
    orders: StoreOrdersPage,
    order_detail: StoreOrderDetailPage,
    search: StoreSearchPage,
    account: StoreAccountPage,
  };

  const Page = pages[route] ?? StoreHomePage;

  return (
    <StoreLayout>
      <Suspense fallback={<PageLoader />}>
        <Page />
      </Suspense>
    </StoreLayout>
  );
}

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [interfaceMode, setInterfaceMode] = useState<'admin' | 'store'>('admin');

  // Auto-select interface based on role
  useEffect(() => {
    if (profile) {
      if (profile.role === 'customer') {
        setInterfaceMode('store');
      } else if (ADMIN_ROLES.includes(profile.role)) {
        setInterfaceMode('admin');
      }
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  // Interface toggle button (for staff who can access both)
  const showToggle = profile && ADMIN_ROLES.includes(profile.role);

  const toggleButton = showToggle ? (
    <button
      onClick={() => setInterfaceMode((m) => (m === 'admin' ? 'store' : 'admin'))}
      className="fixed bottom-20 lg:bottom-4 left-4 z-50 btn-secondary shadow-elevated px-3 py-2 text-xs gap-1.5"
      title={interfaceMode === 'admin' ? 'معاينة المتجر' : 'لوحة الإدارة'}
    >
      {interfaceMode === 'admin' ? <Store className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
      {interfaceMode === 'admin' ? 'المتجر' : 'الإدارة'}
    </button>
  ) : null;

  return (
    <>
      {interfaceMode === 'admin' ? (
        <RouterProvider>
          <AdminApp />
        </RouterProvider>
      ) : (
        <StoreRouterProvider>
          <CartProvider>
            <StoreApp />
          </CartProvider>
        </StoreRouterProvider>
      )}
      {toggleButton}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
