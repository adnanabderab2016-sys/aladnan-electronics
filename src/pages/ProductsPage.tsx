import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState, LoadingState, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Barcode,
  Cpu,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import type { Product, Brand, Category } from '@/types';

interface ProductWithRelations extends Product {
  brands: { name: string } | null;
  categories: { name: string } | null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    sku: '',
    barcode: '',
    name: '',
    brand_id: '',
    category_id: '',
    unit: 'قطعة',
    warranty_duration_months: 12,
    warranty_type: '',
    is_serialized: false,
    is_imei: false,
    is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [productsRes, brandsRes, categoriesRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, brands(name), categories(name)')
        .order('created_at', { ascending: false }),
      supabase.from('brands').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ]);
    setProducts((productsRes.data ?? []) as ProductWithRelations[]);
    setBrands(brandsRes.data ?? []);
    setCategories(categoriesRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode ?? '').toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      sku: '',
      barcode: '',
      name: '',
      brand_id: '',
      category_id: '',
      unit: 'قطعة',
      warranty_duration_months: 12,
      warranty_type: '',
      is_serialized: false,
      is_imei: false,
      is_active: true,
    });
    setError(null);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      sku: p.sku,
      barcode: p.barcode ?? '',
      name: p.name,
      brand_id: p.brand_id ?? '',
      category_id: p.category_id ?? '',
      unit: p.unit,
      warranty_duration_months: p.warranty_duration_months,
      warranty_type: p.warranty_type ?? '',
      is_serialized: p.is_serialized,
      is_imei: p.is_imei,
      is_active: p.is_active,
    });
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.sku.trim() || !form.name.trim()) {
      setError('رمز الصنف والاسم مطلوبان');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      name: form.name.trim(),
      brand_id: form.brand_id || null,
      category_id: form.category_id || null,
      unit: form.unit,
      warranty_duration_months: form.warranty_duration_months,
      warranty_type: form.warranty_type.trim() || null,
      is_serialized: form.is_serialized,
      is_imei: form.is_imei,
      is_active: form.is_active,
    };

    const result = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert(payload);

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setShowModal(false);
    load();
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`حذف المنتج "${p.name}"؟`)) return;
    await supabase.from('products').delete().eq('id', p.id);
    load();
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رمز الصنف أو الباركود..."
            className="input pr-10"
          />
        </div>
        <button onClick={openCreate} className="btn-primary shrink-0">
          <Plus className="w-4 h-4" />
          منتج جديد
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5">
            <LoadingState rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Package className="w-8 h-8" />}
            title="لا توجد منتجات"
            description="ابدأ بإضافة منتجاتك إلى الكتالوج لإدارتها وتتبع مخزونها"
            action={
              <button onClick={openCreate} className="btn-primary">
                <Plus className="w-4 h-4" />
                إضافة أول منتج
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app bg-app/50">
                  <th className="text-right font-medium text-muted px-4 py-3">المنتج</th>
                  <th className="text-right font-medium text-muted px-4 py-3 hidden md:table-cell">رمز الصنف</th>
                  <th className="text-right font-medium text-muted px-4 py-3 hidden lg:table-cell">العلامة</th>
                  <th className="text-right font-medium text-muted px-4 py-3 hidden lg:table-cell">التصنيف</th>
                  <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">الضمان</th>
                  <th className="text-right font-medium text-muted px-4 py-3">الحالة</th>
                  <th className="text-center font-medium text-muted px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-app last:border-0 hover:bg-app/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-app truncate">{p.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {p.is_serialized && (
                              <span className="text-xs text-muted flex items-center gap-1">
                                <Cpu className="w-3 h-3" /> متسلسل
                              </span>
                            )}
                            {p.is_imei && (
                              <span className="text-xs text-muted flex items-center gap-1">
                                <Barcode className="w-3 h-3" /> IMEI
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <code className="text-xs bg-app px-2 py-1 rounded-lg">{p.sku}</code>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted">{p.brands?.name ?? '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted">{p.categories?.name ?? '—'}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="flex items-center gap-1 text-muted">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {p.warranty_duration_months} شهر
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.is_active ? <Badge variant="success">نشط</Badge> : <Badge variant="neutral">غير نشط</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="btn-ghost p-2"
                          aria-label="تعديل"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="btn-ghost p-2 hover:text-error-600"
                          aria-label="حذف"
                        >
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

      {filtered.length > 0 && (
        <p className="text-muted text-sm text-center">
          {filtered.length} منتج
        </p>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-app sticky top-0 bg-surface z-10">
              <h3 className="font-semibold text-app">{editing ? 'تعديل المنتج' : 'منتج جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-2" aria-label="إغلاق">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="sku">رمز الصنف (SKU) *</label>
                  <input
                    id="sku"
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="input"
                    placeholder="مثال: IPH-15-PRO-256"
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="barcode">الباركود</label>
                  <input
                    id="barcode"
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    className="input"
                    placeholder="6291234567890"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="name">اسم المنتج *</label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="مثال: آيفون 15 برو 256 جيجابايت"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="brand">العلامة التجارية</label>
                  <select
                    id="brand"
                    value={form.brand_id}
                    onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                    className="input"
                  >
                    <option value="">— اختر —</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="category">التصنيف</label>
                  <select
                    id="category"
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="input"
                  >
                    <option value="">— اختر —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="unit">وحدة القياس</label>
                  <input
                    id="unit"
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="input"
                    placeholder="قطعة"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="warranty">مدة الضمان (شهر)</label>
                  <input
                    id="warranty"
                    type="number"
                    min={0}
                    value={form.warranty_duration_months}
                    onChange={(e) => setForm({ ...form, warranty_duration_months: parseInt(e.target.value) || 0 })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="warranty_type">نوع الضمان</label>
                <input
                  id="warranty_type"
                  type="text"
                  value={form.warranty_type}
                  onChange={(e) => setForm({ ...form, warranty_type: e.target.value })}
                  className="input"
                  placeholder="مثال: ضمان الوكيل / ضمان المحل"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ToggleChip
                  label="تتبع بالرقم التسلسلي"
                  active={form.is_serialized}
                  onClick={() => setForm({ ...form, is_serialized: !form.is_serialized })}
                />
                <ToggleChip
                  label="تتبع بـ IMEI"
                  active={form.is_imei}
                  onClick={() => setForm({ ...form, is_imei: !form.is_imei })}
                />
                <ToggleChip
                  label="منتج نشط"
                  active={form.is_active}
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                />
              </div>

              {error && (
                <div className="bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all',
        active
          ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 text-primary-700 dark:text-primary-300'
          : 'bg-surface border-app text-muted hover:text-app'
      )}
    >
      <span className={cn('w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all', active ? 'bg-primary-600 border-primary-600' : 'border-muted')}>
        {active && <span className="w-1.5 h-1.5 bg-white rounded-sm" />}
      </span>
      {label}
    </button>
  );
}
