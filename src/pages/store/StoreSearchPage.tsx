import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useStoreRouter } from '@/context/StoreRouterContext';
import { useCart } from '@/context/CartContext';
import type { StoreProduct } from '@/types/store';
import { Search as SearchIcon, Loader as Loader2, Package, Plus } from 'lucide-react';

export default function StoreSearchPage() {
  const { navigate } = useStoreRouter();
  const { addItem } = useCart();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      const term = `%${query.trim()}%`;
      const { data } = await supabase.from('store_products').select('*').or(`name.ilike.${term},sku.ilike.${term},barcode.ilike.${term}`).limit(20);
      setResults(data ?? []);
      setLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleAddToCart = (product: StoreProduct) => {
    addItem({ product_id: product.id, name: product.name, sku: product.sku, image_url: product.image_url, quantity: 1, unit: product.unit });
    navigate('cart');
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن منتج..." className="input pr-12 text-base" autoFocus />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary-600 animate-spin" /></div>
      ) : searched && results.length === 0 ? (
        <div className="card p-8 text-center">
          <Package className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">لا توجد نتائج لـ "{query}"</p>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {results.map((product) => (
            <div key={product.id} className="card card-hover overflow-hidden flex flex-col">
              <button onClick={() => navigate('product', { id: product.id })} className="aspect-square bg-app flex items-center justify-center overflow-hidden shrink-0">
                {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" /> : <Package className="w-12 h-12 text-muted" />}
              </button>
              <div className="p-3 flex flex-col flex-1">
                <button onClick={() => navigate('product', { id: product.id })} className="text-right">
                  <p className="font-medium text-app text-sm leading-snug mb-1">{product.name}</p>
                  {product.brand_name && <p className="text-muted text-xs mb-1">{product.brand_name}</p>}
                  <p className="text-muted text-xs">{product.sku}</p>
                </button>
                <button onClick={() => handleAddToCart(product)} className="btn-primary mt-2 py-2 text-xs w-full">
                  <Plus className="w-3.5 h-3.5" /> إضافة للسلة
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto mb-3">
            <SearchIcon className="w-7 h-7 text-primary-600" />
          </div>
          <p className="font-medium text-app">البحث في المنتجات</p>
          <p className="text-muted text-sm mt-1">ابحث بالاسم أو رمز الصنف أو الباركود</p>
        </div>
      )}
    </div>
  );
}
