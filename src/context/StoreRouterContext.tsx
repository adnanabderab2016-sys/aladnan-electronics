import { createContext, useContext, useState, type ReactNode } from 'react';

export type StoreRouteName =
  | 'home'
  | 'categories'
  | 'category'
  | 'product'
  | 'cart'
  | 'orders'
  | 'order_detail'
  | 'account'
  | 'search';

interface StoreRouterContextValue {
  route: StoreRouteName;
  params: Record<string, string>;
  navigate: (route: StoreRouteName, params?: Record<string, string>) => void;
}

const StoreRouterContext = createContext<StoreRouterContextValue | undefined>(undefined);

export function StoreRouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<StoreRouteName>('home');
  const [params, setParams] = useState<Record<string, string>>({});

  const navigate = (newRoute: StoreRouteName, newParams: Record<string, string> = {}) => {
    setRoute(newRoute);
    setParams(newParams);
    window.scrollTo(0, 0);
  };

  return (
    <StoreRouterContext.Provider value={{ route, params, navigate }}>
      {children}
    </StoreRouterContext.Provider>
  );
}

export function useStoreRouter() {
  const ctx = useContext(StoreRouterContext);
  if (!ctx) throw new Error('useStoreRouter must be used within StoreRouterProvider');
  return ctx;
}
