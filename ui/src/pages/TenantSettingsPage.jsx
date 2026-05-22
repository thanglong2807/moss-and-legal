/**
 * TenantSettingsPage — Cài đặt công ty
 * Tab 1: Thông tin công ty (TenantProfile) — điền vào mẫu xuất hồ sơ
 * Tab 2: Loại hồ sơ (TenantDocumentType) — quản lý & upload template .docx
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, FileText, Save, Upload, Trash2, Plus,
  Download, CheckCircle2, AlertCircle, Edit2, X,
  ChevronDown, Info, RefreshCw, Tag,
} from 'lucide-react';
import axios from 'axios';
import { configApi } from '../services/api';

const token = () => localStorage.getItem('mosslegal_access_token');
const api = (path) => axios.get(`/api/v1/tenant${path}`, { headers: { Authorization: `Bearer ${token()}` } });
const put = (path, data) => axios.put(`/api/v1/tenant${path}`, data, { headers: { Authorization: `Bearer ${token()}` } });
const post = (path, data, cfg = {}) => axios.post(`/api/v1/tenant${path}`, data, { headers: { Authorization: `Bearer ${token()}` }, ...cfg });
const del = (path) => axios.delete(`/api/v1/tenant${path}`, { headers: { Authorization: `Bearer ${token()}` } });

const TABS = [
  { key: 'profile',   label: 'Thông tin công ty', icon: Building2 },
  { key: 'statuses',  label: 'Tình trạng hồ sơ',  icon: Tag       },
  { key: 'doctypes',  label: 'Loại hồ sơ',        icon: FileText  },
];

// Category map cho loại hình DN
const CATEGORY_OPTIONS = [
  { value: 'hkd',    label: 'Hộ KD',     full: 'Hộ kinh doanh' },
  { value: 'tldn_1', label: 'TNHH 1TV',  full: 'TNHH 1 thành viên' },
  { value: 'tldn_2', label: 'TNHH 2TV+', full: 'TNHH 2 thành viên+' },
  { value: 'tldn_3', label: 'Cổ phần',   full: 'Công ty cổ phần' },
];

// ── Toast mini ────────────────────────────────────────────────────────────────
const useToast = () => {
  const [msg, setMsg] = useState(null);
  const show = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };
  return { msg, show };
};

const Toast = ({ msg }) => {
  if (!msg) return null;
  const ok = msg.type === 'success';
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold
      ${ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      {ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {msg.text}
    </div>
  );
};

// ── Field helper ──────────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, placeholder, textarea = false, hint }) => (
  <div>
    <label className="block text-[11px] font-semibold text-weak uppercase tracking-wide mb-1.5">{label}</label>
    {textarea ? (
      <textarea
        className="input w-full h-20 resize-none text-sm"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <input
        className="input w-full text-sm"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )}
    {hint && <p className="text-[10px] text-weak mt-1">{hint}</p>}
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — Tenant Profile
// ════════════════════════════════════════════════════════════════════════════
const ProfileTab = ({ toast }) => {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/profile').then(r => setForm(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await put('/profile', form);
      setForm(res.data);
      toast.show('Lưu thành công');
    } catch (e) {
      toast.show(e.response?.data?.detail || 'Lưu thất bại', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl">
        <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Thông tin này sẽ được tự động điền vào các mẫu hồ sơ khi xuất tài liệu.
          Dùng biến <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded text-[10px]">{'{{ firm_name }}'}</code>,{' '}
          <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded text-[10px]">{'{{ firm_phone }}'}</code>, v.v. trong template .docx của bạn.
        </p>
      </div>

      {/* Tên công ty */}
      <section>
        <h3 className="text-xs font-black text-strong uppercase tracking-widest mb-3 pb-2 border-b border-base">Tên công ty / văn phòng</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tên đầy đủ" value={form.company_full_name} onChange={set('company_full_name')}
            placeholder="Công ty TNHH Dịch vụ Pháp lý ABC"
            hint="Biến: {{ firm_name }}" />
          <Field label="Tên viết tắt" value={form.company_short_name} onChange={set('company_short_name')}
            placeholder="ABC Legal"
            hint="Biến: {{ firm_name_short }}" />
          <Field label="Mã số thuế" value={form.tax_code} onChange={set('tax_code')}
            placeholder="0123456789"
            hint="Biến: {{ firm_tax_code }}" />
          <Field label="Số GCN ĐKKD" value={form.business_reg_number} onChange={set('business_reg_number')}
            placeholder="0123456789-001"
            hint="Biến: {{ firm_biz_reg }}" />
        </div>
      </section>

      {/* Địa chỉ */}
      <section>
        <h3 className="text-xs font-black text-strong uppercase tracking-widest mb-3 pb-2 border-b border-base">Địa chỉ & Liên hệ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Địa chỉ" value={form.address} onChange={set('address')}
            placeholder="123 Đường ABC, Phường XYZ"
            hint="Biến: {{ firm_address }}" textarea />
          <div className="space-y-4">
            <Field label="Tỉnh / Thành phố" value={form.province} onChange={set('province')}
              placeholder="Hà Nội" hint="Biến: {{ firm_province }}" />
            <Field label="Điện thoại" value={form.phone} onChange={set('phone')}
              placeholder="024 xxxx xxxx" hint="Biến: {{ firm_phone }}" />
          </div>
          <Field label="Email" value={form.email} onChange={set('email')}
            placeholder="info@abc-legal.vn" hint="Biến: {{ firm_email }}" />
          <Field label="Website" value={form.website} onChange={set('website')}
            placeholder="https://abc-legal.vn" hint="Biến: {{ firm_website }}" />
        </div>
      </section>

      {/* Người đại diện */}
      <section>
        <h3 className="text-xs font-black text-strong uppercase tracking-widest mb-3 pb-2 border-b border-base">Người đại diện pháp luật</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Họ và tên" value={form.representative_name} onChange={set('representative_name')}
            placeholder="Nguyễn Văn A" hint="Biến: {{ firm_rep_name }}" />
          <Field label="Chức danh" value={form.representative_title} onChange={set('representative_title')}
            placeholder="Giám đốc" hint="Biến: {{ firm_rep_title }}" />
          <Field label="Số CCCD / CMND" value={form.representative_id_number} onChange={set('representative_id_number')}
            placeholder="012345678901" hint="Biến: {{ firm_rep_id }}" />
          <Field label="Ngày cấp" value={form.representative_id_date} onChange={set('representative_id_date')}
            placeholder="01/01/2020" hint="Biến: {{ firm_rep_id_date }}" />
          <Field label="Nơi cấp" value={form.representative_id_place} onChange={set('representative_id_place')}
            placeholder="Cục Cảnh sát QLHC về TTXH..." hint="Biến: {{ firm_rep_id_place }}" />
        </div>
      </section>

      {/* Ngân hàng & đăng ký */}
      <section>
        <h3 className="text-xs font-black text-strong uppercase tracking-widest mb-3 pb-2 border-b border-base">Ngân hàng & Đăng ký kinh doanh</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Ngân hàng" value={form.bank_name} onChange={set('bank_name')}
            placeholder="Vietcombank — Chi nhánh Hà Nội" hint="Biến: {{ firm_bank_name }}" />
          <Field label="Số tài khoản" value={form.bank_account} onChange={set('bank_account')}
            placeholder="1234567890" hint="Biến: {{ firm_bank_account }}" />
          <Field label="Ngày cấp GCN ĐKKD" value={form.business_reg_date} onChange={set('business_reg_date')}
            placeholder="01/01/2020" hint="Biến: {{ firm_biz_reg_date }}" />
          <Field label="Nơi cấp GCN ĐKKD" value={form.business_reg_place} onChange={set('business_reg_place')}
            placeholder="Sở KH&ĐT Hà Nội" hint="Biến: {{ firm_biz_reg_place }}" />
        </div>
      </section>

      {/* Nội dung con dấu */}
      <section>
        <h3 className="text-xs font-black text-strong uppercase tracking-widest mb-3 pb-2 border-b border-base">Con dấu</h3>
        <Field label="Nội dung con dấu" value={form.seal_text} onChange={set('seal_text')}
          placeholder="CÔNG TY TNHH ABC LEGAL" textarea
          hint="Biến: {{ firm_seal }}" />
      </section>

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary px-6 py-2.5 shadow-md shadow-orange-600/20"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
          {saving ? 'Đang lưu...' : 'Lưu thông tin'}
        </button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — Document Types (multi-category)
