import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState, LoadingState, Badge } from '@/components/ui';
import { Search as SearchIcon, Package, ShoppingCart, Users, Truck, Smartphone, FileText, Wrench } from 'lucide-react';
import { useRouter, type RouteName } from '@/context/RouterContext';

interface SearchResult {
  type: string;
  id: string;
  label: string;
  sublabel: string;
  route: RouteName;
  icon: typeof Package;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { navigate } = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    const term = `%${q.trim()}%`;
    const [prods, orders, custs, sups, serials, invs, repairs] = await Promise.all([
      supabase.from('products').select('id, name, sku').or(`name.ilike.${term},sku.ilike.${term},barcode.ilike.${term}`).limit(5),
      supabase.from('orders').select('id, order_number, customers(name)').or(`order_number.ilike.${term}`).limit(5),
      supabase.from('customers').select('id, name, code').or(`name.ilike.${term},code.ilike.${term},phone.ilike.${term}`).limit(5),
      supabase.from('suppliers').select('id, name, code').or(`name.ilike.${term},code.ilike.${term}`).limit(5),
      supabase.from('serial_devices').select('id, serial_number, imei_1, products(name)').or(`serial_number.ilike.${term},imei_1.ilike.${term},imei_2.ilike.${term}`).limit(5),
      supabase.from('invoices').select('id, invoice_number, customers(name)').or(`invoice_number.ilike.${term}`).limit(5),
      supabase.from('repair_tickets').select('id, ticket_number, customers(name)').or(`ticket_number.ilike.${term}`).limit(5),
    ]);

    const r: SearchResult[] = [];
    (prods.data ?? []).forEach((p: { id: string; name: string; sku: string }) => r.push({ type: 'منتج', id: p.id, label: p.name, sublabel: p.sku, route: 'products', icon: Package }));
    (orders.data ?? []).forEach((o: { id: string; order_number: string; customers: { name: string }[] | null }) => r.push({ type: 'طلب', id: o.id, label: o.order_number, sublabel: o.customers?.[0]?.name ?? '', route: 'orders', icon: ShoppingCart }));
    (custs.data ?? []).forEach((c: { id: string; name: string; code: string }) => r.push({ type: 'عميل', id: c.id, label: c.name, sublabel: c.code, route: 'customers', icon: Users }));
    (sups.data ?? []).forEach((s: { id: string; name: string; code: string }) => r.push({ type: 'مورد', id: s.id, label: s.name, sublabel: s.code, route: 'suppliers', icon: Truck }));
    (serials.data ?? []).forEach((s: { id: string; serial_number: string; imei_1: string | null; products: { name: string }[] | null }) => r.push({ type: 'جهاز', id: s.id, label: s.serial_number, sublabel: s.products?.[0]?.name ?? s.imei_1 ?? '', route: 'serials', icon: Smartphone }));
    (invs.data ?? []).forEach((i: { id: string; invoice_number: string; customers: { name: string }[] | null }) => r.push({ type: 'فاتورة', id: i.id, label: i.invoice_number, sublabel: i.customers?.[0]?.name ?? '', route: 'invoices', icon: FileText }));
    (repairs.data ?? []).forEach((t: { id: string; ticket_number: string; customers: { name: string }[] | null }) => r.push({ type: 'إصلاح', id: t.id, label: t.ticket_number, sublabel: t.customers?.[0]?.name ?? '', route: 'repairs', icon: Wrench }));

    setResults(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const typeVariant = (t: string) => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
      'منتج': 'info', 'طلب': 'success', 'عميل': 'info', 'مورد': 'neutral',
      'جهاز': 'warning', 'فاتورة': 'success', 'إصلاح': 'warning',
    };
    return map[t] ?? 'neutral';
  };

  return (
    <div className="space-y-5">
      <div className="relative">
        <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في كل شيء: منتجات، طلبات، عملاء، أجهزة، فواتير..."
          className="input pr-12 text-base"
          autoFocus
        />
      </div>

      {loading ? <div className="p-5"><LoadingState rows={4} /></div> :
       searched && results.length === 0 ? <EmptyState icon={<SearchIcon className="w-8 h-8" />} title="لا توجد نتائج" description={`لم يتم العثور على نتائج لـ "${query}"`} /> :
       results.length === 0 ? (
         <div className="card p-8 text-center">
           <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto mb-3"><SearchIcon className="w-7 h-7 text-primary-600" /></div>
           <p className="font-medium text-app">البحث الشامل</p>
           <p className="text-muted text-sm mt-1">ابحث عبر جميع بيانات النظام — منتجات، طلبات، عملاء، موردين، أجهزة تسلسلية، فواتير، تذاكر إصلاح</p>
         </div>
       ) : (
         <div className="card overflow-hidden">
           <div className="px-5 py-3 border-b border-app"><p className="text-sm text-muted">{results.length} نتيجة لـ "{query}"</p></div>
           <div className="divide-y divide-app">
             {results.map((r) => {
               const Icon = r.icon;
               return (
                 <button key={`${r.type}-${r.id}`} onClick={() => navigate(r.route)} className="flex items-center gap-3 w-full p-4 hover:bg-app/30 transition-colors text-right">
                   <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-primary-600" /></div>
                   <div className="flex-1 min-w-0"><p className="font-medium text-app truncate">{r.label}</p><p className="text-muted text-xs truncate">{r.sublabel}</p></div>
                   <Badge variant={typeVariant(r.type)}>{r.type}</Badge>
                 </button>
               );
             })}
           </div>
         </div>
       )}
    </div>
  );
}
