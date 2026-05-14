import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Trash2, Plus, X, Search, MapPin,
  Download, Upload, Building2, ExternalLink,
  Info, Users, LayoutGrid, FileText, Loader2,
  CheckSquare, Square, ChevronDown, ChevronLeft, ChevronRight, Copy, BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Common/Toast';
import SearchableSelect from '../Common/SearchableSelect';
import PersonTable from './PersonTable';
import CustomerDetailModal from '../Customer/CustomerDetailModal';
import { companyExportApi, companyTranslateApi, govApi } from '../../services/api';
import CompanyUploadModal from './CompanyUploadModal';
import GovJobModal from '../Common/GovJobModal';
import { validatePhone, validateEmail, sortIndustriesByCode } from '../../utils/validators';
import { COMPANY_SEARCH_SITES } from '../../constants';

const TYPE_LABELS = { 1: 'TNHH 1TV', 2: 'TNHH 2TV+', 3: 'Cổ phần' };

const _isApproved = (fd, statuses) =>
  !!statuses?.find(s => s.id === fd.status_id)?.name?.toLowerCase().includes('chấp thuận');

// [label, getValue, onlyWhen?]
const REQUIRED_FIELDS = [
  { label: 'Tên doanh nghiệp',   getValue: fd => fd.company_full_name },
  { label: 'Vốn điều lệ',        getValue: fd => fd.company_info?.charter_capital },
  { label: 'Tỉnh/Thành phố',     getValue: fd => fd.company_info?.address?.province_id },
  { label: 'Phường/Xã',          getValue: fd => fd.company_info?.address?.ward_id },
  { label: 'Số nhà/Đường',       getValue: fd => fd.company_info?.address?.street },
  { label: 'SĐT',                getValue: fd => fd.company_info?.contact?.phone },
  { label: 'Email',              getValue: fd => fd.company_info?.contact?.email },
  { label: 'Mã số thuế',         getValue: fd => fd.tax_code,       onlyWhen: _isApproved },
  { label: 'Ngày chấp thuận',    getValue: fd => fd.approval_date,  onlyWhen: _isApproved },
];

const _personLabel = (p, idx) => {
  if (p.person_type === 'representative') return 'Người đại diện';
  if (p.person_type === 'owner')   return 'Chủ sở hữu';
  if (p.person_type === 'member')  return `Thành viên ${idx + 1}`;
  return `Cổ đông ${idx + 1}`;
};

