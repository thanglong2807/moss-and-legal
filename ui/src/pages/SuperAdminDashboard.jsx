import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, RefreshCw, Trash2, Edit2, Check, X, Settings, BarChart3,
  TrendingUp, Users, Building2, CreditCard, Activity, UserPlus,
  Eye, EyeOff, Lock, Unlock, Copy, Search, Filter, ChevronLeft,
  ChevronRight, Shield, Server, Mail, Zap, AlertCircle, CheckCircle,
  ClipboardList, Globe
} from 'lucide-react';
import axios from 'axios';

const API = '/api/v1/super-admin';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('mosslegal_access_token')}`,
});

const formatMoney = (v) => new Intl.NumberFormat('vi-VN').format(v || 0) + '₫';
const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';

// ── Generic confirm dialog ────────────────────────────────────────────────────
const Confirm = ({ msg, onOk, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
    <div className="bg-surface rounded-xl shadow-xl p-6 max-w-sm mx-4 w-full" onClick={e => e.stopPropagation()}>
      <p className="text-sm text-strong mb-5">{msg}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="btn-ghost border border-base">Huỷ</button>
        <button onClick={onOk} className="px-4 py-1.5 text-xs rounded-xl bg-red-600 text-white hover:bg-red-700 transition">Xác nhận</button>
      </div>
    </div>
  </div>
);

// ── Tenant Admin Modal ────────────────────────────────────────────────────────
const TenantAdminModal = ({ tenant, onClose }) => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ display_name: '', email: '', password: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(null);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/tenants/${tenant.id}/admins`, { headers: authHeaders() });
      setAdmins(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErr(e.response?.data?.detail || 'Lỗi tải danh sách admin');
      setAdmins([]);
    } finally { setLoading(false); }
  }, [tenant.id]);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  const createAdmin = async () => {
    if (!form.display_name || !form.email || !form.password) {
      setErr('Vui lòng điền đầy đủ họ tên, email và mật khẩu'); return;
    }
    if (form.password.length < 6) { setErr('Mật khẩu tối thiểu 6 ký tự'); return; }
    setSaving(true); setErr('');
    try {
      await axios.post(`${API}/tenants/${tenant.id}/admins`, form, { headers: authHeaders() });
      setForm({ display_name: '', email: '', password: '', phone: '' });
      setShowForm(false);
      loadAdmins();
    } catch (e) {
      setErr(e.response?.data?.detail || 'Lỗi tạo tài khoản');
    } finally { setSaving(false); }
  };

  const deleteAdmin = async (userId) => {
    await axios.delete(`${API}/tenants/${tenant.id}/admins/${userId}`, { headers: authHeaders() });
    setConfirm(null);
    loadAdmins();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-base shrink-0">
          <div>
            <div className="text-sm font-semibold text-strong">Tài khoản Admin</div>
            <div className="text-xs text-weak mt-0.5">{tenant.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowForm(!showForm); setErr(''); }} className="btn-primary">
              <UserPlus size={12} /> Thêm Admin
            </button>
            <button onClick={onClose} className="btn-icon"><X size={16} /></button>
          </div>
        </div>

        {showForm && (
          <div className="px-5 py-4 border-b border-base bg-page/50 shrink-0">
            <div className="text-xs font-semibold text-strong mb-3">Tạo tài khoản Admin mới</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="section-label">Họ và tên *</label>
                <input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                  placeholder="Nguyễn Văn A" className="input-base" />
              </div>
              <div>
                <label className="section-label">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="admin@congty.vn" className="input-base" />
              </div>
              <div>
                <label className="section-label">Số điện thoại</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="0901234567" className="input-base" />
              </div>
              <div className="col-span-2">
                <label className="section-label">Mật khẩu * (tối thiểu 6 ký tự)</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Mật khẩu đăng nhập"
                    className="input-base pr-9" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-weak hover:text-body">
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>
            {err && <div className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-1.5">{err}</div>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setShowForm(false); setErr(''); }} className="flex-1 py-1.5 border border-base text-xs rounded-xl text-body hover:bg-page transition">Huỷ</button>
              <button onClick={createAdmin} disabled={saving}
                className="flex-1 py-1.5 bg-orange-600 text-white text-xs rounded-xl hover:bg-orange-700 transition disabled:opacity-50">
                {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-8"><div className="spinner" /></div>
          ) : admins.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Users size={22} /></div>
              <div className="text-xs text-weak">Chưa có tài khoản admin nào</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>SĐT</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {admins.map(u => (
                  <tr key={u.id}>
                    <td className="font-medium text-strong">{u.display_name}</td>
                    <td className="text-weak">{u.email || '—'}</td>
                    <td className="text-weak">{u.phone || '—'}</td>
                    <td>
                      <span className={u.is_active ? 'badge-green' : 'badge-slate'}>
                        {u.is_active ? 'Hoạt động' : 'Khoá'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => setConfirm(u)} className="btn-icon hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {confirm && (
        <Confirm
          msg={`Xoá tài khoản "${confirm.display_name}" (${confirm.email})? Thao tác không thể hoàn tác.`}
          onOk={() => deleteAdmin(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
};

// ── Tenant Settings Modal ─────────────────────────────────────────────────────
const MODULE_LABELS = {
  hkd: 'Hộ kinh doanh',
  company: 'Thành lập DN',
  customers: 'Khách hàng',
  ocr: 'OCR / Nhận dạng',
  export: 'Xuất văn bản',
};

const TenantSettingsModal = ({ tenant, onClose }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    axios.get(`${API}/tenants/${tenant.id}/settings`, { headers: authHeaders() })
      .then(r => setSettings(r.data))
      .finally(() => setLoading(false));
  }, [tenant.id]);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await axios.put(`${API}/tenants/${tenant.id}/settings`, settings, { headers: authHeaders() });
      setMsg('Đã lưu cài đặt!');
    } catch { setMsg('Lỗi khi lưu.'); }
    finally { setSaving(false); }
  };

  const toggleModule = (key) =>
    setSettings(s => ({ ...s, modules: { ...s.modules, [key]: !s.modules[key] } }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-base">
          <div>
            <div className="text-sm font-semibold text-strong">Cài đặt tenant</div>
            <div className="text-xs text-weak mt-0.5">{tenant.name}</div>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={16} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><div className="spinner" /></div>
        ) : settings && (
          <div className="p-5 space-y-5">
            <div>
              <span className="section-label">Các module được bật</span>
              <div className="space-y-2">
                {Object.entries(MODULE_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-strong group-hover:text-orange-600 transition-colors">{label}</span>
                    <button onClick={() => toggleModule(key)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${settings.modules?.[key] ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.modules?.[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="section-label">Giới hạn user (ghi đè gói — để trống = dùng giới hạn của gói)</label>
              <input type="number" placeholder="Để trống = dùng giới hạn gói"
                value={settings.max_users_override ?? ''}
                onChange={e => setSettings(s => ({ ...s, max_users_override: e.target.value ? Number(e.target.value) : null }))}
                className="input-base" />
            </div>

            <div>
              <label className="section-label">Email nhận thông báo gia hạn</label>
              <input type="email" placeholder={tenant.contact_email}
                value={settings.billing_email || ''}
                onChange={e => setSettings(s => ({ ...s, billing_email: e.target.value }))}
                className="input-base" />
            </div>

            <div>
              <label className="section-label">Ghi chú nội bộ</label>
              <textarea rows={3} placeholder="Ghi chú về khách hàng này..."
                value={settings.notes || ''}
                onChange={e => setSettings(s => ({ ...s, notes: e.target.value }))}
                className="input-base resize-none" />
            </div>

            {msg && (
              <div className={`text-xs px-3 py-2 rounded-xl ${msg.includes('Lỗi') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                {msg}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2 border border-base text-xs rounded-xl text-body hover:bg-page transition">Đóng</button>
              <button onClick={save} disabled={saving}
                className="flex-1 py-2 bg-orange-600 text-white text-xs rounded-xl hover:bg-orange-700 transition disabled:opacity-50">
                {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'orange' }) => {
  const colors = {
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20',
    blue:   'bg-blue-50 text-blue-600 dark:bg-blue-900/20',
    emerald:'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20',
  };
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-xl ${colors[color]}`}><Icon size={18} /></div>
      <div className="flex-1 min-w-0">
        <div className="section-label">{label}</div>
        <div className="text-xl font-bold text-strong truncate">{value}</div>
        {sub && <div className="text-[11px] text-weak mt-0.5">{sub}</div>}
      </div>
    </div>
  );
};

// ── Toggle switch ─────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }) => (
  <button type="button" onClick={onChange}
    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
  </button>
);

// ── Report tab ────────────────────────────────────────────────────────────────
const ReportTab = () => {
  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [tenantDetail, setTenantDetail] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, mo, td] = await Promise.all([
        axios.get(`${API}/reports/overview`, { headers: authHeaders() }),
        axios.get(`${API}/reports/monthly-revenue`, { headers: authHeaders() }),
        axios.get(`${API}/reports/tenants-detail`, { headers: authHeaders() }),
      ]);
      setOverview(ov.data);
      setMonthly(mo.data);
      setTenantDetail(td.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex justify-center py-16"><div className="spinner w-8 h-8" /></div>
  );

  const maxRevenue = monthly.length ? Math.max(...monthly.map(m => m.revenue), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-strong">Tổng quan hệ thống</h2>
        <button onClick={load} className="btn-icon"><RefreshCw size={14} /></button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Tổng doanh thu" value={formatMoney(overview?.revenue?.total || 0)}
          sub={`Tháng này: ${formatMoney(overview?.revenue?.this_month || 0)}`} color="orange" />
        <StatCard icon={Building2} label="Tenants" value={overview?.tenants?.total || 0}
          sub={`Hoạt động: ${overview?.tenants?.active || 0} · Mới tháng này: ${overview?.tenants?.new_this_month || 0}`} color="blue" />
        <StatCard icon={CreditCard} label="Gói đang chạy" value={overview?.subscriptions?.active || 0}
          sub={`Hết hạn: ${overview?.subscriptions?.expired || 0}`} color="emerald" />
        <StatCard icon={Activity} label="Tỷ lệ TT thành công" value={`${overview?.payments?.success_rate_30d || 0}%`}
          sub={`30 ngày: ${overview?.payments?.success_30d || 0}/${overview?.payments?.total_30d || 0} giao dịch`} color="purple" />
      </div>

      {overview?.subscriptions?.by_plan?.length > 0 && (
        <div className="card p-4">
          <div className="text-xs font-semibold text-strong mb-3">Gói đang active theo loại</div>
          <div className="flex gap-4 flex-wrap">
            {overview.subscriptions.by_plan.map(p => (
              <div key={p.plan} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm text-strong font-medium">{p.count}</span>
                <span className="text-xs text-weak">{p.plan}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {monthly.length > 0 && (
        <div className="card p-4">
          <div className="text-xs font-semibold text-strong mb-4">Doanh thu theo tháng (12 tháng gần nhất)</div>
          <div className="flex items-end gap-2 h-32">
            {monthly.map(m => {
              const pct = Math.max(4, Math.round((m.revenue / maxRevenue) * 100));
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {formatMoney(m.revenue)}
                  </div>
                  <div className="w-full bg-orange-500 rounded-t-sm transition-all hover:bg-orange-400" style={{ height: `${pct}%` }} />
                  <span className="text-[9px] text-weak">{m.month.slice(5)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tháng</th>
                  <th className="text-right">Doanh thu</th>
                  <th className="text-right">Giao dịch</th>
                </tr>
              </thead>
              <tbody>
                {[...monthly].reverse().map(m => (
                  <tr key={m.month}>
                    <td className="text-strong">{m.month}</td>
                    <td className="text-right font-semibold text-orange-600">{formatMoney(m.revenue)}</td>
                    <td className="text-right text-weak">{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-base">
          <div className="text-xs font-semibold text-strong">Chi tiết từng tenant</div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Gói</th>
                <th className="text-center">Users</th>
                <th>Hết hạn</th>
                <th className="text-right">Tổng đã TT</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {tenantDetail.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="font-medium text-strong">{t.name}</div>
                    <div className="text-[10px] text-weak font-mono">{t.slug}</div>
                  </td>
                  <td>{t.plan_name || <span className="italic text-weak">Chưa có</span>}</td>
                  <td className="text-center">{t.user_count}</td>
                  <td>{formatDate(t.sub_end)}</td>
                  <td className="text-right font-semibold text-orange-600">{formatMoney(t.total_revenue)}</td>
                  <td>
                    <span className={
                      t.sub_status === 'active' ? 'badge-green' :
                      t.sub_status === 'none' ? 'badge-slate' : 'badge-amber'
                    }>{t.sub_status}</span>
                  </td>
                </tr>
              ))}
              {tenantDetail.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-weak italic">Chưa có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── Tenant tab ────────────────────────────────────────────────────────────────
const TenantTab = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [settingsTenant, setSettingsTenant] = useState(null);
  const [adminTenant, setAdminTenant] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', contact_email: '', contact_phone: '', address: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/tenants`, { headers: authHeaders() });
      setTenants(r.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', contact_email: '', contact_phone: '', address: '' });
    setShowForm(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({ name: t.name, slug: t.slug, contact_email: t.contact_email, contact_phone: t.contact_phone || '', address: t.address || '' });
    setShowForm(true);
  };

  const save = async () => {
    if (editing) {
      await axios.put(`${API}/tenants/${editing.id}`, form, { headers: authHeaders() });
    } else {
      await axios.post(`${API}/tenants`, form, { headers: authHeaders() });
    }
    setShowForm(false);
    load();
  };

  const del = async (id) => {
    await axios.delete(`${API}/tenants/${id}`, { headers: authHeaders() });
    setConfirm(null);
    load();
  };

  const toggleActive = async (t) => {
    await axios.put(`${API}/tenants/${t.id}`, { is_active: !t.is_active }, { headers: authHeaders() });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-strong">Danh sách Tenant</h2>
        <div className="flex gap-2">
          <button onClick={load} className="btn-icon"><RefreshCw size={14} /></button>
          <button onClick={openCreate} className="btn-primary"><Plus size={13} /> Thêm tenant</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="spinner" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên</th>
                  <th>Slug</th>
                  <th>Email</th>
                  <th>SĐT</th>
                  <th>Gói HĐ</th>
                  <th>Hết hạn</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id}>
                    <td className="text-weak">{t.id}</td>
                    <td className="font-medium text-strong">{t.name}</td>
                    <td className="font-mono text-weak text-[11px]">{t.slug}</td>
                    <td>{t.contact_email}</td>
                    <td className="text-weak">{t.contact_phone || '—'}</td>
                    <td>{t.subscription?.plan_name || <span className="text-weak italic">Chưa có</span>}</td>
                    <td>{formatDate(t.subscription?.end_date)}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Toggle checked={t.is_active} onChange={() => toggleActive(t)} />
                        <span className={t.is_active ? 'badge-green' : 'badge-slate'}>
                          {t.is_active ? 'Hoạt động' : 'Tắt'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-0.5">
                        <button onClick={() => setAdminTenant(t)} title="Tài khoản Admin" className="btn-icon hover:text-purple-600"><UserPlus size={13} /></button>
                        <button onClick={() => setSettingsTenant(t)} title="Cài đặt" className="btn-icon hover:text-blue-600"><Settings size={13} /></button>
                        <button onClick={() => openEdit(t)} title="Sửa" className="btn-icon hover:text-orange-600"><Edit2 size={13} /></button>
                        <button onClick={() => setConfirm({ id: t.id, name: t.name })} title="Xoá" className="btn-icon hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-weak italic">Chưa có tenant nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl p-6 max-w-md mx-4 w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-strong">{editing ? 'Sửa tenant' : 'Thêm tenant mới'}</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon"><X size={15} /></button>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Tên công ty', key: 'name' },
                { label: 'Slug (URL)', key: 'slug', disabled: !!editing },
                { label: 'Email liên hệ', key: 'contact_email' },
                { label: 'Số điện thoại', key: 'contact_phone' },
                { label: 'Địa chỉ', key: 'address' },
              ].map(f => (
                <div key={f.key}>
                  <label className="section-label">{f.label}</label>
                  <input value={form[f.key]} disabled={f.disabled}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="input-base disabled:opacity-50" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setShowForm(false)} className="btn-ghost border border-base">Huỷ</button>
              <button onClick={save} className="btn-primary">Lưu</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <Confirm
          msg={`Xoá tenant "${confirm.name}"? Thao tác này không thể hoàn tác.`}
          onOk={() => del(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {settingsTenant && <TenantSettingsModal tenant={settingsTenant} onClose={() => setSettingsTenant(null)} />}
      {adminTenant && <TenantAdminModal tenant={adminTenant} onClose={() => setAdminTenant(null)} />}
    </div>
  );
};

// ── Users tab ─────────────────────────────────────────────────────────────────
const UserTab = () => {
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;
  const [resetModal, setResetModal] = useState(null); // { user, newPassword }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: page * LIMIT,
        limit: LIMIT,
      });
      if (search) params.set('search', search);
      if (tenantFilter) params.set('tenant_id', tenantFilter);
      if (activeFilter !== 'all') params.set('is_active', activeFilter === 'active');

      const [ur, tr] = await Promise.all([
        axios.get(`${API}/users?${params}`, { headers: authHeaders() }),
        tenants.length === 0 ? axios.get(`${API}/tenants`, { headers: authHeaders() }) : Promise.resolve({ data: tenants }),
      ]);
      if (Array.isArray(ur.data)) {
        setUsers(ur.data);
        setTotal(ur.data.length < LIMIT ? page * LIMIT + ur.data.length : (page + 2) * LIMIT);
      } else {
        setUsers(ur.data.items || []);
        setTotal(ur.data.total || 0);
      }
      if (tenants.length === 0) setTenants(tr.data);
    } finally { setLoading(false); }
  }, [page, search, tenantFilter, activeFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (u) => {
    await axios.put(`${API}/users/${u.id}/toggle-active`, {}, { headers: authHeaders() });
    load();
  };

  const resetPassword = async (u) => {
    try {
      const r = await axios.put(`${API}/users/${u.id}/reset-password`, {}, { headers: authHeaders() });
      setResetModal({ user: u, newPassword: r.data.new_password || r.data.password || r.data });
    } catch (e) {
      alert(e.response?.data?.detail || 'Lỗi reset mật khẩu');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-strong">Người dùng</h2>
        <button onClick={load} className="btn-icon"><RefreshCw size={14} /></button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-weak" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Tìm theo tên, email..." className="input-base pl-8" />
        </div>
        <select value={tenantFilter} onChange={e => { setTenantFilter(e.target.value); setPage(0); }}
          className="input-base w-auto min-w-40">
          <option value="">Tất cả tenant</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="flex rounded-xl border border-base overflow-hidden">
          {[
            { val: 'all', label: 'Tất cả' },
            { val: 'active', label: 'Hoạt động' },
            { val: 'inactive', label: 'Khoá' },
          ].map(f => (
            <button key={f.val} onClick={() => { setActiveFilter(f.val); setPage(0); }}
              className={`px-3 py-2 text-xs transition ${activeFilter === f.val ? 'bg-orange-600 text-white' : 'text-body hover:bg-page'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><div className="spinner" /></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>SĐT</th>
                  <th>Tenant</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Tạo lúc</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="text-weak">{u.id}</td>
                    <td className="font-medium text-strong">{u.display_name || u.username}</td>
                    <td>{u.email}</td>
                    <td className="text-weak">{u.phone || '—'}</td>
                    <td>{u.tenant?.name || u.tenant_id || '—'}</td>
                    <td>
                      <span className="badge-blue">{u.role || '—'}</span>
                    </td>
                    <td>
                      <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                        {u.is_active ? 'Hoạt động' : 'Khoá'}
                      </span>
                    </td>
                    <td className="text-weak">{formatDate(u.created_at)}</td>
                    <td>
                      <div className="flex gap-0.5">
                        <button onClick={() => toggleActive(u)}
                          title={u.is_active ? 'Khoá tài khoản' : 'Mở khoá'}
                          className={`btn-icon ${u.is_active ? 'hover:text-amber-500' : 'hover:text-emerald-500'}`}>
                          {u.is_active ? <Lock size={13} /> : <Unlock size={13} />}
                        </button>
                        <button onClick={() => resetPassword(u)} title="Reset mật khẩu"
                          className="btn-icon hover:text-blue-500">
                          <RefreshCw size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-weak italic">Không có người dùng nào</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-base">
            <span className="text-xs text-weak">
              Trang {page + 1} / {totalPages} &nbsp;·&nbsp; {total} người dùng
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="btn-icon disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="btn-icon disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset password modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setResetModal(null)}>
          <div className="bg-surface rounded-2xl shadow-2xl p-6 max-w-sm mx-4 w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-strong">Mật khẩu mới</div>
              <button onClick={() => setResetModal(null)} className="btn-icon"><X size={15} /></button>
            </div>
            <div className="text-xs text-weak mb-3">
              Mật khẩu đã được reset cho <span className="text-strong font-medium">{resetModal.user.email}</span>
            </div>
            <div className="flex items-center gap-2 bg-page rounded-xl px-3 py-2.5 border border-base">
              <code className="flex-1 text-sm text-strong font-mono break-all">{resetModal.newPassword}</code>
              <button onClick={() => navigator.clipboard.writeText(resetModal.newPassword)}
                className="btn-icon shrink-0 hover:text-orange-600">
                <Copy size={14} />
              </button>
            </div>
            <p className="text-[11px] text-amber-600 mt-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
              Hãy gửi mật khẩu này cho người dùng. Họ nên đổi lại sau khi đăng nhập.
            </p>
            <button onClick={() => setResetModal(null)} className="btn-primary w-full mt-4 justify-center">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Plan tab ──────────────────────────────────────────────────────────────────
const PlanTab = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { name: '', max_users: 5, price_3m: 0, price_9m: 0, price_12m: 0, price_24m: 0, price_36m: 0 };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/plans`, { headers: authHeaders() });
      setPlans(r.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...p }); setShowForm(true); };

  const save = async () => {
    const payload = { ...form, max_users: Number(form.max_users) };
    ['price_3m', 'price_9m', 'price_12m', 'price_24m', 'price_36m'].forEach(k => { payload[k] = Number(form[k]); });
    if (editing) {
      await axios.put(`${API}/plans/${editing.id}`, payload, { headers: authHeaders() });
    } else {
      await axios.post(`${API}/plans`, payload, { headers: authHeaders() });
    }
    setShowForm(false);
    load();
  };

  const durations = [
    { key: 'price_3m', label: '3 tháng' },
    { key: 'price_9m', label: '9 tháng' },
    { key: 'price_12m', label: '12 tháng' },
    { key: 'price_24m', label: '24 tháng' },
    { key: 'price_36m', label: '36 tháng' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-strong">Gói dịch vụ</h2>
        <div className="flex gap-2">
          <button onClick={load} className="btn-icon"><RefreshCw size={14} /></button>
          <button onClick={openCreate} className="btn-primary"><Plus size={13} /> Thêm gói</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex justify-center py-10"><div className="spinner" /></div>
        ) : plans.map(p => (
          <div key={p.id} className="card p-4 hover:border-orange-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-strong text-sm">{p.name}</div>
                <div className="text-xs text-weak mt-0.5">{p.max_users === -1 ? 'Không giới hạn' : `${p.max_users} user`}</div>
              </div>
              <button onClick={() => openEdit(p)} className="btn-icon hover:text-orange-600"><Edit2 size={13} /></button>
            </div>
            <div className="space-y-1.5 mt-3">
              {durations.map(d => (
                <div key={d.key} className="flex justify-between text-xs">
                  <span className="text-weak">{d.label}</span>
                  <span className="text-strong font-medium">{formatMoney(p[d.key])}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!loading && plans.length === 0 && (
          <div className="col-span-3 empty-state">
            <div className="empty-state-icon"><CreditCard size={22} /></div>
            <div className="text-xs text-weak">Chưa có gói dịch vụ nào</div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl p-6 max-w-md mx-4 w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-strong">{editing ? 'Sửa gói' : 'Thêm gói mới'}</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon"><X size={15} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="section-label">Tên gói</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="section-label">Giới hạn user (-1 = không giới hạn)</label>
                <input type="number" value={form.max_users} onChange={e => setForm(p => ({ ...p, max_users: e.target.value }))} className="input-base" />
              </div>
              {durations.map(d => (
                <div key={d.key}>
                  <label className="section-label">Giá {d.label} (VND)</label>
                  <input type="number" value={form[d.key]} onChange={e => setForm(p => ({ ...p, [d.key]: e.target.value }))} className="input-base" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setShowForm(false)} className="btn-ghost border border-base">Huỷ</button>
              <button onClick={save} className="btn-primary">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Subscription tab ──────────────────────────────────────────────────────────
const DURATION_KEY = { 3: 'price_3m', 9: 'price_9m', 12: 'price_12m', 24: 'price_24m', 36: 'price_36m' };

const SubscriptionTab = () => {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const emptyForm = { tenant_id: '', plan_id: '', duration_months: 12, amount_paid: 0, activate_now: true };
  const [form, setForm] = useState(emptyForm);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, tr, pr] = await Promise.all([
        axios.get(`${API}/subscriptions`, { headers: authHeaders() }),
        axios.get(`${API}/tenants`, { headers: authHeaders() }),
        axios.get(`${API}/plans`, { headers: authHeaders() }),
      ]);
      setSubs(sr.data);
      setTenants(tr.data);
      setPlans(pr.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateForm = (patch) => {
    setForm(prev => {
      const next = { ...prev, ...patch };
      const plan = plans.find(p => String(p.id) === String(next.plan_id));
      if (plan) {
        const key = DURATION_KEY[Number(next.duration_months)];
        next.amount_paid = plan[key] ?? 0;
      }
      return next;
    });
  };

  const create = async () => {
    if (!form.tenant_id || !form.plan_id) { setErr('Vui lòng chọn tenant và gói'); return; }
    setSaving(true); setErr('');
    try {
      const res = await axios.post(`${API}/subscriptions`, {
        tenant_id: Number(form.tenant_id),
        plan_id: Number(form.plan_id),
        duration_months: Number(form.duration_months),
        amount_paid: Number(form.amount_paid),
      }, { headers: authHeaders() });
      if (form.activate_now) {
        await axios.put(`${API}/subscriptions/${res.data.id}/activate`, {}, { headers: authHeaders() });
      }
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      setErr(e.response?.data?.detail || 'Lỗi khi cấp subscription');
    } finally { setSaving(false); }
  };

  const activate = async (id) => {
    await axios.put(`${API}/subscriptions/${id}/activate`, {}, { headers: authHeaders() });
    load();
  };

  const cancel = async (id) => {
    await axios.put(`${API}/subscriptions/${id}/cancel`, {}, { headers: authHeaders() });
    setConfirm(null);
    load();
  };

  const statusBadge = {
    active: 'badge-green',
    pending: 'badge-amber',
    expired: 'badge-slate',
    cancelled: 'badge-red',
  };
  const statusLabel = { active: 'Đang chạy', pending: 'Chờ KH', expired: 'Hết hạn', cancelled: 'Đã huỷ' };

  const selectedPlan = plans.find(p => String(p.id) === String(form.plan_id));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-strong">Subscriptions</h2>
          <p className="text-[11px] text-weak mt-0.5">Cấp và quản lý gói dịch vụ thủ công</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-icon"><RefreshCw size={14} /></button>
          <button onClick={() => { setShowForm(true); setErr(''); setForm(emptyForm); }} className="btn-primary">
            <Plus size={13} /> Cấp thủ công
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tenant</th>
                <th>Gói</th>
                <th>Thời hạn</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th className="text-right">Số tiền</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-8 text-center"><div className="spinner mx-auto" /></td></tr>
              ) : subs.map(s => (
                <tr key={s.id}>
                  <td className="text-weak">{s.id}</td>
                  <td className="font-medium text-strong">{s.tenant?.name || s.tenant_id}</td>
                  <td>{s.plan?.name || s.plan_id}</td>
                  <td>{s.duration_months} tháng</td>
                  <td className="text-weak">{formatDate(s.start_date)}</td>
                  <td className="text-weak">{formatDate(s.end_date)}</td>
                  <td className="text-right font-medium text-orange-600">{formatMoney(s.amount_paid)}</td>
                  <td>
                    <span className={statusBadge[s.status] || 'badge-slate'}>
                      {statusLabel[s.status] || s.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {s.status !== 'active' && (
                        <button onClick={() => activate(s.id)}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition font-medium border border-emerald-200">
                          <Check size={11} /> Kích hoạt
                        </button>
                      )}
                      {s.status === 'active' && (
                        <button onClick={() => setConfirm(s)} className="btn-icon hover:text-red-500"><X size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && subs.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-weak italic">Chưa có subscription nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-base">
              <div>
                <div className="text-sm font-semibold text-strong">Cấp gói thủ công</div>
                <div className="text-[11px] text-weak mt-0.5">Không qua thanh toán online</div>
              </div>
              <button onClick={() => setShowForm(false)} className="btn-icon"><X size={15} /></button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="section-label">Tenant *</label>
                <select value={form.tenant_id} onChange={e => updateForm({ tenant_id: e.target.value })} className="input-base">
                  <option value="">-- Chọn tenant --</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="section-label">Gói dịch vụ *</label>
                <select value={form.plan_id} onChange={e => updateForm({ plan_id: e.target.value })} className="input-base">
                  <option value="">-- Chọn gói --</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.max_users === -1 ? 'không giới hạn user' : `${p.max_users} user`})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="section-label">Thời hạn</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[3, 9, 12, 24, 36].map(m => (
                    <button key={m} type="button" onClick={() => updateForm({ duration_months: m })}
                      className={`py-2 text-xs rounded-xl border transition font-medium ${
                        Number(form.duration_months) === m
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'border-base text-body hover:border-orange-400 hover:text-orange-600'
                      }`}>
                      {m}T
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="section-label mb-0">Số tiền đã thu (VND)</label>
                  {selectedPlan && (
                    <span className="text-[10px] text-orange-600 font-medium">
                      Giá niêm yết: {formatMoney(selectedPlan[DURATION_KEY[Number(form.duration_months)]] ?? 0)}
                    </span>
                  )}
                </div>
                <input type="number" value={form.amount_paid}
                  onChange={e => setForm(p => ({ ...p, amount_paid: e.target.value }))}
                  className="input-base" />
                <div className="text-[10px] text-weak mt-1">Có thể sửa nếu thu khác giá niêm yết</div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-xl bg-page border border-base hover:border-orange-300 transition">
                <Toggle checked={form.activate_now} onChange={() => setForm(p => ({ ...p, activate_now: !p.activate_now }))} />
                <div>
                  <div className="text-xs font-medium text-strong">Kích hoạt ngay lập tức</div>
                  <div className="text-[10px] text-weak">{form.activate_now ? 'Gói sẽ active ngay sau khi cấp' : 'Cấp ở trạng thái pending, kích hoạt sau'}</div>
                </div>
              </label>

              {err && <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{err}</div>}
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-base text-xs rounded-xl text-body hover:bg-page transition">Huỷ</button>
              <button onClick={create} disabled={saving}
                className="flex-1 py-2 bg-orange-600 text-white text-xs rounded-xl hover:bg-orange-700 transition disabled:opacity-50 font-medium">
                {saving ? 'Đang xử lý...' : form.activate_now ? 'Cấp & Kích hoạt' : 'Cấp (pending)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <Confirm
          msg={`Huỷ subscription của "${confirm.tenant?.name}"? Tenant sẽ mất quyền truy cập ngay lập tức.`}
          onOk={() => cancel(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
};

// ── Audit Log tab ─────────────────────────────────────────────────────────────
const ACTION_COLORS = {
  CREATE: 'badge-green',
  UPDATE: 'badge-blue',
  DELETE: 'badge-red',
  LOGIN:  'badge-purple',
  EXPORT: 'badge-amber',
};

const AuditTab = () => {
  const [logs, setLogs] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tenantFilter, setTenantFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page + 1, limit: LIMIT });
      if (tenantFilter) params.set('tenant_id', tenantFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (resourceFilter) params.set('resource', resourceFilter);

      const [lr, tr] = await Promise.all([
        axios.get(`/api/v1/audit/super-admin?${params}`, { headers: authHeaders() }),
        tenants.length === 0 ? axios.get(`${API}/tenants`, { headers: authHeaders() }) : Promise.resolve({ data: tenants }),
      ]);
      if (Array.isArray(lr.data)) {
        setLogs(lr.data);
        setTotal(lr.data.length < LIMIT ? page * LIMIT + lr.data.length : (page + 2) * LIMIT);
      } else {
        setLogs(lr.data.items || lr.data.logs || []);
        setTotal(lr.data.total || 0);
      }
      if (tenants.length === 0) setTenants(tr.data);
    } finally { setLoading(false); }
  }, [page, tenantFilter, actionFilter, resourceFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-strong">Audit Log</h2>
        <button onClick={load} className="btn-icon"><RefreshCw size={14} /></button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={tenantFilter} onChange={e => { setTenantFilter(e.target.value); setPage(0); }} className="input-base w-auto min-w-40">
          <option value="">Tất cả tenant</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0); }} className="input-base w-auto min-w-36">
          <option value="">Mọi hành động</option>
          {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input value={resourceFilter} onChange={e => { setResourceFilter(e.target.value); setPage(0); }}
          placeholder="Lọc resource..." className="input-base min-w-36 w-auto" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><div className="spinner" /></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Tenant</th>
                  <th>User ID</th>
                  <th>Hành động</th>
                  <th>Resource</th>
                  <th>Resource ID</th>
                  <th>Chi tiết</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={l.id || i}>
                    <td className="text-weak whitespace-nowrap">{formatDateTime(l.created_at || l.timestamp)}</td>
                    <td className="text-strong font-medium">{l.tenant_name || l.tenant_id || '—'}</td>
                    <td className="text-weak">{l.user_id || '—'}</td>
                    <td>
                      <span className={ACTION_COLORS[l.action] || 'badge-slate'}>{l.action}</span>
                    </td>
                    <td className="font-mono text-[11px]">{l.resource_type || l.resource || '—'}</td>
                    <td className="text-weak">{l.resource_id || '—'}</td>
                    <td className="text-weak max-w-[200px] truncate" title={l.detail || l.description}>
                      {l.detail || l.description || '—'}
                    </td>
                    <td className="text-weak font-mono text-[11px]">{l.ip_address || l.ip || '—'}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-weak italic">Không có log nào</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-base">
            <span className="text-xs text-weak">Trang {page + 1} / {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="btn-icon disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="btn-icon disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── System tab ────────────────────────────────────────────────────────────────
const SystemTab = () => {
  const [info, setInfo] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ir, er] = await Promise.all([
        axios.get(`${API}/system/info`, { headers: authHeaders() }),
        axios.get(`${API}/system/expiring-soon?days=14`, { headers: authHeaders() }),
      ]);
      setInfo(ir.data);
      setExpiring(er.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendTestEmail = async () => {
    if (!testEmail) return;
    setTestLoading(true); setTestResult(null);
    try {
      await axios.post(`${API}/system/test-email`, { email: testEmail }, { headers: authHeaders() });
      setTestResult({ ok: true, msg: `Email đã gửi thành công tới ${testEmail}` });
    } catch (e) {
      setTestResult({ ok: false, msg: e.response?.data?.detail || 'Gửi email thất bại' });
    } finally { setTestLoading(false); }
  };

  const integrations = info?.integrations || {};
  const INTEGRATIONS = [
    { key: 'smtp', label: 'SMTP / Email' },
    { key: 'gemini', label: 'Gemini AI' },
    { key: 'google_drive', label: 'Google Drive' },
    { key: 'vnpay', label: 'VNPay' },
    { key: 'momo', label: 'MoMo' },
  ];

  if (loading) return <div className="flex justify-center py-16"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-strong">Thông tin hệ thống</h2>
        <button onClick={load} className="btn-icon"><RefreshCw size={14} /></button>
      </div>

      {/* System info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Tổng người dùng" value={info?.stats?.total_users ?? '—'} color="blue" />
        <StatCard icon={Building2} label="Tổng tenant" value={info?.stats?.total_tenants ?? '—'} color="orange" />
        <StatCard icon={CreditCard} label="Gói đang active" value={info?.stats?.active_subscriptions ?? '—'} color="emerald" />
      </div>

      <div className="card p-5">
        <span className="section-label">Chi tiết phiên bản</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
          {[
            { label: 'Phiên bản', val: info?.version || '—' },
            { label: 'Python', val: info?.python_version || '—' },
            { label: 'Database', val: info?.db_server || '—' },
            { label: 'Môi trường', val: info?.environment || '—' },
          ].map(item => (
            <div key={item.label}>
              <div className="text-[10px] text-weak uppercase tracking-wider mb-1">{item.label}</div>
              <div className="text-sm text-strong font-medium font-mono">{item.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Integrations */}
      <div className="card p-5">
        <span className="section-label">Tích hợp</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-3">
          {INTEGRATIONS.map(({ key, label }) => {
            const ok = integrations[key];
            return (
              <div key={key} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium ${
                ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                   : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
              }`}>
                {ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                {label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Test email */}
      <div className="card p-5">
        <span className="section-label">Test gửi email</span>
        <p className="text-xs text-weak mb-3">Kiểm tra cấu hình SMTP bằng cách gửi email thử nghiệm.</p>
        <div className="flex gap-2">
          <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
            placeholder="email@example.com" className="input-base flex-1" />
          <button onClick={sendTestEmail} disabled={testLoading || !testEmail} className="btn-primary shrink-0">
            {testLoading ? <><div className="spinner w-3 h-3 mr-1" />Đang gửi...</> : <><Mail size={13} />Gửi test</>}
          </button>
        </div>
        {testResult && (
          <div className={`mt-2 text-xs px-3 py-2 rounded-xl ${testResult.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
            {testResult.ok ? <CheckCircle size={12} className="inline mr-1" /> : <AlertCircle size={12} className="inline mr-1" />}
            {testResult.msg}
          </div>
        )}
      </div>

      {/* Expiring soon */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-base flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-500" />
          <div className="text-xs font-semibold text-strong">Sắp hết hạn (14 ngày tới)</div>
          <span className="ml-auto badge-amber">{expiring.length} tenant</span>
        </div>
        {expiring.length === 0 ? (
          <div className="empty-state py-10">
            <div className="empty-state-icon"><CheckCircle size={20} className="text-emerald-500" /></div>
            <div className="text-xs text-weak">Không có subscription nào sắp hết hạn</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Gói</th>
                  <th>Ngày hết hạn</th>
                  <th>Còn lại</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {expiring.map(s => {
                  const daysLeft = s.days_left ?? Math.ceil((new Date(s.end_date) - new Date()) / 86400000);
                  return (
                    <tr key={s.id}>
                      <td className="font-medium text-strong">{s.tenant?.name || s.tenant_name || s.tenant_id}</td>
                      <td>{s.plan?.name || s.plan_name || s.plan_id}</td>
                      <td>{formatDate(s.end_date)}</td>
                      <td>
                        <span className={daysLeft <= 3 ? 'badge-red' : daysLeft <= 7 ? 'badge-amber' : 'badge-blue'}>
                          {daysLeft} ngày
                        </span>
                      </td>
                      <td className="text-weak">{s.tenant?.contact_email || s.billing_email || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main dashboard ────────────────────────────────────────────────────────────
const TABS = [
  { key: 'reports',       label: 'Báo cáo',       icon: BarChart3 },
  { key: 'tenants',       label: 'Tenants',        icon: Building2 },
  { key: 'users',         label: 'Người dùng',     icon: Users },
  { key: 'plans',         label: 'Gói dịch vụ',   icon: CreditCard },
  { key: 'subscriptions', label: 'Subscriptions',  icon: Activity },
  { key: 'audit',         label: 'Audit Log',      icon: ClipboardList },
  { key: 'system',        label: 'Hệ thống',       icon: Server },
];

const SuperAdminDashboard = () => {
  const [tab, setTab] = useState('reports');

  return (
    <div className="page-content">
      {/* Header */}
      <div className="px-6 pt-6 pb-0 bg-surface border-b border-base">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-xl bg-orange-50 dark:bg-orange-900/20">
            <Shield size={16} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-strong">Super Admin</h1>
            <div className="text-[11px] text-weak">Quản lý toàn bộ nền tảng MOSS&amp;LEGAL</div>
          </div>
        </div>
        <div className="flex gap-0.5 overflow-x-auto pb-px">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                tab === t.key
                  ? 'text-orange-600 border-orange-600'
                  : 'text-weak hover:text-body border-transparent'
              }`}>
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {tab === 'reports'       && <ReportTab />}
        {tab === 'tenants'       && <TenantTab />}
        {tab === 'users'         && <UserTab />}
        {tab === 'plans'         && <PlanTab />}
        {tab === 'subscriptions' && <SubscriptionTab />}
        {tab === 'audit'         && <AuditTab />}
        {tab === 'system'        && <SystemTab />}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
