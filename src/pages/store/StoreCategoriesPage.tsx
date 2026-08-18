import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStoreRouter } from '@/context/StoreRouterContext';
import type { StoreCategory } from '@/types/store';
import { Grid3x3, Loader as Loader2, ChevronLeft, Package } from 'lucide-react';

export default function StoreCategoriesPage() {
  const { navigate } = useStoreRouter();
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('store_categories').select('*');
      setCategories(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-app">الأقسام</h1>
      {categories.length === 0 ? (
        <div className="card p-8 text-center">
          <Grid3x3 className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">لا توجد أقسام حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate('category', { id: cat.id, name: cat.name })}
              className="card card-hover p-5 flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary-600" />
              </div>
              <p className="font-medium text-app text-sm text-center">{cat.name}</p>
              <span className="text-primary-600 text-xs flex items-center gap-1">
                تصفح <ChevronLeft className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
