import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileText,
  Users,
  Save,
  Download,
  Trash2,
  X,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  RefreshCw,
  ExternalLink,
  LayoutGrid,
  Plus,
  Search,
  Upload,
  CheckSquare,
  Square,
  Building2,
  CreditCard,
  Loader2,
  Copy,
  BookOpen,
} from 'lucide-react';
import { hkdApi, exportApi, govApi, driveApi, ocrApi } from '../../services/api';
import DriveFileLink from '../Common/DriveFileLink';
import PasteDropZone from '../Common/PasteDropZone';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Common/Toast';
import SearchableSelect from '../Common/SearchableSelect';
import UploadModal from './UploadModal';
import GovJobModal from '../Common/GovJobModal';
import CustomerDetailModal from '../Customer/CustomerDetailModal';
import { validatePhone, validateEmail, sortIndustriesByCode, compressImage } from '../../utils/validators';


const IndustrySelect = ({ industries, onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [hi, setHi] = useState(0);
  const listRef = useRef(null);

  const filtered = industries.filter(i =>
    i.code.toLowerCase().includes(query.toLowerCase()) ||
    i.name.toLowerCase().includes(query.toLowerCase())
  );

  const scrollToItem = (idx) => {
    if (!listRef.current) return;
    const item = listRef.current.children[idx];
    if (item) item.scrollIntoView({ block: 'nearest' });
  };

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
          <input autoFocus className="w-full pl-9 pr-3 py-2 bg-page border-none rounded-xl text-xs font-bold outline-none"
            placeholder="Tìm mã hoặc tên ngành..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHi(0); }}
            onKeyDown={handleKeyDown} />
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-input text-weak hover:text-body transition shrink-0"><X size={14} /></button>
      </div>
      <div ref={listRef} className="max-h-64 overflow-y-auto">
        {filtered.map((i, idx) => (
          <div
            key={i.code}
            onMouseDown={() => onSelect(i)}
            onMouseEnter={() => setHi(idx)}
            className={`px-4 py-3 cursor-pointer transition-all border-b border-faint last:border-none ${idx === hi ? 'bg-orange-100' : 'hover:bg-orange-50'}`}
          >
            <div className="text-[10px] font-black text-orange-600 uppercase mb-0.5">{i.code}</div>
            <div className="text-[11px] font-black text-body">{i.name}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-weak italic text-xs font-bold">Không tìm thấy kết quả</div>
        )}
      </div>
    </div>
  );
};

// validatePhone and validateEmail imported from utils/validators

const validateGov = (formData) => {
  const missing = [];
  const fd = formData || {};
  const ci = fd.company_info || {};
  const addr = ci.address || {};
  const contact = ci.contact || {};
  const oi = fd.owner_info || {};
  const pi = oi.personal_info || {};
  const oa = oi.contact_address || {};
  const oc = oi.contact_info || {};

  if (!fd.company_full_name) missing.push('Tên Hộ kinh doanh');
  if (!addr.province_id) missing.push('Tỉnh/Thành phố (HKD)');
  if (!addr.ward_id) missing.push('Phường/Xã (HKD)');
  if (!addr.street) missing.push('Số nhà, đường (HKD)');
  if (!contact.phone) missing.push('SĐT liên hệ (HKD)');
  if (!ci.charter_capital) missing.push('Vốn điều lệ');
  if (!pi.full_name) missing.push('Họ tên chủ sở hữu');
  if (pi.gender === null || pi.gender === undefined || pi.gender === '') missing.push('Giới tính chủ sở hữu');
  if (!pi.birth_date) missing.push('Ngày sinh chủ sở hữu');
  if (!pi.id_number) missing.push('CCCD/Định danh chủ sở hữu');
  if (!oa.province_id) missing.push('Tỉnh/Thành phố (chủ sở hữu)');
  if (!oa.ward_id) missing.push('Phường/Xã (chủ sở hữu)');
  if (!oa.street) missing.push('Số nhà, đường (chủ sở hữu)');
  if (!oc.phone) missing.push('SĐT chủ sở hữu');
  if (!fd.industries || fd.industries.length === 0 || !fd.industries.some(i => i.code)) missing.push('Ít nhất 1 ngành nghề');
  if (!fd.industries?.some(i => i.is_main)) missing.push('Chưa chọn ngành nghề chính');
  if (validatePhone(contact.phone) === 'error') missing.push('SĐT HKD không đúng định dạng');
  if (validatePhone(oc.phone) === 'error') missing.push('SĐT chủ sở hữu không đúng định dạng');
  if (validateEmail(contact.email) === 'error') missing.push('Email HKD không đúng định dạng');
  if (validateEmail(oc.email) === 'error') missing.push('Email chủ sở hữu không đúng định dạng');
  return missing;
};

// Validate chỉ kiểm tra NN chính + format — dùng cho xuất hồ sơ & upload Drive
const validateMainIndustry = (formData) => {
  const errs = [];
  const contact = formData.company_info?.contact || {};
  if (!formData.industries?.some(i => i.is_main)) errs.push('Chưa chọn ngành nghề chính');
  if (validatePhone(contact.phone) === 'error') errs.push('SĐT HKD không đúng định dạng');
  if (validateEmail(contact.email) === 'error') errs.push('Email HKD không đúng định dạng');
  return errs;
};

// Fallback nếu API không trả về templates
const FALLBACK_TEMPLATES = [
  { id: '000', name: 'HD ký + Hợp đồng + Giấy đề nghị', source: 'system' },
  { id: '001', name: 'Giấy giới thiệu', source: 'system' },
];

const ExportModal = ({ isOpen, onClose, formData }) => {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [exportErrors, setExportErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tplLoading, setTplLoading] = useState(false);

  // Fetch templates khi modal mở
  useEffect(() => {
    if (!isOpen) return;
    setTplLoading(true);
    exportApi.getTemplates()
      .then(res => {
        const tpls = res.data?.templates || FALLBACK_TEMPLATES;
        setTemplates(tpls);
        setSelected(new Set(tpls.map(t => t.id)));
      })
      .catch(() => {
        setTemplates(FALLBACK_TEMPLATES);
        setSelected(new Set(FALLBACK_TEMPLATES.map(t => t.id)));
      })
      .finally(() => setTplLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;
  const toggle = (id) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const toggleAll = () => setSelected(selected.size === templates.length ? new Set() : new Set(templates.map(t => t.id)));

  const doExport = async (isMerge) => {
    const errs = validateMainIndustry(formData);
    if (errs.length > 0) { setExportErrors(errs); return; }
    setExportErrors([]);
    setLoading(true);
    try {
      const templateIds = [...selected];
      const res = await exportApi.exportHkd(formData.id, templateIds, isMerge);

      const disposition = res.headers['content-disposition'] || '';
      let filename = `HKD_${formData.code || 'export'}.${isMerge ? 'docx' : templateIds.length > 1 ? 'zip' : 'docx'}`;
      const match = disposition.match(/filename\*=UTF-8''(.+)/i) || disposition.match(/filename="?([^"]+)"?/i);
      if (match) filename = decodeURIComponent(match[1]);

      const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      const msg = e.response?.data ? await e.response.data.text?.() : e.message;
      setExportErrors([msg || 'Lỗi khi tạo file']);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => doExport(false);
  const handleMerge = () => doExport(true);

  const systemTpls = templates.filter(t => t.source !== 'custom');
  const customTpls = templates.filter(t => t.source === 'custom');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface rounded-[28px] shadow-2xl w-[520px] max-h-[80vh] flex flex-col p-8">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-base font-black text-strong uppercase tracking-tight">Xuất hồ sơ</h3>
          <div className="flex items-center gap-3">
            {!tplLoading && templates.length > 0 && (
              <button onClick={toggleAll} className="text-[10px] font-black text-orange-600 hover:underline uppercase">
                {selected.size === templates.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-input rounded-xl text-weak"><X size={16} /></button>
          </div>
        </div>
        {exportErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-4 shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-2">Cần bổ sung thông tin trước khi xuất:</p>
            <ul className="space-y-1">
              {exportErrors.map((e, i) => <li key={i} className="text-xs font-bold text-red-500 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />{e}</li>)}
            </ul>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {tplLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-orange-500" />
            </div>
          ) : (
            <>
              {/* Biểu mẫu hệ thống */}
              {systemTpls.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-black text-weak uppercase tracking-widest mb-2">Biểu mẫu mặc định</p>
                  <div className="space-y-2">
                    {systemTpls.map(t => (
                      <div key={t.id} onClick={() => toggle(t.id)} className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all border ${selected.has(t.id) ? 'bg-orange-50 border-orange-200' : 'border-faint hover:border-base'}`}>
                        {selected.has(t.id) ? <CheckSquare size={16} className="text-orange-600 shrink-0" /> : <Square size={16} className="text-weak shrink-0" />}
                        <span className={`text-sm font-bold ${selected.has(t.id) ? 'text-orange-800' : 'text-body'}`}>{t.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Mẫu tùy chỉnh của tenant */}
              {customTpls.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-black text-weak uppercase tracking-widest mb-2">Mẫu tùy chỉnh của công ty</p>
                  <div className="space-y-2">
                    {customTpls.map(t => (
                      <div key={t.id} onClick={() => toggle(t.id)} className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all border ${selected.has(t.id) ? 'bg-indigo-50 border-indigo-200' : 'border-faint hover:border-base'}`}>
                        {selected.has(t.id) ? <CheckSquare size={16} className="text-indigo-600 shrink-0" /> : <Square size={16} className="text-weak shrink-0" />}
                        <span className={`text-sm font-bold ${selected.has(t.id) ? 'text-indigo-800' : 'text-body'}`}>{t.name}</span>
                        <span className="ml-auto text-[9px] font-black text-indigo-400 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full shrink-0">CUSTOM</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {templates.length === 0 && (
                <p className="text-center text-xs text-weak italic py-6">Không có biểu mẫu nào.</p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 justify-end flex-wrap pt-4 border-t border-faint mt-2 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 text-weak font-bold text-sm">Hủy</button>
          {selected.size > 1 && (
            <button
              disabled={loading}
              onClick={handleMerge}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-md shadow-indigo-200/50 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Download size={15} className={loading ? 'animate-bounce' : ''} />
              Tải & gộp file
            </button>
          )}
          <button
            disabled={selected.size === 0 || loading}
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-2xl font-black text-sm hover:bg-orange-700 shadow-md shadow-orange-200/50 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Download size={15} className={loading ? 'animate-bounce' : ''} />
            {loading ? 'Đang tạo...' : `Tải xuống (${selected.size} file)`}
          </button>
        </div>
      </div>
    </div>
  );
};

const buildGovPayload = (formData, provinces, wardOptions) => {
  const resolveName = (list, id) => list?.find(x => x.id === id || x.id === parseInt(id))?.name || '';
  const ci = formData.company_info || {};
  const addr = ci.address || {};
  const contact = ci.contact || {};
  const oi = formData.owner_info || {};
  const pi = oi.personal_info || {};
  const oa = oi.contact_address || {};
  const oc = oi.contact_info || {};

  return {
    hkd_id: formData.id,
    company_info: {
      name: { full: ci.name?.full || formData.company_full_name || '', foreign: ci.name?.foreign || '', short: ci.name?.short || '' },
      address: {
        country: 'Việt Nam',
        province: resolveName(provinces, addr.province_id),
        ward: resolveName(wardOptions?.hkd, addr.ward_id),
        street: addr.street || '',
      },
      contact: { phone: contact.phone || '', fax: contact.fax || '', email: contact.email || '', website: contact.website || '' },
      charter_capital: ci.charter_capital || 0,
    },
    owner: {
      personal_info: {
        full_name: pi.full_name || '',
        gender: pi.gender ?? 0,
        birth_date: pi.birth_date || '',
        id_number: pi.id_number || '',
      },
      contact_address: {
        country: 'Việt Nam',
        province: resolveName(provinces, oa.province_id),
        ward: resolveName(wardOptions?.owner, oa.ward_id),
        street: oa.street || '',
      },
      contact_info: { phone: oc.phone || '', fax: oc.fax || '', email: oc.email || '', website: oc.website || '' },
    },
    industries: (formData.industries || []).map(ind => ({
      code: ind.code,
      is_main: ind.is_main || false,
      note: ind.note || '',
    })),
  };
};

const HKDGovModal = ({ isOpen, onClose, formData, provinces, wardOptions, onSave }) => {
  const { token } = useAuth();
  const payload = buildGovPayload(formData, provinces, wardOptions);
  const ci = payload.company_info;
  const ow = payload.owner;

  const previewContent = (
    <div className="space-y-3 text-xs">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-weak mb-2">Thông tin HKD</p>
        <div className="bg-page rounded-2xl p-4 space-y-1.5 font-bold text-body">
          <div><span className="text-weak">Tên:</span> {ci.name.full}</div>
          <div><span className="text-weak">Địa chỉ:</span> {ci.address.street}, {ci.address.ward}, {ci.address.province}</div>
          <div><span className="text-weak">SĐT:</span> {ci.contact.phone}</div>
          <div><span className="text-weak">Vốn:</span> {ci.charter_capital.toLocaleString('vi-VN')} VND</div>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-weak mb-2">Chủ sở hữu</p>
        <div className="bg-page rounded-2xl p-4 space-y-1.5 font-bold text-body">
          <div><span className="text-weak">Họ tên:</span> {ow.personal_info.full_name}</div>
          <div><span className="text-weak">CCCD:</span> {ow.personal_info.id_number}</div>
          <div><span className="text-weak">Ngày sinh:</span> {ow.personal_info.birth_date}</div>
          <div><span className="text-weak">Địa chỉ:</span> {ow.contact_address.street}, {ow.contact_address.ward}, {ow.contact_address.province}</div>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-weak mb-2">Ngành nghề ({payload.industries.length})</p>
        <div className="bg-page rounded-2xl p-4 space-y-1 font-bold text-body">
          {payload.industries.map((ind, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-orange-600">{ind.code}</span>
              {ind.is_main && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-black">CHÍNH</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const handleSubmit = async () => {
    const res = await govApi.submitHkd(payload, token);
    return { job_id: res.data.job_id };
  };

  return (
    <GovJobModal
      isOpen={isOpen}
      onClose={onClose}
      recordId={formData.id}
      recordType="hkd"
      recordName={formData.company_full_name}
      service="hkd"
      previewContent={previewContent}
      onSubmit={handleSubmit}
      onSave={onSave}
    />
  );
};

const HKDEditor = ({
  formData,
  updateFormData,
  batchUpdateFormData,
  onSave,
  onDelete,
  onClose,
  provinces,
  staff,
  sources,
  statuses,
  customers,
  fields,
  wardOptions,
  loadWards,
  syncAddress,
  setSyncAddress,
  copyAllIndustries,
  allIndustries,
  selectedFieldId,
  setSelectedFieldId
}) => {
  const { can } = useAuth();
  const showToast = useToast();
  const location = useLocation();
  const [syncing, setSyncing] = useState(false);
  const [activeIndustryIdx, setActiveIndustryIdx] = useState(null);
  const [showExtra, setShowExtra] = useState(false);
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
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showGov, setShowGov] = useState(false);

  // Tự động mở modal xuất hồ sơ khi vừa tạo mới (navigate state = { justCreated: true })
  useEffect(() => {
    if (location.state?.justCreated && formData?.id) {
      setShowExport(true);
      // Xóa state để không mở lại khi reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [formData?.id, location.state?.justCreated]);
  const [showUpload, setShowUpload] = useState(false);
  const [govErrors, setGovErrors] = useState([]);

  // CCCD upload state
  const [cccdDocs, setCccdDocs] = useState({});      // { '005': doc, '006': doc }
  const [cccdUploading, setCccdUploading] = useState({}); // { '005': bool }
  const [ocrRunning, setOcrRunning] = useState(false);
  const [pasteTarget, setPasteTarget] = useState(null); // label '005'|'006' or null
  const cccdRefs = { '005': useRef(), '006': useRef() };

  useEffect(() => {
    if (!formData.id) return;
    driveApi.list(formData.id).then(res => {
      const map = {};
      res.data.filter(d => d.label === '005' || d.label === '006').forEach(d => { map[d.label] = d; });
      setCccdDocs(map);
    }).catch(() => {});
  }, [formData.id]);

  // Clear gov errors when switching to a different HKD
  useEffect(() => { setGovErrors([]); }, [formData.id]);

  const fmtNum = (v) => v ? new Intl.NumberFormat('vi-VN').format(v) : '';
  const parseNum = (s) => parseInt(String(s).replace(/\D/g, '')) || null;

  const handleCccdUpload = async (label, file) => {
    if (!formData.id) { showToast('Vui lòng lưu hồ sơ trước khi upload CCCD.', 'warn'); return; }
    setCccdUploading(prev => ({ ...prev, [label]: true }));
    if (label === '005') setOcrRunning(true);
    try {
      if (!formData.folder_id) {
        const res = await driveApi.createFolder(formData.id);
        updateFormData('folder_id', res.data.folder_id);
      }

      const compressed = await compressImage(file);
      const uploadTask = driveApi.upload(formData.id, label, compressed).then(r => r.data);
      const ocrTask = label === '005'
        ? ocrApi.extract('cccd', compressed, { serviceType: 'hkd' })
            .catch(e => { console.warn('OCR thất bại:', e.response?.data?.detail || e.message); return null; })
        : Promise.resolve(null);

      const [uploadDoc, ocrRes] = await Promise.all([uploadTask, ocrTask]);
      setCccdDocs(prev => ({ ...prev, [label]: uploadDoc }));

      if (ocrRes) {
        const entries = Object.entries(ocrRes.data?.fields || {});
        if (entries.length > 0) batchUpdateFormData(entries);
      }
    } catch (e) {
      showToast('Lỗi upload: ' + (e.response?.data?.detail || e.message), 'error');
    } finally {
      setCccdUploading(prev => ({ ...prev, [label]: false }));
      if (label === '005') setOcrRunning(false);
    }
  };

  const handleCccdDelete = async (label) => {
    const doc = cccdDocs[label];
    if (!doc) return;
    if (!window.confirm(`Xóa file "${doc.file_name}"?`)) return;
    try {
      await driveApi.deleteDoc(doc.id);
      setCccdDocs(prev => { const n = { ...prev }; delete n[label]; return n; });
    } catch (e) {
      showToast('Lỗi xóa: ' + (e.response?.data?.detail || e.message), 'error');
    }
  };

  const handleSyncCRM = async () => {
    if (!formData.id) return;
    if (!window.confirm("Bắt đầu đẩy dữ liệu hồ sơ này lên CRM?")) return;
    setSyncing(true);
    try {
      const res = await hkdApi.syncCRM(formData.id);
      updateFormData('crm_link', res.data.crm_link);
      showToast('Đồng bộ CRM thành công!');
    } catch (e) { showToast('Lỗi khi đồng bộ CRM', 'error'); }
    finally { setSyncing(false); }
  };

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

  return (
    <div className="flex-1 flex flex-col bg-page animate-in fade-in slide-in-from-bottom-2 duration-300 border-l border-base">
      {/* Header */}
      <div className="bg-surface border-b border-base px-6 py-4 flex justify-between items-center z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-page rounded-2xl text-weak transition"><ArrowLeft size={20} /></button>
          <div className="px-3 border-l border-faint">
            <h2 className="text-base font-black text-strong tracking-tight uppercase italic">{formData.id ? `Sửa hồ sơ: ${formData.code}` : 'Soạn hồ sơ mới'}</h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] font-black text-weak uppercase tracking-widest">{formData.customer?.name || 'Vãng lai'}</span>
              {formData.crm_link && (
                <a href={formData.crm_link} target="_blank" rel="noreferrer" className="text-[10px] font-black text-emerald-600 flex items-center gap-1 hover:underline">
                  <ExternalLink size={10} /> LINK CRM
                </a>
              )}
              {formData.folder_id && (
                <a href={`https://drive.google.com/drive/folders/${formData.folder_id}`} target="_blank" rel="noreferrer" className="text-[10px] font-black text-blue-500 flex items-center gap-1 hover:underline">
                  <ExternalLink size={10} /> DRIVE
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {formData.id && onDelete && can('hkd', 'delete') && (
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[11px] transition-all border bg-surface border-red-200 text-red-400 hover:bg-red-50 hover:border-red-400 hover:text-red-600"
            >
              <Trash2 size={14} /> Xóa hồ sơ
            </button>
          )}
          {can('hkd', formData.id ? 'update' : 'create') && (
            <button onClick={() => {
              const isApproved = statuses.find(s => s.id === formData.status_id)?.name?.toLowerCase().includes('chấp thuận');
              if (isApproved && (!formData.tax_code?.trim() || !formData.approval_date?.trim())) {
                alert('Vui lòng nhập Mã số thuế và Ngày chấp thuận trước khi lưu.');
                return;
              }
              onSave();
            }} className="flex items-center gap-2 px-8 py-2 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 shadow-lg shadow-orange-200/50 dark:shadow-none font-black text-xs transition">
              <Save size={18} /> LƯU HỒ SƠ
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex gap-3 overflow-hidden px-4 py-4 min-w-0">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto space-y-8 pb-32 min-w-0">
          {/* Action buttons */}
          {formData.id && (
            <div className="flex gap-3">
              <button onClick={() => { setShowExport(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-base text-body rounded-2xl font-black text-xs hover:border-orange-400 hover:text-orange-600 shadow-sm transition">
                <Download size={14} /> Xuất hồ sơ
              </button>
              <button onClick={() => { const errs = validateMainIndustry(formData); if (errs.length > 0) { setGovErrors(errs); return; } setGovErrors([]); setShowUpload(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-base text-body rounded-2xl font-black text-xs hover:border-blue-400 hover:text-blue-600 shadow-sm transition">
                <Upload size={14} /> Upload Drive
              </button>
              <button onClick={() => {
                const errs = validateGov(formData);
                if (errs.length > 0) { setGovErrors(errs); } else { setGovErrors([]); setShowGov(true); }
              }} className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-base text-body rounded-2xl font-black text-xs hover:border-indigo-400 hover:text-indigo-600 shadow-sm transition">
                <Building2 size={14} /> Chuyển GOV
              </button>
            </div>
          )}

          {govErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-2">Thiếu thông tin để chuyển GOV:</p>
              <ul className="space-y-1">
                {govErrors.map((e, i) => <li key={i} className="text-xs font-bold text-red-500 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />{e}</li>)}
              </ul>
            </div>
          )}

          {/* 1. HKD INFO */}
          <div className="bg-surface rounded-[24px] p-5 border border-slate-300 dark:border-slate-600 shadow-sm relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 shadow-sm border border-orange-100"><FileText size={16} /></div>
                <h3 className="text-xs font-black text-strong uppercase tracking-widest">Hộ kinh doanh</h3>
              </div>
              {formData.customer && (
                <button
                  onClick={() => {
                    const c = formData.customer;
                    batchUpdateFormData([
                      ['company_full_name', c.name || ''],
                      ['company_info.address.province_id', c.province_id || ''],
                      ['company_info.address.ward_id', c.ward_id || ''],
                      ['company_info.address.street', c.street || ''],
                      ['company_info.contact.phone', c.phone || ''],
                    ]);
                    if (c.province_id) loadWards('hkd', c.province_id);
                  }}
                  className="text-[9px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-700 transition border border-orange-200 px-3 py-1 rounded-xl bg-orange-50 hover:bg-orange-100"
                >
                  Giống thông tin KH
                </button>
              )}
            </div>

            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Tên Hộ kinh doanh</label>
                <div className="flex items-stretch rounded-xl overflow-hidden border border-base bg-page focus-within:border-orange-500 focus-within:bg-surface transition-all">
                  <span className="flex items-center px-3 text-[10px] font-black text-body bg-input border-r border-base whitespace-nowrap select-none">HKD</span>
                  <input className="flex-1 px-3 py-2.5 bg-transparent outline-none font-black text-sm uppercase" value={formData.company_full_name || ''} onChange={(e) => updateFormData('company_full_name', e.target.value.toUpperCase())} placeholder="NGUYỄN VĂN A..." />
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Vốn điều lệ (VNĐ)</label>
                <input type="text" className="w-full px-3 py-2.5 bg-page border border-base rounded-xl focus:bg-surface focus:border-orange-500 transition-all outline-none font-black text-sm" value={fmtNum(formData.company_info?.charter_capital)} onChange={(e) => updateFormData('company_info.charter_capital', parseNum(e.target.value))} />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Tỉnh/Thành phố</label>
                <SearchableSelect
                  value={formData.company_info?.address?.province_id || ''}
                  onChange={(id) => { updateFormData('company_info.address.province_id', id); loadWards('hkd', id); }}
                  options={provinces}
                  placeholder="-- Chọn --"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Phường/Xã</label>
                <SearchableSelect
                  value={formData.company_info?.address?.ward_id || ''}
                  onChange={(id) => updateFormData('company_info.address.ward_id', id)}
                  options={wardOptions?.hkd || []}
                  placeholder="-- Chọn --"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Số nhà, tên đường</label>
                <input className="w-full px-3 py-2.5 bg-page border border-base rounded-xl font-black text-sm outline-none" value={formData.company_info?.address?.street || ''} onChange={(e) => updateFormData('company_info.address.street', e.target.value)} />
              </div>

              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">SĐT liên hệ</label>
                {(() => { const s = validatePhone(formData.company_info?.contact?.phone); return (
                  <div className="relative">
                    <input className={`w-full px-3 py-2.5 bg-page border rounded-xl font-black text-sm outline-none ${s === 'error' ? 'border-red-400' : s === 'warn' ? 'border-yellow-400' : 'border-base'}`} value={formData.company_info?.contact?.phone || ''} onChange={(e) => updateFormData('company_info.contact.phone', e.target.value)} />
                    {s === 'error' && <p className="text-[10px] font-bold text-red-500 mt-0.5 px-1">SĐT</p>}
                    {s === 'warn' && <p className="text-[10px] font-bold text-yellow-600 mt-0.5 px-1">⚠ Chắc là 11 số không?</p>}
                  </div>
                ); })()}
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Email HKD</label>
                {(() => { const s = validateEmail(formData.company_info?.contact?.email); return (
                  <div>
                    <input className={`w-full px-3 py-2.5 bg-page border rounded-xl font-black text-sm outline-none ${s === 'error' ? 'border-red-400' : 'border-base'}`} value={formData.company_info?.contact?.email || ''} onChange={(e) => updateFormData('company_info.contact.email', e.target.value)} placeholder="email@..." />
                    {s === 'error' && <p className="text-[10px] font-bold text-red-500 mt-0.5 px-1">Email không đúng định dạng</p>}
                  </div>
                ); })()}
              </div>

              {/* Collapsible extra info */}
              <div className="col-span-6">
                <button onClick={() => setShowExtra(!showExtra)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-body hover:text-orange-600 transition">
                  <ChevronDown size={12} className={`transition-transform ${showExtra ? 'rotate-180' : ''}`} />
                  Tên tiếng Anh, viết tắt, Fax &amp; website
                </button>
                {showExtra && (
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    {[
                      ['Tên tiếng Anh', 'company_info.name.foreign', 'NGUYEN VAN A...'],
                      ['Tên viết tắt', 'company_info.name.short', 'NVA...'],
                      ['Số Fax', 'company_info.contact.fax', '028...'],
                      ['Website', 'company_info.contact.website', 'https://...'],
                    ].map(([lbl, path, ph]) => (
                      <div key={path}>
                        <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">{lbl}</label>
                        <input className="w-full px-3 py-2 bg-page border border-base rounded-xl font-bold text-sm outline-none focus:bg-surface focus:border-orange-400" value={path.split('.').reduce((o, k) => o?.[k], formData) || ''} onChange={(e) => updateFormData(path, e.target.value)} placeholder={ph} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. OWNER INFO */}
          <div className="bg-surface rounded-[24px] p-5 border border-slate-300 dark:border-slate-600 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100"><Users size={16} /></div>
                <h3 className="text-xs font-black text-strong uppercase tracking-widest">Chủ sở hữu</h3>
              </div>
              {formData.customer && (
                <button
                  onClick={() => {
                    const c = formData.customer;
                    const bd = c.birth_date ? (() => { const d = new Date(c.birth_date); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; })() : '';
                    batchUpdateFormData([
                      ['owner_info.personal_info.full_name', c.name || ''],
                      ['owner_info.personal_info.id_number', c.id_card || ''],
                      ['owner_info.personal_info.gender', c.gender ?? ''],
                      ['owner_info.personal_info.birth_date', bd],
                      ['owner_info.contact_info.phone', c.phone || ''],
                      ['owner_info.contact_address.province_id', c.province_id || ''],
                      ['owner_info.contact_address.ward_id', c.ward_id || ''],
                      ['owner_info.contact_address.street', c.street || ''],
                    ]);
                    if (c.province_id) loadWards('owner', c.province_id);
                  }}
                  className="text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition border border-indigo-200 px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100"
                >
                  Giống thông tin KH
                </button>
              )}
            </div>
            {/* CCCD Upload */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 px-1">
                <CreditCard size={13} className="text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-body">Ảnh CCCD - Up mặt trước có AI quét</span>
                {ocrRunning && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500">
                    <Loader2 size={10} className="animate-spin" /> Đang OCR CCCD, đợi xíu...
                  </span>
                )}
                {!formData.id && <span className="text-[10px] font-bold text-weak italic">(Lưu hồ sơ trước)</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ label: '005', name: 'Mặt trước' }, { label: '006', name: 'Mặt sau' }].map(({ label, name }) => {
                  const doc = cccdDocs[label];
                  const uploading = cccdUploading[label];
                  return (
                    <div key={label}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all ${doc ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800' : 'bg-page border-base'}`}
                    >
                      <input ref={cccdRefs[label]} type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden"
                        onChange={e => { const f = e.target.files[0]; if (f) { handleCccdUpload(label, f); e.target.value = ''; } }} />
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                        <CreditCard size={15} className={doc ? 'text-indigo-600' : 'text-weak'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black text-body uppercase tracking-wide">{name}</div>
                        {doc
                          ? <DriveFileLink driveLink={doc.drive_link} fileName={doc.file_name} className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 max-w-[120px]" />
                          : <div className="text-[9px] font-bold text-weak italic">Chưa có ảnh</div>
                        }
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {doc && (
                          <button onClick={() => handleCccdDelete(label)} className="p-1 text-weak hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                            <Trash2 size={12} />
                          </button>
                        )}
                        <button onClick={() => { if (formData.id) setPasteTarget(label); }} disabled={uploading || !formData.id}
                          className="p-1.5 text-weak hover:text-indigo-600 border border-base hover:border-indigo-300 rounded-lg transition-all disabled:opacity-40">
                          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <PasteDropZone
              isOpen={!!pasteTarget}
              onClose={() => setPasteTarget(null)}
              title={`CCCD — ${pasteTarget === '005' ? 'Mặt trước' : 'Mặt sau'}`}
              onFile={(file) => {
                const named = new File([file], `cccd_${pasteTarget}.png`, { type: file.type });
                handleCccdUpload(pasteTarget, named);
              }}
            />

            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Họ và tên chủ sở hữu</label>
                <input className="w-full px-3 py-2.5 bg-page border border-base rounded-xl font-black text-sm outline-none uppercase" value={formData.owner_info?.personal_info?.full_name || ''} onChange={(e) => updateFormData('owner_info.personal_info.full_name', e.target.value.toUpperCase())} />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Số CCCD/Định danh</label>
                <input className="w-full px-3 py-2.5 bg-page border border-base rounded-xl font-black text-sm outline-none" value={formData.owner_info?.personal_info?.id_number || ''} onChange={(e) => updateFormData('owner_info.personal_info.id_number', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Ngày sinh</label>
                <input type="date" className="w-full px-3 py-2.5 bg-page border border-base rounded-xl font-black text-sm outline-none"
                  value={(() => { const bd = formData.owner_info?.personal_info?.birth_date; if (!bd) return ''; const p = bd.split('/'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : bd; })()}
                  onChange={(e) => { const v = e.target.value; if (!v) { updateFormData('owner_info.personal_info.birth_date', ''); return; } const [y,m,d] = v.split('-'); updateFormData('owner_info.personal_info.birth_date', `${d}/${m}/${y}`); }} />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Giới tính</label>
                <div className="flex gap-2">
                  {[{ v: 0, label: 'Nam' }, { v: 1, label: 'Nữ' }].map(g => (
                    <button key={g.v} onClick={() => updateFormData('owner_info.personal_info.gender', g.v)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all border ${formData.owner_info?.personal_info?.gender === g.v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-page text-body border-base hover:border-indigo-300'}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 flex items-end">
                <button onClick={() => setSyncAddress(!syncAddress)} className={`w-full px-3 py-2.5 rounded-xl text-[10px] font-black transition-all border ${syncAddress ? 'bg-orange-600 text-white border-orange-600' : 'bg-surface text-body border-base hover:border-orange-500 hover:text-orange-600 uppercase tracking-widest'}`}>GIỐNG ĐỊA CHỈ HKD</button>
              </div>
              <div className="col-span-6 bg-page/50 p-4 rounded-2xl border border-dashed border-base">
                <h4 className="text-[10px] font-black text-body uppercase tracking-widest mb-3">Địa chỉ thường trú</h4>
                <div className="grid grid-cols-3 gap-3">
                  <SearchableSelect
                    value={formData.owner_info?.contact_address?.province_id || ''}
                    onChange={(id) => { updateFormData('owner_info.contact_address.province_id', id); loadWards('owner', id); }}
                    options={provinces}
                    placeholder="Tỉnh/Thành"
                    disabled={syncAddress}
                  />
                  <SearchableSelect
                    value={formData.owner_info?.contact_address?.ward_id || ''}
                    onChange={(id) => updateFormData('owner_info.contact_address.ward_id', id)}
                    options={wardOptions?.owner || []}
                    placeholder="Phường/Xã"
                    disabled={syncAddress}
                  />
                  <input disabled={syncAddress} className="w-full px-3 py-2.5 rounded-xl bg-surface border border-base font-bold text-xs outline-none" placeholder="Số nhà, đường..." value={formData.owner_info?.contact_address?.street || ''} onChange={(e) => updateFormData('owner_info.contact_address.street', e.target.value)} />
                </div>
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Số điện thoại</label>
                {(() => { const s = validatePhone(formData.owner_info?.contact_info?.phone); return (
                  <div>
                    <input className={`w-full px-3 py-2.5 bg-page border rounded-xl font-black text-sm outline-none ${s === 'error' ? 'border-red-400' : s === 'warn' ? 'border-yellow-400' : 'border-base'}`} value={formData.owner_info?.contact_info?.phone || ''} onChange={(e) => updateFormData('owner_info.contact_info.phone', e.target.value)} placeholder="09xx..." />
                    {s === 'error' && <p className="text-[10px] font-bold text-red-500 mt-0.5 px-1">SĐT phải bắt đầu bằng 0 và có 10 số</p>}
                    {s === 'warn' && <p className="text-[10px] font-bold text-yellow-600 mt-0.5 px-1">⚠ Bạn có chắc là 11 số không?</p>}
                  </div>
                ); })()}
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Email</label>
                {(() => { const s = validateEmail(formData.owner_info?.contact_info?.email); return (
                  <div>
                    <input className={`w-full px-3 py-2.5 bg-page border rounded-xl font-black text-sm outline-none ${s === 'error' ? 'border-red-400' : 'border-base'}`} value={formData.owner_info?.contact_info?.email || ''} onChange={(e) => updateFormData('owner_info.contact_info.email', e.target.value)} placeholder="email@..." />
                    {s === 'error' && <p className="text-[10px] font-bold text-red-500 mt-0.5 px-1">Email không đúng định dạng</p>}
                  </div>
                ); })()}
              </div>

            </div>
          </div>

          {/* 3. FIELDS TEMPLATE */}
          <div className="bg-surface rounded-[24px] p-5 border border-slate-300 dark:border-slate-600 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 border border-violet-100"><BookOpen size={16} /></div>
                <h3 className="text-xs font-black text-strong uppercase tracking-widest">Lĩnh vực mẫu</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={copyAllIndustries} className="flex items-center gap-1 text-[9px] font-black text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-lg uppercase hover:bg-orange-100 transition">
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

          {/* 4. INDUSTRIES */}
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
                            onSelect={(i) => {
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
                          onChange={(e) => { const next = [...formData.industries]; next[idx].note = e.target.value; updateFormData('industries', next); }}
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

        </div>

        {/* Right panel toggle button */}
        <div className="flex flex-col items-center justify-start pt-2 shrink-0">
          <button
            onClick={() => { const v = !rightHidden; setRightHidden(v); localStorage.setItem('editorRightHidden', v ? '1' : '0'); }}
            className="p-1.5 rounded-xl bg-surface border border-base text-weak hover:text-orange-600 hover:border-orange-300 transition"
            title={rightHidden ? 'Mở panel phải' : 'Ẩn panel phải'}
          >
            {rightHidden ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        <div className={`w-80 shrink-0 overflow-y-auto pb-32 space-y-8 transition-all ${rightHidden ? 'hidden' : ''}`}>
          <div className="bg-surface rounded-[32px] p-8 border border-slate-300 dark:border-slate-600 shadow-sm">
            <h4 className="text-[11px] font-black text-weak uppercase tracking-widest mb-8 flex items-center gap-2">
              <Info size={14} className="text-orange-500" /> Hồ sơ & Phân quyền
            </h4>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-weak block mb-2 px-1">Tình trạng hồ sơ</label>
                <select value={formData.status_id || ''} onChange={(e) => updateFormData('status_id', parseInt(e.target.value))} className="w-full bg-orange-600 text-white rounded-2xl px-5 py-3.5 text-xs font-black border-none shadow-lg shadow-orange-200/60 dark:shadow-none appearance-none uppercase tracking-widest">
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
                <label className="text-[10px] font-black uppercase text-weak block mb-2 px-1">Số tiền đã thanh toán (VNĐ)</label>
                <input
                  type="text"
                  className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3 text-sm font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-400 transition"
                  placeholder="0"
                  value={fmtNum(formData.paid_amount)}
                  onChange={(e) => updateFormData('paid_amount', parseNum(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-faint">
                <div>
                  <label className="text-[10px] font-black uppercase text-weak block mb-2 px-1">NV Xử lý chính</label>
                  <select value={formData.handling_staff_id || ''} onChange={(e) => updateFormData('handling_staff_id', parseInt(e.target.value))} className="w-full bg-page rounded-xl px-4 py-3 text-[11px] font-bold border-none appearance-none outline-none">
                    <option value="">--</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-weak block mb-2 px-1">NV Hỗ trợ</label>
                  <select value={formData.supporting_staff_id || ''} onChange={(e) => updateFormData('supporting_staff_id', parseInt(e.target.value))} className="w-full bg-page rounded-xl px-4 py-3 text-[11px] font-bold border-none appearance-none outline-none">
                    <option value="">--</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 border-t border-faint">
                <label className="text-[10px] font-black uppercase text-weak block mb-2 px-1">Chủ hồ sơ (KH)</label>
                <button
                  onClick={() => formData.customer && setShowCustomerDetail(true)}
                  className={`w-full flex items-center gap-2 p-3.5 rounded-2xl border shadow-inner transition-all text-left ${formData.customer ? 'bg-page border-transparent hover:border-orange-200 hover:bg-orange-50/50 cursor-pointer' : 'bg-page border-transparent cursor-default'}`}
                >
                  <Users size={16} className="text-orange-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-strong truncate">{formData.customer?.name || 'Chưa chọn'}</div>
                    {formData.customer?.phone && <div className="text-[10px] font-bold text-weak">{formData.customer.phone}</div>}
                  </div>
                  {formData.customer && <Info size={12} className="text-weak shrink-0 ml-auto" />}
                </button>
              </div>
              <div className="pt-4 border-t border-faint">
                <label className="text-[10px] font-black uppercase text-orange-600 block mb-2 px-1">Ghi chú</label>
                <textarea value={formData.note || ''} onChange={(e) => updateFormData('note', e.target.value)} className="w-full bg-orange-50/30 rounded-[24px] px-5 py-5 text-xs font-bold border-none min-h-[140px] outline-none shadow-inner" placeholder="Ghi chú..." />
              </div>
            </div>

          </div>
        </div>
      </div>
      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} formData={formData} />
      <HKDGovModal isOpen={showGov} onClose={() => setShowGov(false)} formData={formData} provinces={provinces} wardOptions={wardOptions} onSave={onSave} />
      <CustomerDetailModal
        customer={showCustomerDetail ? formData.customer : null}
        onClose={() => setShowCustomerDetail(false)}
        onUpdated={(updated) => { updateFormData('customer', updated); setShowCustomerDetail(false); }}
        sources={sources}
        staff={staff}
      />
      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        hkdId={formData.id}
        folderId={formData.folder_id}
        onFolderCreated={(newFolderId) => updateFormData('folder_id', newFolderId)}
      />
    </div>
  );
};

export default HKDEditor;