// ════════════════════════════════════════════════════════════════════════════
const CAT_COLORS = {
  hkd:     { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700' },
  tldn_1:  { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700' },
  tldn_2:  { bg: 'bg-blue-100   dark:bg-blue-900/30',   text: 'text-blue-700   dark:text-blue-300',   border: 'border-blue-200   dark:border-blue-700'   },
  tldn_3:  { bg: 'bg-green-100  dark:bg-green-900/30',  text: 'text-green-700  dark:text-green-300',  border: 'border-green-200  dark:border-green-700'  },
  company: { bg: 'bg-slate-100  dark:bg-slate-800',     text: 'text-slate-600  dark:text-slate-300',  border: 'border-slate-200  dark:border-slate-600'  },
};

// Multi-category checkbox widget
const CategoryPicker = ({ value, onChange }) => {
  const cats = Array.isArray(value) ? value : (value || '').split(',').filter(Boolean);
  const toggle = (v) => {
    const next = cats.includes(v) ? cats.filter(c => c !== v) : [...cats, v];
    onChange(next.length ? next : [v]); // at least 1 required
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORY_OPTIONS.map(o => {
        const on = cats.includes(o.value);
        const col = CAT_COLORS[o.value];
        return (
          <button key={o.value} type="button" onClick={() => toggle(o.value)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all
              ${on ? `${col.bg} ${col.text} ${col.border}` : 'bg-surface border-base text-weak hover:border-orange-300'}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
};

const DocTypesTab = ({ toast }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState(null);
  const [newForm, setNewForm] = useState({ name: '', description: '', categories: ['hkd'], sort_order: 0 });
  const [filterActive, setFilterActive] = useState('all'); // 'all' | 'active' | 'inactive'
  const fileInputs = useRef({});

  const load = () => {
    setLoading(true);
    api('/document-types').then(r => setItems(r.data.items)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = items.filter(i => {
    if (filterActive === 'active') return i.is_active;
    if (filterActive === 'inactive') return !i.is_active;
    return true;
  });

  // Tạo mới
  const handleCreate = async () => {
    if (!newForm.name.trim()) { toast.show('Nhập tên loại hồ sơ', 'error'); return; }
    if (!newForm.categories.length) { toast.show('Chọn ít nhất 1 loại hình', 'error'); return; }
    try {
      const res = await post('/document-types', newForm);
      setItems(prev => [...prev, res.data]);
      setNewForm({ name: '', description: '', categories: ['hkd'], sort_order: 0 });
      setCreating(false);
      toast.show('Đã thêm loại hồ sơ');
    } catch (e) {
      toast.show(e.response?.data?.detail || 'Lỗi tạo loại hồ sơ', 'error');
    }
  };

  // Cập nhật inline
  const handleUpdate = async (id, data) => {
    try {
      const res = await put(`/document-types/${id}`, data);
      setItems(prev => prev.map(i => i.id === id ? res.data : i));
      setEditId(null);
      toast.show('Đã cập nhật');
    } catch (e) {
      toast.show(e.response?.data?.detail || 'Lỗi cập nhật', 'error');
    }
  };

  // Xóa
  const handleDelete = async (id) => {
    if (!window.confirm('Xóa loại hồ sơ này? File template cũng sẽ bị xóa.')) return;
    try {
      await del(`/document-types/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.show('Đã xóa');
    } catch (e) {
      toast.show('Lỗi xóa', 'error');
    }
  };

  // Upload file
  const handleUpload = async (id) => {
    const file = fileInputs.current[id]?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await post(`/document-types/${id}/upload`, formData, {
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'multipart/form-data' },
      });
      toast.show('Upload thành công');
      load();
    } catch (e) {
      toast.show(e.response?.data?.detail || 'Upload thất bại', 'error');
    } finally {
      if (fileInputs.current[id]) fileInputs.current[id].value = '';
    }
  };

  // Download
  const handleDownload = async (item) => {
    try {
      const res = await axios.get(`/api/v1/tenant/document-types/${item.id}/download`, {
        headers: { Authorization: `Bearer ${token()}` },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = item.original_filename || `${item.name}.docx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.show('Tải về thất bại', 'error');
    }
  };

  const activeCount = items.filter(i => i.is_active).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {[
            { key: 'all',      label: `Tất cả (${items.length})` },
            { key: 'active',   label: `Đang dùng (${activeCount})` },
            { key: 'inactive', label: `Tắt (${items.length - activeCount})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterActive(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                ${filterActive === f.key
                  ? 'bg-orange-600 text-white shadow'
                  : 'bg-surface border border-base text-weak hover:border-orange-300'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary text-xs px-4 py-2 shrink-0">
          <Plus size={13} /> Thêm loại hồ sơ
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl">
        <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Mỗi hồ sơ có thể áp dụng cho <strong>nhiều loại hình</strong> doanh nghiệp.
          Upload file <strong>.docx</strong> làm template — dùng biến{' '}
          <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded text-[10px]">{'{{ hkd_name }}'}</code>,{' '}
          <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded text-[10px]">{'{{ firm_name }}'}</code> trong template.
        </p>
      </div>

      {/* Create form */}
      {creating && (
        <div className="card p-5 border-2 border-orange-200 dark:border-orange-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-strong">Thêm loại hồ sơ mới</span>
            <button onClick={() => setCreating(false)} className="btn-ghost p-1"><X size={14} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-weak uppercase mb-1.5 block">Tên loại hồ sơ *</label>
              <input className="input w-full text-sm" placeholder="Ví dụ: Giấy ủy quyền dịch vụ"
                value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-weak uppercase mb-1.5 block">Thứ tự</label>
              <input type="number" className="input w-full text-sm" value={newForm.sort_order}
                onChange={e => setNewForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-semibold text-weak uppercase mb-1.5 block">Mô tả</label>
              <input className="input w-full text-sm" placeholder="Mô tả ngắn..."
                value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-weak uppercase mb-2 block">
              Áp dụng cho loại hình <span className="text-red-500">*</span>
            </label>
            <CategoryPicker value={newForm.categories}
              onChange={cats => setNewForm(f => ({ ...f, categories: cats }))} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setCreating(false)} className="btn-ghost text-xs px-4 py-2">Hủy</button>
            <button onClick={handleCreate} className="btn-primary text-xs px-5 py-2">
              <Plus size={13} /> Tạo
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <FileText size={36} className="mx-auto text-weak/30" />
          <p className="text-sm text-weak">
            {items.length === 0
              ? <>Chưa có loại hồ sơ nào. Nhấn <strong>Thêm loại hồ sơ</strong> để bắt đầu.</>
              : 'Không có hồ sơ nào phù hợp.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(item => (
            <DocTypeRow
              key={item.id}
              item={item}
              editId={editId}
              setEditId={setEditId}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onUpload={handleUpload}
              onDownload={handleDownload}
              fileInputRef={el => { if (el) fileInputs.current[item.id] = el; }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — Tình trạng hồ sơ
// ════════════════════════════════════════════════════════════════════════════
const StatusTab = ({ toast }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const load = () => {
    setLoading(true);
    configApi.getStatuses()
      .then(r => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.show('Nhập tên tình trạng', 'error'); return; }
    try {
      const res = await configApi.createStatus({ name: newName.trim() });
      setItems(prev => [...prev, res.data]);
      setNewName(''); setCreating(false);
      toast.show('Đã thêm tình trạng');
    } catch (e) {
      toast.show(e.response?.data?.detail || 'Lỗi tạo tình trạng', 'error');
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try {
      const res = await configApi.updateStatus(id, { name: editName.trim() });
      setItems(prev => prev.map(i => i.id === id ? res.data : i));
      setEditId(null);
      toast.show('Đã cập nhật');
    } catch (e) {
      toast.show(e.response?.data?.detail || 'Lỗi cập nhật', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa tình trạng này?')) return;
    try {
      await configApi.delete('statuses', id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.show('Đã xóa');
    } catch (e) {
      toast.show('Lỗi xóa', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-weak">Các trạng thái áp dụng cho hồ sơ HKD và Doanh nghiệp.</p>
        <button onClick={() => { setCreating(true); setNewName(''); }}
          className="btn-primary text-xs px-4 py-2">
          <Plus size={13} /> Thêm tình trạng
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="card p-4 border-2 border-orange-200 dark:border-orange-800 flex items-center gap-3">
          <Tag size={15} className="text-orange-500 shrink-0" />
          <input
            autoFocus
            className="input flex-1 text-sm"
            placeholder="VD: Đang tư vấn / Đã ký HĐ / Hoàn thành..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
          />
          <button onClick={handleCreate} className="btn-primary text-xs px-4 py-2 shrink-0">
            <Plus size={12} /> Tạo
          </button>
          <button onClick={() => setCreating(false)} className="btn-ghost p-2 text-weak shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-14">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-14 space-y-3">
          <Tag size={36} className="mx-auto text-weak/30" />
          <p className="text-sm text-weak">Chưa có tình trạng nào. Nhấn <strong>Thêm tình trạng</strong> để bắt đầu.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="card p-3.5 flex items-center gap-3">
              <span className="text-[10px] font-black text-weak/50 w-5 text-right shrink-0">{idx + 1}</span>
              {editId === item.id ? (
                <>
                  <input
                    autoFocus
                    className="input flex-1 text-sm"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdate(item.id); if (e.key === 'Escape') setEditId(null); }}
                  />
                  <button onClick={() => handleUpdate(item.id)} className="btn-primary text-xs px-3 py-1.5 shrink-0">
                    <Save size={12} />
                  </button>
                  <button onClick={() => setEditId(null)} className="btn-ghost p-1.5 text-weak shrink-0">
                    <X size={13} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-semibold text-strong">{item.name}</span>
                  <button onClick={() => { setEditId(item.id); setEditName(item.name); }}
                    className="btn-ghost p-1.5 text-weak hover:text-strong shrink-0">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDelete(item.id)}
                    className="btn-ghost p-1.5 text-weak hover:text-red-600 shrink-0">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Single doc type row ───────────────────────────────────────────────────────
const DocTypeRow = ({ item, editId, setEditId, onUpdate, onDelete, onUpload, onDownload, fileInputRef }) => {
  const isEditing = editId === item.id;
  const cats = item.categories || (item.category ? item.category.split(',').filter(Boolean) : ['hkd']);
  const [editForm, setEditForm] = useState({
    name: item.name,
    description: item.description || '',
    categories: cats,
    sort_order: item.sort_order,
  });

  // Reset form when item changes
  React.useEffect(() => {
    if (!isEditing) return;
    const c = item.categories || (item.category ? item.category.split(',').filter(Boolean) : ['hkd']);
    setEditForm({ name: item.name, description: item.description || '', categories: c, sort_order: item.sort_order });
  }, [isEditing, item]);

  if (isEditing) {
    return (
      <div className="card p-4 border-2 border-orange-200 dark:border-orange-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-weak uppercase mb-1 block">Tên *</label>
            <input className="input w-full text-sm" value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Escape' && setEditId(null)} autoFocus />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-weak uppercase mb-1 block">Thứ tự</label>
            <input type="number" className="input w-full text-sm" value={editForm.sort_order}
              onChange={e => setEditForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-semibold text-weak uppercase mb-1 block">Mô tả</label>
            <input className="input w-full text-sm" value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả ngắn..." />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-weak uppercase mb-2 block">
            Áp dụng cho loại hình <span className="text-red-500">*</span>
          </label>
          <CategoryPicker value={editForm.categories}
            onChange={cats => setEditForm(f => ({ ...f, categories: cats }))} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditId(null)} className="btn-ghost text-xs px-4 py-2">Hủy</button>
          <button onClick={() => onUpdate(item.id, editForm)} className="btn-primary text-xs px-5 py-2">
            <Save size={12} /> Lưu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`card p-4 transition-opacity ${!item.is_active ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Active toggle dot */}
        <button
          onClick={() => onUpdate(item.id, { is_active: !item.is_active })}
          title={item.is_active ? 'Bấm để tắt' : 'Bấm để bật'}
          className={`mt-1 shrink-0 w-3 h-3 rounded-full border-2 transition-all
            ${item.is_active
              ? 'bg-emerald-500 border-emerald-500'
              : 'bg-transparent border-slate-300 dark:border-slate-600'}`}
        />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Name + file status */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-sm font-bold ${item.is_active ? 'text-strong' : 'text-weak'}`}>
              {item.name}
            </span>
            {!item.is_active && (
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-weak">
                Tắt
              </span>
            )}
            <span className="ml-auto shrink-0">
              {item.has_template ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                  <CheckCircle2 size={10} /> {item.original_filename}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold">
                  <AlertCircle size={10} /> Chưa có template
                </span>
              )}
            </span>
          </div>

          {/* Row 2: Category badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {cats.map(c => {
              const opt = CATEGORY_OPTIONS.find(o => o.value === c);
              const col = CAT_COLORS[c] || CAT_COLORS.company;
              return (
                <span key={c} className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${col.bg} ${col.text} ${col.border}`}>
                  {opt?.label || c}
                </span>
              );
            })}
            {item.description && (
              <span className="text-[10px] text-weak ml-1 truncate max-w-xs">{item.description}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Upload */}
          <label className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300 rounded-xl text-[11px] font-semibold cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/40 transition">
            <Upload size={11} /> {item.has_template ? 'Đổi' : 'Upload'}
            <input type="file" accept=".docx,.doc" className="hidden"
              ref={fileInputRef} onChange={() => onUpload(item.id)} />
          </label>

          {/* Download */}
          {item.has_template && (
            <button onClick={() => onDownload(item)} title="Tải về template"
              className="p-1.5 rounded-xl border border-base text-weak hover:text-strong hover:border-orange-300 transition">
              <Download size={13} />
            </button>
          )}

          {/* Edit */}
          <button
            onClick={() => setEditId(item.id)}
            title="Chỉnh sửa"
            className="p-1.5 rounded-xl border border-base text-weak hover:text-strong hover:border-orange-300 transition">
            <Edit2 size={13} />
          </button>

          {/* Delete */}
          <button onClick={() => onDelete(item.id)} title="Xóa"
            className="p-1.5 rounded-xl border border-base text-weak hover:text-red-600 hover:border-red-300 transition">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Main page
// ════════════════════════════════════════════════════════════════════════════
const TenantSettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const toast = useToast();

  return (
    <div className="flex-1 flex flex-col bg-page overflow-auto">
      <div className="max-w-4xl mx-auto w-full px-6 py-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-base font-black text-strong flex items-center gap-2">
            <Building2 size={18} className="text-orange-600" />
            Cài đặt công ty
          </h1>
          <p className="text-xs text-weak mt-0.5">Cấu hình thông tin công ty và quản lý loại hồ sơ xuất tài liệu</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-base">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all -mb-px
                  ${activeTab === tab.key
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-weak hover:text-strong'}`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'profile'  && <ProfileTab  toast={toast} />}
          {activeTab === 'statuses' && <StatusTab   toast={toast} />}
          {activeTab === 'doctypes' && <DocTypesTab toast={toast} />}
        </div>
      </div>

      <Toast msg={toast.msg} />
    </div>
  );
};

export default TenantSettingsPage;
