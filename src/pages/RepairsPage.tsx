import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState, LoadingState, Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Wrench, Plus, X, Loader2 } from 'lucide-react';
import type { Customer, Product } from '@/types';

interface RepairRow {
  id: string;
  ticket_number: string;
  symptoms: string | null;
  diagnosis: string | null;
  technician: string | null;
  status: string;
  labor_cost: number;
  parts_cost: number;
  sla_due_date: string | null;
  created_at: string;
  customers: { name: string } | null;
  products: { name: string; sku: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'مفتوحة', diagnosed: 'تم التشخيص', in_progress: 'قيد الإصلاح',
  parts_ordered: 'قطع غرف مطلوبة', repaired: 'تم الإصلاح', ready: 'جاهزة', delivered: 'مُسلمة', cancelled: 'ملغاة',
};
function statusVariant(s: string) {
  if (s === 'repaired' || s === 'ready' || s === 'delivered') return 'success' as const;
  if (s === 'cancelled') return 'error' as const;
  if (s === 'open') return 'warning' as const;
  return 'info' as const;
}

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<RepairRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_id: '', product_id: '', symptoms: '', technician: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [rRes, cRes, pRes] = await Promise.all([
      supabase.from('repair_tickets').select('*, customers(name), products(name, sku)').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').eq('is_active', true).order('name'),
      supabase.from('products').select('*').order('name'),
    ]);
    setRepairs(rRes.data ?? []);
    setCustomers(cRes.data ?? []);
    setProducts(pRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.customer_id || !form.product_id) { setError('العميل والمنتج مطلوبان'); return; }
    setSaving(true); setError(null);
    const ticketNumber = `REP-${Date.now().toString().slice(-8)}`;
    const { error: err } = await supabase.from('repair_tickets').insert({
      ticket_number: ticketNumber, customer_id: form.customer_id, product_id: form.product_id,
      symptoms: form.symptoms.trim() || null, technician: form.technician.trim() || null, status: 'open',
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowModal(false); setForm({ customer_id: '', product_id: '', symptoms: '', technician: '' }); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end"><button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4" />تذكرة إصلاح</button></div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-5"><LoadingState rows={5} /></div> :
         repairs.length === 0 ? <EmptyState icon={<Wrench className="w-8 h-8" />} title="لا توجد تذاكر إصلاح" description="ابدأ بإنشاء تذاكر الإصلاح للأجهزة" action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4" />تذكرة جديدة</button>} /> :
         <div className="overflow-x-auto"><table className="w-full text-sm">
           <thead><tr className="border-b border-app bg-app/50">
             <th className="text-right font-medium text-muted px-4 py-3">رقم التذكرة</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">العميل</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden md:table-cell">المنتج</th>
             <th className="text-right font-medium text-muted px-4 py-3">الحالة</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden lg:table-cell">الفني</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">التكلفة</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden md:table-cell">SLA</th>
           </tr></thead>
           <tbody>
             {repairs.map((r) => (
               <tr key={r.id} className="border-b border-app last:border-0 hover:bg-app/30 transition-colors">
                 <td className="px-4 py-3 font-medium text-app">{r.ticket_number}</td>
                 <td className="px-4 py-3 hidden sm:table-cell text-muted">{r.customers?.name ?? '—'}</td>
                 <td className="px-4 py-3 hidden md:table-cell text-muted">{r.products?.name ?? '—'}</td>
                 <td className="px-4 py-3"><Badge variant={statusVariant(r.status)}>{STATUS_LABELS[r.status] ?? r.status}</Badge></td>
                 <td className="px-4 py-3 hidden lg:table-cell text-muted">{r.technician ?? '—'}</td>
                 <td className="px-4 py-3 hidden sm:table-cell text-app">{formatCurrency(r.labor_cost + r.parts_cost)}</td>
                 <td className="px-4 py-3 hidden md:table-cell text-muted text-xs">{r.sla_due_date ? formatDate(r.sla_due_date) : '—'}</td>
               </tr>
             ))}
           </tbody>
         </table></div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="card w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-app"><h3 className="font-semibold text-app">تذكرة إصلاح جديدة</h3><button onClick={() => setShowModal(false)} className="btn-ghost p-2" aria-label="إغلاق"><X className="w-5 h-5" /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="label" htmlFor="cust">العميل *</label><select id="cust" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="input"><option value="">— اختر —</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="label" htmlFor="prod">المنتج *</label><select id="prod" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="input"><option value="">— اختر —</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="label" htmlFor="sym">الأعراض</label><textarea id="sym" value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} className="input min-h-[80px]" placeholder="وصف المشكلة..." /></div>
              <div><label className="label" htmlFor="tech">الفني المسؤول</label><input id="tech" type="text" value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} className="input" /></div>
              {error && <div className="bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 text-sm rounded-xl px-4 py-3">{error}</div>}
              <div className="flex gap-3 pt-2"><button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إنشاء'}</button><button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
