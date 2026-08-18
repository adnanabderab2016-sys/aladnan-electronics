import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState, LoadingState, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { ShieldCheck, Plus, X, Loader2 } from 'lucide-react';
import type { Customer, Product, SerialDevice } from '@/types';

interface WarrantyRow {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  claim_count: number;
  customers: { name: string; code: string } | null;
  products: { name: string; sku: string } | null;
}

const STATUS_LABELS: Record<string, string> = { active: 'ساري', expired: 'منتهي', void: 'ملغي', claimed: 'تم المطالبة' };
function statusVariant(s: string) {
  if (s === 'active') return 'success' as const;
  if (s === 'expired') return 'warning' as const;
  if (s === 'void') return 'error' as const;
  return 'info' as const;
}

export default function WarrantyPage() {
  const [warranties, setWarranties] = useState<WarrantyRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serials, setSerials] = useState<SerialDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_id: '', product_id: '', serial_id: '', start_date: '', duration: '12' });

  const load = useCallback(async () => {
    setLoading(true);
    const [wRes, cRes, pRes, sRes] = await Promise.all([
      supabase.from('warranties').select('*, customers(name, code), products(name, sku)').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').eq('is_active', true).order('name'),
      supabase.from('products').select('*').order('name'),
      supabase.from('serial_devices').select('*').order('serial_number'),
    ]);
    setWarranties(wRes.data ?? []);
    setCustomers(cRes.data ?? []);
    setProducts(pRes.data ?? []);
    setSerials(sRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.customer_id || !form.product_id || !form.start_date) { setError('العميل والمنتج وتاريخ البدء مطلوبة'); return; }
    setSaving(true); setError(null);
    const duration = parseInt(form.duration) || 12;
    const endDate = new Date(form.start_date); endDate.setMonth(endDate.getMonth() + duration);
    const { error: err } = await supabase.from('warranties').insert({
      customer_id: form.customer_id, product_id: form.product_id, serial_id: form.serial_id || null,
      start_date: form.start_date, end_date: endDate.toISOString().split('T')[0], status: 'active', claim_count: 0,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowModal(false); setForm({ customer_id: '', product_id: '', serial_id: '', start_date: '', duration: '12' }); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end"><button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4" />ضمان جديد</button></div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-5"><LoadingState rows={5} /></div> :
         warranties.length === 0 ? <EmptyState icon={<ShieldCheck className="w-8 h-8" />} title="لا توجد ضمانات" description="ابدأ بتسجيل ضمانات الأجهزة المباعة" action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4" />تسجيل ضمان</button>} /> :
         <div className="overflow-x-auto"><table className="w-full text-sm">
           <thead><tr className="border-b border-app bg-app/50">
             <th className="text-right font-medium text-muted px-4 py-3">العميل</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">المنتج</th>
             <th className="text-right font-medium text-muted px-4 py-3">البداية</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">النهاية</th>
             <th className="text-right font-medium text-muted px-4 py-3">الحالة</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden md:table-cell">المطالبات</th>
           </tr></thead>
           <tbody>
             {warranties.map((w) => (
               <tr key={w.id} className="border-b border-app last:border-0 hover:bg-app/30 transition-colors">
                 <td className="px-4 py-3 font-medium text-app">{w.customers?.name ?? '—'}</td>
                 <td className="px-4 py-3 hidden sm:table-cell text-muted">{w.products?.name ?? '—'}</td>
                 <td className="px-4 py-3 text-muted">{formatDate(w.start_date)}</td>
                 <td className="px-4 py-3 hidden sm:table-cell text-muted">{formatDate(w.end_date)}</td>
                 <td className="px-4 py-3"><Badge variant={statusVariant(w.status)}>{STATUS_LABELS[w.status] ?? w.status}</Badge></td>
                 <td className="px-4 py-3 hidden md:table-cell text-muted">{w.claim_count}</td>
               </tr>
             ))}
           </tbody>
         </table></div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="card w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-app"><h3 className="font-semibold text-app">ضمان جديد</h3><button onClick={() => setShowModal(false)} className="btn-ghost p-2" aria-label="إغلاق"><X className="w-5 h-5" /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="label" htmlFor="cust">العميل *</label><select id="cust" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="input"><option value="">— اختر —</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="label" htmlFor="prod">المنتج *</label><select id="prod" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="input"><option value="">— اختر —</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="label" htmlFor="serial">الرقم التسلسلي</label><select id="serial" value={form.serial_id} onChange={(e) => setForm({ ...form, serial_id: e.target.value })} className="input"><option value="">— اختياري —</option>{serials.map((s) => <option key={s.id} value={s.id}>{s.serial_number}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label" htmlFor="start">تاريخ البدء *</label><input id="start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input" /></div>
                <div><label className="label" htmlFor="dur">المدة (شهر)</label><input id="dur" type="number" min={1} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="input" /></div>
              </div>
              {error && <div className="bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 text-sm rounded-xl px-4 py-3">{error}</div>}
              <div className="flex gap-3 pt-2"><button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تسجيل'}</button><button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
