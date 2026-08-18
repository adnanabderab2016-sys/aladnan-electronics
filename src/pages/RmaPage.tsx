import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState, LoadingState, Badge } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import { RotateCcw, Plus, X, Loader2 } from 'lucide-react';
import type { Customer, Product } from '@/types';

interface RmaRow {
  id: string;
  rma_number: string;
  status: string;
  reason: string | null;
  created_at: string;
  customers: { name: string } | null;
  products: { name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  requested: 'مطلوب', approved: 'موافق عليه', received: 'مستلم', diagnosed: 'تم التشخيص',
  repair: 'إصلاح', replace: 'استبدال', refund: 'استرداد', completed: 'مكتمل', rejected: 'مرفوض',
};
function statusVariant(s: string) {
  if (s === 'completed') return 'success' as const;
  if (s === 'rejected') return 'error' as const;
  if (s === 'approved' || s === 'received' || s === 'diagnosed') return 'info' as const;
  return 'warning' as const;
}

export default function RmaPage() {
  const [rmas, setRmas] = useState<RmaRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_id: '', product_id: '', reason: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [rRes, cRes, pRes] = await Promise.all([
      supabase.from('rmas').select('*, customers(name), products(name)').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').eq('is_active', true).order('name'),
      supabase.from('products').select('*').order('name'),
    ]);
    setRmas(rRes.data ?? []);
    setCustomers(cRes.data ?? []);
    setProducts(pRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.customer_id || !form.product_id) { setError('العميل والمنتج مطلوبان'); return; }
    setSaving(true); setError(null);
    const rmaNumber = `RMA-${Date.now().toString().slice(-8)}`;
    const { error: err } = await supabase.from('rmas').insert({
      rma_number: rmaNumber, customer_id: form.customer_id, product_id: form.product_id,
      reason: form.reason.trim() || null, status: 'requested',
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowModal(false); setForm({ customer_id: '', product_id: '', reason: '' }); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end"><button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4" />طلب مرتجع</button></div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-5"><LoadingState rows={5} /></div> :
         rmas.length === 0 ? <EmptyState icon={<RotateCcw className="w-8 h-8" />} title="لا توجد طلبات مرتجع" description="ابدأ بإنشاء طلبات RMA للمنتجات المرتجعة" action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4" />طلب جديد</button>} /> :
         <div className="overflow-x-auto"><table className="w-full text-sm">
           <thead><tr className="border-b border-app bg-app/50">
             <th className="text-right font-medium text-muted px-4 py-3">رقم RMA</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">العميل</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden md:table-cell">المنتج</th>
             <th className="text-right font-medium text-muted px-4 py-3">الحالة</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">السبب</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden md:table-cell">التاريخ</th>
           </tr></thead>
           <tbody>
             {rmas.map((r) => (
               <tr key={r.id} className="border-b border-app last:border-0 hover:bg-app/30 transition-colors">
                 <td className="px-4 py-3 font-medium text-app">{r.rma_number}</td>
                 <td className="px-4 py-3 hidden sm:table-cell text-muted">{r.customers?.name ?? '—'}</td>
                 <td className="px-4 py-3 hidden md:table-cell text-muted">{r.products?.name ?? '—'}</td>
                 <td className="px-4 py-3"><Badge variant={statusVariant(r.status)}>{STATUS_LABELS[r.status] ?? r.status}</Badge></td>
                 <td className="px-4 py-3 hidden sm:table-cell text-muted truncate max-w-[200px]">{r.reason ?? '—'}</td>
                 <td className="px-4 py-3 hidden md:table-cell text-muted text-xs">{formatDateTime(r.created_at)}</td>
               </tr>
             ))}
           </tbody>
         </table></div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="card w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-app"><h3 className="font-semibold text-app">طلب مرتجع جديد</h3><button onClick={() => setShowModal(false)} className="btn-ghost p-2" aria-label="إغلاق"><X className="w-5 h-5" /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="label" htmlFor="cust">العميل *</label><select id="cust" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="input"><option value="">— اختر —</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="label" htmlFor="prod">المنتج *</label><select id="prod" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="input"><option value="">— اختر —</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="label" htmlFor="reason">سبب الإرجاع</label><textarea id="reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="input min-h-[80px]" placeholder="وصف سبب الإرجاع..." /></div>
              {error && <div className="bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 text-sm rounded-xl px-4 py-3">{error}</div>}
              <div className="flex gap-3 pt-2"><button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إنشاء'}</button><button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
