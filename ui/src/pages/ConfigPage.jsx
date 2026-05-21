import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Briefcase, Radio, Tag, X, RefreshCw, ChevronDown, ChevronUp, Settings, AlertCircle } from 'lucide-react';
import { configApi } from '../services/api';

// ── Modal thêm / sửa ──────────────────────────────────────────────────────────

const ItemModal = ({ mode, item, sectionLabel, onClose, onSaved }) => {
  const isEdit = mode === 'edit';
  const [name, setName] = useState(item?.name || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [crmId, setCrmId] = useState(item?.crm_id || '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setErr('Vui lòng nhập tên'); return; }
    onSaved({ name: name.trim(), crm_id: crmId.trim() || null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-base">
          <span className="text-sm font-semibold text-strong">
            {isEdit ? `Sửa ${sectionLabel}` : `Thêm ${sectionLabel}`}
          </span>
          <button onClick={onClose} className="text-weak hover:text-strong transition-colors"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          {err && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{err}</div>
          )}

          <div>
            <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Tên *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500"
              placeholder={`VD: ${sectionLabel === 'Nguồn khách' ? 'Facebook / Zalo / Giới thiệu' : sectionLabel === 'Trạng thái' ? 'Đang tư vấn / Đã ký HĐ' : 'Nguyễn Văn A'}`}
            />
          </div>

          {/* Advanced: CRM ID — ẩn mặc định */}
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1 text-[10px] text-weak hover:text-body transition-colors w-fit"
          >
            {showAdvanced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            Nâng cao (ID CRM)
          </button>

          {showAdvanced && (
            <div>
              <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">ID CRM (tuỳ chọn)</label>
              <input
                value={crmId}
                onChange={e => setCrmId(e.target.value)}
                className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500"
                placeholder="VD: src_001"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-2 bg-orange-600 text-white text-xs rounded-xl hover:bg-orange-700 transition disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : (isEdit ? 'Lưu thay đổi' : 'Thêm')}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Section card ───────────────────────────────────────────────────────────────

const SECTION_ACCENT = {
  'text-blue-600':    { dot: 'bg-blue-500',    ring: 'bg-blue-100 dark:bg-blue-900/30',   count: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  'text-orange-600':  { dot: 'bg-orange-500',  ring: 'bg-orange-100 dark:bg-orange-900/30', count: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  'text-emerald-600': { dot: 'bg-emerald-500', ring: 'bg-emerald-100 dark:bg-emerald-900/30', count: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

const ConfigSection = ({ title, icon: Icon, color, data, loading, error, onAdd, onEdit, onDelete }) => {
  const accent = SECTION_ACCENT[color] || SECTION_ACCENT['text-orange-600'];
  return (
    <div className="card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-base flex items-center justify-between bg-page/50">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${accent.ring}`}>
            <Icon size={14} className={color} />
          </div>
          <span className="text-[13px] font-medium text-strong">{title}</span>
          {!loading && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none ${accent.count}`}>
              {data.length}
            </span>
          )}
        </div>
        <button onClick={onAdd} className="btn-primary py-1 px-2.5 text-[11px]">
          <Plus size={11} /> Thêm
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-[180px] max-h-[400px]">
        {loading && (
          <div className="flex justify-center py-10">
            <div className="spinner" />
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-2 text-xs text-red-500 px-3 py-6 italic">
            <AlertCircle size={12} /> {error}
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent.ring}`}>
              <Icon size={14} className={`${color} opacity-50`} />
            </div>
            <div className="text-[11px] text-weak">
              Chưa có dữ liệu
            </div>
          </div>
        )}

        {!loading && !error && data.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-page group transition-colors cursor-default"
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${accent.dot} opacity-60`} />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium text-strong truncate">{item.name}</div>
                {item.crm_id && (
                  <div className="text-[10px] text-weak mt-0.5">CRM ID: {item.crm_id}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
              <button onClick={() => onEdit(item)} className="btn-icon hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20" title="Sửa">
                <Edit2 size={12} />
              </button>
              <button onClick={() => onDelete(item)} className="btn-icon hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Xóa">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Page ───────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    key: 'staff',
    label: 'Nhân viên phụ trách',
    icon: Briefcase,
    color: 'text-blue-600',
    api: {
      get: () => configApi.getStaff(),
      create: (d) => configApi.createStaff(d),
      update: (id, d) => configApi.updateStaff(id, d),
      delete: (id) => configApi.delete('staff', id),
    },
  },
  {
    key: 'sources',
    label: 'Nguồn khách',
    icon: Radio,
    color: 'text-orange-600',
    api: {
      get: () => configApi.getSources(),
      create: (d) => configApi.createSource(d),
      update: (id, d) => configApi.updateSource(id, d),
      delete: (id) => configApi.delete('sources', id),
    },
  },
  {
    key: 'statuses',
    label: 'Trạng thái hồ sơ',
    icon: Tag,
    color: 'text-emerald-600',
    api: {
      get: () => configApi.getStatuses(),
      create: (d) => configApi.createStatus(d),
      update: (id, d) => configApi.updateStatus(id, d),
      delete: (id) => configApi.delete('statuses', id),
    },
  },
];

const ConfigPage = () => {
  const [data, setData] = useState({ staff: [], sources: [], statuses: [] });
  const [loading, setLoading] = useState({ staff: true, sources: true, statuses: true });
  const [errors, setErrors] = useState({ staff: '', sources: '', statuses: '' });

  // modal: null | { section, mode: 'add'|'edit', item }
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { section, item }
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchSection = useCallback(async (sec) => {
    setLoading(prev => ({ ...prev, [sec.key]: true }));
    setErrors(prev => ({ ...prev, [sec.key]: '' }));
    try {
      const res = await sec.api.get();
      setData(prev => ({ ...prev, [sec.key]: res.data || [] }));
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Không thể tải dữ liệu';
      setErrors(prev => ({ ...prev, [sec.key]: msg }));
    } finally {
      setLoading(prev => ({ ...prev, [sec.key]: false }));
    }
  }, []);

  const fetchAll = useCallback(() => {
    SECTIONS.forEach(sec => fetchSection(sec));
  }, [fetchSection]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async (formData) => {
    const { section, mode, item } = modal;
    try {
      if (mode === 'edit') {
        await section.api.update(item.id, formData);
      } else {
        await section.api.create(formData);
      }
      setModal(null);
      fetchSection(section);
    } catch (e) {
      alert(e.response?.data?.detail || 'Lỗi khi lưu, vui lòng thử lại');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteTarget.section.api.delete(deleteTarget.item.id);
      setDeleteTarget(null);
      fetchSection(deleteTarget.section);
    } catch (e) {
      alert(e.response?.data?.detail || 'Lỗi khi xóa');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-inner" style={{ maxWidth: 1024 }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0 mt-0.5">
              <Settings size={15} className="text-orange-600" />
            </div>
            <div>
              <h1 className="text-[15px] font-black text-strong">Cấu hình hệ thống</h1>
              <p className="text-[11px] text-weak mt-0.5">
                Nhân viên phụ trách, nguồn khách và trạng thái hồ sơ — riêng cho từng văn phòng
              </p>
            </div>
          </div>
          <button onClick={fetchAll} className="btn-icon shrink-0" title="Làm mới tất cả">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SECTIONS.map(sec => (
            <ConfigSection
              key={sec.key}
              title={sec.label}
              icon={sec.icon}
              color={sec.color}
              data={data[sec.key]}
              loading={loading[sec.key]}
              error={errors[sec.key]}
              onAdd={() => setModal({ section: sec, mode: 'add', item: null })}
              onEdit={(item) => setModal({ section: sec, mode: 'edit', item })}
              onDelete={(item) => setDeleteTarget({ section: sec, item })}
            />
          ))}
        </div>
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <ItemModal
          mode={modal.mode}
          item={modal.item}
          sectionLabel={modal.section.label}
          onClose={() => setModal(null)}
          onSaved={handleSave}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <div className="text-sm font-medium text-strong mb-1">Xác nhận xóa</div>
            <p className="text-xs text-weak mb-5 leading-relaxed">
              Bạn có chắc muốn xóa{' '}
              <span className="font-medium text-strong">"{deleteTarget.item.name}"</span>?
              Các hồ sơ đang dùng mục này sẽ mất liên kết.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-xs border border-base rounded-xl text-weak hover:text-strong hover:bg-page transition">
                Hủy
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 py-2 text-xs bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-50 font-medium">

                {deleteLoading ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigPage;
