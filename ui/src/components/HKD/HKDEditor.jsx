import { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  Save,
  Download,
  Send,
  Trash2,
  X,
  ArrowLeft,
  ChevronDown,
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
} from 'lucide-react';
import { hkdApi, exportApi, govApi, govJobStorage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../Common/SearchableSelect';
import UploadModal from './UploadModal';
import GovProgressModal from './GovProgressModal';


const IndustrySelect = ({ industries, onSelect, onClose }) => {
  const [query, setQuery] = useState('');

  const filtered = industries.filter(i =>
    i.code.toLowerCase().includes(query.toLowerCase()) ||
    i.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="px-3 pt-3 pb-2 border-b border-slate-50 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input autoFocus className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none" placeholder="Tìm mã hoặc tên ngành..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition shrink-0"><X size={14} /></button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtered.map(i => (
          <div
            key={i.code}
            onClick={() => onSelect(i)}
            className="px-4 py-3 hover:bg-orange-50 cursor-pointer transition-all border-b border-slate-50 last:border-none"
          >
            <div className="text-[10px] font-black text-orange-600 uppercase mb-0.5">{i.code}</div>
            <div className="text-[11px] font-black text-slate-700">{i.name}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-300 italic text-xs font-bold">Không tìm thấy kết quả</div>
        )}
      </div>
    </div>
  );
};

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
  return missing;
};

const EXPORT_TEMPLATES = [
  { id: '000', name: 'HD ký + Hợp đồng + Giấy đề nghị' },
  { id: '001', name: 'Giấy giới thiệu' },
  // { id: '002', name: 'Hợp đồng & xác nhận dịch vụ' },
  // { id: '003', name: 'Giấy giới thiệu nhận' },
  // { id: '004', name: 'Giấy giới thiệu nộp' },
];


