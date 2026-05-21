import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Search, LayoutGrid, ChevronRight, ArrowLeft,
  Edit2, Check, X, Hash, AlertCircle,
} from 'lucide-react';
import { fieldsApi, industryApi } from '../services/api';
import Modal from '../components/Common/Modal';
import { useAuth } from '../context/AuthContext';

/* ── Industry selector modal ────────────────────────────────────────────── */
const IndustrySelectorModal = ({ isOpen, onClose, onSelect, industries }) => {
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const inputRef = useRef();

  useEffect(() => {
    if (isOpen) { setQuery(''); setNote(''); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [isOpen]);

  const filtered = query.length >= 1
    ? industries.filter(i =>
        i.code.toLowerCase().includes(query.toLowerCase()) ||
        i.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 30)
    : [];

  const selected = industries.find(i => i.code === query);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thêm ngành nghề vào lĩnh vực"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Hủy</button>
          <button
            disabled={!query.trim()}
            onClick={() => { onSelect(query, note); setQuery(''); setNote(''); }}
            className="btn-primary disabled:opacity-40"
          >
            <Check size={13} /> Xác nhận thêm
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="section-label">Tìm mã / tên ngành nghề</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-weak pointer-events-none" />
            <input
              ref={inputRef}
              className="input-base pl-9"
              placeholder="VD: 0111 hoặc Trồng lúa..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          {filtered.length > 0 && (
            <div className="mt-1.5 max-h-40 overflow-y-auto border border-base rounded-xl bg-surface shadow-sm">
              {filtered.map(i => (
                <button
                  key={i.code}
                  type="button"
                  onClick={() => setQuery(i.code)}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors hover:bg-page ${
                    query === i.code
                      ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 font-medium'
                      : 'text-body'
                  }`}
                >
                  <span className="font-medium text-orange-600 dark:text-orange-400">{i.code}</span>
                  <span className="text-weak ml-2">—</span>
                  <span className="ml-2">{i.name}</span>
                </button>
              ))}
            </div>
          )}
          {selected && (
            <div className="mt-2 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 text-xs text-orange-700 dark:text-orange-400">
              ✓ Đã chọn: <strong>{selected.code}</strong> — {selected.name}
            </div>
          )}
        </div>
        <div>
          <label className="section-label">Ghi chú nghiệp vụ (tuỳ chọn)</label>
          <textarea
            className="input-base resize-none h-20"
            placeholder="VD: Áp dụng cho doanh nghiệp ngoại tỉnh..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};

/* ── Add field inline modal ─────────────────────────────────────────────── */
const AddFieldModal = ({ onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setErr('Vui lòng nhập tên'); return; }
    setLoading(true);
    try {
      await fieldsApi.create({ name: name.trim() });
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.detail || 'Lỗi khi tạo lĩnh vực');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-base">
          <span className="text-sm font-medium text-strong">Tạo lĩnh vực mới</span>
          <button onClick={onClose} className="btn-icon"><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          {err && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5">
              <AlertCircle size={12} />{err}
            </div>
          )}
          <div>
            <label className="section-label">Tên lĩnh vực *</label>
            <input
              autoFocus value={name} onChange={e => setName(e.target.value)}
              className="input-base" placeholder="VD: Thương mại, Xây dựng..."
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-1 py-2.5">
            {loading ? <><span className="spinner w-3.5 h-3.5" /> Đang tạo...</> : 'Tạo lĩnh vực'}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ── Page ───────────────────────────────────────────────────────────────── */
const FieldsPage = () => {
  const { can } = useAuth();
  const [fields, setFields] = useState([]);
  const [allIndustries, setAllIndustries] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [showAddInd, setShowAddInd] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [f, ind] = await Promise.all([fieldsApi.list(), industryApi.list()]);
      setFields(f.data);
      setAllIndustries(ind.data);
      if (selectedField) {
        const updated = f.data.find(x => x.id === selectedField.id);
        if (updated) setSelectedField(updated);
      }
    } catch {}
  };

  const handleLink = async (code, note) => {
    try {
      await fieldsApi.linkIndustry(selectedField.id, code, note);
      fetchData();
      setShowAddInd(false);
    } catch (e) { alert('Lỗi khi thêm ngành nghề'); }
  };

  const handleUpdateNote = async (code, note) => {
    try {
      await fieldsApi.updateIndustryNote(selectedField.id, code, note);
      setEditingNote(null);
      fetchData();
    } catch { alert('Lỗi khi cập nhật ghi chú'); }
  };

  const handleDeleteField = async () => {
    if (!window.confirm(`Xóa lĩnh vực "${selectedField.name}"?`)) return;
    try {
      await fieldsApi.delete(selectedField.id);
      setSelectedField(null);
      fetchData();
    } catch (e) { alert('Lỗi: ' + (e.response?.data?.detail || e.message)); }
  };

  const handleUnlink = async (code) => {
    if (!confirm('Xóa ngành nghề này khỏi lĩnh vực?')) return;
    try {
      await fieldsApi.unlinkIndustry(selectedField.id, code);
      fetchData();
    } catch { alert('Lỗi khi xóa'); }
  };

  return (
    <div className="flex-1 flex overflow-hidden">

      {/* ── LEFT: Field list ──────────────────────────────────────────── */}
      <div className={`transition-all duration-300 border-r border-base flex flex-col bg-surface overflow-hidden shrink-0 ${selectedField ? 'w-[240px]' : 'flex-1 max-w-xs'}`}>

        {/* Header */}
        <div className="px-4 py-4 border-b border-base flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <LayoutGrid size={15} className="text-orange-600" />
              <h1 className="text-[14px] font-black text-strong">Lĩnh vực</h1>
            </div>
            <p className="text-[11px] text-weak mt-0.5 ml-6">{fields.length} lĩnh vực</p>
          </div>
          {can('fields', 'create') && (
            <button onClick={() => setShowAddField(true)} className="btn-primary py-1.5 px-2.5 text-[11px]">
              <Plus size={12} /> Thêm
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {fields.map(f => {
            const isActive = selectedField?.id === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedField(f)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between group ${
                  isActive
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                    : 'text-body hover:bg-page hover:text-strong'
                }`}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? 'bg-orange-200 dark:bg-orange-800' : 'bg-page dark:bg-slate-800 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20'
                  }`}>
                    <LayoutGrid size={12} className={isActive ? 'text-orange-600' : 'text-weak'} />
                  </div>
                  <span className={`text-[12.5px] truncate ${isActive ? 'font-medium' : ''}`}>{f.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(f.industries?.length || 0) > 0 && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isActive ? 'bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300' : 'bg-page text-weak'}`}>
                      {f.industries.length}
                    </span>
                  )}
                  <ChevronRight size={13} className={`transition-transform ${isActive ? 'text-orange-500 translate-x-0.5' : 'text-weak/50'}`} />
                </div>
              </button>
            );
          })}

          {fields.length === 0 && (
            <div className="empty-state py-16">
              <div className="empty-state-icon">
                <LayoutGrid size={18} />
              </div>
              <div className="text-xs text-weak text-center">
                <div className="font-medium text-strong mb-1">Chưa có lĩnh vực</div>
                <div>Nhấn "Thêm" để tạo lĩnh vực mới</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Detail panel ────────────────────────────────────────── */}
      {selectedField ? (
        <div className="flex-1 flex flex-col bg-page overflow-hidden">

          {/* Detail header */}
          <div className="bg-surface border-b border-base px-5 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedField(null)}
                className="btn-icon hover:text-orange-600" title="Quay lại">
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-[14px] font-black text-strong">{selectedField.name}</h2>
                <p className="text-[11px] text-weak mt-0.5">
                  {selectedField.industries?.length || 0} ngành nghề
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {can('fields', 'delete') && (
                <button onClick={handleDeleteField}
                  className="btn-ghost text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <Trash2 size={13} /> Xóa lĩnh vực
                </button>
              )}
              {can('fields', 'create') && (
                <button onClick={() => setShowAddInd(true)} className="btn-primary">
                  <Plus size={13} /> Thêm ngành nghề
                </button>
              )}
            </div>
          </div>

          {/* Industry list */}
          <div className="flex-1 overflow-y-auto p-5">
            {(!selectedField.industries || selectedField.industries.length === 0) ? (
              <div className="empty-state py-20">
                <div className="empty-state-icon">
                  <Hash size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-strong mb-1">Chưa có ngành nghề</div>
                  <div className="text-xs text-weak">Nhấn "Thêm ngành nghề" để gắn vào lĩnh vực này</div>
                </div>
                {can('fields', 'create') && (
                  <button onClick={() => setShowAddInd(true)} className="btn-primary mt-1">
                    <Plus size={13} /> Thêm ngành nghề đầu tiên
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-w-2xl">
                {selectedField.industries.map((li, idx) => (
                  <div key={idx} className="card p-4 group hover:border-orange-200 dark:hover:border-orange-800 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mt-0.5">
                          <Hash size={14} className="text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-0.5">
                            {li.industry?.code}
                          </div>
                          <div className="text-[13px] font-medium text-strong leading-tight">{li.industry?.name}</div>

                          {/* Note editing */}
                          {editingNote?.code === li.industry.code ? (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                autoFocus
                                className="input-base flex-1 py-1.5 text-xs"
                                value={editingNote.note}
                                onChange={e => setEditingNote({ ...editingNote, note: e.target.value })}
                                placeholder="Ghi chú nghiệp vụ..."
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleUpdateNote(editingNote.code, editingNote.note);
                                  if (e.key === 'Escape') setEditingNote(null);
                                }}
                              />
                              <button onClick={() => handleUpdateNote(editingNote.code, editingNote.note)}
                                className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
                                <Check size={12} />
                              </button>
                              <button onClick={() => setEditingNote(null)}
                                className="p-1.5 bg-page text-body rounded-lg hover:bg-input transition">
                                <X size={12} />
                              </button>
                            </div>
                          ) : li.note ? (
                            <div className="mt-1.5 text-[11px] text-weak italic flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-weak/50 shrink-0" />
                              {li.note}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {can('fields', 'update') && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => setEditingNote({ code: li.industry.code, note: li.note || '' })}
                            className="btn-icon hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            title="Sửa ghi chú"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleUnlink(li.industry.code)}
                            className="btn-icon hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Xóa khỏi lĩnh vực"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-page gap-3">
          <div className="w-16 h-16 rounded-3xl bg-surface border border-base flex items-center justify-center">
            <LayoutGrid size={28} className="text-weak opacity-50" />
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-body mb-1">Chọn một lĩnh vực</div>
            <div className="text-xs text-weak">để xem danh sách ngành nghề</div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddField && (
        <AddFieldModal
          onClose={() => setShowAddField(false)}
          onSaved={() => { setShowAddField(false); fetchData(); }}
        />
      )}
      <IndustrySelectorModal
        isOpen={showAddInd}
        onClose={() => setShowAddInd(false)}
        industries={allIndustries}
        onSelect={handleLink}
      />
    </div>
  );
};

export default FieldsPage;
