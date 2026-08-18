import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState, LoadingState, Badge } from '@/components/ui';
import { Plus, Search, Pencil, Trash2, X, Phone, Truck, Loader2 } from 'lucide-react';
import type { Supplier } from '@/types';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', phone: '', is_active: true });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    setSuppliers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = suppliers.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', name: '', phone: '', is_active: true });
    setError(null);
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ code: s.code, name: s.name, phone: s.phone ?? '', is_active: s.is_active });
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) { setError('الرمز والاسم مطلوبان'); return; }
    setSaving(true);
    setError(null);
    const payload = { code: form.code.trim(), name: form.name.trim(), phone: form.phone.trim() || null, is_active: form.is_active };
    const result = editing ? await supabase.from('suppliers').update(payload).eq('id', editing.id) : await supabase.from('suppliers').insert(payload);
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    setShowModal(false);
    load();
  };

  const handleDelete = async (s: Supplier) => {
    if (!confirm(`حذف المورد "${s.name}"؟`)) return;
    await supabase.from('suppliers').delete().eq('id', s.id);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الرمز..." className="input pr-10" />
        </div>
        <button onClick={openCreate} className="btn-primary shrink-0"><Plus className="w-4 h-4" />مورد جديد</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-5"><LoadingState rows={5} /></div> :
         filtered.length === 0 ? <EmptyState icon={<Truck className="w-8 h-8" />} title="لا يوجد موردون" description="ابدأ بإضافة موردين لإدارة أوامر الشراء" action={<button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />إضافة مورد</button>} /> :
         <div className="overflow-x-auto">
           <table className="w-full text-sm">
             <thead>
               <tr className="border-b border-app bg-app/50">
                 <th className="text-right font-medium text-muted px-4 py-3">المورد</th>
                 <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">الهاتف</th>
                 <th className="text-right font-medium text-muted px-4 py-3">الحالة</th>
                 <th className="text-center font-medium text-muted px-4 py-3">إجراءات</th>
               </tr>
             </thead>
             <tbody>
               {filtered.map((s) => (
                 <tr key={s.id} className="border-b border-app last:border-0 hover:bg-app/30 transition-colors">
                   <td className="px-4 py-3">
                     <div className="flex items-center gap-3">
                       <div className="w-9 h-9 rounded-lg bg-secondary-100 dark:bg-secondary-800/40 flex items-center justify-center shrink-0">
                         <Truck className="w-4 h-4 text-secondary-600 dark:text-secondary-300" />
                       </div>
                       <div><p className="font-medium text-app">{s.name}</p><code className="text-xs text-muted">{s.code}</code></div>
                     </div>
                   </td>
                   <td className="px-4 py-3 hidden sm:table-cell">{s.phone ? <span className="flex items-center gap-1.5 text-muted" dir="ltr"><Phone className="w-3.5 h-3.5" />{s.phone}</span> : '—'}</td>
                   <td className="px-4 py-3">{s.is_active ? <Badge variant="success">نشط</Badge> : <Badge variant="neutral">غير نشط</Badge>}</td>
                   <td className="px-4 py-3"><div className="flex items-center justify-center gap-1">
                     <button onClick={() => openEdit(s)} className="btn-ghost p-2" aria-label="تعديل"><Pencil className="w-4 h-4" /></button>
                     <button onClick={() => handleDelete(s)} className="btn-ghost p-2 hover:text-error-600" aria-label="حذف"><Trash2 className="w-4 h-4" /></button>
                   </div></td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="card w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-app">
              <h3 className="font-semibold text-app">{editing ? 'تعديل المورد' : 'مورد جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-2" aria-label="إغلاق"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div><label className="label" htmlFor="code">رمز المورد *</label><input id="code" type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input" required /></div>
              <div><label className="label" htmlFor="name">الاسم *</label><input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required /></div>
              <div><label className="label" htmlFor="phone">الهاتف</label><input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" dir="ltr" /></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded accent-primary-600" /><span className="text-sm text-app">مورد نشط</span></label>
              {error && <div className="bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 text-sm rounded-xl px-4 py-3">{error}</div>}
              <div className="flex gap-3 pt-2"><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'حفظ' : 'إضافة'}</button><button type="button" onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
