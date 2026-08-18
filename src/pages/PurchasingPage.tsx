import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState, LoadingState, Badge } from '@/components/ui';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ClipboardList, Plus, X, Loader2 } from 'lucide-react';
import type { Supplier, Product } from '@/types';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: string;
  total: number;
  created_at: string;
  suppliers: { name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة', submitted: 'مُرسلة', received: 'مستلمة', confirmed: 'مؤكدة', cancelled: 'ملغاة',
};

function statusVariant(s: string) {
  if (s === 'received' || s === 'confirmed') return 'success' as const;
  if (s === 'cancelled') return 'error' as const;
  return 'warning' as const;
}

export default function PurchasingPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<{ product_id: string; quantity: number; unit_cost: number }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [poRes, supRes, prodRes] = await Promise.all([
      supabase.from('purchase_orders').select('*, suppliers(name)').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').eq('is_active', true).order('name'),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
    ]);
    setOrders(poRes.data ?? []);
    setSuppliers(supRes.data ?? []);
    setProducts(prodRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addItem = () => setItems([...items, { product_id: '', quantity: 1, unit_cost: 0 }]);
  const updateItem = (i: number, field: string, val: string | number) => { const u = [...items]; u[i] = { ...u[i], [field]: val }; setItems(u); };
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const total = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);

  const handleCreate = async () => {
    if (!supplierId) { setError('اختر المورد'); return; }
    if (items.length === 0 || items.some((i) => !i.product_id)) { setError('أضف منتجاً واحداً على الأقل'); return; }
    setSaving(true); setError(null);
    const poNumber = `PO-${Date.now().toString().slice(-8)}`;
    const { data: po, error: poErr } = await supabase.from('purchase_orders').insert({ po_number: poNumber, supplier_id: supplierId, status: 'draft', total }).select().single();
    if (poErr || !po) { setError(poErr?.message ?? 'فشل'); setSaving(false); return; }
    const poItems = items.map((i) => ({ po_id: po.id, product_id: i.product_id, quantity: i.quantity, unit_cost: i.unit_cost, total_cost: i.quantity * i.unit_cost }));
    const { error: itemsErr } = await supabase.from('purchase_order_items').insert(poItems);
    setSaving(false);
    if (itemsErr) { setError(itemsErr.message); return; }
    setShowModal(false); setSupplierId(''); setItems([]); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4" />أمر شراء جديد</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-5"><LoadingState rows={5} /></div> :
         orders.length === 0 ? <EmptyState icon={<ClipboardList className="w-8 h-8" />} title="لا توجد أوامر شراء" description="ابدأ بإنشاء أوامر شراء من مورديك" action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4" />إنشاء أمر شراء</button>} /> :
         <div className="overflow-x-auto">
           <table className="w-full text-sm">
             <thead><tr className="border-b border-app bg-app/50">
               <th className="text-right font-medium text-muted px-4 py-3">رقم الأمر</th>
               <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">المورد</th>
               <th className="text-right font-medium text-muted px-4 py-3">الحالة</th>
               <th className="text-right font-medium text-muted px-4 py-3">الإجمالي</th>
               <th className="text-right font-medium text-muted px-4 py-3 hidden md:table-cell">التاريخ</th>
             </tr></thead>
             <tbody>
               {orders.map((o) => (
                 <tr key={o.id} className="border-b border-app last:border-0 hover:bg-app/30 transition-colors">
                   <td className="px-4 py-3 font-medium text-app">{o.po_number}</td>
                   <td className="px-4 py-3 hidden sm:table-cell text-muted">{o.suppliers?.name ?? '—'}</td>
                   <td className="px-4 py-3"><Badge variant={statusVariant(o.status)}>{STATUS_LABELS[o.status] ?? o.status}</Badge></td>
                   <td className="px-4 py-3 font-semibold text-app">{formatCurrency(o.total)}</td>
                   <td className="px-4 py-3 hidden md:table-cell text-muted text-xs">{formatDateTime(o.created_at)}</td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-app sticky top-0 bg-surface z-10">
              <h3 className="font-semibold text-app">أمر شراء جديد</h3>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-2" aria-label="إغلاق"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="label" htmlFor="supplier">المورد *</label>
                <select id="supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input">
                  <option value="">— اختر —</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
              <div><div className="flex items-center justify-between mb-2"><label className="label mb-0">المنتجات</label><button onClick={addItem} className="btn-ghost text-primary-600 text-sm"><Plus className="w-4 h-4" />إضافة</button></div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <select value={item.product_id} onChange={(e) => updateItem(idx, 'product_id', e.target.value)} className="input flex-1"><option value="">— اختر —</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                      <input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="input w-20" placeholder="كمية" />
                      <input type="number" min={0} step="0.01" value={item.unit_cost} onChange={(e) => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)} className="input w-28" placeholder="التكلفة" />
                      <button onClick={() => removeItem(idx)} className="btn-ghost p-2.5 text-error-600"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-muted text-sm text-center py-4">لا توجد أصناف</p>}
                </div>
              </div>
              {items.length > 0 && <div className="flex justify-between items-center pt-3 border-t border-app"><span className="text-muted">الإجمالي</span><span className="text-xl font-bold text-app">{formatCurrency(total)}</span></div>}
              {error && <div className="bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 text-sm rounded-xl px-4 py-3">{error}</div>}
              <div className="flex gap-3 pt-2"><button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إنشاء'}</button><button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
