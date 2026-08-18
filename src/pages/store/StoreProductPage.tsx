import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStoreRouter } from '@/context/StoreRouterContext';
import { useCart } from '@/context/CartContext';
import type { StoreProduct } from '@/types/store';
import { Loader as Loader2, Package, Plus, Minus, ArrowRight, ShieldCheck, Cpu, Barcode, CircleCheck as CheckCircle2 } from 'lucide-react';

export default function StoreProductPage() {
  const { params, navigate } = useStoreRouter();
  const { addItem } = useCart();
  const productId = params.id ?? '';
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase.from('store_products').select('*').eq('id', productId).maybeSingle();
      if (err) {
        setError('فشل تحميل المنتج');
      } else if (!data) {
        setError('المنتج غير موجود');
      } else {
        setProduct(data as StoreProduct);
      }
      setLoading(false);
    }
    if (productId) load();
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      product_id: product.id,
      name: product.name,
      sku: product.sku,
      image_url: product.image_url,
      quantity,
      unit: product.unit,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('home')} className="btn-ghost text-muted">
          <ArrowRight className="w-4 h-4" /> العودة
        </button>
        <div className="card p-8 text-center">
          <Package className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">{error ?? 'المنتج غير متاح'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('home')} className="btn-ghost text-muted">
        <ArrowRight className="w-4 h-4" /> العودة للمنتجات
      </button>

      <div className="card overflow-hidden">
        <div className="aspect-square sm:aspect-[4/3] bg-app flex items-center justify-center">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-20 h-20 text-muted" />
          )}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <h1 className="text-lg font-bold text-app mb-1">{product.name}</h1>
            {product.brand_name && <p className="text-muted text-sm">{product.brand_name}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="badge-neutral"><Package className="w-3 h-3" /> {product.sku}</span>
            {product.barcode && <span className="badge-neutral"><Barcode className="w-3 h-3" /> {product.barcode}</span>}
            {product.is_serialized && <span className="badge-info"><Cpu className="w-3 h-3" /> جهاز متسلسل</span>}
            {product.warranty_duration_months > 0 && (
              <span className="badge-success"><ShieldCheck className="w-3 h-3" /> ضمان {product.warranty_duration_months} شهر</span>
            )}
          </div>

          <div>
            <label className="label" htmlFor="qty">الكمية ({product.unit})</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="btn-secondary p-2.5" aria-label="تقليل">
                <Minus className="w-4 h-4" />
              </button>
              <input
                id="qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="input w-24 text-center font-semibold"
              />
              <button onClick={() => setQuantity((q) => q + 1)} className="btn-secondary p-2.5" aria-label="زيادة">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className={added ? 'btn-primary w-full py-3 bg-success-600 hover:bg-success-600' : 'btn-primary w-full py-3'}
          >
            {added ? (<><CheckCircle2 className="w-5 h-5" /> تمت الإضافة</>) : (<><Plus className="w-5 h-5" /> إضافة للسلة</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
