import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Trash2, Edit2, Check, X, Settings, BarChart3, TrendingUp, Users, Building2, CreditCard, Activity, UserPlus, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const API = '/api/v1/super-admin';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('mosslegal_access_token')}`,
});

const formatMoney = (v) => new Intl.NumberFormat('vi-VN').format(v) + '₫';
const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

// ── Generic confirm dialog ────────────────────────────────────────────────────
const Confirm = ({ msg, onOk, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
    <div className="bg-surface rounded-xl shadow-xl p-6 max-w-sm mx-4 w-full" onClick={e => e.stopPropagation()}>
      <p className="text-sm text-strong mb-5">{msg}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-1.5 text-xs rounded-lg border border-base text-body hover:bg-page transition">Huỷ</button>
        <button onClick={onOk} className="px-4 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 transition">Xác nhận</button>
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
      setAdmins(r.data);
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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base shrink-0">
          <div>
            <div className="text-sm font-semibold text-strong">Tài khoản Admin</div>
            <div className="text-xs text-weak mt-0.5">{tenant.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowForm(!showForm); setErr(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition">
              <UserPlus size={12} /> Thêm Admin
            </button>
            <button onClick={onClose} className="text-weak hover:text-strong transition-colors"><X size={16} /></button>
          </div>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="px-5 py-4 border-b border-base bg-page/50 shrink-0">
            <div className="text-xs font-semibold text-strong mb-3">Tạo tài khoản Admin mới</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Họ và tên *</label>
                <input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="admin@congty.vn"
                  className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Số điện thoại</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="0901234567"
                  className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Mật khẩu * (tối thiểu 6 ký tự)</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Mật khẩu đăng nhập"
                    className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 pr-9 border border-base focus:outline-none focus:border-orange-500" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-weak hover:text-body">
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>
            {err && <div className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-1.5">{err}</div>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setShowForm(false); setErr(''); }}
                className="flex-1 py-1.5 border border-base text-xs rounded-lg text-body hover:bg-page transition">Huỷ</button>
              <button onClick={createAdmin} disabled={saving}
                className="flex-1 py-1.5 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition disabled:opacity-50">
                {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </div>
          </div>
        )}

        {/* Admin list */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" /></div>
          ) : admins.length === 0 ? (
            <div className="py-10 text-center">
              <Users size={32} className="mx-auto text-weak/30 mb-2" />
              <div className="text-xs text-weak italic">Chưa có tài khoản admin nào</div>
              <div className="text-[11px] text-weak/70 mt-1">Nhấn "Thêm Admin" để tạo</div>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-base text-weak">
                  <th className="text-left py-2 px-4">Họ tên</th>
                  <th className="text-left py-2 px-4">Email</th>
                  <th className="text-left py-2 px-4">SĐT</th>
                  <th className="text-left py-2 px-4">Trạng thái</th>
                  <th className="py-2 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {admins.map(u => (
                  <tr key={u.id} className="border-b border-base/40 hover:bg-page/50 transition">
                    <td className="py-2.5 px-4 font-medium text-strong">{u.display_name}</td>
                    <td className="py-2.5 px-4 text-weak">{u.email || '—'}</td>
                    <td className="py-2.5 px-4 text-weak">{u.phone || '—'}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.is_active ? 'Hoạt động' : 'Khoá'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <button onClick={() => setConfirm(u)} className="p-1 text-weak hover:text-red-500 transition">
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
          <button onClick={onClose} className="text-weak hover:text-strong transition-colors"><X size={16} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" /></div>
        ) : settings && (
          <div className="p-5 space-y-5">
            {/* Modules */}
            <div>
              <div className="text-[10px] text-weak uppercase tracking-wider mb-2.5 font-semibold">Các module được bật</div>
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

            {/* Max users override */}
            <div>
              <label className="text-[10px] text-weak uppercase tracking-wider block mb-1.5 font-semibold">
                Giới hạn user (ghi đè gói — để trống = dùng giới hạn của gói)
              </label>
              <input type="number" placeholder="Để trống = dùng giới hạn gói"
                value={settings.max_users_override ?? ''}
                onChange={e => setSettings(s => ({ ...s, max_users_override: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500" />
            </div>

            {/* Billing email */}
            <div>
              <label className="text-[10px] text-weak uppercase tracking-wider block mb-1.5 font-semibold">Email nhận thông báo gia hạn</label>
              <input type="email" placeholder={tenant.contact_email}
                value={settings.billing_email || ''}
                onChange={e => setSettings(s => ({ ...s, billing_email: e.target.value }))}
                className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500" />
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] text-weak uppercase tracking-wider block mb-1.5 font-semibold">Ghi chú nội bộ</label>
              <textarea rows={3} placeholder="Ghi chú về khách hàng này..."
                value={settings.notes || ''}
                onChange={e => setSettings(s => ({ ...s, notes: e.target.value }))}
                className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500 resize-none" />
            </div>

            {msg && <div className={`text-xs px-3 py-2 rounded-lg ${msg.includes('Lỗi') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>{msg}</div>}

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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-strong">Danh sách Tenant</h2>
        <div className="flex gap-2">
          <button onClick={load} className="p-1.5 text-weak hover:text-orange-600 transition"><RefreshCw size={14} /></button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition">
            <Plus size={13} /> Thêm tenant
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-base text-weak">
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">Tên</th>
                <th className="text-left py-2 px-3">Slug</th>
                <th className="text-left py-2 px-3">Email</th>
                <th className="text-left py-2 px-3">Gói HĐ</th>
                <th className="text-left py-2 px-3">Hết hạn</th>
                <th className="text-left py-2 px-3">Trạng thái</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} className="border-b border-base/50 hover:bg-page/50 transition">
                  <td className="py-2 px-3 text-weak">{t.id}</td>
                  <td className="py-2 px-3 text-strong font-medium">{t.name}</td>
                  <td className="py-2 px-3 font-mono text-weak">{t.slug}</td>
                  <td className="py-2 px-3">{t.contact_email}</td>
                  <td className="py-2 px-3">{t.subscription?.plan_name || <span className="text-weak italic">Chưa có</span>}</td>
                  <td className="py-2 px-3">{formatDate(t.subscription?.end_date)}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                      {t.is_active ? 'Hoạt động' : 'Tắt'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1">
                      <button onClick={() => setAdminTenant(t)} title="Tài khoản Admin" className="p-1 text-weak hover:text-purple-600 transition"><UserPlus size={13} /></button>
                      <button onClick={() => setSettingsTenant(t)} title="Cài đặt" className="p-1 text-weak hover:text-blue-600 transition"><Settings size={13} /></button>
                      <button onClick={() => openEdit(t)} title="Sửa" className="p-1 text-weak hover:text-orange-600 transition"><Edit2 size={13} /></button>
                      <button onClick={() => setConfirm({ id: t.id, name: t.name })} title="Xoá" className="p-1 text-weak hover:text-red-500 transition"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-weak italic text-xs">Chưa có tenant nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-surface rounded-xl shadow-xl p-6 max-w-md mx-4 w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-strong mb-4">{editing ? 'Sửa tenant' : 'Thêm tenant mới'}</h3>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Tên công ty', key: 'name' },
                { label: 'Slug (URL)', key: 'slug', disabled: !!editing },
                { label: 'Email liên hệ', key: 'contact_email' },
                { label: 'Số điện thoại', key: 'contact_phone' },
                { label: 'Địa chỉ', key: 'address' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">{f.label}</label>
                  <input value={form[f.key]} disabled={f.disabled}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500 disabled:opacity-50" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-1.5 text-xs rounded-lg border border-base text-body hover:bg-page transition">Huỷ</button>
              <button onClick={save} className="px-4 py-1.5 text-xs rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition">Lưu</button>
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

      {settingsTenant && (
        <TenantSettingsModal tenant={settingsTenant} onClose={() => setSettingsTenant(null)} />
      )}

      {adminTenant && (
        <TenantAdminModal tenant={adminTenant} onClose={() => setAdminTenant(null)} />
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
    ['price_3m','price_9m','price_12m','price_24m','price_36m'].forEach(k => { payload[k] = Number(form[k]); });
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
          <button onClick={load} className="p-1.5 text-weak hover:text-orange-600 transition"><RefreshCw size={14} /></button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition">
            <Plus size={13} /> Thêm gói
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex justify-center py-10"><div className="w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" /></div>
        ) : plans.map(p => (
          <div key={p.id} className="border border-base rounded-xl p-4 hover:border-orange-300 transition bg-surface">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-strong text-sm">{p.name}</div>
                <div className="text-xs text-weak mt-0.5">{p.max_users === -1 ? 'Không giới hạn' : `${p.max_users} user`}</div>
              </div>
              <button onClick={() => openEdit(p)} className="p-1 text-weak hover:text-orange-600 transition"><Edit2 size={13} /></button>
            </div>
            <div className="space-y-1">
              {durations.map(d => (
                <div key={d.key} className="flex justify-between text-xs">
                  <span className="text-weak">{d.label}</span>
                  <span className="text-strong font-medium">{formatMoney(p[d.key])}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-surface rounded-xl shadow-xl p-6 max-w-md mx-4 w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-strong mb-4">{editing ? 'Sửa gói' : 'Thêm gói mới'}</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Tên gói</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Giới hạn user (-1 = không giới hạn)</label>
                <input type="number" value={form.max_users} onChange={e => setForm(p => ({ ...p, max_users: e.target.value }))}
                  className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500" />
              </div>
              {durations.map(d => (
                <div key={d.key}>
                  <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Giá {d.label} (VND)</label>
                  <input type="number" value={form[d.key]} onChange={e => setForm(p => ({ ...p, [d.key]: e.target.value }))}
                    className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-1.5 text-xs rounded-lg border border-base text-body hover:bg-page transition">Huỷ</button>
              <button onClick={save} className="px-4 py-1.5 text-xs rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Subscription tab ──────────────────────────────────────────────────────────
const SubscriptionTab = () => {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ tenant_id: '', plan_id: '', duration_months: 12, amount_paid: 0 });

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

  const create = async () => {
    await axios.post(`${API}/subscriptions`, {
      ...form,
      tenant_id: Number(form.tenant_id),
      plan_id: Number(form.plan_id),
      duration_months: Number(form.duration_months),
      amount_paid: Number(form.amount_paid),
    }, { headers: authHeaders() });
    setShowForm(false);
    load();
  };

  const activate = async (id) => {
    await axios.put(`${API}/subscriptions/${id}/activate`, {}, { headers: authHeaders() });
    load();
  };

  const cancel = async (id) => {
    await axios.put(`${API}/subscriptions/${id}/cancel`, {}, { headers: authHeaders() });
    load();
  };

  const statusColors = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    expired: 'bg-slate-100 text-slate-500',
    cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-strong">Subscriptions</h2>
        <div className="flex gap-2">
          <button onClick={load} className="p-1.5 text-weak hover:text-orange-600 transition"><RefreshCw size={14} /></button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition">
            <Plus size={13} /> Cấp thủ công
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-base text-weak">
              <th className="text-left py-2 px-3">ID</th>
              <th className="text-left py-2 px-3">Tenant</th>
              <th className="text-left py-2 px-3">Gói</th>
              <th className="text-left py-2 px-3">Thời hạn</th>
              <th className="text-left py-2 px-3">Bắt đầu</th>
              <th className="text-left py-2 px-3">Kết thúc</th>
              <th className="text-left py-2 px-3">Số tiền</th>
              <th className="text-left py-2 px-3">Trạng thái</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="py-8 text-center"><div className="inline-block w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" /></td></tr>
            ) : subs.map(s => (
              <tr key={s.id} className="border-b border-base/50 hover:bg-page/50 transition">
                <td className="py-2 px-3 text-weak">{s.id}</td>
                <td className="py-2 px-3 text-strong">{s.tenant?.name || s.tenant_id}</td>
                <td className="py-2 px-3">{s.plan?.name || s.plan_id}</td>
                <td className="py-2 px-3">{s.duration_months} tháng</td>
                <td className="py-2 px-3">{formatDate(s.start_date)}</td>
                <td className="py-2 px-3">{formatDate(s.end_date)}</td>
                <td className="py-2 px-3">{formatMoney(s.amount_paid)}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[s.status] || ''}`}>{s.status}</span>
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-1">
                    {s.status !== 'active' && (
                      <button onClick={() => activate(s.id)} title="Kích hoạt" className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition"><Check size={13} /></button>
                    )}
                    {s.status === 'active' && (
                      <button onClick={() => cancel(s.id)} title="Huỷ" className="p-1 text-red-500 hover:bg-red-50 rounded transition"><X size={13} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && subs.length === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-weak italic text-xs">Chưa có subscription</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-surface rounded-xl shadow-xl p-6 max-w-md mx-4 w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-strong mb-4">Cấp subscription thủ công</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Tenant</label>
                <select value={form.tenant_id} onChange={e => setForm(p => ({ ...p, tenant_id: e.target.value }))}
                  className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500">
                  <option value="">-- Chọn tenant --</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Gói</label>
                <select value={form.plan_id} onChange={e => setForm(p => ({ ...p, plan_id: e.target.value }))}
                  className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500">
                  <option value="">-- Chọn gói --</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Thời hạn (tháng)</label>
                <select value={form.duration_months} onChange={e => setForm(p => ({ ...p, duration_months: e.target.value }))}
                  className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500">
                  {[3, 9, 12, 24, 36].map(m => <option key={m} value={m}>{m} tháng</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Số tiền đã thu (VND)</label>
                <input type="number" value={form.amount_paid} onChange={e => setForm(p => ({ ...p, amount_paid: e.target.value }))}
                  className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-1.5 text-xs rounded-lg border border-base text-body hover:bg-page transition">Huỷ</button>
              <button onClick={create} className="px-4 py-1.5 text-xs rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition">Cấp</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Report tab ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'orange' }) => {
  const colors = {
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20',
    blue:   'bg-blue-50 text-blue-600 dark:bg-blue-900/20',
    emerald:'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20',
  };
  return (
    <div className="border border-base rounded-xl p-4 bg-surface flex items-start gap-3">
      <div className={`p-2.5 rounded-xl ${colors[color]}`}><Icon size={18} /></div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-weak uppercase tracking-wider mb-1">{label}</div>
        <div className="text-xl font-bold text-strong truncate">{value}</div>
        {sub && <div className="text-[11px] text-weak mt-0.5">{sub}</div>}
      </div>
    </div>
  );
};

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
    <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" /></div>
  );

  const maxRevenue = monthly.length ? Math.max(...monthly.map(m => m.revenue), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-strong">Tổng quan hệ thống</h2>
        <button onClick={load} className="p-1.5 text-weak hover:text-orange-600 transition"><RefreshCw size={14} /></button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Tổng doanh thu" value={formatMoney(overview?.revenue?.total || 0)} sub={`Tháng này: ${formatMoney(overview?.revenue?.this_month || 0)}`} color="orange" />
        <StatCard icon={Building2} label="Tenants" value={overview?.tenants?.total || 0} sub={`Hoạt động: ${overview?.tenants?.active || 0} · Mới tháng này: ${overview?.tenants?.new_this_month || 0}`} color="blue" />
        <StatCard icon={CreditCard} label="Gói đang chạy" value={overview?.subscriptions?.active || 0} sub={`Hết hạn: ${overview?.subscriptions?.expired || 0}`} color="emerald" />
        <StatCard icon={Activity} label="Tỷ lệ TT thành công" value={`${overview?.payments?.success_rate_30d || 0}%`} sub={`30 ngày: ${overview?.payments?.success_30d || 0}/${overview?.payments?.total_30d || 0} giao dịch`} color="purple" />
      </div>

      {/* Subscription by plan */}
      {overview?.subscriptions?.by_plan?.length > 0 && (
        <div className="border border-base rounded-xl p-4 bg-surface">
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

      {/* Monthly revenue chart */}
      {monthly.length > 0 && (
        <div className="border border-base rounded-xl p-4 bg-surface">
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
          {/* Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-weak border-b border-base">
                  <th className="text-left py-1.5 px-2">Tháng</th>
                  <th className="text-right py-1.5 px-2">Doanh thu</th>
                  <th className="text-right py-1.5 px-2">Giao dịch</th>
                </tr>
              </thead>
              <tbody>
                {[...monthly].reverse().map(m => (
                  <tr key={m.month} className="border-b border-base/40 hover:bg-page/50">
                    <td className="py-1.5 px-2 text-strong">{m.month}</td>
                    <td className="py-1.5 px-2 text-right font-semibold text-orange-600">{formatMoney(m.revenue)}</td>
                    <td className="py-1.5 px-2 text-right text-weak">{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tenant detail table */}
      <div className="border border-base rounded-xl overflow-hidden bg-surface">
        <div className="px-4 py-3 border-b border-base">
          <div className="text-xs font-semibold text-strong">Chi tiết từng tenant</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-page">
              <tr className="border-b border-base text-weak">
                <th className="text-left py-2 px-4">Tenant</th>
                <th className="text-left py-2 px-4">Gói</th>
                <th className="text-center py-2 px-4">Users</th>
                <th className="text-left py-2 px-4">Hết hạn</th>
                <th className="text-right py-2 px-4">Tổng đã TT</th>
                <th className="text-left py-2 px-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {tenantDetail.map(t => (
                <tr key={t.id} className="border-b border-base/40 hover:bg-page/50 transition">
                  <td className="py-2 px-4">
                    <div className="font-medium text-strong">{t.name}</div>
                    <div className="text-[10px] text-weak font-mono">{t.slug}</div>
                  </td>
                  <td className="py-2 px-4">{t.plan_name || <span className="italic text-weak">Chưa có</span>}</td>
                  <td className="py-2 px-4 text-center">{t.user_count}</td>
                  <td className="py-2 px-4">{formatDate(t.sub_end)}</td>
                  <td className="py-2 px-4 text-right font-semibold text-orange-600">{formatMoney(t.total_revenue)}</td>
                  <td className="py-2 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      t.sub_status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      t.sub_status === 'none' ? 'bg-slate-100 text-slate-500' :
                      'bg-amber-100 text-amber-700'
                    }`}>{t.sub_status}</span>
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

// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'reports',       label: 'Báo cáo',       icon: BarChart3 },
  { key: 'tenants',       label: 'Tenants',        icon: Building2 },
  { key: 'plans',         label: 'Gói dịch vụ',   icon: CreditCard },
  { key: 'subscriptions', label: 'Subscriptions',  icon: Activity },
];

const SuperAdminDashboard = () => {
  const [tab, setTab] = useState('reports');

  return (
    <div className="flex-1 flex flex-col bg-page overflow-auto">
      <div className="px-6 pt-6 pb-0">
        <h1 className="text-base font-bold text-strong mb-4">Super Admin — Quản lý Platform</h1>
        <div className="flex gap-1 border-b border-base">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${tab === t.key ? 'text-orange-600 border-b-2 border-orange-600' : 'text-weak hover:text-body'}`}>
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-6">
        {tab === 'reports' && <ReportTab />}
        {tab === 'tenants' && <TenantTab />}
        {tab === 'plans' && <PlanTab />}
        {tab === 'subscriptions' && <SubscriptionTab />}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
