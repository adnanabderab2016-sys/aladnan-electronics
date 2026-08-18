import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState, LoadingState, Badge } from '@/components/ui';
import {
  Smartphone,
  Plus,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import type { SerialDevice, Product, Warehouse } from '@/types';

interface SerialRow extends SerialDevice {
  products: { name: string; sku: string } | null;
  warehouses: { name: string } | null;
  customers: { name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  in_stock: 'في المخزون',
  sold: 'مباع',
  reserved: 'محجوز',
  returned: 'مرتجع',
  defective: 'تالف',
  in_repair: 'قيد الإصلاح',
};

function statusVariant(s: string) {
  if (s === 'in_stock') return 'success' as const;
  if (s === 'sold') return 'info' as const;
  if (s === 'reserved') return 'warning' as const;
  if (s === 'defective' || s === 'returned') return 'error' as const;
  return 'neutral' as const;
}

export default function SerialsPage() {
  const [serials, setSerials] = useState<SerialRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    product_id: '',
    serial_number: '',
    imei_1: '',
    imei_2: '',
    warehouse_id: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [sRes, pRes, wRes] = await Promise.all([
      supabase
        .from('serial_devices')
        .select('*, products(name, sku), warehouses(name), customers(name)')
        .order('created_at', { ascending: false }),
      supabase.from('products').select('*').eq('is_active', true).eq('is_serialized', true).order('name'),
      supabase.from('warehouses').select('*').eq('is_active', true).order('name'),
    ]);
    setSerials(sRes.data ?? []);
    setProducts(pRes.data ?? []);
    setWarehouses(wRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = serials.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.serial_number.toLowerCase().includes(q) ||
      (s.imei_1 ?? '').toLowerCase().includes(q) ||
      (s.imei_2 ?? '').toLowerCase().includes(q) ||
      (s.products?.name ?? '').toLowerCase().includes(q)
    );
  });

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.product_id || !form.serial_number.trim()) {
      setError('المنتج والرقم التسلسلي مطلوبان');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      product_id: form.product_id,
      serial_number: form.serial_number.trim(),
      imei_1: form.imei_1.trim() || null,
      imei_2: form.imei_2.trim() || null,
      warehouse_id: form.warehouse_id || null,
      status: 'in_stock',
    };

    const { error: err } = await supabase.from('serial_devices').insert(payload);
    setSaving(false);
    if (err) {
      if (err.code === '23505') {
        setError('الرقم التسلسلي أو IMEI مكرر — ممنوع إدخال جهاز بنفس المعرف');
      } else {
        setError(err.message);
      }
      return;
    }
    setShowModal(false);
    setForm({ product_id: '', serial_number: '', imei_1: '', imei_2: '', warehouse_id: '' });
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
            placeholder="بحث بالرقم التسلسلي أو IMEI أو المنتج..."
            className="input pr-10"
          />
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">
          <Plus className="w-4 h-4" />
          جهاز جديد
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5"><LoadingState rows={6} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Smartphone className="w-8 h-8" />}
            title="لا توجد أجهزة تسلسلية"
            description="سجل الأجهزة بأرقامها التسلسلية و IMEI لتتبعها عبر دورة الحياة الكاملة"
            action={
              <button onClick={() => setShowModal(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                تسجيل جهاز
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app bg-app/50">
                  <th className="text-right font-medium text-muted px-4 py-3">المنتج</th>
                  <th className="text-right font-medium text-muted px-4 py-3">الرقم التسلسلي</th>
                  <th className="text-right font-medium text-muted px-4 py-3 hidden md:table-cell">IMEI 1</th>
                  <th className="text-right font-medium text-muted px-4 py-3 hidden lg:table-cell">IMEI 2</th>
                  <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">المستودع</th>
                  <th className="text-right font-medium text-muted px-4 py-3 hidden lg:table-cell">العميل</th>
                  <th className="text-right font-medium text-muted px-4 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-app last:border-0 hover:bg-app/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                          <Smartphone className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-app truncate">{s.products?.name ?? '—'}</p>
                          <code className="text-xs text-muted">{s.products?.sku ?? ''}</code>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><code className="text-xs bg-app px-2 py-1 rounded-lg" dir="ltr">{s.serial_number}</code></td>
                    <td className="px-4 py-3 hidden md:table-cell"><code className="text-xs text-muted" dir="ltr">{s.imei_1 ?? '—'}</code></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><code className="text-xs text-muted" dir="ltr">{s.imei_2 ?? '—'}</code></td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted">{s.warehouses?.name ?? '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted">{s.customers?.name ?? '—'}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(s.status)}>{STATUS_LABELS[s.status] ?? s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && <p className="text-muted text-sm text-center">{filtered.length} جهاز</p>}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-app sticky top-0 bg-surface z-10">
              <h3 className="font-semibold text-app">تسجيل جهاز تسلسلي</h3>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-2" aria-label="إغلاق">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="label" htmlFor="product">المنتج *</label>
                <select id="product" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="input" required>
                  <option value="">— اختر المنتج —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
                {products.length === 0 && <p className="text-xs text-warning-600 mt-1">لا توجد منتجات مسلسلة. فعّل خيار "تتبع بالرقم التسلسلي" في صفحة المنتجات أولاً.</p>}
              </div>
              <div>
                <label className="label" htmlFor="serial">الرقم التسلسلي *</label>
                <input id="serial" type="text" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} className="input" placeholder="SN-XXXXXXX" dir="ltr" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="imei1">IMEI 1</label>
                  <input id="imei1" type="text" value={form.imei_1} onChange={(e) => setForm({ ...form, imei_1: e.target.value })} className="input" placeholder="35XXXXXXXXXXXXX" dir="ltr" />
                </div>
                <div>
                  <label className="label" htmlFor="imei2">IMEI 2</label>
                  <input id="imei2" type="text" value={form.imei_2} onChange={(e) => setForm({ ...form, imei_2: e.target.value })} className="input" placeholder="(اختياري)" dir="ltr" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="wh">المستودع</label>
                <select id="wh" value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })} className="input">
                  <option value="">— اختر —</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              {error && <div className="bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 text-sm rounded-xl px-4 py-3">{error}</div>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تسجيل الجهاز'}
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
