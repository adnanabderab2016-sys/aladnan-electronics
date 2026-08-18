import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStoreRouter } from '@/context/StoreRouterContext';
import { useCart } from '@/context/CartContext';
import type { StoreProduct, StoreCategory } from '@/types/store';
import { Search, ChevronLeft, Plus, Package, Loader as Loader2 } from 'lucide-react';

export default function StoreHomePage() {
  const { navigate } = useStoreRouter();
  const { addItem } = useCart();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [prodRes, catRes] = await Promise.all([
          supabase.from('store_products').select('*').limit(20),
          supabase.from('store_categories').select('*'),
        ]);
        if (prodRes.error) throw prodRes.error;
        if (catRes.error) throw catRes.error;
        setProducts(prodRes.data ?? []);
        setCategories(catRes.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'فشل تحميل المنتجات');
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleAddToCart = (product: StoreProduct) => {
    addItem({
      product_id: product.id,
      name: product.name,
      sku: product.sku,
      image_url: product.image_url,
      quantity: 1,
      unit: product.unit,
    });
    navigate('cart');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-error-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800 border-0">
        <div className="p-6 sm:p-8 text-white">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">مرحباً بك في متجر إنجاز للإلكترونيات</h1>
          <p className="text-primary-100 text-sm mb-4">تصفح أحدث المنتجات الإلكترونية واطلب بكل سهولة</p>
          <button
            onClick={() => navigate('search')}
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
          >
            <Search className="w-4 h-4" />
            ابحث عن منتج
          </button>
        </div>
      </div>

      {categories.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-app">الأقسام</h2>
            <button onClick={() => navigate('categories')} className="text-primary-600 text-sm flex items-center gap-1">
              عرض الكل <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {categories.slice(0, 10).map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate('category', { id: cat.id, name: cat.name })}
                className="card p-4 min-w-[120px] text-center hover:border-primary-300 transition-all shrink-0"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto mb-2">
                  <Package className="w-5 h-5 text-primary-600" />
                </div>
                <p className="text-sm font-medium text-app">{cat.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold text-app mb-3">المنتجات</h2>
        {products.length === 0 ? (
          <div className="card p-8 text-center">
            <Package className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted text-sm">لا توجد منتجات متاحة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {products.map((product) => (
              <div key={product.id} className="card card-hover overflow-hidden flex flex-col">
                <button
                  onClick={() => navigate('product', { id: product.id })}
                  className="aspect-square bg-app flex items-center justify-center overflow-hidden shrink-0"
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Package className="w-12 h-12 text-muted" />
                  )}
                </button>
                <div className="p-3 flex flex-col flex-1">
                  <button onClick={() => navigate('product', { id: product.id })} className="text-right">
                    <p className="font-medium text-app text-sm leading-snug mb-1">{product.name}</p>
                    {product.brand_name && <p className="text-muted text-xs mb-1">{product.brand_name}</p>}
                    <p className="text-muted text-xs">{product.sku}</p>
                  </button>
                  <button onClick={() => handleAddToCart(product)} className="btn-primary mt-2 py-2 text-xs w-full">
                    <Plus className="w-3.5 h-3.5" />
                    إضافة للسلة
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