// context: 'save' includes conditional fields + person checks; others skip conditional + skip person detail
const getErrors = (fd, statuses, context) => {
  const errors = [];

  // Company-level required fields
  for (const f of REQUIRED_FIELDS) {
    if (f.onlyWhen && (context !== 'save' || !f.onlyWhen(fd, statuses))) continue;
    const val = f.getValue(fd);
    if (!val && val !== 0) errors.push(f.label);
  }

  // Person validation (all contexts)
  const persons = fd.persons || [];
  if (!persons.length) {
    errors.push('Cần ít nhất 1 người (chủ/thành viên hoặc đại diện)');
  } else {
    // Capital total for LLC2/JSC
    if ([2, 3].includes(fd.company_type)) {
      const key = fd.company_type === 2 ? 'member' : 'founder';
      const nonReps = persons.filter(p => p.person_type === key);
      if (nonReps.length) {
        const total = nonReps.reduce((s, p) => s + parseFloat(p.ownership_percentage || 0), 0);
        if (Math.abs(total - 100) > 0.1)
          errors.push(`Tổng vốn góp phải 100% (hiện: ${total.toFixed(1)}%)`);
      }
    }

    // Per-person detail
    persons.forEach((p, i) => {
        const missing = [];
        if (!p.full_name?.trim())    missing.push('tên');
        if (p.gender == null)         missing.push('giới tính');
        if (!p.birth_date?.trim())   missing.push('ngày sinh');
        if (!p.id_number?.trim())    missing.push('số CCCD');
        if (p.person_type === 'representative' && !p.position_id) missing.push('chức danh');
        if (p.person_type !== 'representative' && p.person_type !== 'owner' && !(parseFloat(p.ownership_percentage) > 0))
          missing.push('tỉ lệ vốn');
        if (!p.province_id)           missing.push('tỉnh/TP');
        if (!p.ward_id)               missing.push('phường/xã');
        if (!p.street?.trim())        missing.push('địa chỉ');
        if (missing.length) errors.push(`${_personLabel(p, i)}: thiếu ${missing.join(', ')}`);
      });
  }

  return errors;
};
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
  const [hi, setHi] = useState(0);
  const listRef = useRef(null);
  const filtered = industries.filter(i =>
    i.code.toLowerCase().includes(query.toLowerCase()) || i.name.toLowerCase().includes(query.toLowerCase())
  );
  const scrollToItem = (idx) => { if (!listRef.current) return; const item = listRef.current.children[idx]; if (item) item.scrollIntoView({ block: 'nearest' }); };
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => { const n = Math.min(h + 1, filtered.length - 1); scrollToItem(n); return n; }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => { const n = Math.max(h - 1, 0); scrollToItem(n); return n; }); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[hi]) onSelect(filtered[hi]); }
    else if (e.key === 'Escape') { onClose(); }
  };
  return (
    <div className="absolute top-full left-0 mt-2 w-[480px] max-w-[90vw] bg-surface rounded-2xl shadow-2xl border border-base z-50 overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="px-3 pt-3 pb-2 border-b border-faint flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-weak" />
          <input autoFocus className="w-full pl-9 pr-3 py-2 bg-page rounded-xl text-xs font-bold outline-none"
            placeholder="Tìm mã hoặc tên ngành..." value={query}
            onChange={e => { setQuery(e.target.value); setHi(0); }} onKeyDown={handleKeyDown} />
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-input text-weak transition"><X size={14} /></button>
      </div>
      <div ref={listRef} className="max-h-64 overflow-y-auto">
        {filtered.map((i, idx) => (
          <div key={i.code} onMouseDown={() => onSelect(i)} onMouseEnter={() => setHi(idx)}
            className={`px-4 py-3 cursor-pointer transition border-b border-faint last:border-none ${idx === hi ? 'bg-orange-100' : 'hover:bg-orange-50'}`}>
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

  const doExport = async (isMerge) => {
    setLoading(true); setErr('');
    try {
      if (onSave) await onSave();
      const res = await companyExportApi.export(formData.id, [...selected], isMerge);
      const disposition = res.headers['content-disposition'] || '';
      let filename = `TLDN_${formData.code || 'export'}.${isMerge ? 'docx' : selected.size > 1 ? 'zip' : 'docx'}`;
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

  const handleExport = () => doExport(false);
  const handleMerge = () => doExport(true);

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
        <div className="flex gap-3 justify-end flex-wrap">
          <button onClick={onClose} className="px-6 py-2.5 text-weak font-bold text-sm">Đóng</button>
          {templates.length > 0 && selected.size > 1 && (
            <button disabled={loading} onClick={handleMerge}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 disabled:opacity-50 transition shadow-lg shadow-indigo-100">
              <Download size={15} className={loading ? 'animate-bounce' : ''} />
              Tải & gộp file
            </button>
          )}
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

// ── Build GOV payload ─────────────────────────────────────────────────────────
const TYPE_PATH = { 1: 'llc1', 2: 'llc2', 3: 'jsc' };

const toGovDate = (d) => {
  if (!d) return '';
  // Already dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
  // ISO yyyy-mm-dd → dd/mm/yyyy
  const [y, m, day] = d.split('-');
  return day && m && y ? `${day}/${m}/${y}` : d;
};

const buildGovPayload = (formData, provinces, wardOptions) => {
  const resolveName = (list, id) => list?.find(x => x.id === id || x.id === parseInt(id))?.name || '';
  const ci = formData.company_info || {};
  const addr = ci.address || {};
  const contact = ci.contact || {};

  const buildPerson = (p, wardKey) => ({
    personal_info: {
      full_name: p.full_name || '',
      gender: p.gender ?? 0,
      birth_date: toGovDate(p.birth_date),
      id_number: p.id_number || '',
    },
    contact_address: {
      country: 'Việt Nam',
      province: resolveName(provinces, p.province_id),
      ward: resolveName(wardOptions?.[wardKey], p.ward_id),
      street: p.street || '',
    },
    contact_info: { phone: p.phone || '', fax: '', email: p.email || '', website: '' },
  });

  const persons = formData.persons || [];
  const reps = persons.filter(p => p.person_type === 'representative');
  const nonReps = persons.filter(p => p.person_type !== 'representative');

  const representatives = reps.map((p, i) => ({
    position: { value: p.position_id || 0, text: p.position_name || '' },
    ...buildPerson(p, `person_${persons.indexOf(p)}`),
  }));

  const personKey = { 1: 'owner', 2: 'members', 3: 'founders' }[formData.company_type];
  const personList = nonReps.map((p, i) => ({
    type: 1,
    ...buildPerson(p, `person_${persons.indexOf(p)}`),
    capital_contribution: {
      ownership_percentage: p.ownership_percentage ?? (formData.company_type === 1 ? 100 : 0),
      asset_type_ratio: 100,
    },
  }));

  const payload = {
    company_id: formData.id,
    company_type: formData.company_type,
    company_info: {
      name: {
        full: formData.company_full_name || '',
        foreign: ci.name?.foreign || '',
        short: ci.name?.short || '',
      },
      address: {
        country: 'Việt Nam',
        province: resolveName(provinces, addr.province_id),
        ward: resolveName(wardOptions?.company, addr.ward_id),
        street: addr.street || '',
      },
      contact: { phone: contact.phone || '', fax: contact.fax || '', email: contact.email || '', website: contact.website || '' },
    },
    charter_capital: { info: { amount: ci.charter_capital || 0, text: '' } },
    representatives,
    [personKey]: formData.company_type === 1 ? (personList[0] || {}) : personList,
    industries: (formData.industries || []).map(ind => ({ code: ind.code, is_main: ind.is_main || false, note: ind.note || '' })),
    tax: { accounting: { full_name: formData.accounting_name || '', phone: formData.accounting_phone || '' } },
  };

  return payload;
};

// ── GOV Transfer Modal ────────────────────────────────────────────────────────
const GovModal = ({ isOpen, onClose, formData, provinces, wardOptions, onSave }) => {
  const { token } = useAuth();
  const typePath = TYPE_PATH[formData.company_type];

  const payload = buildGovPayload(formData, provinces, wardOptions);
  const ci = payload.company_info;

  const previewContent = (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-weak mb-2">Thông tin Doanh nghiệp</p>
      <div className="bg-page rounded-2xl p-4 space-y-1.5 font-bold text-body text-xs">
        <div><span className="text-weak">Loại hình:</span> {TYPE_LABELS[formData.company_type] || '—'}</div>
        <div><span className="text-weak">Tên:</span> {ci.name.full}</div>
        <div><span className="text-weak">Địa chỉ:</span> {[ci.address.street, ci.address.ward, ci.address.province].filter(Boolean).join(', ')}</div>
        <div><span className="text-weak">SĐT:</span> {ci.contact.phone}</div>
        <div><span className="text-weak">Vốn điều lệ:</span> {(payload.charter_capital.info.amount || 0).toLocaleString('vi-VN')} VNĐ</div>
      </div>
    </div>
  );

  const handleSubmit = async () => {
    const res = await govApi.submitTLDN(typePath, payload, token);
    return { job_id: res.data.job_id };
  };

  return (
    <GovJobModal
      isOpen={isOpen}
      onClose={onClose}
      recordId={formData.id}
      recordType="company"
      recordName={formData.company_full_name}
      service="tldn"
      previewContent={previewContent}
      onSubmit={handleSubmit}
      onSave={onSave}
    />
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
  const showToast = useToast();
  const navigate = useNavigate();
  const [activeIndustryIdx, setActiveIndustryIdx] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [rightHidden, setRightHidden] = useState(() => localStorage.getItem('editorRightHidden') === '1');
  const [fieldVisible, setFieldVisible] = useState(true);
  const [draft, setDraft] = useState({ code: '', name: '', note: '', is_main: false });
  const [draftPickerOpen, setDraftPickerOpen] = useState(false);
  const draftNoteRef = useRef(null);

  useEffect(() => {
    const h = () => setRightHidden(true);
    window.addEventListener('sidebarUltraCollapse', h);
    return () => window.removeEventListener('sidebarUltraCollapse', h);
  }, []);
  const [translating, setTranslating] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showGov, setShowGov] = useState(false);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => { if (validationErrors.length) setValidationErrors([]); }, [formData]);

  const validate = (context, action) => {
    const errs = getErrors(formData, statuses, context);
    if (errs.length) { setValidationErrors(errs); return; }
    setValidationErrors([]);
    action();
  };

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

  const commitDraft = () => {
    if (!draft.code) return;
    if ((formData.industries || []).some(r => r.code === draft.code)) { showToast('Ngành nghề này đã được thêm', 'error'); return; }
    const isFirst = !(formData.industries?.length);
    const next = [...(formData.industries || []), { code: draft.code, name: draft.name, note: draft.note, is_main: draft.is_main || isFirst }];
    if (draft.is_main) next.forEach((r, i) => { if (i < next.length - 1) r.is_main = false; });
    updateFormData('industries', sortIndustriesByCode(next));
    setDraft({ code: '', name: '', note: '', is_main: false });
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
            <button onClick={onSave}
              className="flex items-center gap-2 px-8 py-2 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 shadow-lg shadow-orange-200/50 dark:shadow-none font-black text-xs transition">
              <Save size={18} /> LƯU HỒ SƠ
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex gap-3 overflow-hidden px-4 py-4 min-w-0">
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
              <button onClick={() => validate('export', () => navigate(`/company/${formData.id}/export`))}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-base text-body rounded-2xl font-black text-xs hover:border-orange-400 hover:text-orange-600 shadow-sm transition">
                <Download size={14} /> Xuất hồ sơ
              </button>
              <button onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-base text-body rounded-2xl font-black text-xs hover:border-blue-400 hover:text-blue-600 shadow-sm transition">
                <Upload size={14} /> Upload Drive
              </button>
              <button onClick={() => validate('gov', () => setShowGov(true))}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-base text-body rounded-2xl font-black text-xs hover:border-indigo-400 hover:text-indigo-600 shadow-sm transition">
                <Building2 size={14} /> Chuyển GOV
              </button>
            </div>
          )}

          {/* Validation errors — hiện ngay dưới cụm nút */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-red-600">
              <div className="flex items-center gap-1.5 mb-1.5 text-red-700">
                <span>⚠</span><span className="uppercase tracking-wider text-[10px]">Cần bổ sung trước khi thực hiện</span>
              </div>
              <ul className="space-y-0.5 pl-4 list-disc">
                {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* ── 1. Company Info ── */}
          <div className="bg-surface rounded-[24px] p-5 border border-slate-300 dark:border-slate-600 shadow-sm relative">
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
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Tên doanh nghiệp (đầy đủ) <span className="text-red-500">*</span></label>
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
                        showToast('Lỗi dịch: ' + (e.response?.data?.detail || e.message), 'error');
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
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Vốn điều lệ (VNĐ) <span className="text-red-500">*</span></label>
                <input type="text" className="w-full px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl font-black text-sm outline-none focus:border-emerald-400 text-emerald-700 transition-all"
                  value={fmtNum(ci.charter_capital)}
                  onChange={e => setCI('charter_capital', parseNum(e.target.value))} />
              </div>

              {/* Address */}
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Tỉnh/Thành phố <span className="text-red-500">*</span></label>
                <SearchableSelect value={addr.province_id || ''} onChange={id => { updateFormData('company_info', { ...ci, address: { ...addr, province_id: id || null, ward_id: null } }); loadWards('company', id); }} options={provinces} placeholder="-- Chọn --" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Phường/Xã <span className="text-red-500">*</span></label>
                <SearchableSelect value={addr.ward_id || ''} onChange={id => setCI('address.ward_id', id)} options={wardCompany} placeholder="-- Chọn --" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Số nhà, tên đường <span className="text-red-500">*</span></label>
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
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">SĐT <span className="text-red-500">*</span></label>
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
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Email <span className="text-red-500">*</span></label>
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

          {/* ── 3. Fields Template ── */}
          <div className="bg-surface rounded-[24px] p-5 border border-slate-300 dark:border-slate-600 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 border border-violet-100"><BookOpen size={16} /></div>
                <h3 className="text-xs font-black text-strong uppercase tracking-widest">Lĩnh vực mẫu</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={copyFieldIndustries} className="flex items-center gap-1 text-[9px] font-black text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-lg uppercase hover:bg-orange-100 transition">
                  <Copy size={10} /> Copy all
                </button>
                <button onClick={() => setFieldVisible(v => !v)} className="p-1.5 rounded-lg text-weak hover:text-violet-600 hover:bg-violet-50 transition">
                  {fieldVisible ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>
            </div>
            {fieldVisible && (
              <>
                <SearchableSelect value={selectedFieldId} onChange={setSelectedFieldId} options={fields} placeholder="Chọn lĩnh vực..." className="mb-3" />
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                  {(() => {
                    const tpl = fields.find(f => f.id === selectedFieldId || f.id === parseInt(selectedFieldId));
                    if (!tpl) return null;
                    return tpl.industries?.map((li, idx) => (
                      <div key={idx}
                        onClick={() => {
                          if ((formData.industries || []).some(r => r.code === li.industry.code)) { showToast('Ngành nghề này đã được thêm', 'error'); return; }
                          const next = [...(formData.industries || []), { code: li.industry.code, name: li.industry.name, is_main: !formData.industries?.length, note: li.note }];
                          updateFormData('industries', sortIndustriesByCode(next));
                        }}
                        className="flex items-center justify-between p-2.5 bg-page border border-faint rounded-xl hover:border-violet-300 hover:bg-violet-50 cursor-pointer transition-all group">
                        <div className="flex-1 overflow-hidden pr-1">
                          <div className="text-[10px] font-black text-orange-600">{li.industry?.code}</div>
                          <div className="text-[10px] font-bold text-body truncate">{li.industry?.name}</div>
                          {li.note && <div className="text-[9px] text-weak mt-0.5 truncate">{li.note}</div>}
                        </div>
                        <Plus size={13} className="text-weak group-hover:text-violet-600 shrink-0 transition-colors" />
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}
          </div>

          {/* ── 4. Industries ── */}
          <div className="bg-surface rounded-[24px] p-5 border border-slate-300 dark:border-slate-600 shadow-sm relative z-30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100"><LayoutGrid size={16} /></div>
              <h3 className="text-xs font-black text-strong uppercase tracking-widest">Ngành nghề</h3>
            </div>

            {formData.industries?.length > 0 ? (
              <table className="w-full table-fixed border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-base">
                    <th className="text-left py-2 px-2 text-[9px] font-black uppercase tracking-widest text-body w-[45%]">Mã — Tên ngành nghề</th>
                    <th className="text-left py-2 px-2 text-[9px] font-black uppercase tracking-widest text-body">Ghi chú</th>
                    <th className="text-center py-2 px-2 text-[9px] font-black uppercase tracking-widest text-body w-[72px]">NN Chính <span className="text-red-500">*</span></th>
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
                            onSelect={i => {
                              const dup = formData.industries.some((r, j) => j !== idx && r.code === i.code);
                              if (dup) { showToast('Ngành nghề này đã được thêm', 'error'); setActiveIndustryIdx(null); return; }
                              const next = [...formData.industries];
                              next[idx] = { ...next[idx], code: i.code, name: i.name };
                              updateFormData('industries', sortIndustriesByCode(next));
                              setActiveIndustryIdx(null);
                            }}
                            onClose={() => setActiveIndustryIdx(null)} />
                        )}
                      </td>
                      <td className="py-1.5 px-2">
                        <textarea rows={1} className="w-full px-3 py-2 bg-surface border border-base rounded-xl font-bold text-[11px] outline-none focus:border-orange-400 resize-none text-strong"
                          value={ind.note || ''}
                          onChange={e => { const next = [...formData.industries]; next[idx].note = e.target.value; updateFormData('industries', next); }}
                          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                          placeholder="..." />
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
              <div className="py-8 text-center text-weak italic text-xs font-bold border border-dashed border-base rounded-xl">Chưa có ngành nghề nào.</div>
            )}
            {/* Draft row */}
            <div className="mt-2 flex items-center gap-1.5 border-t border-dashed border-base pt-2">
              <div className="relative w-[45%]">
                <div onClick={() => setDraftPickerOpen(true)}
                  className="w-full px-3 py-2 bg-page border border-dashed border-base rounded-xl font-bold text-[11px] cursor-pointer hover:border-orange-400 transition truncate text-strong">
                  {draft.code ? <><span className="text-orange-600 font-black">{draft.code}</span> — {draft.name}</> : <span className="text-weak italic">Chọn ngành nghề...</span>}
                </div>
                {draftPickerOpen && (
                  <IndustrySelect industries={allIndustries}
                    onSelect={(i) => {
                      setDraft(d => ({ ...d, code: i.code, name: i.name }));
                      setDraftPickerOpen(false);
                      setTimeout(() => draftNoteRef.current?.focus(), 50);
                    }}
                    onClose={() => setDraftPickerOpen(false)} />
                )}
              </div>
              <textarea ref={draftNoteRef}
                className="flex-1 px-3 py-2 bg-page border border-dashed border-base rounded-xl font-bold text-[11px] outline-none focus:border-orange-400 text-strong resize-none"
                placeholder="Ghi chú..."
                rows={1}
                value={draft.note}
                onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
 />
              <div className="w-[72px] flex justify-center">
                <button onClick={() => setDraft(d => ({ ...d, is_main: !d.is_main }))}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${draft.is_main ? 'bg-orange-600 text-white' : 'bg-input text-body hover:bg-orange-100 hover:text-orange-600'}`}>
                  CHÍNH
                </button>
              </div>
              <div className="w-8 flex justify-center">
                <button onClick={commitDraft} disabled={!draft.code}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-30 disabled:cursor-not-allowed">
                  <Plus size={15} />
                </button>
              </div>
            </div>
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
                  value={(() => { const bd = formData.accounting_birth_date; if (!bd) return ''; const p = bd.split('/'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : bd; })()}
                  onChange={e => { const v = e.target.value; if (!v) { updateFormData('accounting_birth_date', ''); return; } const [y, m, d] = v.split('-'); updateFormData('accounting_birth_date', `${d}/${m}/${y}`); }} />
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

        {/* Right panel toggle */}
        <div className="flex flex-col items-center justify-start pt-2 shrink-0">
          <button
            onClick={() => { const v = !rightHidden; setRightHidden(v); localStorage.setItem('editorRightHidden', v ? '1' : '0'); }}
            className="p-1.5 rounded-xl bg-surface border border-base text-weak hover:text-orange-600 hover:border-orange-300 transition"
            title={rightHidden ? 'Mở panel phải' : 'Ẩn panel phải'}
          >
            {rightHidden ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        {/* ── Right Sidebar ── */}
        <div className={`w-80 shrink-0 overflow-y-auto pb-32 space-y-8 ${rightHidden ? 'hidden' : ''}`}>
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

              {/* 3 field chấp thuận */}
              <div className="space-y-3">
                {statuses.find(s => s.id === formData.status_id)?.name?.toLowerCase().includes('chấp thuận') && (
                  <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl px-3 py-2 text-[11px] text-yellow-700 dark:text-yellow-400 font-semibold">
                    <span>⚠️</span>
                    <span>Vui lòng nhập Mã số thuế và Ngày chấp thuận để lưu trạng thái này.</span>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black uppercase text-weak block mb-1 px-1">Ngày đăng ký</label>
                  <input type="text" placeholder="dd/mm/yyyy"
                    className="w-full bg-page rounded-xl px-4 py-2.5 text-[11px] font-bold border border-faint outline-none focus:ring-2 focus:ring-orange-300 transition"
                    value={formData.registration_date || ''}
                    onChange={e => updateFormData('registration_date', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-weak block mb-1 px-1">
                    Mã số thuế
                    {statuses.find(s => s.id === formData.status_id)?.name?.toLowerCase().includes('chấp thuận') && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input type="text" placeholder="0123456789"
                    className="w-full bg-page rounded-xl px-4 py-2.5 text-[11px] font-bold border border-faint outline-none focus:ring-2 focus:ring-orange-300 transition"
                    value={formData.tax_code || ''}
                    onChange={e => updateFormData('tax_code', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-weak block mb-1 px-1">
                    Ngày chấp thuận
                    {statuses.find(s => s.id === formData.status_id)?.name?.toLowerCase().includes('chấp thuận') && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input type="text" placeholder="dd/mm/yyyy"
                    className="w-full bg-page rounded-xl px-4 py-2.5 text-[11px] font-bold border border-faint outline-none focus:ring-2 focus:ring-orange-300 transition"
                    value={formData.approval_date || ''}
                    onChange={e => updateFormData('approval_date', e.target.value)} />
                </div>
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

          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <CompanyUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        companyId={formData.id}
        companyType={formData.company_type}
        folderId={formData.folder_id}
        onFolderCreated={folderId => updateFormData('folder_id', folderId)}
      />
      <GovModal isOpen={showGov} onClose={() => setShowGov(false)} formData={formData} provinces={provinces} wardOptions={wardOptions} onSave={onSave} />
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
