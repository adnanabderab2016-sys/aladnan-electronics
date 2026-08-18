import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState, LoadingState, Badge } from '@/components/ui';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Phone,
  Loader2,
} from 'lucide-react';
import type { Customer, CustomerTier } from '@/types';

const TIER_LABELS: Record<CustomerTier, string> = {
  wholesale_wholesale: 'جملة الجملة',
  wholesale: 'جملة',
  retail: 'تجزئة',
};

function tierVariant(tier: CustomerTier) {
  if (tier === 'wholesale_wholesale') return 'info' as const;
  if (tier === 'wholesale') return 'success' as const;
  return 'neutral' as const;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '',
    name: '',
    phone: '',
    tier: 'retail' as CustomerTier,
    credit_limit: '0',
    balance: '0',
    is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setCustomers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || (c.phone ?? '').includes(q);
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', name: '', phone: '', tier: 'retail', credit_limit: '0', balance: '0', is_active: true });
    setError(null);
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      code: c.code,
      name: c.name,
      phone: c.phone ?? '',
      tier: c.tier,
      credit_limit: String(c.credit_limit),
      balance: String(c.balance),
      is_active: c.is_active,
    });
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setError('رمز العميل والاسم مطلوبان');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      tier: form.tier,
      credit_limit: parseFloat(form.credit_limit) || 0,
      balance: parseFloat(form.balance) || 0,
      is_active: form.is_active,
    };

    const result = editing
      ? await supabase.from('customers').update(payload).eq('id', editing.id)
      : await supabase.from('customers').insert(payload);

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setShowModal(false);
    load();
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`حذف العميل "${c.name}"؟`)) return;
    await supabase.from('customers').delete().eq('id', c.id);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الرمز أو الهاتف..."
            className="input pr-10"
          />
        </div>
        <button onClick={openCreate} className="btn-primary shrink-0">
          <Plus className="w-4 h-4" />
          عميل جديد
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5"><LoadingState rows={6} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="لا يوجد عملاء"
            description="ابدأ بإضافة عملائك لإدارة طلباتهم وأرصدتهم"
            action={
              <button onClick={openCreate} className="btn-primary">
                <Plus className="w-4 h-4" />
                إضافة أول عميل
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app bg-app/50">
                  <th className="text-right font-medium text-muted px-4 py-3">العميل</th>
                  <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">الهاتف</th>
                  <th className="text-right font-medium text-muted px-4 py-3">الفئة</th>
                  <th className="text-right font-medium text-muted px-4 py-3 hidden md:table-cell">الرصيد</th>
                  <th className="text-right font-medium text-muted px-4 py-3 hidden md:table-cell">حد الائتمان</th>
                  <th className="text-right font-medium text-muted px-4 py-3">الحالة</th>
                  <th className="text-center font-medium text-muted px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-app last:border-0 hover:bg-app/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-app truncate">{c.name}</p>
                          <code className="text-xs text-muted">{c.code}</code>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {c.phone ? (
                        <span className="flex items-center gap-1.5 text-muted" dir="ltr">
                          <Phone className="w-3.5 h-3.5" />
                          {c.phone}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><Badge variant={tierVariant(c.tier)}>{TIER_LABELS[c.tier]}</Badge></td>
                    <td className="px-4 py-3 hidden md:table-cell font-medium text-app">{formatCurrency(c.balance)}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted">{formatCurrency(c.credit_limit)}</td>
                    <td className="px-4 py-3">{c.is_active ? <Badge variant="success">نشط</Badge> : <Badge variant="neutral">غير نشط</Badge>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(c)} className="btn-ghost p-2" aria-label="تعديل">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c)} className="btn-ghost p-2 hover:text-error-600" aria-label="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && <p className="text-muted text-sm text-center">{formatNumber(filtered.length)} عميل</p>}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-app sticky top-0 bg-surface z-10">
              <h3 className="font-semibold text-app">{editing ? 'تعديل العميل' : 'عميل جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-2" aria-label="إغلاق">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="code">رمز العميل *</label>
                  <input id="code" type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input" placeholder="CUST-001" required />
                </div>
                <div>
                  <label className="label" htmlFor="name">الاسم *</label>
                  <input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="اسم العميل" required />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="phone">الهاتف</label>
                <input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="05xxxxxxxx" dir="ltr" />
              </div>
              <div>
                <label className="label" htmlFor="tier">فئة العميل</label>
                <select id="tier" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as CustomerTier })} className="input">
                  <option value="retail">تجزئة</option>
                  <option value="wholesale">جملة</option>
                  <option value="wholesale_wholesale">جملة الجملة</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="balance">الرصيد</label>
                  <input id="balance" type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="credit">حد الائتمان</label>
                  <input id="credit" type="number" step="0.01" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} className="input" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded accent-primary-600" />
                <span className="text-sm text-app">عميل نشط</span>
              </label>
              {error && <div className="bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 text-sm rounded-xl px-4 py-3">{error}</div>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'حفظ التعديلات' : 'إضافة العميل'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
