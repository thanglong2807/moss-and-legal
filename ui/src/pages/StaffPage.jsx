import React, { useState, useEffect, useCallback } from 'react';
import {
  Users2, Plus, Edit2, Trash2, RefreshCw, X,
  ToggleLeft, ToggleRight, ShieldCheck, UserX, AlertCircle,
} from 'lucide-react';
import axios from 'axios';

const API = '/api/v1/tenant/staff';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('mosslegal_access_token')}`,
});

const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const AVATAR_COLORS = [
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300',
  'bg-rose-100   text-rose-700   dark:bg-rose-900/40   dark:text-rose-300',
  'bg-teal-100   text-teal-700   dark:bg-teal-900/40   dark:text-teal-300',
];

const avatarColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const initials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase();
};

/* ── Modal thêm / sửa ──────────────────────────────────────────────────── */
const StaffModal = ({ mode, data, roles, onClose, onSaved }) => {
  const isEdit = mode === 'edit';
  const [fullName, setFullName] = useState(data?.display_name || '');
  const [email, setEmail] = useState(data?.email || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(data?.phone || '');
  const [isActive, setIsActive] = useState(data?.is_active ?? true);
  const [roleId, setRoleId] = useState(data?.role_id ?? '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      if (isEdit) {
        await axios.put(`${API}/${data.id}`, {
          display_name: fullName,
          phone: phone || null,
          is_active: isActive,
          ...(roleId !== '' && { role_id: parseInt(roleId) }),
        }, { headers: authHeaders() });
      } else {
        await axios.post(API, {
          display_name: fullName,
          email,
          password,
          phone: phone || null,
          ...(roleId !== '' && { role_id: parseInt(roleId) }),
        }, { headers: authHeaders() });
      }
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.detail || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'input-base py-2.5';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-base">
          <div>
            <div className="text-sm font-medium text-strong">{isEdit ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}</div>
            {isEdit && <div className="text-[11px] text-weak mt-0.5">{data?.email}</div>}
          </div>
          <button onClick={onClose} className="btn-icon"><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3.5">
          {err && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5">
              <AlertCircle size={13} className="shrink-0" /> {err}
            </div>
          )}

          <div>
            <label className="section-label">Họ tên *</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              required className={inputCls} placeholder="Nguyễn Văn A" autoFocus />
          </div>

          {!isEdit && (
            <>
              <div>
                <label className="section-label">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required className={inputCls} placeholder="email@example.com" />
              </div>
              <div>
                <label className="section-label">Mật khẩu *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required minLength={6} className={inputCls} placeholder="Tối thiểu 6 ký tự" />
              </div>
            </>
          )}

          <div>
            <label className="section-label">Số điện thoại</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className={inputCls} placeholder="0901 234 567" />
          </div>

          {roles && roles.length > 0 && (
            <div>
              <label className="section-label">Vai trò</label>
              <select value={roleId} onChange={e => setRoleId(e.target.value)} className={inputCls}>
                <option value="">— Chưa phân quyền —</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.level === 1 ? ' (Quản trị viên)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isEdit && (
            <div className="flex items-center justify-between py-1 px-1">
              <div>
                <div className="text-xs font-medium text-strong">Trạng thái hoạt động</div>
                <div className="text-[11px] text-weak mt-0.5">{isActive ? 'Đang hoạt động' : 'Đã khóa tài khoản'}</div>
              </div>
              <button type="button" onClick={() => setIsActive(v => !v)}
                className={`transition-colors ${isActive ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`}>
                {isActive ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
              </button>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-1 py-2.5">
            {loading
              ? <><span className="spinner w-3.5 h-3.5" /> Đang lưu...</>
              : (isEdit ? 'Lưu thay đổi' : 'Thêm nhân viên')}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ── Page ───────────────────────────────────────────────────────────────── */
const StaffPage = () => {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sub, setSub] = useState(null);
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sr, subr, rr] = await Promise.all([
        axios.get(API + '/', { headers: authHeaders() }),
        axios.get('/api/v1/tenant/subscription', { headers: authHeaders() }).catch(() => ({ data: null })),
        axios.get(API + '/roles', { headers: authHeaders() }).catch(() => ({ data: [] })),
      ]);
      const items = Array.isArray(sr.data) ? sr.data : (sr.data?.items ?? []);
      setStaff(items);
      setSub(subr.data);
      setRoles(Array.isArray(rr.data) ? rr.data : []);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${API}/${id}`, { headers: authHeaders() });
      setDeleteTarget(null);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Xóa thất bại');
    } finally {
      setDeleteLoading(false);
    }
  };

  const userCount = sub?.user_count ?? staff.length;
  const maxUsers = sub?.max_users;
  const usagePct = maxUsers && maxUsers !== -1 ? Math.min(100, Math.round(userCount / maxUsers * 100)) : null;

  if (loading) {
    return <div className="page-loading"><div className="spinner w-7 h-7" /></div>;
  }

  return (
    <div className="page-content">
      <div className="page-inner">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Users2 size={16} className="text-orange-600" />
              </div>
              <h1 className="text-[15px] font-black text-strong">Quản lý nhân viên</h1>
            </div>

            {/* Usage bar */}
            {maxUsers != null && (
              <div className="ml-10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] text-weak">
                    {userCount} / {maxUsers === -1 ? '∞' : maxUsers} nhân viên
                  </span>
                  {usagePct !== null && usagePct >= 80 && (
                    <span className="badge-amber text-[10px]">Gần đầy</span>
                  )}
                </div>
                {usagePct !== null && (
                  <div className="w-32 h-1 bg-page rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} style={{ width: `${usagePct}%` }} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={load} className="btn-icon" title="Làm mới">
              <RefreshCw size={14} />
            </button>
            <button onClick={() => setModal({ mode: 'add' })} className="btn-primary">
              <Plus size={14} /> Thêm nhân viên
            </button>
          </div>
        </div>

        {/* ── Error ──────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-2.5 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Table ──────────────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          {staff.length === 0 ? (
            <div className="empty-state py-20">
              <div className="empty-state-icon">
                <UserX size={22} />
              </div>
              <div>
                <div className="text-sm font-medium text-strong mb-1">Chưa có nhân viên</div>
                <div className="text-xs text-weak">Nhấn "Thêm nhân viên" để bắt đầu</div>
              </div>
              <button onClick={() => setModal({ mode: 'add' })} className="btn-primary mt-1">
                <Plus size={13} /> Thêm nhân viên đầu tiên
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th className="hidden sm:table-cell">Email</th>
                    <th className="hidden md:table-cell">SĐT</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th className="hidden lg:table-cell">Ngày tạo</th>
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => {
                    const name = s.display_name || s.email || '—';
                    const active = s.is_active ?? true;
                    const isAdmin = roles.find(r => r.id === s.role_id)?.level === 1;
                    const avc = avatarColor(name);
                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${avc}`}>
                              {initials(name)}
                            </div>
                            <div>
                              <div className="text-strong font-medium text-xs truncate max-w-[130px]">{name}</div>
                              {isAdmin && (
                                <div className="flex items-center gap-0.5 text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                                  <ShieldCheck size={9} /> Admin
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-weak hidden sm:table-cell">
                          <span className="truncate block max-w-[180px]">{s.email || '—'}</span>
                        </td>
                        <td className="text-weak hidden md:table-cell">{s.phone || '—'}</td>
                        <td className="text-weak">
                          {s.role_name
                            ? <span className="badge-blue">{s.role_name}</span>
                            : <span className="text-weak italic text-[11px]">—</span>
                          }
                        </td>
                        <td>
                          <span className={active ? 'badge-green' : 'badge-slate'}>
                            {active ? 'Hoạt động' : 'Đã khóa'}
                          </span>
                        </td>
                        <td className="text-weak hidden lg:table-cell">{formatDate(s.created_at)}</td>
                        <td>
                          <div className="flex items-center gap-0.5 justify-end">
                            <button onClick={() => setModal({ mode: 'edit', data: s })}
                              className="btn-icon hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20" title="Sửa">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => setDeleteTarget(s)}
                              className="btn-icon hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Xóa">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {modal && (
        <StaffModal
          mode={modal.mode}
          data={modal.data}
          roles={roles}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}

      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <div className="text-sm font-medium text-strong mb-1">Xác nhận xóa</div>
            <p className="text-xs text-weak mb-5 leading-relaxed">
              Bạn có chắc muốn xóa nhân viên{' '}
              <span className="font-medium text-strong">
                {deleteTarget.display_name || deleteTarget.email}
              </span>?
              {' '}Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-xs border border-base rounded-xl text-weak hover:text-strong hover:bg-page transition">
                Hủy
              </button>
              <button onClick={() => handleDelete(deleteTarget.id)} disabled={deleteLoading}
                className="flex-1 py-2 text-xs bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-50 font-medium">
                {deleteLoading ? 'Đang xóa...' : 'Xóa nhân viên'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPage;