const ExportModal = ({ isOpen, onClose, formData }) => {
  const [selected, setSelected] = useState(new Set(EXPORT_TEMPLATES.map(t => t.id)));
  const [exportErrors, setExportErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;
  const toggle = (id) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };

  const handleExport = async () => {
    const errs = validateGov(formData);
    if (errs.length > 0) { setExportErrors(errs); return; }
    setExportErrors([]);
    setLoading(true);
    try {
      const templateIds = [...selected];
      const res = await exportApi.exportHkd(formData.id, templateIds);

      // Derive filename from Content-Disposition header or fallback
      const disposition = res.headers['content-disposition'] || '';
      let filename = `HKD_${formData.code || 'export'}.${templateIds.length > 1 ? 'zip' : 'docx'}`;
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-[28px] shadow-2xl w-[480px] p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Xuất hồ sơ</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={16} /></button>
        </div>
        {exportErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-2">Cần bổ sung thông tin trước khi xuất:</p>
            <ul className="space-y-1">
              {exportErrors.map((e, i) => <li key={i} className="text-xs font-bold text-red-500 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />{e}</li>)}
            </ul>
          </div>
        )}
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Chọn các biểu mẫu cần tạo</p>
        <div className="space-y-2 mb-6">
          {EXPORT_TEMPLATES.map(t => (
            <div key={t.id} onClick={() => toggle(t.id)} className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all border ${selected.has(t.id) ? 'bg-orange-50 border-orange-200' : 'border-slate-100 hover:border-slate-200'}`}>
              {selected.has(t.id) ? <CheckSquare size={16} className="text-orange-600 shrink-0" /> : <Square size={16} className="text-slate-300 shrink-0" />}
              <span className={`text-sm font-bold ${selected.has(t.id) ? 'text-orange-800' : 'text-slate-600'}`}>{t.name}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-6 py-2.5 text-slate-400 font-bold text-sm">Hủy</button>
          <button
            disabled={selected.size === 0 || loading}
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-2xl font-black text-sm hover:bg-orange-700 shadow-lg shadow-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
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

const GovTransferModal = ({ isOpen, onClose, formData, provinces, wardOptions, onJobStarted }) => {
  const { token } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  if (!isOpen) return null;

  const payload = buildGovPayload(formData, provinces, wardOptions);
  const ci = payload.company_info;
  const ow = payload.owner;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-[28px] shadow-2xl w-[560px] max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center"><Building2 size={18} className="text-indigo-600" /></div>
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Xác nhận chuyển GOV</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Kiểm tra thông tin trước khi gửi</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 text-xs">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Thông tin HKD</p>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5 font-bold text-slate-700">
              <div><span className="text-slate-400">Tên:</span> {ci.name.full}</div>
              <div><span className="text-slate-400">Địa chỉ:</span> {ci.address.street}, {ci.address.ward}, {ci.address.province}</div>
              <div><span className="text-slate-400">SĐT:</span> {ci.contact.phone}</div>
              <div><span className="text-slate-400">Vốn:</span> {ci.charter_capital.toLocaleString('vi-VN')} VND</div>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Chủ sở hữu</p>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5 font-bold text-slate-700">
              <div><span className="text-slate-400">Họ tên:</span> {ow.personal_info.full_name}</div>
              <div><span className="text-slate-400">CCCD:</span> {ow.personal_info.id_number}</div>
              <div><span className="text-slate-400">Ngày sinh:</span> {ow.personal_info.birth_date}</div>
              <div><span className="text-slate-400">Địa chỉ:</span> {ow.contact_address.street}, {ow.contact_address.ward}, {ow.contact_address.province}</div>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Ngành nghề ({payload.industries.length})</p>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-1 font-bold text-slate-700">
              {payload.industries.map((ind, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-orange-600">{ind.code}</span>
                  {ind.is_main && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-black">CHÍNH</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-8 py-5 border-t border-slate-100 flex justify-between items-center">
          <span className="text-[11px] font-bold">{submitError ? <span className="text-red-500">{submitError}</span> : <span className="text-slate-400">Dữ liệu sẽ được gửi tự động lên GOV</span>}</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 text-slate-400 font-bold text-sm">Hủy</button>
            <button
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                setSubmitError('');
                try {
                  const res = await govApi.submitHkd(payload, token);
                  const jobId = res.data?.job_id;
                  if (jobId) onJobStarted?.(jobId);
                  onClose();
                } catch (err) {
                  setSubmitError(err?.response?.data?.detail || 'Gửi thất bại');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition disabled:opacity-50"
            >
              {submitting ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />} Gửi hồ sơ
            </button>
          </div>
        </div>
      </div>
    </div>
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
  const [syncing, setSyncing] = useState(false);
  const [activeIndustryIdx, setActiveIndustryIdx] = useState(null);
  const [showExtra, setShowExtra] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showGov, setShowGov] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showGovProgress, setShowGovProgress] = useState(false);
  const [govErrors, setGovErrors] = useState([]);
  const govJob = formData.id ? govJobStorage.get(formData.id) : null;

  // Clear gov errors when switching to a different HKD
  useEffect(() => { setGovErrors([]); }, [formData.id]);

  const fmtNum = (v) => v ? new Intl.NumberFormat('vi-VN').format(v) : '';
  const parseNum = (s) => parseInt(String(s).replace(/\D/g, '')) || null;

  const handleSyncCRM = async () => {
    if (!formData.id) return;
    if (!window.confirm("Bắt đầu đẩy dữ liệu hồ sơ này lên CRM?")) return;
    setSyncing(true);
    try {
      const res = await hkdApi.syncCRM(formData.id);
      updateFormData('crm_link', res.data.crm_link);
      alert("Đồng bộ CRM thành công!");
    } catch (e) { alert("Lỗi khi đồng bộ CRM"); }
    finally { setSyncing(false); }
  };

  const addIndustryRow = () => {
    const newRow = { code: '', name: '', is_main: !(formData.industries?.length), note: '' };
    updateFormData('industries', [newRow, ...(formData.industries || [])]);
  };

  const removeIndustryRow = (idx) => {
    updateFormData('industries', formData.industries.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F9FAFB] animate-in fade-in slide-in-from-bottom-2 duration-300 border-l border-slate-200">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-2xl text-slate-400 transition"><ArrowLeft size={20} /></button>
          <div className="px-3 border-l border-slate-100">
            <h2 className="text-base font-black text-slate-800 tracking-tight uppercase italic">{formData.id ? `Sửa hồ sơ: ${formData.code}` : 'Soạn hồ sơ mới'}</h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formData.customer?.name || 'Vãng lai'}</span>
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
          {formData.id && onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[11px] transition-all border bg-white border-red-200 text-red-400 hover:bg-red-50 hover:border-red-400 hover:text-red-600"
            >
              <Trash2 size={14} /> Xóa hồ sơ
            </button>
          )}
          {formData.id && (
            <button
              onClick={handleSyncCRM}
              disabled={syncing}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[11px] transition-all border ${formData.crm_link ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-500 hover:text-emerald-600'
                }`}
            >
              {syncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {formData.crm_link ? 'CẬP NHẬT CRM' : 'NHẬP LÊN CRM'}
            </button>
          )}
          <button onClick={onSave} className="flex items-center gap-2 px-8 py-2 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 shadow-xl shadow-orange-100 font-black text-xs transition">
            <Save size={18} /> LƯU HỒ SƠ
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden px-8 py-8">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto space-y-8 pb-32">
          {/* Action buttons */}
          {formData.id && (
            <div className="flex gap-3">
              <button onClick={() => { setShowExport(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs hover:border-orange-400 hover:text-orange-600 shadow-sm transition">
                <Download size={14} /> Xuất hồ sơ
              </button>
              <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs hover:border-blue-400 hover:text-blue-600 shadow-sm transition">
                <Upload size={14} /> Upload Drive
              </button>
              <button onClick={() => {
                const errs = validateGov(formData);
                if (errs.length > 0) { setGovErrors(errs); } else { setGovErrors([]); setShowGov(true); }
              }} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs hover:border-indigo-400 hover:text-indigo-600 shadow-sm transition">
                <Building2 size={14} /> Chuyển GOV
              </button>
              {govJob && (
                <button onClick={() => setShowGovProgress(true)} className={`flex items-center gap-2 px-5 py-2.5 bg-white border rounded-2xl font-black text-xs shadow-sm transition ${govJob.status === 'completed' ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50' : govJob.status === 'failed' ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}>
                  <RefreshCw size={14} />
                  {govJob.status === 'completed' ? 'GOV: Hoàn thành' : govJob.status === 'failed' ? `GOV: Thất bại` : 'Xem tiến độ GOV'}
                </button>
              )}
              {govJob?.status === 'failed' && govJob.error && (
                <span className="text-[10px] font-bold text-red-500 px-1">{govJob.error}</span>
              )}
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
          <div className="bg-white rounded-[24px] p-5 border border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 shadow-sm border border-orange-100"><FileText size={16} /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Hộ kinh doanh</h3>
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
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1 block px-1">Tên Hộ kinh doanh</label>
                <div className="flex items-stretch rounded-xl overflow-hidden border border-slate-200 bg-slate-50 focus-within:border-orange-500 focus-within:bg-white transition-all">
                  <span className="flex items-center px-3 text-[10px] font-black text-slate-500 bg-slate-100 border-r border-slate-200 whitespace-nowrap select-none">HKD</span>
                  <input className="flex-1 px-3 py-2.5 bg-transparent outline-none font-black text-sm uppercase" value={formData.company_full_name || ''} onChange={(e) => updateFormData('company_full_name', e.target.value.toUpperCase())} placeholder="NGUYỄN VĂN A..." />
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1 block px-1">Vốn điều lệ (VNĐ)</label>
                <input type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 transition-all outline-none font-black text-sm" value={fmtNum(formData.company_info?.charter_capital)} onChange={(e) => updateFormData('company_info.charter_capital', parseNum(e.target.value))} />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1 block px-1">Tỉnh/Thành phố</label>
                <SearchableSelect
                  value={formData.company_info?.address?.province_id || ''}
                  onChange={(id) => { updateFormData('company_info.address.province_id', id); loadWards('hkd', id); }}
                  options={provinces}
                  placeholder="-- Chọn --"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1 block px-1">Phường/Xã</label>
                <SearchableSelect
                  value={formData.company_info?.address?.ward_id || ''}
                  onChange={(id) => updateFormData('company_info.address.ward_id', id)}
                  options={wardOptions?.hkd || []}
                  placeholder="-- Chọn --"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1 block px-1">Số nhà, tên đường</label>
                <input className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none" value={formData.company_info?.address?.street || ''} onChange={(e) => updateFormData('company_info.address.street', e.target.value)} />
              </div>

              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1 block px-1">SĐT liên hệ</label>
                <input className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none" value={formData.company_info?.contact?.phone || ''} onChange={(e) => updateFormData('company_info.contact.phone', e.target.value)} />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1 block px-1">Email HKD</label>
                <input className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none" value={formData.company_info?.contact?.email || ''} onChange={(e) => updateFormData('company_info.contact.email', e.target.value)} placeholder="email@..." />
              </div>

              {/* Collapsible extra info */}
              <div className="col-span-6">
                <button onClick={() => setShowExtra(!showExtra)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-orange-600 transition">
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
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1 block px-1">{lbl}</label>
                        <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-orange-400" value={path.split('.').reduce((o, k) => o?.[k], formData) || ''} onChange={(e) => updateFormData(path, e.target.value)} placeholder={ph} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. OWNER INFO */}
          <div className="bg-white rounded-[24px] p-5 border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100"><Users size={16} /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Chủ sở hữu</h3>
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
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1 block px-1">Họ và tên chủ sở hữu</label>
                <input className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none uppercase" value={formData.owner_info?.personal_info?.full_name || ''} onChange={(e) => updateFormData('owner_info.personal_info.full_name', e.target.value.toUpperCase())} />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1 block px-1">Số CCCD/Định danh</label>
                <input className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none" value={formData.owner_info?.personal_info?.id_number || ''} onChange={(e) => updateFormData('owner_info.personal_info.id_number', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1 block px-1">Ngày sinh</label>
                <input type="date" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none"
                  value={(() => { const bd = formData.owner_info?.personal_info?.birth_date; if (!bd) return ''; const p = bd.split('/'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : bd; })()}
                  onChange={(e) => { const v = e.target.value; if (!v) { updateFormData('owner_info.personal_info.birth_date', ''); return; } const [y,m,d] = v.split('-'); updateFormData('owner_info.personal_info.birth_date', `${d}/${m}/${y}`); }} />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1 block px-1">Giới tính</label>
                <div className="flex gap-2">
                  {[{ v: 0, label: 'Nam' }, { v: 1, label: 'Nữ' }].map(g => (
                    <button key={g.v} onClick={() => updateFormData('owner_info.personal_info.gender', g.v)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all border ${formData.owner_info?.personal_info?.gender === g.v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300'}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 flex items-end">
                <button onClick={() => setSyncAddress(!syncAddress)} className={`w-full px-3 py-2.5 rounded-xl text-[10px] font-black transition-all border ${syncAddress ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-500 border-slate-200 hover:border-orange-500 hover:text-orange-600 uppercase tracking-widest'}`}>GIỐNG ĐỊA CHỈ HKD</button>
              </div>
              <div className="col-span-6 bg-slate-50/50 p-4 rounded-2xl border border-dashed border-slate-200">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Địa chỉ thường trú</h4>
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
                  <input disabled={syncAddress} className="px-3 py-2.5 rounded-xl bg-white border border-slate-200 font-bold text-xs outline-none" placeholder="Số nhà, đường..." value={formData.owner_info?.contact_address?.street || ''} onChange={(e) => updateFormData('owner_info.contact_address.street', e.target.value)} />
                </div>
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1 block px-1">Số điện thoại</label>
                <input className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none" value={formData.owner_info?.contact_info?.phone || ''} onChange={(e) => updateFormData('owner_info.contact_info.phone', e.target.value)} placeholder="09xx..." />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1 block px-1">Email</label>
                <input className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none" value={formData.owner_info?.contact_info?.email || ''} onChange={(e) => updateFormData('owner_info.contact_info.email', e.target.value)} placeholder="email@..." />
              </div>
            </div>
          </div>

          {/* 3. INDUSTRIES */}
          <div className="bg-white rounded-[24px] p-5 border border-slate-200/60 shadow-sm relative z-30">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100"><LayoutGrid size={16} /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Ngành nghề</h3>
              </div>
              <button onClick={addIndustryRow} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-xl font-black text-[10px] shadow-md shadow-orange-100 uppercase hover:bg-orange-700 transition">
                <Plus size={12} /> Thêm
              </button>
            </div>

            {formData.industries?.length > 0 ? (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-2 px-2 text-[9px] font-black uppercase tracking-widest text-slate-600 w-[40%]">Mã — Tên ngành nghề</th>
                    <th className="text-left py-2 px-2 text-[9px] font-black uppercase tracking-widest text-slate-600">Ghi chú</th>
                    <th className="text-center py-2 px-2 text-[9px] font-black uppercase tracking-widest text-slate-600 w-16">NN Chính</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {formData.industries.map((ind, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/60 transition-all group">
                      <td className="py-1.5 px-2 relative">
                        <div onClick={() => setActiveIndustryIdx(activeIndustryIdx === idx ? null : idx)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-[11px] cursor-pointer hover:border-orange-400 transition truncate text-slate-800">
                          {ind.code ? <><span className="text-orange-600 font-black">{ind.code}</span> — {ind.name}</> : <span className="text-slate-400 italic">Bấm để chọn ngành...</span>}
                        </div>
                        {activeIndustryIdx === idx && (
                          <IndustrySelect industries={allIndustries}
                            onSelect={(i) => { const next = [...formData.industries]; next[idx] = { ...next[idx], code: i.code, name: i.name }; updateFormData('industries', next); setActiveIndustryIdx(null); }}
                            onClose={() => setActiveIndustryIdx(null)} />
                        )}
                      </td>
                      <td className="py-1.5 px-2">
                        <textarea rows={1} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-[11px] outline-none focus:border-orange-400 resize-none text-slate-800"
                          value={ind.note || ''} onChange={(e) => { const next = [...formData.industries]; next[idx].note = e.target.value; updateFormData('industries', next); }} placeholder="..." />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button onClick={() => { const next = [...formData.industries]; next.forEach((it, i) => it.is_main = (i === idx)); updateFormData('industries', next); }}
                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${ind.is_main ? 'bg-orange-600 text-white shadow-sm shadow-orange-100' : 'bg-slate-100 text-slate-500 hover:bg-orange-100 hover:text-orange-600'}`}>
                          CHÍNH
                        </button>
                      </td>
                      <td className="py-1.5 px-1 text-center">
                        <button onClick={() => removeIndustryRow(idx)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-300 italic text-xs font-bold border border-dashed border-slate-200 rounded-xl">Chưa có ngành nghề nào. Bấm "+ Thêm" để thêm.</div>
            )}
          </div>

        </div>

        <div className="w-80 shrink-0 overflow-y-auto pb-32 space-y-8">
          <div className="bg-white rounded-[32px] p-8 border border-slate-200/60 shadow-sm">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
              <Info size={14} className="text-orange-500" /> Hồ sơ & Phân quyền
            </h4>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Tình trạng hồ sơ</label>
                <select value={formData.status_id || ''} onChange={(e) => updateFormData('status_id', parseInt(e.target.value))} className="w-full bg-orange-600 text-white rounded-2xl px-5 py-3.5 text-xs font-black border-none shadow-xl shadow-orange-100 appearance-none uppercase tracking-widest">
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="pt-4 border-t border-slate-50">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Số tiền đã thanh toán (VNĐ)</label>
                <input
                  type="text"
                  className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3 text-sm font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-400 transition"
                  placeholder="0"
                  value={fmtNum(formData.paid_amount)}
                  onChange={(e) => updateFormData('paid_amount', parseNum(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">NV Xử lý chính</label>
                  <select value={formData.handling_staff_id || ''} onChange={(e) => updateFormData('handling_staff_id', parseInt(e.target.value))} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-[11px] font-bold border-none appearance-none outline-none">
                    <option value="">--</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">NV Hỗ trợ</label>
                  <select value={formData.supporting_staff_id || ''} onChange={(e) => updateFormData('supporting_staff_id', parseInt(e.target.value))} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-[11px] font-bold border-none appearance-none outline-none">
                    <option value="">--</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-50">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Chủ hồ sơ (KH)</label>
                <div className="flex items-center gap-2 p-3.5 bg-slate-50 rounded-2xl border border-transparent shadow-inner">
                  <Users size={16} className="text-orange-500" />
                  <span className="text-xs font-black text-slate-800">{formData.customer?.name || 'Chưa chọn'}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-50">
                <label className="text-[10px] font-black uppercase text-orange-600 block mb-2 px-1">Ghi chú</label>
                <textarea value={formData.note || ''} onChange={(e) => updateFormData('note', e.target.value)} className="w-full bg-orange-50/30 rounded-[24px] px-5 py-5 text-xs font-bold border-none min-h-[140px] outline-none shadow-inner" placeholder="Nhập lưu ý nội bộ cho hồ sơ này..." />
              </div>
            </div>

            {/* Suggestions */}
            <div className="mt-8 pt-8 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest italic">Lĩnh vực mẫu</h4>
                <button onClick={copyAllIndustries} className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg uppercase">COPY ALL</button>
              </div>
              <select value={selectedFieldId} onChange={(e) => setSelectedFieldId(e.target.value)} className="w-full bg-slate-100/50 rounded-xl px-3 py-2 text-[10px] font-bold border-none mb-4 outline-none">
                <option value="">-- Chọn lọc lĩnh vực --</option>{fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {fields.find(f => f.id === parseInt(selectedFieldId))?.industries?.map((li, idx) => (
                  <div key={idx} onClick={() => {
                    const next = [...(formData.industries || []), { code: li.industry.code, name: li.industry.name, is_main: !formData.industries?.length, note: li.note }];
                    updateFormData('industries', next);
                  }} className="p-2.5 bg-white border border-slate-100 rounded-xl hover:border-orange-300 cursor-pointer transition-all flex items-center justify-between">
                    <div className="flex-1 overflow-hidden pr-2">
                      <div className="text-[10px] font-black text-orange-600">{li.industry?.code}</div>
                      <div className="text-[10px] font-bold text-slate-500 truncate">{li.industry?.name}</div>
                    </div>
                    <Plus size={12} className="text-slate-300" />
                  </div>
                )) || (
                    <div className="py-8 text-center text-slate-300 italic text-[10px] font-bold">Hãy chọn lĩnh vực để xem gợi ý</div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} formData={formData} />
      <GovTransferModal isOpen={showGov} onClose={() => setShowGov(false)} formData={formData} provinces={provinces} wardOptions={wardOptions} onJobStarted={(jobId) => { govJobStorage.save(formData.id, jobId); }} />
      <GovProgressModal isOpen={showGovProgress} onClose={() => setShowGovProgress(false)} jobId={govJob?.jobId} hkdId={formData.id} />
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
