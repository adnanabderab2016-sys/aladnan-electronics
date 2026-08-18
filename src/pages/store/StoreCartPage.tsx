import { useStoreRouter } from '@/context/StoreRouterContext';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, Loader as Loader2, Package, CircleCheck as CheckCircle2 } from 'lucide-react';

export default function StoreCartPage() {
  const { navigate } = useStoreRouter();
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmitOrder = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('يجب تسجيل الدخول لإرسال الطلب');
        setSubmitting(false);
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).maybeSingle();

      let customerId: string | null = null;

      if (profile?.email) {
        const { data: customer } = await supabase.from('customers').select('id').eq('code', profile.email).maybeSingle();
        if (customer) customerId = customer.id;
      }

      if (!customerId) {
        const { data: customer2 } = await supabase.from('customers').select('id').eq('id', user.id).maybeSingle();
        if (customer2) customerId = customer2.id;
      }

      if (!customerId) {
        setError('لم يتم العثور على حساب عميل مرتبط بحسابك. يرجى التواصل مع الإدارة.');
        setSubmitting(false);
        return;
      }

      const orderItems = items.map((item) => ({ product_id: item.product_id, quantity: item.quantity }));

      const { data: orderId, error: rpcError } = await supabase.rpc('create_customer_order', {
        p_customer_id: customerId,
        p_items: orderItems,
        p_notes: null,
      });

      if (rpcError) {
        setError(rpcError.message);
        setSubmitting(false);
        return;
      }

      clearCart();
      setSuccess('تم إرسال طلبك بنجاح! يمكنك متابعته من صفحة طلباتي.');
      setTimeout(() => navigate('order_detail', { id: orderId }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إرسال الطلب');
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-success-50 dark:bg-success-900/20 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-success-600" />
        </div>
        <h2 className="font-semibold text-app mb-1">{success}</h2>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-app">سلة التسوق</h1>
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-app flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-muted" />
          </div>
          <h3 className="font-semibold text-app mb-1">سلتك فارغة</h3>
          <p className="text-muted text-sm mb-4">تصفح المنتجات وأضف ما تحتاجه</p>
          <button onClick={() => navigate('home')} className="btn-primary">تصفح المنتجات</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-app">سلة التسوق</h1>
        <button onClick={clearCart} className="btn-ghost text-error-600 text-sm">تفريغ السلة</button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.product_id} className="card p-3 flex gap-3 items-center">
            <div className="w-16 h-16 rounded-xl bg-app flex items-center justify-center shrink-0 overflow-hidden">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-7 h-7 text-muted" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-app text-sm truncate">{item.name}</p>
              <p className="text-muted text-xs">{item.sku}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="btn-secondary p-1.5" aria-label="تقليل">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold text-app text-sm w-8 text-center">{item.quantity}</span>
              <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="btn-secondary p-1.5" aria-label="زيادة">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <button onClick={() => removeItem(item.product_id)} className="btn-ghost p-2 text-error-600 shrink-0" aria-label="حذف">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <div className="card p-4">
        <p className="text-muted text-sm mb-3 text-center">سيتم احتساب الأسعار وتأكيدها من قبل الإدارة عند مراجعة الطلب</p>
        <button onClick={handleSubmitOrder} disabled={submitting} className="btn-primary w-full py-3">
          {submitting ? (<><Loader2 className="w-5 h-5 animate-spin" /> جاري الإرسال...</>) : (<><ArrowRight className="w-5 h-5" /> إرسال الطلب</>)}
        </button>
      </div>
    </div>
  );
}
