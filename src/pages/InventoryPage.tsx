import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState, LoadingState, Badge } from '@/components/ui';
import { formatNumber } from '@/lib/utils';
import {
  Warehouse,
  Package,
  AlertTriangle,
  Boxes,
  Plus,
  X,
  Loader2,
  Smartphone,
} from 'lucide-react';
import type { InventoryItem, Product, Warehouse as WH } from '@/types';

interface InventoryRow extends InventoryItem {
  products: { name: string; sku: string; is_serialized: boolean } | null;
  warehouses: { name: string } | null;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [warehouses, setWarehouses] = useState<WH[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [showWhModal, setShowWhModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [whName, setWhName] = useState('');
  const [whLocation, setWhLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Adjust form
  const [adjProduct, setAdjProduct] = useState('');
  const [adjWarehouse, setAdjWarehouse] = useState('');
  const [adjQty, setAdjQty] = useState('0');
  const [adjType, setAdjType] = useState<'add' | 'set'>('add');

  const load = useCallback(async () => {
    setLoading(true);
    const [invRes, whRes, prodRes] = await Promise.all([
      supabase
        .from('inventory_items')
        .select('*, products(name, sku, is_serialized), warehouses(name)')
        .order('updated_at', { ascending: false }),
      supabase.from('warehouses').select('*').order('name'),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
    ]);
    setItems((invRes.data ?? []) as InventoryRow[]);
    setWarehouses(whRes.data ?? []);
    setProducts(prodRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((i) => {
    if (filter === 'low') return i.on_hand > 0 && i.on_hand <= 5;
    if (filter === 'out') return i.on_hand === 0;
    return true;
  });

  const createWarehouse = async () => {
    if (!whName.trim()) {
      setError('اسم المستودع مطلوب');
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from('warehouses')
      .insert({ name: whName.trim(), location: whLocation.trim() || null });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setShowWhModal(false);
    setWhName('');
    setWhLocation('');
    setError(null);
    load();
  };

  const adjustStock = async () => {
    if (!adjProduct || !adjWarehouse) {
      setError('اختر المنتج والمستودع');
      return;
    }
    setSaving(true);
    setError(null);

    // Check if inventory row exists
    const { data: existing } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('product_id', adjProduct)
      .eq('warehouse_id', adjWarehouse)
      .maybeSingle();

    const qty = parseFloat(adjQty) || 0;
    const newOnHand = adjType === 'add' ? (existing?.on_hand ?? 0) + qty : qty;

    if (newOnHand < 0) {
      setError('لا يمكن أن يكون المخزون سالباً');
      setSaving(false);
      return;
    }

    if (existing) {
      const { error: err } = await supabase
        .from('inventory_items')
        .update({
          on_hand: newOnHand,
          row_version: existing.row_version + 1,
        })
        .eq('id', existing.id)
        .eq('row_version', existing.row_version);

      if (err) {
        setError('فشل التحديث — قد يكون هناك تعديل متزامن. أعد المحاولة.');
        setSaving(false);
        return;
      }
    } else {
      const { error: err } = await supabase.from('inventory_items').insert({
        product_id: adjProduct,
        warehouse_id: adjWarehouse,
        on_hand: newOnHand,
        reserved: 0,
      });
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setShowAdjustModal(false);
    setAdjProduct('');
    setAdjWarehouse('');
    setAdjQty('0');
    load();
  };

  const totalSku = items.length;
  const totalUnits = items.reduce((sum, i) => sum + i.on_hand, 0);
  const lowStock = items.filter((i) => i.on_hand > 0 && i.on_hand <= 5).length;
  const outStock = items.filter((i) => i.on_hand === 0).length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-muted mb-1">
            <Boxes className="w-4 h-4" />
            <span className="text-xs">أصناف المخزون</span>
          </div>
          <p className="text-xl font-bold text-app">{formatNumber(totalSku)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-muted mb-1">
            <Package className="w-4 h-4" />
            <span className="text-xs">إجمالي الوحدات</span>
          </div>
          <p className="text-xl font-bold text-app">{formatNumber(totalUnits)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-muted mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">مخزون منخفض</span>
          </div>
          <p className="text-xl font-bold text-warning-600">{formatNumber(lowStock)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-muted mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">نفد المخزون</span>
          </div>
          <p className="text-xl font-bold text-error-600">{formatNumber(outStock)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex gap-1 p-1 bg-app rounded-xl">
          {([
            ['all', 'الكل'],
            ['low', 'منخفض'],
            ['out', 'نفد'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === key ? 'bg-surface text-app shadow-sm' : 'text-muted hover:text-app'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdjustModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            تعديل المخزون
          </button>
          <button onClick={() => setShowWhModal(true)} className="btn-secondary">
            <Warehouse className="w-4 h-4" />
            مستودع جديد
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5"><LoadingState rows={6} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Warehouse className="w-8 h-8" />}
            title="لا يوجد مخزون"
            description="ابدأ بإضافة مخزون للمنتجات في المستودعات"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app bg-app/50">
                  <th className="text-right font-medium text-muted px-4 py-3">المنتج</th>
                  <th className="text-right font-medium text-muted px-4 py-3 hidden md:table-cell">المستودع</th>
                  <th className="text-right font-medium text-muted px-4 py-3">المتاح</th>
                  <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">المحجوز</th>
                  <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">الإجمالي</th>
                  <th className="text-right font-medium text-muted px-4 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const available = item.on_hand - item.reserved;
                  return (
                    <tr key={item.id} className="border-b border-app last:border-0 hover:bg-app/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                            {item.products?.is_serialized ? (
                              <Smartphone className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                            ) : (
                              <Package className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-app truncate">{item.products?.name ?? '—'}</p>
                            <code className="text-xs text-muted">{item.products?.sku ?? ''}</code>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted">
                        {item.warehouses?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${available < 0 ? 'text-error-600' : 'text-app'}`}>
                          {formatNumber(available)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted">{formatNumber(item.reserved)}</td>
                      <td className="px-4 py-3 hidden sm:table-cell font-medium text-app">{formatNumber(item.on_hand)}</td>
                      <td className="px-4 py-3">
                        {item.on_hand === 0 ? (
                          <Badge variant="error">نفد</Badge>
                        ) : item.on_hand <= 5 ? (
                          <Badge variant="warning">منخفض</Badge>
                        ) : (
                          <Badge variant="success">متاح</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warehouse Modal */}
      {showWhModal && (
        <Modal title="مستودع جديد" onClose={() => setShowWhModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="whName">اسم المستودع *</label>
              <input
                id="whName"
                type="text"
                value={whName}
                onChange={(e) => setWhName(e.target.value)}
                className="input"
                placeholder="مثال: المستودع الرئيسي - الرياض"
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="whLoc">الموقع</label>
              <input
                id="whLoc"
                type="text"
                value={whLocation}
                onChange={(e) => setWhLocation(e.target.value)}
                className="input"
                placeholder="مثال: الرياض - حي العليا"
              />
            </div>
            {error && (
              <div className="bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={createWarehouse} disabled={saving} className="btn-primary flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إضافة'}
              </button>
              <button onClick={() => setShowWhModal(false)} className="btn-secondary">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <Modal title="تعديل المخزون" onClose={() => setShowAdjustModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="adjProduct">المنتج *</label>
              <select
                id="adjProduct"
                value={adjProduct}
                onChange={(e) => setAdjProduct(e.target.value)}
                className="input"
              >
                <option value="">— اختر المنتج —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="adjWarehouse">المستودع *</label>
              <select
                id="adjWarehouse"
                value={adjWarehouse}
                onChange={(e) => setAdjWarehouse(e.target.value)}
                className="input"
              >
                <option value="">— اختر المستودع —</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1 p-1 bg-app rounded-xl">
              <button
                onClick={() => setAdjType('add')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  adjType === 'add' ? 'bg-surface text-app shadow-sm' : 'text-muted'
                }`}
              >
                إضافة كمية
              </button>
              <button
                onClick={() => setAdjType('set')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  adjType === 'set' ? 'bg-surface text-app shadow-sm' : 'text-muted'
                }`}
              >
                تعيين الكمية
              </button>
            </div>
            <div>
              <label className="label" htmlFor="adjQty">الكمية</label>
              <input
                id="adjQty"
                type="number"
                min={0}
                step="0.01"
                value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)}
                className="input"
                placeholder="0"
              />
            </div>
            {error && (
              <div className="bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={adjustStock} disabled={saving} className="btn-primary flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
              </button>
              <button onClick={() => setShowAdjustModal(false)} className="btn-secondary">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-app sticky top-0 bg-surface z-10">
          <h3 className="font-semibold text-app">{title}</h3>
          <button onClick={onClose} className="btn-ghost p-2" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
