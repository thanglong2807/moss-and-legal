import React, { useState, useEffect, useCallback } from 'react';
import { Users2, Plus, Edit2, Trash2, RefreshCw, X, ToggleLeft, ToggleRight } from 'lucide-react';
import axios from 'axios';

const API = '/api/v1/tenant/staff';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('mosslegal_access_token')}`,
});

const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const initials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase();
};

const roleLabel = (roles) => {
  if (!roles || roles.length === 0) return 'Nhân viên';
  if (roles.includes('ADMIN')) return 'Quản trị viên';
  return roles[0];
};

// Modal thêm / sửa nhân viên
const StaffModal = ({ mode, data, onClose, onSaved }) => {
  const isEdit = mode === 'edit';
  const [fullName, setFullName] = useState(data?.full_name || data?.display_name || '');
  const [email, setEmail] = useState(data?.email || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(data?.phone || '');
  const [isActive, setIsActive] = useState(data?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      if (isEdit) {
        const body = { full_name: fullName, phone, is_active: isActive };
        await axios.put(`${API}/${data.id}`, body, { headers: authHeaders() });
      } else {
        const body = { full_name: fullName, email, password, phone };
        await axios.post(API, body, { headers: authHeaders() });
      }
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.detail || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-base">
          <span className="text-sm font-semibold text-strong">
            {isEdit ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên'}
          </span>
          <button onClick={onClose} className="text-weak hover:text-strong transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          {err && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{err}</div>
          )}

          <div>
            <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Họ tên *</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500"
              placeholder="Nguyễn Văn A"
            />
          </div>

          {!isEdit && (
            <>
              <div>
                <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Mật khẩu *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500"
                  placeholder="Tối thiểu 6 ký tự"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Số điện thoại</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500"
              placeholder="0901234567"
            />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-strong">Trạng thái hoạt động</span>
              <button
                type="button"
                onClick={() => setIsActive(v => !v)}
                className={`transition-colors ${isActive ? 'text-emerald-500' : 'text-weak'}`}
              >
                {isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-2 bg-orange-600 text-white text-xs rounded-xl hover:bg-orange-700 transition disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : (isEdit ? 'Lưu thay đổi' : 'Thêm nhân viên')}
          </button>
        </form>
      </div>
    </div>
  );
};

const StaffPage = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState(null);
  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', data: {...} }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, subr] = await Promise.all([
        axios.get(API, { headers: authHeaders() }),
        axios.get('/api/v1/tenant/subscription', { headers: authHeaders() }).catch(() => ({ data: null })),
      ]);
      setStaff(sr.data?.data ?? sr.data ?? []);
      setSub(subr.data);
    } catch {
      // ignore
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
      await load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Xóa thất bại');
    } finally {
      setDeleteLoading(false);
    }
  };

  const userCount = sub?.user_count ?? staff.length;
  const maxUsers = sub?.max_users;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-page">
        <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-page overflow-auto">
      <div className="px-6 py-6 max-w-5xl mx-auto w-full space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users2 size={18} className="text-orange-600" />
            <h1 className="text-base font-bold text-strong">Quản lý nhân viên</h1>
            {maxUsers != null && (
              <span className="ml-2 text-[11px] text-weak bg-page border border-base px-2.5 py-0.5 rounded-full">
                {userCount} / {maxUsers === -1 ? '∞' : maxUsers} nhân viên
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-1.5 text-weak hover:text-orange-600 transition" title="Làm mới">
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setModal({ mode: 'add' })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-xs rounded-xl hover:bg-orange-700 transition"
            >
              <Plus size={14} />
              Thêm nhân viên
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-base rounded-2xl overflow-hidden bg-surface">
          {staff.length === 0 ? (
            <div className="py-16 text-center text-weak text-sm italic">
              Chưa có nhân viên nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-page border-b border-base">
                  <tr>
                    <th className="text-left py-2.5 px-4 text-weak font-semibold uppercase tracking-wide">Nhân viên</th>
                    <th className="text-left py-2.5 px-4 text-weak font-semibold uppercase tracking-wide hidden sm:table-cell">Email</th>
                    <th className="text-left py-2.5 px-4 text-weak font-semibold uppercase tracking-wide hidden md:table-cell">SĐT</th>
                    <th className="text-left py-2.5 px-4 text-weak font-semibold uppercase tracking-wide">Vai trò</th>
                    <th className="text-left py-2.5 px-4 text-weak font-semibold uppercase tracking-wide">Trạng thái</th>
                    <th className="text-left py-2.5 px-4 text-weak font-semibold uppercase tracking-wide hidden lg:table-cell">Ngày tạo</th>
                    <th className="py-2.5 px-4 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => {
                    const name = s.full_name || s.display_name || s.email || '—';
                    const active = s.is_active ?? true;
                    return (
                      <tr key={s.id} className="border-b border-base/50 hover:bg-page/60 transition">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {initials(name)}
                            </div>
                            <span className="text-strong font-medium truncate max-w-[120px]">{name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-weak hidden sm:table-cell truncate max-w-[160px]">
                          {s.email || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-weak hidden md:table-cell">
                          {s.phone || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-weak">
                          {roleLabel(s.roles)}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {active ? 'Đang hoạt động' : 'Đã khóa'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-weak hidden lg:table-cell">
                          {formatDate(s.created_at)}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => setModal({ mode: 'edit', data: s })}
                              className="p-1.5 text-weak hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition"
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(s)}
                              className="p-1.5 text-weak hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                              title="Xóa"
                            >
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

      {/* Add / Edit Modal */}
      {modal && (
        <StaffModal
          mode={modal.mode}
          data={modal.data}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-5" onClick={e => e.stopPropagation()}>
            <div className="text-sm font-semibold text-strong mb-2">Xác nhận xóa</div>
            <p className="text-xs text-weak mb-5">
              Bạn có chắc muốn xóa nhân viên{' '}
              <span className="font-semibold text-strong">
                {deleteTarget.full_name || deleteTarget.display_name || deleteTarget.email}
              </span>
              ? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-xs border border-base rounded-xl text-weak hover:text-strong transition"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                disabled={deleteLoading}
                className="flex-1 py-2 text-xs bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleteLoading ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPage;
