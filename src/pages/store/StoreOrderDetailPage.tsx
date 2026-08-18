import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStoreRouter } from '@/context/StoreRouterContext';
import { Loader as Loader2, ArrowRight, Package, Check, Clock, CircleAlert as AlertCircle, CreditCard } from 'lucide-react';

const STATUS_FLOW = [
  { key: 'submitted', label: 'مُرسلة', icon: Clock },
  { key: 'received', label: 'مستلمة', icon: Check },
  { key: 'confirmed', label: 'مؤكدة', icon: Check },
  { key: 'processing', label: 'قيد المعالجة', icon: Package },
  { key: 'ready', label: 'جاهزة', icon: Package },
  { key: 'delivered', label: 'مُسلمة', icon: Check },
  { key: 'completed', label: 'مكتملة', icon: Check },
];

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  notes: string | null;
  created_at: string;
  items: { item_id: string; product_name: string; product_sku: string; product_image: string | null; quantity: number; is_dirty: boolean }[];
}

export default function StoreOrderDetailPage() {
  const { params, navigate } = useStoreRouter();
  const orderId = params.id ?? '';
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data, error: err } = await supabase.from('customer_orders').select('*').eq('id', orderId).maybeSingle();
        if (err) throw err;
        if (!data) throw new Error('الطلب غير موجود');
        setOrder(data as OrderDetail);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'فشل تحميل الطلب');
      }
      setLoading(false);
    }
    if (orderId) load();
  }, [orderId]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-primary-600 animate-spin" /></div>;
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('orders')} className="btn-ghost text-muted"><ArrowRight className="w-4 h-4" /> العودة</button>
        <div className="card p-8 text-center"><p className="text-muted text-sm">{error ?? 'الطلب غير موجود'}</p></div>
      </div>
    );
  }

  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === order.status);
  const hasDirty = order.items?.some((i) => i.is_dirty);
  const isAwaitingMod = order.status === 'awaiting_modification';
  const isPaymentPending = order.status === 'confirmed' || order.status === 'payment_pending';

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('orders')} className="btn-ghost text-muted"><ArrowRight className="w-4 h-4" /> العودة للطلبات</button>

      <div className="card p-5">
        <h2 className="text-xl font-bold text-app mb-1">{order.order_number}</h2>
        <p className="text-muted text-sm">{new Date(order.created_at).toLocaleDateString('ar-SA')}</p>
      </div>

      {hasDirty && (
        <div className="card p-4 bg-warning-50/50 dark:bg-warning-900/10 border-warning-200 dark:border-warning-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-app">تنبيه: تم تعديل الأصناف/الكميات</p>
              <p className="text-xs text-muted mt-0.5">تم تعديل بعض الكميات بحسب المتوفر. يرجى مراجعة الأصناف أدناه.</p>
            </div>
          </div>
        </div>
      )}

      {isAwaitingMod && (
        <div className="card p-4 bg-warning-50/50 dark:bg-warning-900/10 border-warning-200 dark:border-warning-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-app">تم إرجاع طلبك للتعديل</p>
              <p className="text-xs text-muted mt-0.5">يرجى مراجعة الطلب وتعديله ثم إعادة إرساله.</p>
            </div>
          </div>
        </div>
      )}

      {isPaymentPending && (
        <div className="card p-4 bg-primary-50/50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800">
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-app">يرجى إرسال المبلغ لإتمام اعتماد الطلب</p>
              <p className="text-xs text-muted mt-0.5">تم تأكيد طلبك. يرجى تحويل المبلغ لإتمام العملية.</p>
            </div>
          </div>
        </div>
      )}

      {currentIdx >= 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-app mb-4">حالة الطلب</h3>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2">
            {STATUS_FLOW.map((step, idx) => {
              const Icon = step.icon;
              const done = idx <= currentIdx;
              return (
                <div key={step.key} className="flex items-center gap-1 shrink-0">
                  <div className={`flex flex-col items-center gap-1 ${done ? 'text-primary-600' : 'text-muted'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${done ? 'bg-primary-100 dark:bg-primary-900/40' : 'bg-app'}`}>
                      {idx < currentIdx ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className="text-[10px] font-medium whitespace-nowrap">{step.label}</span>
                  </div>
                  {idx < STATUS_FLOW.length - 1 && <div className={`w-6 h-0.5 ${idx < currentIdx ? 'bg-primary-300' : 'bg-border'}`} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-app"><h3 className="font-semibold text-app">أصناف الطلب</h3></div>
        <div className="divide-y divide-app">
          {order.items?.map((item) => (
            <div key={item.item_id} className="flex items-center gap-3 p-4">
              <div className="w-12 h-12 rounded-xl bg-app flex items-center justify-center shrink-0 overflow-hidden">
                {item.product_image ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-muted" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-app text-sm">{item.product_name}</p>
                <p className="text-muted text-xs">{item.product_sku}</p>
              </div>
              <div className="text-left shrink-0">
                <p className="font-semibold text-app text-sm">{item.quantity}</p>
                {item.is_dirty && <span className="badge-warning text-[10px] py-0.5 px-1.5">عدّلت</span>}
              </div>
            </div>
          ))}
          {(!order.items || order.items.length === 0) && <p className="text-muted text-sm text-center py-8">لا توجد أصناف</p>}
        </div>
      </div>
    </div>
  );
}
