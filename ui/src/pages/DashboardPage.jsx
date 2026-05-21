import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Building2, FileText, UserCheck, CreditCard,
  TrendingUp, RefreshCw, ArrowRight, AlertTriangle,
  CheckCircle2, Clock, XCircle, LayoutGrid,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('mosslegal_access_token')}`,
});

const formatMoney = (v) =>
  new Intl.NumberFormat('vi-VN').format(v || 0) + '₫';
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'orange', to }) => {
  const navigate = useNavigate();
  const colors = {
    orange:  'bg-orange-50  text-orange-600  dark:bg-orange-900/20',
    blue:    'bg-blue-50    text-blue-600    dark:bg-blue-900/20',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20',
    purple:  'bg-purple-50  text-purple-600  dark:bg-purple-900/20',
    amber:   'bg-amber-50   text-amber-600   dark:bg-amber-900/20',
    rose:    'bg-rose-50    text-rose-600    dark:bg-rose-900/20',
  };
  return (
    <div
      onClick={() => to && navigate(to)}
      className={`card p-5 flex items-start gap-4 ${to ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-weak mb-1">{label}</div>
        <div className="text-2xl font-black text-strong leading-none">{value}</div>
        {sub && <div className="text-xs text-weak mt-1">{sub}</div>}
      </div>
      {to && <ArrowRight size={14} className="text-weak shrink-0 mt-1" />}
    </div>
  );
};

