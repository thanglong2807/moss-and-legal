import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Users, Calendar, RefreshCw,
  CheckCircle2, Clock, XCircle, AlertTriangle, Phone, Mail,
} from 'lucide-react';
import axios from 'axios';

const API = '/api/v1/tenant';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('mosslegal_access_token')}`,
});

const formatMoney = (v) => new Intl.NumberFormat('vi-VN').format(v) + '₫';
const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const STATUS_CONFIG = {
  active: {
    label: 'Đang hoạt động',
    badgeCls: 'badge-green',
    cardCls: 'border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-900/10 dark:to-slate-900',
    icon: CheckCircle2,
    iconCls: 'text-emerald-600',
  },
  pending: {
    label: 'Chờ kích hoạt',
    badgeCls: 'badge-amber',
    cardCls: 'border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-900/10 dark:to-slate-900',
    icon: Clock,
    iconCls: 'text-amber-600',
  },
  expired: {
    label: 'Đã hết hạn',
    badgeCls: 'badge-red',
    cardCls: 'border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50/40 to-white dark:from-red-900/10 dark:to-slate-900',
    icon: XCircle,
    iconCls: 'text-red-500',
  },
  cancelled: {
    label: 'Đã huỷ',
    badgeCls: 'badge-slate',
    cardCls: 'border-slate-200 dark:border-slate-700',
    icon: XCircle,
    iconCls: 'text-slate-400',
  },
  none: {
    label: 'Chưa có gói',
    badgeCls: 'badge-slate',
    cardCls: 'border-dashed border-slate-300 dark:border-slate-700',
    icon: AlertTriangle,
    iconCls: 'text-slate-400',
  },
};

const PAYMENT_STATUS = {
  success: { cls: 'badge-green', label: 'Thành công' },
  pending: { cls: 'badge-amber', label: 'Chờ xử lý' },
  failed:  { cls: 'badge-red',   label: 'Thất bại' },
  refunded:{ cls: 'badge-slate', label: 'Đã hoàn' },
};

const StatCard = ({ icon: Icon, label, value, sub, cls = '' }) => (
  <div className={`flex flex-col gap-1.5 p-4 rounded-2xl bg-white/60 dark:bg-black/20 border border-base/60 ${cls}`}>
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-weak">
      <Icon size={11} /> {label}
    </div>
    <div className="text-sm font-black text-strong leading-tight">{value}</div>
    {sub && <div className="text-[11px] text-weak">{sub}</div>}
  </div>
);

const SubscriptionPage = () => {
  const [sub, setSub] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, hr] = await Promise.all([
        axios.get(`${API}/subscription`, { headers: authHeaders() }),
        axios.get(`${API}/subscription/history`, { headers: authHeaders() }),
      ]);
      setSub(sr.data);
      setHistory(Array.isArray(hr.data) ? hr.data : []);
    } catch {
      // no subscription yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="page-loading"><div className="spinner w-7 h-7" /></div>;
  }

  const status = sub?.status || 'none';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.none;
  const StatusIcon = cfg.icon;

  const usagePct = sub?.max_users && sub.max_users !== -1
    ? Math.min(100, Math.round((sub.user_count / sub.max_users) * 100))
    : null;

  const isNearExpiry = sub?.days_left != null && sub.days_left <= 14 && status === 'active';

  return (
    <div className="page-content">
      <div className="page-inner max-w-3xl">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <CreditCard size={16} className="text-orange-600" />
            </div>
            <h1 className="text-[15px] font-black text-strong">Gói đăng ký</h1>
          </div>
          <button onClick={load} className="btn-icon" title="Làm mới"><RefreshCw size={14} /></button>
        </div>

        {/* ── Subscription card ────────────────────────────────────────── */}
        <div className={`rounded-2xl border p-5 ${cfg.cardCls}`}>
          {/* Top row */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                status === 'expired' ? 'bg-red-100 dark:bg-red-900/30' :
                'bg-slate-100 dark:bg-slate-800'
              }`}>
                <StatusIcon size={18} className={cfg.iconCls} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-weak mb-0.5">Gói hiện tại</div>
                <div className="text-lg font-black text-strong leading-tight">
                  {sub?.plan?.name || sub?.plan_name || '—'}
                </div>
              </div>
            </div>
            <span className={`${cfg.badgeCls} text-[11px]`}>{cfg.label}</span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatCard
              icon={Users}
              label="Người dùng"
              value={`${sub?.user_count ?? 0} / ${sub?.max_users === -1 ? '∞' : (sub?.max_users ?? 0)}`}
              sub={usagePct !== null ? `${usagePct}% đã dùng` : undefined}
            />
            <StatCard icon={Calendar} label="Bắt đầu" value={formatDate(sub?.start_date)} />
            <StatCard
              icon={Calendar}
              label="Hết hạn"
              value={formatDate(sub?.end_date)}
              cls={isNearExpiry ? 'border-amber-300 dark:border-amber-700' : ''}
            />
            <StatCard
              icon={Clock}
              label="Còn lại"
              value={sub?.days_left != null ? `${sub.days_left} ngày` : '—'}
              cls={isNearExpiry ? 'border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/10' : ''}
            />
          </div>

          {/* Usage bar */}
          {usagePct !== null && (
            <div>
              <div className="flex items-center justify-between text-[10px] text-weak mb-1.5">
                <span>Sử dụng nhân viên</span>
                <span className={usagePct >= 90 ? 'text-red-600 font-medium' : usagePct >= 70 ? 'text-amber-600 font-medium' : ''}>
                  {usagePct}%
                </span>
              </div>
              <div className="w-full h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
          )}

          {/* Near expiry warning */}
          {isNearExpiry && (
            <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2.5 border border-amber-200 dark:border-amber-800">
              <AlertTriangle size={13} className="shrink-0" />
              Gói của bạn sẽ hết hạn trong <strong>{sub.days_left} ngày</strong>. Vui lòng gia hạn sớm.
            </div>
          )}
        </div>

        {/* ── Contact to renew ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-orange-200 dark:border-orange-800 bg-orange-50/60 dark:bg-orange-900/10 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0 mt-0.5">
              <Phone size={16} className="text-orange-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-black text-strong mb-1">
                {status === 'active' ? 'Gia hạn / Nâng cấp gói' : 'Đăng ký gói dịch vụ'}
              </div>
              <p className="text-xs text-body leading-relaxed mb-3">
                Để {status === 'active' ? 'gia hạn hoặc nâng cấp' : 'đăng ký'} gói dịch vụ, vui lòng liên hệ trực tiếp với MOSS&LEGAL.
                Đội ngũ hỗ trợ sẽ xử lý và kích hoạt trong vòng <strong>24 giờ</strong>.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <a href="tel:+84901234567"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-medium hover:bg-orange-700 transition shadow-sm">
                  <Phone size={13} /> Gọi hotline
                </a>
                <a href="mailto:support@mosslegal.vn"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 text-xs font-medium hover:bg-orange-100 dark:hover:bg-orange-900/20 transition">
                  <Mail size={13} /> support@mosslegal.vn
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── History ──────────────────────────────────────────────────── */}
        {history.length > 0 && (
          <div>
            <h2 className="text-[11px] font-medium text-weak uppercase tracking-widest mb-3">Lịch sử thanh toán</h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Gói / Thời hạn</th>
                      <th>Cổng TT</th>
                      <th className="text-right">Số tiền</th>
                      <th>Trạng thái</th>
                      <th>Ngày TT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(p => {
                      const ps = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.pending;
                      return (
                        <tr key={p.id}>
                          <td className="font-mono text-[11px] text-weak">{p.order_id?.slice(-12) || '—'}</td>
                          <td>
                            <span className="text-strong text-xs">{p.subscription?.plan_name || '—'}</span>
                            {p.subscription?.duration_months && (
                              <span className="text-weak text-[11px] ml-1">({p.subscription.duration_months} tháng)</span>
                            )}
                          </td>
                          <td>
                            <span className="badge-slate capitalize">{p.provider}</span>
                          </td>
                          <td className="text-right font-medium text-strong">{formatMoney(p.amount)}</td>
                          <td><span className={ps.cls}>{ps.label}</span></td>
                          <td className="text-weak">{formatDate(p.paid_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SubscriptionPage;
