import { createContext, useContext, useState, type ReactNode } from 'react';

export type RouteName =
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'pricing'
  | 'orders'
  | 'customers'
  | 'suppliers'
  | 'purchasing'
  | 'warranty'
  | 'repairs'
  | 'rma'
  | 'import'
  | 'analytics'
  | 'settings'
  | 'serials'
  | 'invoices'
  | 'notifications'
  | 'control_tower'
  | 'data_quality'
  | 'developer_center'
  | 'search';

interface RouterContextValue {
  route: RouteName;
  params: Record<string, string>;
  navigate: (route: RouteName, params?: Record<string, string>) => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<RouteName>('dashboard');
  const [params, setParams] = useState<Record<string, string>>({});

  const navigate = (newRoute: RouteName, newParams: Record<string, string> = {}) => {
    setRoute(newRoute);
    setParams(newParams);
    window.scrollTo(0, 0);
  };

  return (
    <RouterContext.Provider value={{ route, params, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
