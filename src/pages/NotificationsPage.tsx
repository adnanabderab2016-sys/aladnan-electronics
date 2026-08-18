import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState, LoadingState, Badge } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import { Bell, Check, Trash2, Loader2 } from 'lucide-react';
import type { Notification } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  order_created: 'طلب جديد',
  order_status: 'تحديث طلب',
  low_stock: 'مخزون منخفض',
  repair_update: 'تحديث صيانة',
  rma_update: 'تحديث مرتجع',
  warranty: 'ضمان',
  import_complete: 'اكتمل استيراد',
  import_failed: 'فشل استيراد',
  payment: 'مدفوعات',
  system: 'نظام',
};

function typeVariant(t: string) {
  if (t.includes('failed') || t.includes('low_stock')) return 'error' as const;
  if (t.includes('complete') || t.includes('payment')) return 'success' as const;
  if (t.includes('warning') || t.includes('pending')) return 'warning' as const;
  return 'info' as const;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setNotifications(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    load();
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    load();
  };

  const deleteNotif = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    load();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setFilter('all')} className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}>الكل ({notifications.length})</button>
          <button onClick={() => setFilter('unread')} className={filter === 'unread' ? 'btn-primary' : 'btn-secondary'}>غير مقروء ({unreadCount})</button>
        </div>
        {unreadCount > 0 && <button onClick={markAllRead} className="btn-ghost text-primary-600 text-sm"><Check className="w-4 h-4" /> تعليم الكل كمقروء</button>}
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-5"><LoadingState rows={5} /></div> :
         filtered.length === 0 ? <EmptyState icon={<Bell className="w-8 h-8" />} title="لا توجد إشعارات" description="ستظهر هنا جميع تنبيهات النظام والطلبات والمخزون" /> :
         <div className="divide-y divide-app">
           {filtered.map((n) => (
             <div key={n.id} className={`flex items-start gap-3 p-4 hover:bg-app/30 transition-colors ${!n.is_read ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}>
               <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                 <Bell className="w-4 h-4 text-primary-600 dark:text-primary-400" />
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2 mb-1">
                   <p className="font-medium text-app text-sm">{n.title}</p>
                   <Badge variant={typeVariant(n.type)}>{TYPE_LABELS[n.type] ?? n.type}</Badge>
                   {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />}
                 </div>
                 <p className="text-muted text-sm">{n.body}</p>
                 <p className="text-muted text-xs mt-1">{formatDateTime(n.created_at)}</p>
               </div>
               <div className="flex items-center gap-1 shrink-0">
                 {!n.is_read && <button onClick={() => markRead(n.id)} className="btn-ghost p-2" aria-label="تعليم كمقروء"><Check className="w-4 h-4" /></button>}
                 <button onClick={() => deleteNotif(n.id)} className="btn-ghost p-2 hover:text-error-600" aria-label="حذف"><Trash2 className="w-4 h-4" /></button>
               </div>
             </div>
           ))}
         </div>}
      </div>
    </div>
  );
}
