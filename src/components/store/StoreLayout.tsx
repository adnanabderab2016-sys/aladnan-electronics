import { type ReactNode } from 'react';
import { useStoreRouter, type StoreRouteName } from '@/context/StoreRouterContext';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';
import { Cpu, Chrome as Home, Grid3x3, ShoppingCart, ClipboardList, User, Moon, Sun, WifiOff, Search } from 'lucide-react';

interface NavTab {
  route: StoreRouteName;
  label: string;
  icon: typeof Home;
}

const NAV_TABS: NavTab[] = [
  { route: 'home', label: 'الرئيسية', icon: Home },
  { route: 'categories', label: 'الأقسام', icon: Grid3x3 },
  { route: 'cart', label: 'السلة', icon: ShoppingCart },
  { route: 'orders', label: 'طلباتي', icon: ClipboardList },
  { route: 'account', label: 'حسابي', icon: User },
];

export default function StoreLayout({ children }: { children: ReactNode }) {
  const { route, navigate } = useStoreRouter();
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const online = useOnlineStatus();

  return (
    <div className="min-h-screen bg-app flex flex-col">
      {!online && (
        <div className="fixed top-0 inset-x-0 z-[60] bg-warning-500 text-white text-center text-sm py-1.5 font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          وضع عدم الاتصال — سيتم حفظ طلبك ومزامنته لاحقاً
        </div>
      )}

      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-app">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate('home')} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-bold text-app text-sm">إنجاز للإلكترونيات</span>
          </button>

          <div className="flex items-center gap-1">
            <button onClick={() => navigate('search')} className="btn-ghost p-2" aria-label="بحث">
              <Search className="w-5 h-5" />
            </button>
            <button onClick={toggleTheme} className="btn-ghost p-2" aria-label="تبديل الوضع">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-app safe-bottom">
        <div className="max-w-6xl mx-auto flex items-stretch justify-around">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = route === tab.route;
            return (
              <button
                key={tab.route}
                onClick={() => navigate(tab.route)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2 px-3 flex-1 transition-colors',
                  active ? 'text-primary-600' : 'text-muted hover:text-app'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                  {tab.route === 'cart' && totalItems > 0 && (
                    <span className="absolute -top-2 -left-2 bg-primary-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                      {totalItems}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