// ── Subscription status card ──────────────────────────────────────────────────
const SubCard = ({ sub }) => {
  const navigate = useNavigate();
  if (!sub) {
    return (
      <div className="card p-5 border-dashed">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <CreditCard size={16} className="text-weak" />
          </div>
          <div>
            <div className="text-xs font-semibold text-strong">Gói đăng ký</div>
            <div className="text-[11px] text-weak">Chưa có gói dịch vụ</div>
          </div>
        </div>
        <button onClick={() => navigate('/subscription')} className="btn-primary w-full justify-center text-xs py-2">
          Xem thông tin gói
        </button>
      </div>
    );
  }

  const usagePct = sub.max_users && sub.max_users !== -1
    ? Math.min(100, Math.round((sub.user_count / sub.max_users) * 100))
    : null;
  const nearExpiry = sub.days_left != null && sub.days_left <= 14;
  const isActive = sub.status === 'active';

  const statusIcon = isActive ? CheckCircle2 : sub.status === 'expired' ? XCircle : Clock;
  const StatusIcon = statusIcon;
  const statusCls = isActive ? 'text-emerald-600' : sub.status === 'expired' ? 'text-red-500' : 'text-amber-600';
  const cardBg = isActive
    ? 'border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-900/10'
    : nearExpiry
    ? 'border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-900/10'
    : '';

  return (
    <div className={`card p-5 ${cardBg}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
            <StatusIcon size={16} className={statusCls} />
          </div>
          <div>
            <div className="text-xs font-semibold text-strong">{sub.plan_name || 'Gói dịch vụ'}</div>
            <div className="text-[11px] text-weak">
              {isActive ? `Còn ${sub.days_left} ngày` : sub.status === 'expired' ? 'Đã hết hạn' : 'Chờ kích hoạt'}
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/subscription')} className="btn-ghost text-[11px]">
          Chi tiết <ArrowRight size={11} />
        </button>
      </div>

      {/* Usage bar */}
      {usagePct !== null && (
        <div>
          <div className="flex justify-between text-[10px] text-weak mb-1.5">
            <span>Nhân viên: {sub.user_count}/{sub.max_users === -1 ? '∞' : sub.max_users}</span>
            <span className={usagePct >= 90 ? 'text-red-500 font-medium' : usagePct >= 70 ? 'text-amber-600 font-medium' : ''}>{usagePct}%</span>
          </div>
          <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Expiry warning */}
      {nearExpiry && isActive && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          <AlertTriangle size={11} className="shrink-0" />
          Gói hết hạn ngày {formatDate(sub.end_date)} — liên hệ để gia hạn
        </div>
      )}
    </div>
  );
};

// ── Super admin view ──────────────────────────────────────────────────────────
const SuperAdminDashboardView = ({ data }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[11px] uppercase tracking-widest text-weak font-medium mb-3">Tổng quan nền tảng</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Building2}   label="Tenants đang hoạt động" value={data.total_tenants}        color="blue"    to="/super-admin" />
          <StatCard icon={CreditCard}  label="Gói đang chạy"          value={data.active_subscriptions}  color="emerald" to="/super-admin" />
          <StatCard icon={Users}       label="Tổng người dùng"         value={data.total_users}            color="purple"  to="/super-admin" />
          <StatCard icon={TrendingUp}  label="Tổng doanh thu"          value={formatMoney(data.total_revenue)} color="orange" to="/super-admin" />
        </div>
      </div>

      <div className="card p-6 flex flex-col items-center justify-center gap-4 text-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <LayoutGrid size={24} className="text-orange-600" />
        </div>
        <div>
          <div className="text-base font-black text-strong mb-1">Bảng điều khiển Super Admin</div>
          <div className="text-sm text-weak max-w-sm">Quản lý toàn bộ tenant, gói dịch vụ, subscription và cấu hình hệ thống</div>
        </div>
        <button onClick={() => navigate('/super-admin')} className="btn-primary px-6 py-2.5 shadow-md shadow-orange-600/20">
          Vào trang quản lý <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

// ── Tenant view ───────────────────────────────────────────────────────────────
const TenantDashboardView = ({ data }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div>
        <h2 className="text-[11px] uppercase tracking-widest text-weak font-medium mb-3">Tổng quan</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users}     label="Khách hàng"     value={data.customers_count} color="blue"    to="/customers" />
          <StatCard icon={FileText}  label="Hộ kinh doanh"  value={data.hkd_count}       color="orange"  to="/hkd" />
          <StatCard icon={Building2} label="Thành lập DN"   value={data.company_count}   color="purple"  to="/company" />
          <StatCard icon={UserCheck} label="Nhân viên"      value={data.staff_count}     color="emerald" to="/staff" />
        </div>
      </div>

      {/* Subscription + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Subscription */}
        <div className="space-y-2">
          <h2 className="text-[11px] uppercase tracking-widest text-weak font-medium">Gói dịch vụ</h2>
          <SubCard sub={data.subscription} />
        </div>

        {/* Recent HKD */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] uppercase tracking-widest text-weak font-medium">HKD gần đây</h2>
            <button onClick={() => navigate('/hkd')} className="btn-ghost text-[10px] py-1 px-2">Xem tất cả</button>
          </div>
          <div className="card overflow-hidden">
            {data.recent_hkd?.length === 0 ? (
              <div className="py-8 text-center">
                <FileText size={24} className="mx-auto text-weak/30 mb-2" />
                <div className="text-xs text-weak">Chưa có dữ liệu</div>
              </div>
            ) : (
              <div className="divide-y divide-base">
                {data.recent_hkd?.map(h => (
                  <div key={h.id} onClick={() => navigate(`/hkd/${h.id}`)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-page cursor-pointer transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                      <FileText size={13} className="text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-strong truncate">{h.company_full_name || '—'}</div>
                      <div className="text-[10px] text-weak">{formatDateTime(h.created_at)}</div>
                    </div>
                    {h.status_name && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-weak shrink-0">{h.status_name}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Customers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] uppercase tracking-widest text-weak font-medium">Khách hàng gần đây</h2>
            <button onClick={() => navigate('/customers')} className="btn-ghost text-[10px] py-1 px-2">Xem tất cả</button>
          </div>
          <div className="card overflow-hidden">
            {data.recent_customers?.length === 0 ? (
              <div className="py-8 text-center">
                <Users size={24} className="mx-auto text-weak/30 mb-2" />
                <div className="text-xs text-weak">Chưa có dữ liệu</div>
              </div>
            ) : (
              <div className="divide-y divide-base">
                {data.recent_customers?.map(c => (
                  <div key={c.id} onClick={() => navigate('/customers')}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-page cursor-pointer transition-colors">
                    <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 text-blue-600 text-[10px] font-bold">
                      {(c.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-strong truncate">{c.name}</div>
                      <div className="text-[10px] text-weak">{c.phone || '—'}</div>
                    </div>
                    <div className="text-[10px] text-weak shrink-0">{formatDateTime(c.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await axios.get('/api/v1/dashboard/stats', { headers: authHeaders() });
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <div className="page-content">
      <div className="page-inner">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-strong">
              {greeting()}, {user?.display_name?.split(' ').at(-1) || 'bạn'} 👋
            </h1>
            <p className="text-sm text-weak mt-0.5">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={load} disabled={loading} className="btn-icon" title="Làm mới">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Content */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="spinner w-8 h-8" />
          </div>
        )}

        {error && !loading && (
          <div className="card p-6 text-center">
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
            <button onClick={load} className="btn-primary mt-4 mx-auto">Thử lại</button>
          </div>
        )}

        {!loading && !error && data && (
          data.role === 'super_admin'
            ? <SuperAdminDashboardView data={data} />
            : <TenantDashboardView data={data} />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
