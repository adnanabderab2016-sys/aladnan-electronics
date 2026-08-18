import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { RouterProvider, useRouter } from '@/context/RouterContext';
import AppShell from '@/components/AppShell';
import AuthPage from '@/pages/AuthPage';
import { Loader2 } from 'lucide-react';

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

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
    </div>
  );
}

function AppContent() {
  const { session, loading } = useAuth();
  const { route } = useRouter();

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

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
