import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, ShoppingBag, DollarSign, LogOut, Users, TrendingUp,
  Image, BarChart2, ArrowUpRight, ShoppingCart, Truck, Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  getCurrentAdmin, logoutAdmin,
  canManageUsers, canManageOrders, canManageBanners, canManageDelivery,
  ROLE_LABELS,
} from '../../lib/auth';
import { formatPrice } from '../../lib/utils';
import { getStatusInfo } from '../../lib/orderStatuses';

interface SalesDay { date: string; revenue: number; orders: number }
interface TopProduct { name: string; orders: number; revenue: number }

type Period = '7d' | '30d' | 'all';

interface DashStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  recentOrders: any[];
  salesByDay: SalesDay[];
  topProducts: TopProduct[];
  ordersByStatus: Record<string, number>;
  avgOrderValue: number;
  activeBanners: number;
  newUsersCount: number;
}

const EMPTY_STATS: DashStats = {
  totalOrders: 0,
  totalRevenue: 0,
  totalProducts: 0,
  totalUsers: 0,
  recentOrders: [],
  salesByDay: [],
  topProducts: [],
  ordersByStatus: {},
  avgOrderValue: 0,
  activeBanners: 0,
  newUsersCount: 0,
};

const STATUS_BAR_COLORS: Record<string, string> = {
  new: 'bg-gray-400',
  processing: 'bg-blue-500',
  assembling: 'bg-yellow-500',
  assembled: 'bg-amber-500',
  shipping: 'bg-orange-500',
  delivered: 'bg-emerald-500',
  cancelled: 'bg-red-400',
  return_requested: 'bg-rose-500',
  returned: 'bg-slate-400',
  paid: 'bg-green-500',
  shipped: 'bg-blue-400',
};

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 дней',
  '30d': '30 дней',
  'all': 'Всё время',
};

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const admin = getCurrentAdmin();
  const [stats, setStats] = useState<DashStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('7d');

  useEffect(() => { loadStats(); }, [period]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let dateFrom: string | null = null;

      if (period === '7d') {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        dateFrom = d.toISOString().slice(0, 10);
      } else if (period === '30d') {
        const d = new Date(now);
        d.setDate(d.getDate() - 29);
        dateFrom = d.toISOString().slice(0, 10);
      }

      let ordersQuery = supabase
        .from('orders')
        .select('total_amount, status, created_at, items', { count: 'exact' });
      if (dateFrom) {
        ordersQuery = ordersQuery.gte('created_at', dateFrom + 'T00:00:00');
      }

      const [ordersRes, productsRes, recentRes, bannersRes, usersRes] = await Promise.all([
        ordersQuery,
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(6),
        supabase.from('banners').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('users').select('id', { count: 'exact' }),
      ]);

      const allOrders = ordersRes.data ?? [];
      const totalRevenue = allOrders.reduce((s, o) => s + Number(o.total_amount), 0);
      const avgOrderValue = allOrders.length ? totalRevenue / allOrders.length : 0;

      const days = period === '7d' ? 7 : period === '30d' ? 30 : 14;
      const salesByDay: SalesDay[] = Array.from({ length: days }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (days - 1 - i));
        const dateStr = d.toISOString().slice(0, 10);
        const dayOrders = allOrders.filter(o => o.created_at.slice(0, 10) === dateStr);
        return {
          date: dateStr,
          revenue: dayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
          orders: dayOrders.length,
        };
      });

      const ordersByStatus: Record<string, number> = {};
      allOrders.forEach(o => {
        ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
      });

      const productMap: Record<string, { name: string; orders: number; revenue: number }> = {};
      allOrders.forEach(order => {
        const items = order.items as any[];
        if (!Array.isArray(items)) return;
        items.forEach((item: any) => {
          const key = item.product_id ?? item.id ?? item.name?.ru ?? 'unknown';
          if (!productMap[key]) {
            productMap[key] = { name: item.name?.ru ?? item.name ?? key, orders: 0, revenue: 0 };
          }
          productMap[key].orders += item.quantity ?? 1;
          productMap[key].revenue += (item.price ?? 0) * (item.quantity ?? 1);
        });
      });
      const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setStats({
        totalOrders: ordersRes.count ?? 0,
        totalRevenue,
        totalProducts: productsRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
        recentOrders: recentRes.data ?? [],
        salesByDay,
        topProducts,
        ordersByStatus,
        avgOrderValue,
        activeBanners: bannersRes.count ?? 0,
        newUsersCount: usersRes.count ?? 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { logoutAdmin(); navigate('/admin'); };

  if (!admin) return null;

  const maxDayRevenue = Math.max(...stats.salesByDay.map(d => d.revenue), 1);

  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : null;
  const dateFormat = period === '30d'
    ? { day: 'numeric' as const, month: 'short' as const }
    : { day: 'numeric' as const, month: 'short' as const };
  const showEvery = period === '30d' ? 4 : 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">StyleTech Shop</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Панель управления</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">{admin.first_name}</p>
              <p className="text-xs mt-0.5">
                <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${
                  admin.role === 'admin'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : admin.role === 'manager'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {ROLE_LABELS[admin.role]}
                </span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Обзор</h2>
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400 ml-2" />
            {(['7d', '30d', 'all'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  period === p
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Заказов"
            value={loading ? null : stats.totalOrders}
            icon={<ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            iconBg="bg-blue-50 dark:bg-blue-900/20"
            sub={period === 'all' ? 'за всё время' : `за ${PERIOD_LABELS[period]}`}
          />
          <KpiCard
            label="Выручка"
            value={loading ? null : formatPrice(stats.totalRevenue)}
            icon={<TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />}
            iconBg="bg-green-50 dark:bg-green-900/20"
            sub={period === 'all' ? 'за всё время' : `за ${PERIOD_LABELS[period]}`}
          />
          <KpiCard
            label="Средний чек"
            value={loading ? null : formatPrice(stats.avgOrderValue)}
            icon={<DollarSign className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
            iconBg="bg-orange-50 dark:bg-orange-900/20"
            sub="на заказ"
          />
          <KpiCard
            label="Покупатели"
            value={loading ? null : stats.totalUsers}
            icon={<Users className="w-5 h-5 text-sky-600 dark:text-sky-400" />}
            iconBg="bg-sky-50 dark:bg-sky-900/20"
            sub="всего"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
          <KpiCard
            label="Товары"
            value={loading ? null : stats.totalProducts}
            icon={<Package className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
            iconBg="bg-slate-50 dark:bg-slate-900/20"
            sub="в каталоге"
          />
          <KpiCard
            label="Активные баннеры"
            value={loading ? null : stats.activeBanners}
            icon={<Image className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
            iconBg="bg-rose-50 dark:bg-rose-900/20"
            sub="показываются"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">
                  Продажи {period !== 'all' ? `за ${PERIOD_LABELS[period]}` : '(последние 14 дней)'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Выручка по дням</p>
              </div>
              <BarChart2 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-36">
                <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex items-end gap-1 h-36">
                {stats.salesByDay.map((day, idx) => {
                  const pct = maxDayRevenue > 0 ? (day.revenue / maxDayRevenue) * 100 : 0;
                  const showLabel = showEvery === 1 || idx % showEvery === 0;
                  const label = new Date(day.date).toLocaleDateString('ru-RU', dateFormat);
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {formatPrice(day.revenue)} · {day.orders} заказ.
                      </div>
                      <div className="w-full flex items-end" style={{ height: '100px' }}>
                        <div
                          className={`w-full rounded-t-lg transition-all duration-300 ${day.revenue > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-100 dark:bg-gray-700'}`}
                          style={{ height: `${Math.max(pct, pct > 0 ? 4 : 2)}%` }}
                        />
                      </div>
                      {showLabel && (
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 whitespace-nowrap leading-tight">{label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-1">Статусы заказов</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Распределение</p>
            {loading ? (
              <div className="flex items-center justify-center h-36">
                <span className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : Object.keys(stats.ordersByStatus).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Заказов нет</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.ordersByStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => {
                    const total = stats.totalOrders || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 dark:text-gray-400">{getStatusInfo(status).label_ru}</span>
                          <span className="text-xs font-semibold text-gray-900 dark:text-white">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${STATUS_BAR_COLORS[status] ?? 'bg-gray-400'} transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-3">
            <NavCard to="/admin/products" color="blue" icon={<ShoppingBag className="w-5 h-5" />} label="Товары" sub="Добавить, редактировать" />
            {canManageOrders(admin) && (
              <NavCard to="/admin/orders" color="green" icon={<Package className="w-5 h-5" />} label="Заказы" sub="Просмотр и статусы" />
            )}
            {canManageBanners(admin) && (
              <NavCard to="/admin/banners" color="orange" icon={<Image className="w-5 h-5" />} label="Баннеры" sub={`${stats.activeBanners} активных`} />
            )}
            {canManageDelivery(admin) && (
              <NavCard to="/admin/delivery" color="sky" icon={<Truck className="w-5 h-5" />} label="Доставка" sub="Тарифы по регионам" />
            )}
            {canManageUsers(admin) && (
              <NavCard to="/admin/users" color="rose" icon={<Users className="w-5 h-5" />} label="Пользователи" sub="Роли и доступы" />
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Топ товаров</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">По выручке · {PERIOD_LABELS[period]}</p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <span className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stats.topProducts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Нет данных</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {stats.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      i === 0 ? 'bg-yellow-400 text-yellow-900'
                      : i === 1 ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                      : i === 2 ? 'bg-orange-200 text-orange-800'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{p.orders} шт.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatPrice(p.revenue)}</p>
                      <p className="flex items-center justify-end gap-0.5 text-[10px] text-green-600 dark:text-green-400">
                        <ArrowUpRight className="w-2.5 h-2.5" />
                        <span>выручка</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-sm">Последние заказы</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">6 последних</p>
              </div>
              {canManageOrders(admin) && (
                <Link to="/admin/orders" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Все
                </Link>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <span className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stats.recentOrders.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-10">Заказов пока нет</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {stats.recentOrders.map((order) => (
                  <div key={order.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusInfo(order.status).color}`}>
                        {getStatusInfo(order.status).label_ru}
                      </span>
                      <p className="text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {formatPrice(Number(order.total_amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

function KpiCard({
  label, value, icon, iconBg, sub,
}: {
  label: string;
  value: string | number | null;
  icon: React.ReactNode;
  iconBg: string;
  sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">
            {value === null ? '—' : value}
          </p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function NavCard({
  to, color, icon, label, sub,
}: {
  to: string;
  color: 'blue' | 'green' | 'orange' | 'sky' | 'rose';
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  const colorMap = {
    blue: {
      wrap: 'hover:border-blue-300 dark:hover:border-blue-700',
      icon: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40',
    },
    green: {
      wrap: 'hover:border-green-300 dark:hover:border-green-700',
      icon: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 group-hover:bg-green-100 dark:group-hover:bg-green-900/40',
    },
    orange: {
      wrap: 'hover:border-orange-300 dark:hover:border-orange-700',
      icon: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/40',
    },
    sky: {
      wrap: 'hover:border-sky-300 dark:hover:border-sky-700',
      icon: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/40',
    },
    rose: {
      wrap: 'hover:border-rose-300 dark:hover:border-rose-700',
      icon: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40',
    },
  };
  const c = colorMap[color];
  return (
    <Link
      to={to}
      className={`flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm ${c.wrap} hover:shadow-md transition group`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${c.icon}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
      </div>
      <ArrowUpRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition flex-shrink-0" />
    </Link>
  );
}
