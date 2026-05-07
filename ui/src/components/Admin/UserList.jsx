import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { adminApi, configApi } from '../../services/api';
import Pagination, { PAGE_SIZE_OPTIONS } from '../Common/Pagination';

const EMPTY_FORM = {
  email: '', password: '', display_name: '', is_active: true,
  phone: '', personal_email: '', gender: '', birth_date: '', id_number: '', address: '',
  gov_account: '', gov_pass: '', role_id: '', staff_config_id: '', manager_id: '',
};

const UserModal = ({ user, roles, staffList, users, onClose, onSaved }) => {
  const isEdit = !!user;
  const [form, setForm] = useState(isEdit ? {
    ...EMPTY_FORM, ...user, password: '',
    role_id: user.role_id ?? '',
    staff_config_id: user.staff_config_id ?? '',
    manager_id: user.manager_id ?? '',
    gender: user.gender !== null && user.gender !== undefined ? String(user.gender) : '',
  } : { ...EMPTY_FORM });
  const [showPass, setShowPass] = useState(false);
  const [showGovPass, setShowGovPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.display_name || (!isEdit && !form.password)) {
      setError('Vui lòng điền họ tên' + (!isEdit ? ' và mật khẩu' : ''));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        email: form.email || null,
        display_name: form.display_name,
        is_active: form.is_active,
        phone: form.phone || null,
        personal_email: form.personal_email || null,
        gender: form.gender !== '' ? parseInt(form.gender) : null,
        birth_date: form.birth_date || null,
        id_number: form.id_number || null,
        address: form.address || null,
        gov_account: form.gov_account || null,
        gov_pass: form.gov_pass || null,
        role_id: form.role_id ? parseInt(form.role_id) : null,
        staff_config_id: form.staff_config_id ? parseInt(form.staff_config_id) : null,
        manager_id: form.manager_id ? parseInt(form.manager_id) : null,
      };
      if (form.password) payload.password = form.password;
      if (isEdit) await adminApi.updateUser(user.id, payload);
      else await adminApi.createUser({ ...payload, password: form.password });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'Lỗi lưu');
    } finally {
      setSaving(false);
    }
  };

  const otherUsers = users.filter(u => !isEdit || u.id !== user.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative z-10 bg-surface rounded-3xl shadow-2xl border border-faint w-full max-w-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-7 py-5 border-b border-base">
          <h2 className="text-sm font-black text-strong uppercase tracking-widest">{isEdit ? 'Sửa nhân viên' : 'Thêm nhân viên'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-input text-weak"><X size={16} /></button>
        </div>
        <div className="px-7 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && <p className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1 block">Họ và tên *</label>
              <input className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none focus:border-orange-400"
                value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1 block">Email hệ thống</label>
              <input type="email" className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none focus:border-orange-400"
                value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@cenvi.vn" />
            </div>
            <div>
              <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1 block">Email cá nhân</label>
              <input type="email" className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none focus:border-orange-400"
                value={form.personal_email} onChange={e => set('personal_email', e.target.value)} placeholder="personal@gmail.com" />
            </div>
            <div>
              <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1 block">Số điện thoại</label>
              <input className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none focus:border-orange-400"
                value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0909..." />
            </div>
            <div>
              <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1 block">Giới tính</label>
              <select className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none focus:border-orange-400"
                value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">— Chọn —</option>
                <option value="0">Nam</option>
                <option value="1">Nữ</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1 block">Ngày sinh</label>
              <input
                className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none focus:border-orange-400"
                value={form.birth_date}
                onChange={e => {
                  const raw = e.target.value;
                  // Convert yyyy-mm-dd (native date input) → dd/mm/yyyy
                  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                    const [y, m, d] = raw.split('-');
                    set('birth_date', `${d}/${m}/${y}`);
                  } else {
                    set('birth_date', raw);
                  }
                }}
                onFocus={e => {
                  // Convert dd/mm/yyyy → yyyy-mm-dd for native date picker
                  if (/^\d{2}\/\d{2}\/\d{4}$/.test(form.birth_date)) {
                    const [d, m, y] = form.birth_date.split('/');
                    e.target.value = `${y}-${m}-${d}`;
                  }
                  e.target.type = 'date';
                }}
                onBlur={e => { e.target.type = 'text'; }}
                placeholder="DD/MM/YYYY"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1 block">CCCD / CMND</label>
              <input className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none focus:border-orange-400"
                value={form.id_number} onChange={e => set('id_number', e.target.value)} placeholder="012345678901" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1 block">Địa chỉ liên lạc</label>
              <input className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none focus:border-orange-400"
                value={form.address} onChange={e => set('address', e.target.value)} placeholder="Số nhà, đường, phường/xã, tỉnh/thành" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1 block">{isEdit ? 'Mật khẩu mới (để trống = giữ nguyên)' : 'Mật khẩu *'}</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none focus:border-orange-400 pr-10"
                value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-weak">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Role / Staff / Manager */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1 block">Vai trò</label>
              <select className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none"
                value={form.role_id} onChange={e => set('role_id', e.target.value)}>
                <option value="">— Không có —</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1 block">Quản lý trực tiếp</label>
              <select className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none"
                value={form.manager_id} onChange={e => set('manager_id', e.target.value)}>
                <option value="">— Không có —</option>
                {otherUsers.map(u => <option key={u.id} value={u.id}>{u.display_name}{u.role_name ? ` (${u.role_name})` : ''}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1 block">Liên kết nhân viên CRM</label>
              <select className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none"
                value={form.staff_config_id} onChange={e => set('staff_config_id', e.target.value)}>
                <option value="">— Không liên kết —</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* GOV */}
          <div className="bg-page/60 rounded-2xl p-4 border border-dashed border-base space-y-3">
            <p className="text-[10px] font-black text-body uppercase tracking-widest">Tài khoản GOV</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-weak mb-1 block">Tên đăng nhập</label>
                <input className="w-full px-3 py-2 bg-surface border border-base rounded-xl text-sm outline-none"
                  value={form.gov_account} onChange={e => set('gov_account', e.target.value)} placeholder="gov_user" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-weak mb-1 block">Mật khẩu</label>
                <div className="relative">
                  <input type={showGovPass ? 'text' : 'password'} className="w-full px-3 py-2 bg-surface border border-base rounded-xl text-sm outline-none pr-9"
                    value={form.gov_pass} onChange={e => set('gov_pass', e.target.value)} placeholder="••••••" />
                  <button type="button" onClick={() => setShowGovPass(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-weak">
                    {showGovPass ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => set('is_active', !form.is_active)}
              className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-slate-300'} relative`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-xs font-bold text-body">{form.is_active ? 'Đang hoạt động' : 'Đã khoá'}</span>
          </div>
        </div>
        <div className="px-7 py-4 border-t border-base flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-body hover:bg-input rounded-xl transition-colors">Huỷ</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2 text-sm font-black text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
};

const GENDER_LABEL = { 0: 'Nam', 1: 'Nữ' };
const PAGE_SIZE = 50;

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [roles, setRoles] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({ skip: (page - 1) * pageSize, limit: pageSize, search: debouncedSearch || undefined });
      setUsers(res.data.items ?? res.data);
      setTotal(res.data.total ?? 0);
    } finally { setLoading(false); }
  };

  const loadMeta = async () => {
    const [r, s] = await Promise.all([adminApi.getRoles(), configApi.getStaff()]);
    setRoles(r.data);
    setStaffList(s.data);
  };

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { fetchUsers(); }, [page, pageSize, debouncedSearch]);

  const handleDelete = async (user) => {
    if (!window.confirm(`Xoá tài khoản "${user.display_name}"?`)) return;
    await adminApi.deleteUser(user.id);
    fetchUsers();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm text-strong">Danh sách nhân viên</h3>
          <span className="text-[10px] text-weak bg-input px-2 py-0.5 rounded-full">{total}</span>
        </div>
        <button onClick={() => setEditing(false)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-xs rounded-xl hover:bg-orange-700 transition-colors">
          <Plus size={13} /> Thêm
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên, email, SĐT..."
          className="w-full max-w-xs px-3 py-2 bg-page border border-base rounded-xl text-xs outline-none focus:border-orange-400"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-weak text-sm">Đang tải...</div>
      ) : (
        <>
        <div className="overflow-x-auto rounded-2xl border border-base">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-page border-b border-base">
                {['Họ tên', 'SĐT / Email', 'Giới tính', 'CCCD', 'Vai trò', 'Quản lý', 'GOV', 'TT', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] text-body uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-faint hover:bg-page/50 transition-colors">
                  <td className="px-4 py-3 text-strong whitespace-nowrap">{u.display_name}</td>
                  <td className="px-4 py-3 text-xs text-body">
                    <div>{u.phone || '—'}</div>
                    <div className="text-weak">{u.email || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-body">{u.gender !== null && u.gender !== undefined ? GENDER_LABEL[u.gender] : '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-body">{u.id_number || '—'}</td>
                  <td className="px-4 py-3">
                    {u.role_name
                      ? <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded-lg whitespace-nowrap">{u.role_name}</span>
                      : <span className="text-weak text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-body whitespace-nowrap">{u.manager_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-weak font-mono">{u.gov_account || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black whitespace-nowrap ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {u.is_active ? 'Hoạt động' : 'Khoá'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(u)} className="p-1.5 text-weak hover:text-orange-600 rounded-lg hover:bg-orange-50 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(u)} className="p-1.5 text-weak hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="text-center py-10 text-weak text-sm">Chưa có nhân viên nào</div>}
        </div>

        <Pagination
          page={page} pageSize={pageSize} total={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
        </>
      )}

      {editing !== null && (
        <UserModal
          user={editing || null}
          roles={roles}
          staffList={staffList}
          users={users}
          onClose={() => setEditing(null)}
          onSaved={fetchUsers}
        />
      )}
    </div>
  );
};

export default UserList;
