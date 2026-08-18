import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStoreRouter } from '@/context/StoreRouterContext';
import { useCart } from '@/context/CartContext';
import type { StoreProduct } from '@/types/store';
import { Loader as Loader2, Package, Plus, ArrowRight, Search as SearchIcon } from 'lucide-react';

export default function StoreCategoryPage() {
  const { params, navigate } = useStoreRouter();
  const { addItem } = useCart();
  const categoryId = params.id ?? '';
  const categoryName = params.name ?? 'القسم';
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase.from('store_products').select('*').eq('category_id', categoryId);
      setProducts(data ?? []);
      setLoading(false);
    }
    if (categoryId) load();
  }, [categoryId]);

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('categories')} className="btn-ghost p-2" aria-label="رجوع">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-app">{categoryName}</h1>
      </div>

      <div className="relative">
        <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث في هذا القسم..." className="input pr-10" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <Package className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">لا توجد منتجات في هذا القسم</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((product) => (
            <div key={product.id} className="card card-hover overflow-hidden flex flex-col">
              <button onClick={() => navigate('product', { id: product.id })} className="aspect-square bg-app flex items-center justify-center overflow-hidden shrink-0">
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
  );
}
