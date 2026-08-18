import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { StatCard, SectionCard, LoadingState, Badge } from '@/components/ui';
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  Wrench,
  RotateCcw,
} from 'lucide-react';
import { formatCurrency, formatNumber, timeAgo } from '@/lib/utils';

interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalOrders: number;
  lowStockCount: number;
  activeRepairs: number;
  pendingRmas: number;
  recentOrders: { id: string; order_number: string; status: string; total: number; created_at: string }[];
  lowStockItems: { id: string; product_name: string; on_hand: number; reserved: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [products, customers, orders, inventory, repairs, rmas] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact', head: true }),
          supabase.from('customers').select('id', { count: 'exact', head: true }),
          supabase.from('orders').select('id, order_number, status, total, created_at').order('created_at', { ascending: false }).limit(5),
          supabase.from('inventory_items').select('product_id, on_hand, reserved, products!inner(name)').filter('on_hand', 'lte', '5'),
          supabase.from('repair_tickets').select('id', { count: 'exact', head: true }).neq('status', 'delivered').neq('status', 'cancelled'),
          supabase.from('rmas').select('id', { count: 'exact', head: true }).eq('status', 'requested'),
        ]);

        setStats({
          totalProducts: products.count ?? 0,
          totalCustomers: customers.count ?? 0,
          totalOrders: orders.count ?? 0,
          lowStockCount: inventory.count ?? 0,
          activeRepairs: repairs.count ?? 0,
          pendingRmas: rmas.count ?? 0,
          recentOrders: (orders.data ?? []) as DashboardStats['recentOrders'],
          lowStockItems: [],
        });
      } catch {
        // Tables may be empty — show zeros
        setStats({
          totalProducts: 0,
          totalCustomers: 0,
          totalOrders: 0,
          lowStockCount: 0,
          activeRepairs: 0,
          pendingRmas: 0,
          recentOrders: [],
          lowStockItems: [],
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <LoadingState />
      </div>
    );
  }

  const orderStatusLabels: Record<string, string> = {
    draft: 'مسودة',
    submitted: 'مُرسلة',
    received: 'مستلمة',
    confirmed: 'مؤكدة',
    processing: 'قيد المعالجة',
    packed: 'مُعبأة',
    ready: 'جاهزة',
    delivered: 'مُسلمة',
    completed: 'مكتملة',
    returned: 'مُرجعة',
    cancelled: 'ملغاة',
    rejected: 'مرفوضة',
    payment_pending: 'بانتظار الدفع',
    awaiting_modification: 'بانتظار التعديل',
    partially_fulfilled: 'تلبية جزئية',
  };

  const statusVariant = (status: string) => {
    if (['completed', 'delivered', 'ready'].includes(status)) return 'success' as const;
    if (['cancelled', 'rejected', 'returned'].includes(status)) return 'error' as const;
    if (['draft', 'payment_pending', 'awaiting_modification'].includes(status)) return 'warning' as const;
    return 'info' as const;
  };

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="إجمالي المنتجات"
          value={formatNumber(stats.totalProducts)}
          icon={<Package className="w-5 h-5" strokeWidth={1.75} />}
          freshness="fresh"
        />
        <StatCard
          label="إجمالي العملاء"
          value={formatNumber(stats.totalCustomers)}
          icon={<Users className="w-5 h-5" strokeWidth={1.75} />}
          freshness="fresh"
        />
        <StatCard
          label="إجمالي الطلبات"
          value={formatNumber(stats.totalOrders)}
          icon={<ShoppingCart className="w-5 h-5" strokeWidth={1.75} />}
          freshness="fresh"
        />
        <StatCard
          label="مخزون منخفض"
          value={formatNumber(stats.lowStockCount)}
          icon={<AlertTriangle className="w-5 h-5" strokeWidth={1.75} />}
          freshness={stats.lowStockCount > 0 ? 'warning' : 'fresh'}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="إصلاحات نشطة"
          value={formatNumber(stats.activeRepairs)}
          icon={<Wrench className="w-5 h-5" strokeWidth={1.75} />}
        />
        <StatCard
          label="مرتجعات معلقة"
          value={formatNumber(stats.pendingRmas)}
          icon={<RotateCcw className="w-5 h-5" strokeWidth={1.75} />}
        />
        <StatCard
          label="قيمة المخزون"
          value={formatCurrency(0)}
          icon={<TrendingUp className="w-5 h-5" strokeWidth={1.75} />}
          freshness="unknown"
        />
      </div>

      {/* Recent orders + Low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="أحدث الطلبات">
          {stats.recentOrders.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">لا توجد طلبات بعد</p>
          ) : (
            <div className="space-y-2">
              {stats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-app transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-app text-sm truncate">{order.order_number}</p>
                      <p className="text-muted text-xs">{timeAgo(order.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-app">{formatCurrency(order.total)}</span>
                    <Badge variant={statusVariant(order.status)}>
                      {orderStatusLabels[order.status] ?? order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="تنبيهات المخزون">
          {stats.lowStockCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-success-50 dark:bg-success-900/20 flex items-center justify-center mb-3">
                <Package className="w-6 h-6 text-success-600" />
              </div>
              <p className="text-muted text-sm">المخزون في حالة جيدة</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-warning-600 text-sm">
                <Clock className="w-4 h-4" />
                <span>يوجد {formatNumber(stats.lowStockCount)} صنف بمخزون منخفض</span>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
