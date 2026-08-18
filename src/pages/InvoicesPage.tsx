import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState, LoadingState, Badge } from '@/components/ui';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { FileText, Search, ArrowLeft, Loader2, Check } from 'lucide-react';
import { useRouter } from '@/context/RouterContext';

interface InvoiceRow {
  id: string;
  invoice_number: string;
  order_id: string;
  customer_id: string;
  total: number;
  template_version: string;
  created_at: string;
  customers: { name: string; code: string } | null;
  orders: { order_number: string } | null;
}

interface PaymentRow {
  id: string;
  invoice_id: string;
  amount: number;
  status: string;
  evidence_url: string | null;
  verified_by: string | null;
  created_at: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'معلق', requested: 'مطلوب', evidence_uploaded: 'تم رفع الإثبات',
  verified: 'مُتحقق', allocated: 'مُخصص', rejected: 'مرفوض', refunded: 'مُسترد',
};

function payVariant(s: string) {
  if (s === 'verified' || s === 'allocated') return 'success' as const;
  if (s === 'rejected' || s === 'refunded') return 'error' as const;
  if (s === 'pending') return 'warning' as const;
  return 'info' as const;
}

export default function InvoicesPage() {
  const { params, navigate } = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(params.id ?? null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*, customers(name, code), orders(order_number)')
      .order('created_at', { ascending: false });
    setInvoices(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (params.id) setDetailId(params.id); }, [params.id]);

  const filtered = invoices.filter((i) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return i.invoice_number.toLowerCase().includes(q) || (i.customers?.name ?? '').toLowerCase().includes(q);
  });

  if (detailId) {
    return <InvoiceDetail invoiceId={detailId} onBack={() => { setDetailId(null); navigate('invoices'); }} onChanged={load} />;
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث برقم الفاتورة أو العميل..." className="input pr-10" />
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-5"><LoadingState rows={6} /></div> :
         filtered.length === 0 ? <EmptyState icon={<FileText className="w-8 h-8" />} title="لا توجد فواتير" description="تُنشأ الفواتير تلقائياً عند تأكيد الطلبات" /> :
         <div className="overflow-x-auto"><table className="w-full text-sm">
           <thead><tr className="border-b border-app bg-app/50">
             <th className="text-right font-medium text-muted px-4 py-3">رقم الفاتورة</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">العميل</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden md:table-cell">رقم الطلب</th>
             <th className="text-right font-medium text-muted px-4 py-3">الإجمالي</th>
             <th className="text-right font-medium text-muted px-4 py-3 hidden md:table-cell">التاريخ</th>
           </tr></thead>
           <tbody>
             {filtered.map((inv) => (
               <tr key={inv.id} onClick={() => setDetailId(inv.id)} className="border-b border-app last:border-0 hover:bg-app/30 transition-colors cursor-pointer">
                 <td className="px-4 py-3 font-medium text-app">{inv.invoice_number}</td>
                 <td className="px-4 py-3 hidden sm:table-cell text-muted">{inv.customers?.name ?? '—'}</td>
                 <td className="px-4 py-3 hidden md:table-cell text-muted">{inv.orders?.order_number ?? '—'}</td>
                 <td className="px-4 py-3 font-semibold text-app">{formatCurrency(inv.total)}</td>
                 <td className="px-4 py-3 hidden md:table-cell text-muted text-xs">{formatDateTime(inv.created_at)}</td>
               </tr>
             ))}
           </tbody>
         </table></div>}
      </div>
    </div>
  );
}

function InvoiceDetail({ invoiceId, onBack, onChanged }: { invoiceId: string; onBack: () => void; onChanged: () => void }) {
  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [items, setItems] = useState<{ id: string; product_id: string; quantity: number; unit_price: number; total_price: number; products: { name: string; sku: string } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [invRes, payRes, itemsRes] = await Promise.all([
      supabase.from('invoices').select('*, customers(name, code), orders(order_number)').eq('id', invoiceId).maybeSingle(),
      supabase.from('payments').select('*').eq('invoice_id', invoiceId).order('created_at', { ascending: false }),
      supabase.from('order_items').select('*, products(name, sku)').eq('order_id', invoiceRes?.order_id ?? ''),
    ]);
    setInvoice(invRes.data as InvoiceRow);
    setPayments(payRes.data ?? []);
    setItems(itemsRes.data ?? []);
    setLoading(false);
  }, [invoiceId]);

  useEffect(() => { load(); }, [load]);

  const verifyPayment = async (payId: string) => {
    setVerifying(payId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('payments').update({ status: 'verified', verified_by: user?.id }).eq('id', payId);
    setVerifying(null);
    load();
    onChanged();
  };

  if (loading || !invoice) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-primary-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="btn-ghost text-muted"><ArrowLeft className="w-4 h-4" /> العودة للفواتير</button>

      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-app">{invoice.invoice_number}</h2>
            </div>
            <p className="text-muted text-sm">
              العميل: {invoice.customers?.name} ({invoice.customers?.code}) — {formatDateTime(invoice.created_at)}
            </p>
            <p className="text-muted text-sm">الطلب: {invoice.orders?.order_number ?? '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-muted text-sm">الإجمالي</p>
            <p className="text-2xl font-bold text-app">{formatCurrency(invoice.total)}</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-app"><h3 className="font-semibold text-app">أصناف الفاتورة</h3></div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-app bg-app/50">
            <th className="text-right font-medium text-muted px-4 py-3">المنتج</th>
            <th className="text-right font-medium text-muted px-4 py-3">الكمية</th>
            <th className="text-right font-medium text-muted px-4 py-3 hidden sm:table-cell">سعر الوحدة</th>
            <th className="text-right font-medium text-muted px-4 py-3">الإجمالي</th>
          </tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-app last:border-0">
                <td className="px-4 py-3"><p className="font-medium text-app">{item.products?.name ?? '—'}</p><code className="text-xs text-muted">{item.products?.sku ?? ''}</code></td>
                <td className="px-4 py-3 text-app">{item.quantity}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted">{formatCurrency(item.unit_price)}</td>
                <td className="px-4 py-3 font-semibold text-app">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">لا توجد أصناف</td></tr>}
          </tbody>
        </table></div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-app mb-4">المدفوعات</h3>
        {payments.length === 0 ? <p className="text-muted text-sm text-center py-6">لا توجد مدفوعات مسجلة</p> :
         <div className="space-y-3">
           {payments.map((p) => (
             <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-app/50">
               <div className="flex items-center gap-3">
                 <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center"><FileText className="w-4 h-4 text-primary-600" /></div>
                 <div><p className="font-medium text-app">{formatCurrency(p.amount)}</p><p className="text-xs text-muted">{formatDateTime(p.created_at)}</p></div>
               </div>
               <div className="flex items-center gap-2">
                 <Badge variant={payVariant(p.status)}>{PAYMENT_LABELS[p.status] ?? p.status}</Badge>
                 {p.status === 'evidence_uploaded' && (
                   <button onClick={() => verifyPayment(p.id)} disabled={verifying === p.id} className="btn-primary text-sm py-1.5 px-3">
                     {verifying === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                     تحقق
                   </button>
                 )}
               </div>
             </div>
           ))}
         </div>}
      </div>
    </div>
  );
}
