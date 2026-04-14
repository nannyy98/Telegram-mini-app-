import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ArrowLeft, Eye, EyeOff, Minus, AlertTriangle, Warehouse } from 'lucide-react';
import { supabase, Database } from '../../lib/supabase';
import { getCurrentAdmin, ROLE_LABELS } from '../../lib/auth';
import { formatPrice } from '../../lib/utils';
import { toast } from '../../components/Toast';

type Product = Database['public']['Tables']['products']['Row'];

const LOW_STOCK_THRESHOLD = 5;

const StockCell = ({
  product,
  onAdjust,
  onSet,
  disabled,
}: {
  product: Product;
  onAdjust: (delta: number) => void;
  onSet: (val: number) => void;
  disabled: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(product.stock));
  const isLow = (product.stock ?? 0) <= LOW_STOCK_THRESHOLD;
  const isOut = (product.stock ?? 0) === 0;

  const commitEdit = () => {
    const n = parseInt(inputVal, 10);
    if (!isNaN(n) && n >= 0) onSet(n);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        disabled={disabled || (product.stock ?? 0) <= 0}
        onClick={() => onAdjust(-1)}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition"
      >
        <Minus className="w-3 h-3" />
      </button>

      {editing ? (
        <input
          autoFocus
          type="number"
          min={0}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-14 text-center text-sm font-semibold border border-blue-400 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-1 py-0.5"
        />
      ) : (
        <button
          onClick={() => { setInputVal(String(product.stock)); setEditing(true); }}
          className={`min-w-[2.5rem] text-center text-sm font-bold px-2 py-0.5 rounded-lg transition ${
            isOut
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              : isLow
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          } hover:ring-2 hover:ring-blue-400`}
          title="Нажмите для ввода вручную"
        >
          {product.stock ?? 0}
        </button>
      )}

      <button
        disabled={disabled}
        onClick={() => onAdjust(+1)}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition"
      >
        <Plus className="w-3 h-3" />
      </button>

      {isOut && (
        <span className="text-xs font-semibold text-red-500 hidden sm:block">нет</span>
      )}
      {!isOut && isLow && (
        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 hidden sm:block" />
      )}
    </div>
  );
};

export const AdminProducts = () => {
  const navigate = useNavigate();
  const admin = getCurrentAdmin();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [stockView, setStockView] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data ?? []);
    } catch {
      toast.error('Не удалось загрузить список товаров.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот товар? Действие необратимо.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { toast.error('Ошибка при удалении товара.'); return; }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success('Товар удалён.');
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('products').update({ is_active: !current }).eq('id', id);
    if (error) { toast.error('Ошибка при изменении статуса.'); return; }
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, is_active: !current } : p));
  };

  const adjustStock = async (productId: string, delta: number) => {
    if (adjustingId) return;
    setAdjustingId(productId);
    try {
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      const newStock = Math.max(0, (product.stock ?? 0) + delta);
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', productId);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, stock: newStock } : p));
      toast.success(`Остаток: ${newStock} шт.`);
    } catch {
      toast.error('Ошибка при изменении остатка.');
    } finally {
      setAdjustingId(null);
    }
  };

  const setStock = async (productId: string, newStock: number) => {
    if (adjustingId) return;
    setAdjustingId(productId);
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', productId);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, stock: newStock } : p));
      toast.success(`Остаток установлен: ${newStock} шт.`);
    } catch {
      toast.error('Ошибка при установке остатка.');
    } finally {
      setAdjustingId(null);
    }
  };

  const displayProducts = stockView
    ? [...products].sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    : products;

  const lowStockCount = products.filter((p) => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD && (p.stock ?? 0) > 0).length;
  const outOfStockCount = products.filter((p) => (p.stock ?? 0) === 0).length;

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Товары</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{products.length} позиций</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStockView(!stockView)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition ${
                stockView
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Warehouse className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Склад</span>
            </button>

            <div className="text-right hidden sm:block ml-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">{admin.first_name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                admin.role === 'admin'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : admin.role === 'manager'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                {ROLE_LABELS[admin.role]}
              </span>
            </div>

            <button
              onClick={() => navigate('/admin/products/new')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {(lowStockCount > 0 || outOfStockCount > 0) && (
          <div className="mb-5 flex flex-wrap gap-3">
            {outOfStockCount > 0 && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-2.5 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                Нет в наличии: {outOfStockCount} товар(а)
              </div>
            )}
            {lowStockCount > 0 && (
              <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 rounded-xl px-4 py-2.5 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                Мало на складе (≤{LOW_STOCK_THRESHOLD} шт.): {lowStockCount} товар(а)
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400 mb-4">Товаров пока нет</p>
            <button
              onClick={() => navigate('/admin/products/new')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Добавить первый товар
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">Товар</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">Цена</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">
                      <span className="flex items-center gap-1.5">
                        <Warehouse className="w-3.5 h-3.5" />
                        Остаток
                      </span>
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">Видимость</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {displayProducts.map((product) => {
                    const isLow = (product.stock ?? 0) <= LOW_STOCK_THRESHOLD;
                    const isOut = (product.stock ?? 0) === 0;

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition ${
                          isOut ? 'bg-red-50/30 dark:bg-red-900/5' : isLow ? 'bg-yellow-50/30 dark:bg-yellow-900/5' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">нет</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[160px]">
                                {(product.name as any)?.ru ?? '—'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px]">{product.slug}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          {formatPrice(Number(product.price))}
                        </td>

                        <td className="px-5 py-3.5">
                          <StockCell
                            product={product}
                            onAdjust={(delta) => adjustStock(product.id, delta)}
                            onSet={(val) => setStock(product.id, val)}
                            disabled={adjustingId === product.id}
                          />
                        </td>

                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => toggleActive(product.id, product.is_active ?? true)}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                              product.is_active
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {product.is_active
                              ? <><Eye className="w-3.5 h-3.5" />Активен</>
                              : <><EyeOff className="w-3.5 h-3.5" />Скрыт</>
                            }
                          </button>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                              title="Редактировать"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
