import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStoreRouter } from '@/context/StoreRouterContext';
import type { CustomerOrderView } from '@/types/store';
import { Loader as Loader2, ClipboardList, Package, Clock, CircleAlert as AlertCircle } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة', submitted: 'مُرسلة', received: 'مستلمة', confirmed: 'مؤكدة',
  processing: 'قيد المعالجة', packed: 'مُعبأة', ready: 'جاهزة', delivered: 'مُسلمة',
  completed: 'مكتملة', returned: 'مُرجعة', cancelled: 'ملغاة', rejected: 'مرفوضة',
  payment_pending: 'بانتظار الدفع', awaiting_modification: 'بانتظار التعديل', partially_fulfilled: 'تلبية جزئية',
};

function statusVariant(s: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (['completed', 'delivered', 'ready'].includes(s)) return 'success';
  if (['cancelled', 'rejected', 'returned'].includes(s)) return 'error';
  if (['draft', 'payment_pending', 'awaiting_modification'].includes(s)) return 'warning';
  return 'info';
}

export default function StoreOrdersPage() {
  const { navigate } = useStoreRouter();
  const [orders, setOrders] = useState<CustomerOrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data, error: err } = await supabase.from('customer_orders').select('*').order('created_at', { ascending: false });
        if (err) throw err;
        setOrders(data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'فشل تحميل الطلبات');
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-primary-600 animate-spin" /></div>;
  }

  if (error) {
    return <div className="card p-6 text-center"><p className="text-error-600 text-sm">{error}</p></div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-app">طلباتي</h1>
      {orders.length === 0 ? (
        <div className="card p-8 text-center">
          <ClipboardList className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted text-sm mb-4">لا توجد طلبات بعد</p>
          <button onClick={() => navigate('home')} className="btn-primary">تصفح المنتجات</button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const hasDirty = order.items?.some((i) => i.is_dirty);
            const variant = statusVariant(order.status);
            const variantClass = {
              success: 'badge-success', warning: 'badge-warning', error: 'badge-error', info: 'badge-info', neutral: 'badge-neutral',
            }[variant];
            return (
              <button key={order.id} onClick={() => navigate('order_detail', { id: order.id })} className="card card-hover p-4 w-full text-right">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-app text-sm">{order.order_number}</span>
                  <span className={variantClass}>{STATUS_LABELS[order.status] ?? order.status}</span>
                </div>
                <div className="flex items-center gap-2 text-muted text-xs mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(order.created_at).toLocaleDateString('ar-SA')}
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-muted" />
                  <span className="text-muted text-xs">{order.items?.length ?? 0} صنف</span>
                  {hasDirty && (
                    <span className="badge-warning text-[10px] py-0.5 px-1.5">
                      <AlertCircle className="w-3 h-3" /> تم تعديل الكميات
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
