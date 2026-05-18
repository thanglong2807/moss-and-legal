import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Users, Calendar, RefreshCw, ArrowRight } from 'lucide-react';
import axios from 'axios';

const API = '/api/v1/tenant';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('mosslegal_access_token')}`,
});

const formatMoney = (v) => new Intl.NumberFormat('vi-VN').format(v) + '₫';
const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const statusLabel = {
  active: { text: 'Đang hoạt động', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  pending: { text: 'Chờ kích hoạt', cls: 'bg-amber-100 text-amber-700' },
  expired: { text: 'Hết hạn', cls: 'bg-slate-100 text-slate-500' },
  cancelled: { text: 'Đã huỷ', cls: 'bg-red-100 text-red-600' },
  none: { text: 'Chưa có gói', cls: 'bg-slate-100 text-slate-500' },
};

const SubscriptionPage = () => {
  const navigate = useNavigate();
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
      setHistory(hr.data);
    } catch {
      // ignore — likely no subscription yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-page">
        <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  const status = sub?.status || 'none';
  const st = statusLabel[status] || statusLabel.none;
  const usagePercent = sub?.max_users && sub.max_users !== -1
    ? Math.min(100, Math.round((sub.user_count / sub.max_users) * 100))
    : null;

  return (
    <div className="flex-1 flex flex-col bg-page overflow-auto">
      <div className="px-6 py-6 max-w-4xl mx-auto w-full space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-strong">Gói đăng ký</h1>
          <button onClick={load} className="p-1.5 text-weak hover:text-orange-600 transition"><RefreshCw size={14} /></button>
        </div>

        {/* Current subscription card */}
        <div className="border border-base rounded-2xl p-5 bg-surface">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs text-weak uppercase tracking-wider mb-1">Gói hiện tại</div>
              <div className="text-lg font-bold text-strong">{sub?.plan?.name || '—'}</div>
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>{st.text}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-weak text-[10px] uppercase tracking-wide"><Users size={11} />Người dùng</div>
              <div className="text-sm font-semibold text-strong">
                {sub?.user_count ?? 0} / {sub?.max_users === -1 ? '∞' : (sub?.max_users ?? 0)}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-weak text-[10px] uppercase tracking-wide"><Calendar size={11} />Bắt đầu</div>
              <div className="text-sm font-semibold text-strong">{formatDate(sub?.start_date)}</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-weak text-[10px] uppercase tracking-wide"><Calendar size={11} />Hết hạn</div>
              <div className="text-sm font-semibold text-strong">{formatDate(sub?.end_date)}</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-weak text-[10px] uppercase tracking-wide"><CreditCard size={11} />Còn lại</div>
              <div className={`text-sm font-semibold ${sub?.days_left <= 14 ? 'text-amber-600' : 'text-strong'}`}>
                {sub?.days_left != null ? `${sub.days_left} ngày` : '—'}
              </div>
            </div>
          </div>

          {usagePercent !== null && (
            <div>
              <div className="flex justify-between text-[10px] text-weak mb-1">
                <span>Sử dụng</span>
                <span>{usagePercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-page rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${usagePercent}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Upgrade button */}
        <button onClick={() => navigate('/payment')}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm rounded-xl hover:bg-orange-700 transition font-medium">
          <CreditCard size={15} />
          {status === 'active' ? 'Gia hạn / Nâng cấp gói' : 'Đăng ký ngay'}
          <ArrowRight size={14} />
        </button>

        {/* Payment history */}
        {history.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-strong mb-3 uppercase tracking-wider">Lịch sử thanh toán</h2>
            <div className="border border-base rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-page">
                  <tr className="border-b border-base text-weak">
                    <th className="text-left py-2 px-4">Mã đơn</th>
                    <th className="text-left py-2 px-4">Gói</th>
                    <th className="text-left py-2 px-4">Cổng TT</th>
                    <th className="text-left py-2 px-4">Số tiền</th>
                    <th className="text-left py-2 px-4">Trạng thái</th>
                    <th className="text-left py-2 px-4">Ngày TT</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(p => (
                    <tr key={p.id} className="border-b border-base/50 hover:bg-page/50 transition">
                      <td className="py-2 px-4 font-mono text-weak">{p.order_id}</td>
                      <td className="py-2 px-4">{p.subscription?.plan_name || '—'} ({p.subscription?.duration_months}t)</td>
                      <td className="py-2 px-4 capitalize">{p.provider}</td>
                      <td className="py-2 px-4 font-semibold">{formatMoney(p.amount)}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                          p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-600'
                        }`}>{p.status}</span>
                      </td>
                      <td className="py-2 px-4">{formatDate(p.paid_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;
