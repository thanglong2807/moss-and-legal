import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Save, Trash2, Plus, X, Search, MapPin,
  Download, Upload, Building2, ExternalLink,
  Info, Users, LayoutGrid, FileText, Loader2,
  CheckSquare, Square,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../Common/SearchableSelect';
import PersonTable from './PersonTable';
import CustomerDetailModal from '../Customer/CustomerDetailModal';
import { companyExportApi, companyTranslateApi } from '../../services/api';
import CompanyUploadModal from './CompanyUploadModal';
import { validatePhone, validateEmail, sortIndustriesByCode } from '../../utils/validators';
import { COMPANY_SEARCH_SITES } from '../../constants';

const TYPE_LABELS = { 1: 'TNHH 1TV', 2: 'TNHH 2TV+', 3: 'Cổ phần' };
const TYPE_COLORS = {
  1: 'bg-purple-600 text-white shadow-purple-200/60',
  2: 'bg-blue-600 text-white shadow-blue-200/60',
  3: 'bg-green-600 text-white shadow-green-200/60',
};

const fmtNum = (v) => v ? new Intl.NumberFormat('vi-VN').format(v) : '';
const parseNum = (s) => parseInt(String(s).replace(/\D/g, '')) || null;

// ── Industry picker dropdown ──────────────────────────────────────────────────
const IndustrySelect = ({ industries, onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const filtered = industries.filter(i =>
    i.code.toLowerCase().includes(query.toLowerCase()) || i.name.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div className="absolute top-full left-0 mt-2 w-[480px] max-w-[90vw] bg-surface rounded-2xl shadow-2xl border border-base z-50 overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="px-3 pt-3 pb-2 border-b border-faint flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-weak" />
          <input autoFocus className="w-full pl-9 pr-3 py-2 bg-page rounded-xl text-xs font-bold outline-none" placeholder="Tìm mã hoặc tên ngành..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-input text-weak transition"><X size={14} /></button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtered.map(i => (
          <div key={i.code} onClick={() => onSelect(i)} className="px-4 py-3 hover:bg-orange-50 cursor-pointer transition border-b border-faint last:border-none">
            <div className="text-[10px] font-black text-orange-600 uppercase">{i.code}</div>
            <div className="text-[11px] font-black text-body">{i.name}</div>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-8 text-center text-weak italic text-xs font-bold">Không tìm thấy</div>}
      </div>
    </div>
  );
};

// ── Export templates per company type ────────────────────────────────────────
const TLDN_TEMPLATES = {
  1: [ // LLC1 / 1TV
    { id: '000', name: 'Hướng dẫn ký' },
    { id: '001', name: 'Giấy đề nghị' },
    { id: '002', name: 'Điều lệ' },
    { id: '003', name: 'Giấy ủy quyền' },
    { id: '004', name: 'Danh sách chủ sở hữu hưởng lợi' },
  ],
  2: [ // LLC2 / 2TV
    { id: '000', name: 'Hướng dẫn ký' },
    { id: '001', name: 'Giấy đề nghị' },
    { id: '002', name: 'Điều lệ' },
    { id: '003', name: 'Danh sách thành viên' },
    { id: '004', name: 'Giấy ủy quyền' },
    { id: '005', name: 'Danh sách chủ sở hữu hưởng lợi' },
  ],
  3: [ // JSC / Cổ phần
    { id: '000', name: 'Hướng dẫn ký' },
    { id: '001', name: 'Giấy đề nghị' },
    { id: '002', name: 'Điều lệ' },
    { id: '003', name: 'Danh sách cổ đông' },
    { id: '004', name: 'Giấy ủy quyền' },
    { id: '005', name: 'Danh sách chủ sở hữu hưởng lợi' },
  ],
};

const ExportModal = ({ isOpen, onClose, formData, onSave }) => {
  const templates = TLDN_TEMPLATES[formData.company_type] || [];
  const [selected, setSelected] = useState(new Set(templates.map(t => t.id)));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setSelected(new Set((TLDN_TEMPLATES[formData.company_type] || []).map(t => t.id)));
  }, [formData.company_type]);

  if (!isOpen) return null;
  const toggle = (id) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };

  const handleExport = async () => {
    setLoading(true); setErr('');
    try {
      if (onSave) await onSave();
      const res = await companyExportApi.export(formData.id, [...selected]);
      const disposition = res.headers['content-disposition'] || '';
      let filename = `TLDN_${formData.code || 'export'}.${selected.size > 1 ? 'zip' : 'docx'}`;
      const match = disposition.match(/filename\*=UTF-8''(.+)/i) || disposition.match(/filename="?([^"]+)"?/i);
      if (match) filename = decodeURIComponent(match[1]);
      const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      const msg = e.response?.data ? await e.response.data.text?.() : e.message;
      setErr(msg || 'Lỗi khi tạo file');
    } finally { setLoading(false); }
  };

  const TYPE_LABEL = { 1: 'TNHH 1TV', 2: 'TNHH 2TV+', 3: 'Cổ phần' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface rounded-[28px] shadow-2xl w-[480px] p-8">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-base font-black text-strong uppercase tracking-tight">Xuất hồ sơ TLDN</h3>
          <button onClick={onClose} className="p-2 hover:bg-input rounded-xl text-weak"><X size={16} /></button>
        </div>
        <p className="text-[10px] font-bold text-weak mb-5">
          Loại hình: <span className="text-orange-600 font-black">{TYPE_LABEL[formData.company_type] || '—'}</span>
        </p>
        {err && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-5 text-xs font-bold text-red-500">{err}</div>}
        {templates.length === 0 ? (
          <div className="py-8 text-center text-weak text-sm font-bold italic">Chưa chọn loại hình hoặc chưa có biểu mẫu.</div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-[10px] font-black text-weak uppercase tracking-widest">Chọn biểu mẫu</span>
              <button onClick={() => setSelected(selected.size === templates.length ? new Set() : new Set(templates.map(t => t.id)))}
                className="text-[10px] font-black text-orange-600 hover:underline">
                {selected.size === templates.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
            <div className="space-y-2 mb-6">
              {templates.map(t => (
                <div key={t.id} onClick={() => toggle(t.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all border ${selected.has(t.id) ? 'bg-orange-50 border-orange-200' : 'border-faint hover:border-base'}`}>
                  {selected.has(t.id) ? <CheckSquare size={16} className="text-orange-600 shrink-0" /> : <Square size={16} className="text-weak shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-black text-orange-400 mr-2">{t.id}</span>
                    <span className={`text-sm font-bold ${selected.has(t.id) ? 'text-orange-800' : 'text-body'}`}>{t.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-6 py-2.5 text-weak font-bold text-sm">Đóng</button>
          {templates.length > 0 && (
            <button disabled={selected.size === 0 || loading} onClick={handleExport}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-2xl font-black text-sm hover:bg-orange-700 disabled:opacity-50 transition shadow-lg shadow-orange-100">
              <Download size={15} className={loading ? 'animate-bounce' : ''} />
              {loading ? 'Đang tạo...' : `Tải xuống (${selected.size})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── GOV modal (TODO) ──────────────────────────────────────────────────────────
const GovModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface rounded-[28px] shadow-2xl w-[420px] p-8 text-center">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 size={24} className="text-indigo-400" />
        </div>
        <h3 className="text-base font-black text-strong mb-2">Chuyển GOV — Đang phát triển</h3>
        <p className="text-xs font-bold text-weak mb-6">Tính năng nộp hồ sơ TLDN lên GOV chưa triển khai.<br />Liên hệ admin để cập nhật.</p>
        <button onClick={onClose} className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition">Đóng</button>
      </div>
    </div>
  );
};

// ── Default persons per company type ─────────────────────────────────────────
const defaultPersons = (type) => {
  if (type === 1) return [{ person_type: 'owner' }, { person_type: 'representative' }];
  if (type === 2) return [{ person_type: 'member' }, { person_type: 'representative' }];
  if (type === 3) return [{ person_type: 'founder' }, { person_type: 'representative' }];
  return [];
};

const TYPE_PERSON_KEY = { 1: 'owner', 2: 'member', 3: 'founder' };

const CompanyEditor = ({
  formData, updateFormData, onSave, onDelete, onClose,
  staff, sources, statuses, provinces, fields, allIndustries, positions,
  wardOptions, loadWards, customers,
}) => {
  const { can } = useAuth();
  const [activeIndustryIdx, setActiveIndustryIdx] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [translating, setTranslating] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showGov, setShowGov] = useState(false);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);

  // Cache persons by type key so switching back restores them
  const personsCache = useRef({});

  const handleTypeChange = useCallback((newType) => {
    const oldKey = TYPE_PERSON_KEY[formData.company_type];
    const newKey = TYPE_PERSON_KEY[newType];
    const currentPersons = formData.persons || [];

    // Save current non-rep persons to cache
    const nonRep = currentPersons.filter(p => p.person_type !== 'representative');
    if (nonRep.length > 0) personsCache.current[oldKey] = nonRep;

    // Restore from cache for new type, or default empty
    const cached = personsCache.current[newKey];
    const newNonRep = cached?.length ? cached : [{ person_type: newKey }];
    const reps = currentPersons.filter(p => p.person_type === 'representative');

    updateFormData('company_type', newType);
    updateFormData('persons', [...newNonRep, ...reps]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.company_type, formData.persons]);

  // Auto-load wards when company is opened
  useEffect(() => {
    const pid = formData?.company_info?.address?.province_id;
    if (pid) loadWards('company', pid);
    (formData?.persons || []).forEach((p, i) => {
      if (p.province_id) loadWards(`person_${i}`, p.province_id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData?.id]);

  // sync wardOptions['company'] on province change
  const wardCompany = wardOptions?.company || [];

  const ci = formData.company_info || {};
  const addr = ci.address || {};
  const contact = ci.contact || {};
  const nameInfo = ci.name || {};

  const setCI = (subpath, value) => updateFormData(`company_info.${subpath}`, value);

  const addIndustryRow = () => {
    updateFormData('industries', sortIndustriesByCode([{ code: '', name: '', is_main: !(formData.industries?.length), note: '' }, ...(formData.industries || [])]));
  };
  const removeIndustryRow = (idx) => {
    updateFormData('industries', formData.industries.filter((_, i) => i !== idx));
  };
  const copyFieldIndustries = () => {
    const field = fields.find(f => f.id === selectedFieldId || f.id === parseInt(selectedFieldId));
    if (!field) return;
    const existing = formData.industries || [];
    const existingCodes = new Set(existing.map(i => i.code));
    const toAdd = field.industries.filter(i => !existingCodes.has(i.industry.code)).map(i => ({ code: i.industry.code, name: i.industry.name, is_main: false, note: i.note }));
    if (toAdd.length > 0) updateFormData('industries', sortIndustriesByCode([...existing, ...toAdd]));
  };

  return (
    <div className="flex-1 flex flex-col bg-page animate-in fade-in slide-in-from-bottom-2 duration-300 border-l border-base">
      {/* ── Header ── */}
      <div className="bg-surface border-b border-base px-6 py-4 flex justify-between items-center z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-page rounded-2xl text-weak transition"><ArrowLeft size={20} /></button>
          <div className="px-3 border-l border-faint">
            <h2 className="text-base font-black text-strong tracking-tight uppercase italic">
              {formData.id ? `Sửa: ${formData.code}` : 'Doanh nghiệp mới'}
            </h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm ${TYPE_COLORS[formData.company_type] || 'bg-gray-500 text-white'}`}>
                {TYPE_LABELS[formData.company_type] || '?'}
              </span>
              <span className="text-[10px] font-black text-weak uppercase tracking-widest">{formData.customer?.name || 'Chưa chọn KH'}</span>
              {formData.folder_id && (
                <a href={`https://drive.google.com/drive/folders/${formData.folder_id}`} target="_blank" rel="noreferrer" className="text-[10px] font-black text-blue-500 flex items-center gap-1 hover:underline">
                  <ExternalLink size={10} /> DRIVE
                </a>
              )}
              {formData.crm_link && (
                <a href={formData.crm_link} target="_blank" rel="noreferrer" className="text-[10px] font-black text-emerald-500 flex items-center gap-1 hover:underline">
                  <ExternalLink size={10} /> CRM
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {formData.id && can('company', 'delete') && (
            <button onClick={onDelete} className="flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[11px] border bg-surface border-red-200 text-red-400 hover:bg-red-50 hover:border-red-400 hover:text-red-600 transition-all">
              <Trash2 size={14} /> Xóa hồ sơ
            </button>
          )}
          {can('company', formData.id ? 'update' : 'create') && (
            <button onClick={onSave} className="flex items-center gap-2 px-8 py-2 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 shadow-lg shadow-orange-200/50 dark:shadow-none font-black text-xs transition">
              <Save size={18} /> LƯU HỒ SƠ
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden px-8 py-8 min-w-0">
        {/* ── Main ── */}
        <div className="flex-1 overflow-y-auto space-y-8 pb-32 min-w-0">

          {/* Company type selector */}
          <div className="flex gap-2">
            {[{ v: 1, label: 'TNHH 1 TV' }, { v: 2, label: 'TNHH 2 TV+' }, { v: 3, label: 'Cổ phần' }].map(({ v, label }) => (
              <button key={v} onClick={() => handleTypeChange(v)}
                className={`flex-1 py-2.5 rounded-2xl text-xs font-black transition-all border ${
                  formData.company_type === v
                    ? v === 1 ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200/40'
                    : v === 2 ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200/40'
                    : 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-200/40'
                    : 'bg-surface text-body border-base hover:border-orange-300'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          {formData.id && (
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => setShowExport(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-base text-body rounded-2xl font-black text-xs hover:border-orange-400 hover:text-orange-600 shadow-sm transition">
                <Download size={14} /> Xuất hồ sơ
              </button>
              <button onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-base text-body rounded-2xl font-black text-xs hover:border-blue-400 hover:text-blue-600 shadow-sm transition">
                <Upload size={14} /> Upload Drive
              </button>
              <button onClick={() => setShowGov(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-base text-body rounded-2xl font-black text-xs hover:border-indigo-400 hover:text-indigo-600 shadow-sm transition">
                <Building2 size={14} /> Chuyển GOV
              </button>
            </div>
          )}

          {/* ── 1. Company Info ── */}
          <div className="bg-surface rounded-[24px] p-5 border border-slate-300 dark:border-slate-600 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 shadow-sm border border-orange-100"><FileText size={16} /></div>
                <h3 className="text-xs font-black text-strong uppercase tracking-widest">Thông tin Doanh nghiệp</h3>
              </div>
              {formData.customer && (
                <button
                  onClick={() => {
                    const c = formData.customer;
                    updateFormData('company_full_name', (c.name || '').toUpperCase());
                    setCI('address.province_id', c.province_id || '');
                    setCI('address.ward_id', c.ward_id || '');
                    setCI('address.street', c.street || '');
                    setCI('contact.phone', c.phone || '');
                    if (c.province_id) loadWards('company', c.province_id);
                  }}
                  className="text-[9px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-700 border border-orange-200 px-3 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 transition"
                >
                  Giống thông tin KH
                </button>
              )}
            </div>

            <div className="grid grid-cols-6 gap-3">
              {/* Row 1: Tên đầy đủ */}
              <div className="col-span-6">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Tên doanh nghiệp (đầy đủ)</label>
                <div className="flex items-stretch rounded-xl overflow-hidden border border-base bg-page focus-within:border-orange-500 focus-within:bg-surface transition-all">
                  <span className="flex items-center px-3 text-[10px] font-black text-body bg-input border-r border-base whitespace-nowrap select-none">
                    {formData.company_type === 3 ? 'CÔNG TY CỔ PHẦN' : 'CÔNG TY TNHH'}
                  </span>
                  <input className="flex-1 px-3 py-2.5 bg-transparent outline-none font-black text-sm uppercase"
                    value={formData.company_full_name || ''}
                    onChange={e => updateFormData('company_full_name', e.target.value.toUpperCase())}
                    placeholder="" />
                  <button
                    type="button"
                    title="Tìm kiếm trên Google"
                    onClick={() => {
                      const name = formData.company_full_name?.trim();
                      if (!name) return;
                      const prefix = formData.company_type === 3 ? 'CÔNG TY CỔ PHẦN' : 'CÔNG TY TNHH';
                      const siteFilter = COMPANY_SEARCH_SITES.join(' OR ');
                      const q = `${prefix} ${name} (${siteFilter})`;
                      window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
                    }}
                    className="shrink-0 flex items-center gap-1.5 px-3 text-weak hover:text-blue-600 hover:bg-blue-50 border-l border-base transition"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="text-[10px] font-black">Tìm kiếm</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Tên tiếng Anh + nút dịch */}
              <div className="col-span-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Tên tiếng Anh</label>
                <div className="flex gap-2">
                  <input className="flex-1 px-3 py-2.5 bg-page border border-base rounded-xl font-black text-sm outline-none focus:bg-surface focus:border-orange-500 transition-all uppercase"
                    value={nameInfo.foreign || ''}
                    onChange={e => setCI('name.foreign', e.target.value.toUpperCase())}
                    placeholder="ENGLISH NAME..." />
                  <button
                    onClick={async () => {
                      const src = formData.company_full_name?.trim();
                      if (!src) return;
                      setTranslating(true);
                      try {
                        const res = await companyTranslateApi.translateName(src, formData.company_type);
                        setCI('name.foreign', res.data.result);
                      } catch (e) {
                        alert('Lỗi dịch: ' + (e.response?.data?.detail || e.message));
                      } finally { setTranslating(false); }
                    }}
                    disabled={translating || !formData.company_full_name}
                    className="shrink-0 px-3 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] hover:bg-indigo-700 disabled:opacity-50 transition whitespace-nowrap">
                    {translating ? '...' : 'Dịch'}
                  </button>
                </div>
              </div>

              {/* Row 2 col 2: Tên viết tắt */}
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Tên viết tắt</label>
                <input className="w-full px-3 py-2.5 bg-page border border-base rounded-xl font-black text-sm outline-none focus:bg-surface focus:border-orange-500 transition-all uppercase"
                  value={nameInfo.short || ''}
                  onChange={e => setCI('name.short', e.target.value.toUpperCase())} />
              </div>

              {/* Row 3: Vốn điều lệ standalone — full row */}
              <div className="col-span-6">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Vốn điều lệ (VNĐ)</label>
                <input type="text" className="w-full px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl font-black text-sm outline-none focus:border-emerald-400 text-emerald-700 transition-all"
                  value={fmtNum(ci.charter_capital)}
                  onChange={e => setCI('charter_capital', parseNum(e.target.value))} />
              </div>

              {/* Address */}
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Tỉnh/Thành phố</label>
                <SearchableSelect value={addr.province_id || ''} onChange={id => { setCI('address.province_id', id); loadWards('company', id); }} options={provinces} placeholder="-- Chọn --" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Phường/Xã</label>
                <SearchableSelect value={addr.ward_id || ''} onChange={id => setCI('address.ward_id', id)} options={wardCompany} placeholder="-- Chọn --" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Số nhà, tên đường</label>
                <div className="flex gap-1.5">
                  <input className="flex-1 min-w-0 px-3 py-2.5 bg-page border border-base rounded-xl font-black text-sm outline-none"
                    value={addr.street || ''} onChange={e => setCI('address.street', e.target.value)} />
                  <button
                    type="button"
                    title="Xem trên Google Maps"
                    onClick={() => {
                      const parts = [addr.street, wardCompany.find(w => w.id === addr.ward_id)?.name, provinces.find(p => p.id === addr.province_id)?.name].filter(Boolean);
                      if (!parts.length) return;
                      window.open(`https://www.google.com/maps/search/${encodeURIComponent(parts.join(', '))}`, '_blank');
                    }}
                    className="shrink-0 flex items-center gap-1 px-2.5 bg-page border border-base rounded-xl text-weak hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition"
                  >
                    <MapPin size={13} /><span className="text-[10px] font-black">Xem Map</span>
                  </button>
                </div>
              </div>

              {/* SĐT + Email + Fax + Website (2x2) */}
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">SĐT</label>
                {(() => { const s = validatePhone(contact.phone); return (
                  <div>
                    <input className={`w-full px-3 py-2.5 bg-page border rounded-xl font-black text-sm outline-none ${s === 'error' ? 'border-red-400' : s === 'warn' ? 'border-yellow-400' : 'border-base'}`}
                      value={contact.phone || ''} onChange={e => setCI('contact.phone', e.target.value)} />
                    {s === 'error' && <p className="text-[10px] font-bold text-red-500 mt-0.5 px-1">SĐT không hợp lệ</p>}
                    {s === 'warn' && <p className="text-[10px] font-bold text-yellow-600 mt-0.5 px-1">⚠ 11 số?</p>}
                  </div>
                ); })()}
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Email</label>
                {(() => { const s = validateEmail(contact.email); return (
                  <div>
                    <input className={`w-full px-3 py-2.5 bg-page border rounded-xl font-black text-sm outline-none ${s === 'error' ? 'border-red-400' : 'border-base'}`}
                      value={contact.email || ''} onChange={e => setCI('contact.email', e.target.value)} placeholder="email@..." />
                    {s === 'error' && <p className="text-[10px] font-bold text-red-500 mt-0.5 px-1">Email không đúng định dạng</p>}
                  </div>
                ); })()}
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Số Fax</label>
                <input className="w-full px-3 py-2.5 bg-page border border-base rounded-xl font-bold text-sm outline-none"
                  value={contact.fax || ''} onChange={e => setCI('contact.fax', e.target.value)} />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Website</label>
                <input className="w-full px-3 py-2.5 bg-page border border-base rounded-xl font-bold text-sm outline-none"
                  value={contact.website || ''} onChange={e => setCI('contact.website', e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* ── 2. Persons ── */}
          <div className="bg-surface rounded-[24px] p-5 border border-slate-300 dark:border-slate-600 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100"><Users size={16} /></div>
              <h3 className="text-xs font-black text-strong uppercase tracking-widest">
                {formData.company_type === 1 ? 'Chủ sở hữu & Người đại diện'
                  : formData.company_type === 2 ? 'Thành viên & Người đại diện'
                  : 'Cổ đông sáng lập & Người đại diện'}
              </h3>
            </div>
            <PersonTable
              persons={formData.persons || []}
              companyType={formData.company_type}
              positions={positions}
              provinces={provinces}
              wardOptions={wardOptions}
              loadWards={loadWards}
              onChange={persons => updateFormData('persons', persons)}
              companyId={formData.id || null}
              onFolderCreated={folderId => updateFormData('folder_id', folderId)}
              customer={formData.customer}
            />
          </div>

          {/* ── 3. Industries ── */}
          <div className="bg-surface rounded-[24px] p-5 border border-slate-300 dark:border-slate-600 shadow-sm relative z-30">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100"><LayoutGrid size={16} /></div>
                <h3 className="text-xs font-black text-strong uppercase tracking-widest">Ngành nghề</h3>
              </div>
              <button onClick={addIndustryRow} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-xl font-black text-[10px] shadow-md shadow-orange-100 uppercase hover:bg-orange-700 transition">
                <Plus size={12} /> Thêm
              </button>
            </div>

            {formData.industries?.length > 0 ? (
              <table className="w-full table-fixed border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-base">
                    <th className="text-left py-2 px-2 text-[9px] font-black uppercase tracking-widest text-body w-[45%]">Mã — Tên ngành nghề</th>
                    <th className="text-left py-2 px-2 text-[9px] font-black uppercase tracking-widest text-body">Ghi chú</th>
                    <th className="text-center py-2 px-2 text-[9px] font-black uppercase tracking-widest text-body w-[72px]">NN Chính</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {formData.industries.map((ind, idx) => (
                    <tr key={idx} className="border-b border-faint hover:bg-page/60 transition-all group">
                      <td className="py-1.5 px-2 relative">
                        <div onClick={() => setActiveIndustryIdx(activeIndustryIdx === idx ? null : idx)}
                          className="w-full px-3 py-2 bg-surface border border-base rounded-xl font-bold text-[11px] cursor-pointer hover:border-orange-400 transition truncate text-strong">
                          {ind.code ? <><span className="text-orange-600 font-black">{ind.code}</span> — {ind.name}</> : <span className="text-weak italic">Bấm để chọn ngành...</span>}
                        </div>
                        {activeIndustryIdx === idx && (
                          <IndustrySelect industries={allIndustries}
                            onSelect={i => { const next = [...formData.industries]; next[idx] = { ...next[idx], code: i.code, name: i.name }; updateFormData('industries', sortIndustriesByCode(next)); setActiveIndustryIdx(null); }}
                            onClose={() => setActiveIndustryIdx(null)} />
                        )}
                      </td>
                      <td className="py-1.5 px-2">
                        <textarea rows={1} className="w-full px-3 py-2 bg-surface border border-base rounded-xl font-bold text-[11px] outline-none focus:border-orange-400 resize-none text-strong"
                          value={ind.note || ''} onChange={e => { const next = [...formData.industries]; next[idx].note = e.target.value; updateFormData('industries', next); }} placeholder="..." />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button onClick={() => { const next = [...formData.industries]; next.forEach((it, i) => it.is_main = (i === idx)); updateFormData('industries', next); }}
                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${ind.is_main ? 'bg-orange-600 text-white shadow-sm shadow-orange-100' : 'bg-input text-body hover:bg-orange-100 hover:text-orange-600'}`}>
                          CHÍNH
                        </button>
                      </td>
                      <td className="py-1.5 px-1 text-center">
                        <button onClick={() => removeIndustryRow(idx)} className="p-1.5 text-weak hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-weak italic text-xs font-bold border border-dashed border-base rounded-xl">Chưa có ngành nghề nào. Bấm "+ Thêm" để thêm.</div>
            )}
          </div>

          {/* ── 4. Kế toán ── */}
          <div className="bg-surface rounded-[24px] p-5 border border-slate-300 dark:border-slate-600 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 shadow-sm border border-teal-100">
                <Users size={16} />
              </div>
              <h3 className="text-xs font-black text-strong uppercase tracking-widest">Kế toán</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Tên kế toán</label>
                <input className="w-full px-4 py-2.5 bg-page rounded-xl text-sm font-bold outline-none border border-base"
                  placeholder="Nguyễn Văn A..." value={formData.accounting_name || ''} onChange={e => updateFormData('accounting_name', e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Giới tính</label>
                <select className="w-full px-4 py-2.5 bg-page rounded-xl text-sm font-bold outline-none border border-base appearance-none"
                  value={formData.accounting_gender ?? ''} onChange={e => updateFormData('accounting_gender', e.target.value === '' ? null : parseInt(e.target.value))}>
                  <option value="">-- Chọn --</option>
                  <option value={0}>Nam</option>
                  <option value={1}>Nữ</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Ngày sinh</label>
                <input type="date" className="w-full px-4 py-2.5 bg-page rounded-xl text-sm font-bold outline-none border border-base"
                  value={formData.accounting_birth_date || ''} onChange={e => updateFormData('accounting_birth_date', e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Số CCCD</label>
                <input className="w-full px-4 py-2.5 bg-page rounded-xl text-sm font-bold outline-none border border-base"
                  placeholder="0123456789..." value={formData.accounting_id_number || ''} onChange={e => updateFormData('accounting_id_number', e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">SĐT kế toán</label>
                <input className="w-full px-4 py-2.5 bg-page rounded-xl text-sm font-bold outline-none border border-base"
                  placeholder="09xx..." value={formData.accounting_phone || ''} onChange={e => updateFormData('accounting_phone', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="w-80 shrink-0 overflow-y-auto pb-32 space-y-8">
          <div className="bg-surface rounded-[32px] p-8 border border-slate-300 dark:border-slate-600 shadow-sm">
            <h4 className="text-[11px] font-black text-weak uppercase tracking-widest mb-8 flex items-center gap-2">
              <Info size={14} className="text-orange-500" /> Hồ sơ & Phân quyền
            </h4>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-weak block mb-2 px-1">Tình trạng hồ sơ</label>
                <select value={formData.status_id || ''} onChange={e => updateFormData('status_id', parseInt(e.target.value))}
                  className="w-full bg-orange-600 text-white rounded-2xl px-5 py-3.5 text-xs font-black border-none shadow-lg shadow-orange-200/60 dark:shadow-none appearance-none uppercase tracking-widest">
                  <option value="">-- Chọn --</option>
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="pt-4 border-t border-faint">
                <label className="text-[10px] font-black uppercase text-weak block mb-2 px-1">Nguồn</label>
                <select value={formData.source_id || ''} onChange={e => updateFormData('source_id', parseInt(e.target.value))}
                  className="w-full bg-page rounded-xl px-4 py-3 text-[11px] font-bold border-none appearance-none outline-none">
                  <option value="">--</option>
                  {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="pt-4 border-t border-faint">
                <label className="text-[10px] font-black uppercase text-weak block mb-2 px-1">Số tiền đã thanh toán (VNĐ)</label>
                <input type="text" className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3 text-sm font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-400 transition"
                  placeholder="0" value={fmtNum(formData.paid_amount)} onChange={e => updateFormData('paid_amount', parseNum(e.target.value))} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-faint">
                <div>
                  <label className="text-[10px] font-black uppercase text-weak block mb-2 px-1">NV Xử lý chính</label>
                  <select value={formData.handling_staff_id || ''} onChange={e => updateFormData('handling_staff_id', parseInt(e.target.value))}
                    className="w-full bg-page rounded-xl px-4 py-3 text-[11px] font-bold border-none appearance-none outline-none">
                    <option value="">--</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-weak block mb-2 px-1">NV Hỗ trợ</label>
                  <select value={formData.supporting_staff_id || ''} onChange={e => updateFormData('supporting_staff_id', parseInt(e.target.value))}
                    className="w-full bg-page rounded-xl px-4 py-3 text-[11px] font-bold border-none appearance-none outline-none">
                    <option value="">--</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Customer picker */}
              <div className="pt-4 border-t border-faint">
                <label className="text-[10px] font-black uppercase text-weak block mb-2 px-1">Chủ hồ sơ (KH) *</label>
                {formData.id ? (
                  <button onClick={() => setShowCustomerDetail(true)} className="w-full flex items-center gap-2 p-3.5 rounded-2xl bg-page border border-transparent hover:border-orange-300 hover:bg-orange-50 transition text-left">
                    <Users size={16} className="text-orange-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-strong truncate">{formData.customer?.name || 'Chưa chọn'}</div>
                      {formData.customer?.phone && <div className="text-[10px] font-bold text-weak">{formData.customer.phone}</div>}
                    </div>
                  </button>
                ) : (
                  <SearchableSelect
                    value={formData.customer_id || ''}
                    onChange={id => {
                      const cust = customers.find(c => c.id === id || c.id === parseInt(id));
                      updateFormData('customer_id', id ? parseInt(id) : null);
                      updateFormData('customer', cust || null);
                    }}
                    options={customers}
                    placeholder="Chọn khách hàng..."
                  />
                )}
              </div>

              <div className="pt-4 border-t border-faint">
                <label className="text-[10px] font-black uppercase text-orange-600 block mb-2 px-1">Ghi chú</label>
                <textarea value={formData.note || ''} onChange={e => updateFormData('note', e.target.value)}
                  className="w-full bg-orange-50/30 rounded-[24px] px-5 py-5 text-xs font-bold border-none min-h-[120px] outline-none shadow-inner" placeholder="Ghi chú..." />
              </div>
            </div>

            {/* Field selector / copy industries */}
            <div className="mt-8 pt-8 border-t border-faint">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-strong uppercase tracking-widest italic">Lĩnh vực mẫu</h4>
                <button onClick={copyFieldIndustries} className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg uppercase">COPY ALL</button>
              </div>
              <SearchableSelect value={selectedFieldId} onChange={setSelectedFieldId} options={fields} placeholder="Chọn lĩnh vực..." className="mb-4 text-[10px]" />
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {fields.find(f => f.id === selectedFieldId || f.id === parseInt(selectedFieldId))?.industries?.map((li, idx) => (
                  <div key={idx} onClick={() => {
                    const next = [...(formData.industries || []), { code: li.industry.code, name: li.industry.name, is_main: !formData.industries?.length, note: li.note }];
                    updateFormData('industries', next);
                  }} className="p-2.5 bg-surface border border-faint rounded-xl hover:border-orange-300 cursor-pointer transition-all flex items-center justify-between">
                    <div className="flex-1 overflow-hidden pr-2">
                      <div className="text-[9px] font-black text-orange-600 uppercase">{li.industry.code}</div>
                      <div className="text-[10px] font-bold text-body truncate">{li.industry.name}</div>
                    </div>
                    <Plus size={12} className="text-weak shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} formData={formData} onSave={onSave} />
      <CompanyUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        companyId={formData.id}
        companyType={formData.company_type}
        folderId={formData.folder_id}
        onFolderCreated={folderId => updateFormData('folder_id', folderId)}
      />
      <GovModal isOpen={showGov} onClose={() => setShowGov(false)} />
      {showCustomerDetail && formData.customer && (
        <CustomerDetailModal
          customer={formData.customer}
          sources={sources}
          staff={staff}
          onClose={() => setShowCustomerDetail(false)}
          onUpdated={(updated) => { updateFormData('customer', updated); setShowCustomerDetail(false); }}
        />
      )}
    </div>
  );
};

export default CompanyEditor;
