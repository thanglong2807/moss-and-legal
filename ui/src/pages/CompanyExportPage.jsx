import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, CheckSquare, Square, AlertCircle, Merge, Plus } from 'lucide-react';
import axios from 'axios';
import { companyApi, companyExportApi } from '../services/api';

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('mosslegal_access_token')}` });

// ── TLDN templates per company type ──────────────────────────────────────────
const TLDN_TEMPLATES = {
  1: [
    { id: '000', name: 'Hướng dẫn ký' },
    { id: '001', name: 'Giấy đề nghị' },
    { id: '002', name: 'Điều lệ' },
    { id: '003', name: 'Giấy ủy quyền' },
    { id: '004', name: 'Danh sách chủ sở hữu hưởng lợi' },
  ],
  2: [
    { id: '000', name: 'Hướng dẫn ký' },
    { id: '001', name: 'Giấy đề nghị' },
    { id: '002', name: 'Điều lệ' },
    { id: '003', name: 'Danh sách thành viên' },
    { id: '004', name: 'Giấy ủy quyền' },
    { id: '005', name: 'Danh sách chủ sở hữu hưởng lợi' },
  ],
  3: [
    { id: '000', name: 'Hướng dẫn ký' },
    { id: '001', name: 'Giấy đề nghị' },
    { id: '002', name: 'Điều lệ' },
    { id: '003', name: 'Danh sách cổ đông' },
    { id: '004', name: 'Giấy ủy quyền' },
    { id: '005', name: 'Danh sách chủ sở hữu hưởng lợi' },
  ],
};

// ── Shared checkbox list ──────────────────────────────────────────────────────
const TemplateList = ({ templates, selected, onToggle }) => (
  <div className="space-y-1.5">
    {templates.map(t => (
      <div key={t.id} onClick={() => onToggle(t.id)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl cursor-pointer transition-all border ${
          selected.has(t.id) ? 'bg-orange-50 border-orange-200' : 'border-faint hover:border-base'
        }`}>
        {selected.has(t.id)
          ? <CheckSquare size={15} className="text-orange-600 shrink-0" />
          : <Square size={15} className="text-weak shrink-0" />}
        <span className="text-[9px] font-black text-orange-400 w-10 shrink-0">{t.id}</span>
        <span className={`text-sm font-bold ${selected.has(t.id) ? 'text-orange-800' : 'text-body'}`}>{t.name}</span>
      </div>
    ))}
  </div>
);

// ── TLDN Section ──────────────────────────────────────────────────────────────
const TldnSection = ({ company, selected, onToggle, onSelectAll }) => {
  const templates = TLDN_TEMPLATES[company?.company_type] || [];
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const allSelected = selected.size === templates.length && templates.length > 0;

  const doExport = async (isMerge) => {
    setLoading(true); setErr('');
    try {
      const res = await companyExportApi.export(company.id, [...selected], isMerge);
      const disposition = res.headers['content-disposition'] || '';
      let filename = `TLDN_${company.code}.${isMerge ? 'docx' : selected.size > 1 ? 'zip' : 'docx'}`;
      const match = disposition.match(/filename\*=UTF-8''(.+)/i) || disposition.match(/filename="?([^"]+)"?/i);
      if (match) filename = decodeURIComponent(match[1]);
      const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e.response?.data ? await e.response.data.text?.() : e.message;
      setErr(msg || 'Lỗi khi tạo file');
    } finally { setLoading(false); }
  };

  if (!templates.length) return (
    <div className="py-6 text-center text-xs text-weak italic">Chưa xác định loại hình doanh nghiệp.</div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onSelectAll(templates, allSelected)}
          className="text-[10px] font-black text-orange-600 hover:underline">
          {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </button>
        <span className="text-[10px] text-weak font-semibold">{selected.size}/{templates.length} biểu mẫu</span>
      </div>

      <TemplateList templates={templates} selected={selected} onToggle={onToggle} />

      {err && (
        <div className="flex items-center gap-2 mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <AlertCircle size={13} /> {err}
        </div>
      )}

      <div className="flex gap-2 justify-end mt-4">
        {selected.size > 1 && (
          <button disabled={loading} onClick={() => doExport(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 disabled:opacity-50 transition shadow-lg shadow-indigo-100">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Tải &amp; gộp file
          </button>
        )}
        <button disabled={selected.size === 0 || loading} onClick={() => doExport(false)}
          className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-2xl font-black text-sm hover:bg-orange-700 disabled:opacity-50 transition shadow-lg shadow-orange-100">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Tải xuống ({selected.size})
        </button>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const CompanyExportPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // Lifted state — TLDN
  const [tldnSelected, setTldnSelected] = useState(new Set());

  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeErr, setMergeErr] = useState('');

  // Custom tenant templates (company category)
  const [customTemplates, setCustomTemplates] = useState([]);
  const [customSelected, setCustomSelected] = useState(new Set());
  const [customLoading, setCustomLoading] = useState(false);
  const [customExportLoading, setCustomExportLoading] = useState(false);
  const [customExportErr, setCustomExportErr] = useState('');

  useEffect(() => {
    companyApi.get(id).then(r => {
      setCompany(r.data);
      // Default select all TLDN templates
      const tpls = TLDN_TEMPLATES[r.data.company_type] || [];
      setTldnSelected(new Set(tpls.map(t => t.id)));
      setLoading(false);

      // Load custom templates theo loại hình DN (tldn_1/2/3) + company (backward compat)
      setCustomLoading(true);
      const typeToCategory = { 1: 'tldn_1', 2: 'tldn_2', 3: 'tldn_3' };
      const cat = typeToCategory[r.data.company_type] || 'tldn_1';
      Promise.all([
        axios.get(`/api/v1/tenant/document-types?category=${cat}`, { headers: authHeaders() }),
        axios.get('/api/v1/tenant/document-types?category=company', { headers: authHeaders() }),
      ])
        .then(([r1, r2]) => {
          const items1 = (r1.data.items || []).filter(t => t.is_active && t.has_template);
          const items2 = (r2.data.items || []).filter(t => t.is_active && t.has_template);
          // Gộp, tránh trùng id
          const seen = new Set(items1.map(t => t.id));
          const merged = [...items1, ...items2.filter(t => !seen.has(t.id))];
          setCustomTemplates(merged);
          setCustomSelected(new Set(merged.map(t => t.template_key)));
        })
        .catch(() => {})
        .finally(() => setCustomLoading(false));
    }).catch(() => setLoading(false));
  }, [id]);

  const customToggle = (tid) => setCustomSelected(s => { const n = new Set(s); n.has(tid) ? n.delete(tid) : n.add(tid); return n; });

  const handleCustomExport = async (isMerge) => {
    if (!customSelected.size) return;
    setCustomExportLoading(true); setCustomExportErr('');
    try {
      const res = await axios.post(
        `/api/v1/export/hkd/${id}`,  // reuse HKD export endpoint — works for any entity with tenant templates
        { template_ids: [...customSelected], is_merge: isMerge },
        { headers: authHeaders(), responseType: 'arraybuffer' }
      );
      const ct = res.headers['content-type'] || '';
      const isZip = ct.includes('zip');
      const disp = res.headers['content-disposition'] || '';
      const match = disp.match(/filename\*=UTF-8''(.+)/i) || disp.match(/filename="?([^"]+)"?/i);
      const filename = match ? decodeURIComponent(match[1]) : `custom_${company?.code || id}.${isMerge || !isZip ? 'docx' : 'zip'}`;
      const url = URL.createObjectURL(new Blob([res.data], { type: ct }));
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      let msg = 'Lỗi khi tạo file';
      if (e.response?.data) {
        try { msg = JSON.parse(new TextDecoder().decode(e.response.data))?.detail || msg; } catch { /* */ }
      }
      setCustomExportErr(msg);
    } finally { setCustomExportLoading(false); }
  };

  // TLDN toggle helpers
  const tldnToggle = (tid) => setTldnSelected(s => { const n = new Set(s); n.has(tid) ? n.delete(tid) : n.add(tid); return n; });
  const tldnSelectAll = (templates, allSelected) =>
    setTldnSelected(allSelected ? new Set() : new Set(templates.map(t => t.id)));

  // Merge all (chỉ TLDN)
  const totalSelected = tldnSelected.size + customSelected.size;
  const mergeReady = tldnSelected.size > 1;

  const handleMergeAll = async () => {
    setMergeLoading(true); setMergeErr('');
    try {
      const res = await companyExportApi.export(company.id, [...tldnSelected], true);
      const disposition = res.headers['content-disposition'] || '';
      let filename = `HoSo_TLDN_${company.code}.docx`;
      const match = disposition.match(/filename\*=UTF-8''(.+)/i) || disposition.match(/filename="?([^"]+)"?/i);
      if (match) filename = decodeURIComponent(match[1]);
      const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e.response?.data ? await e.response.data.text?.() : e.message;
      setMergeErr(msg || 'Lỗi gộp file');
    } finally { setMergeLoading(false); }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-page">
      <Loader2 className="animate-spin text-orange-500" size={28} />
    </div>
  );

  const typeLabel = ['TNHH 1TV', 'TNHH 2TV+', 'Cổ phần'][(company?.company_type || 1) - 1];

  return (
    <div className="flex-1 flex flex-col bg-page overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-faint bg-surface flex items-center gap-3 shrink-0">
        <button onClick={() => navigate(`/company/${id}`)}
          className="flex items-center gap-1.5 text-weak hover:text-strong transition text-xs font-black">
          <ArrowLeft size={14} /> Quay lại
        </button>
        <span className="text-weak/40">|</span>
        <span className="text-xs font-black uppercase tracking-widest text-strong">Xuất hồ sơ</span>
        {company && (
          <span className="ml-auto text-[11px] font-bold text-weak truncate max-w-xs">
            {company.company_full_name}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Nút gộp tất cả */}
          <div className="bg-surface rounded-2xl border border-indigo-200 dark:border-indigo-800 p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-strong">Tải &amp; gộp tất cả</p>
              <p className="text-[10px] text-weak mt-0.5">
                Gộp toàn bộ các file đang chọn ({totalSelected} biểu mẫu) thành 1 file .docx duy nhất.
              </p>
              {mergeErr && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-red-600 font-bold">
                  <AlertCircle size={12} /> {mergeErr}
                </div>
              )}
            </div>
            <button
              disabled={!mergeReady || mergeLoading}
              onClick={handleMergeAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 disabled:opacity-40 transition shadow-lg shadow-indigo-100 shrink-0"
            >
              {mergeLoading ? <Loader2 size={14} className="animate-spin" /> : <Merge size={14} />}
              Gộp tất cả ({totalSelected})
            </button>
          </div>

          {/* Section 1: Hồ sơ TLDN */}
          <div className="bg-surface rounded-2xl border border-base overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-faint bg-slate-50 dark:bg-slate-800/40">
              <span className="text-[10px] font-black uppercase tracking-widest text-strong">Hồ sơ TLDN</span>
              <span className="ml-2 text-[10px] text-weak font-semibold">{typeLabel}</span>
            </div>
            <div className="p-5">
              {company
                ? <TldnSection
                    company={company}
                    selected={tldnSelected}
                    onToggle={tldnToggle}
                    onSelectAll={tldnSelectAll}
                  />
                : <div className="py-4 text-center text-xs text-weak italic">Không tải được dữ liệu.</div>}
            </div>
          </div>

          {/* Section 2: Custom templates của tenant */}
          {(customLoading || customTemplates.length > 0) && (
            <div className="bg-surface rounded-2xl border border-base overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-faint bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-strong">Hồ sơ tùy chỉnh</span>
                  <span className="text-[10px] text-weak font-semibold">— mẫu tùy chỉnh ({typeLabel})</span>
                </div>
                <a href="/settings" className="text-[10px] text-orange-600 hover:underline font-semibold flex items-center gap-1">
                  <Plus size={10} /> Thêm mẫu
                </a>
              </div>
              <div className="p-5">
                {customLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 size={18} className="animate-spin text-orange-500" />
                  </div>
                ) : (
                  <>
                    <TemplateList
                      templates={customTemplates.map(t => ({ id: t.template_key, name: t.name }))}
                      selected={customSelected}
                      onToggle={customToggle}
                    />
                    {customExportErr && (
                      <div className="flex items-center gap-2 mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                        <AlertCircle size={13} /> {customExportErr}
                      </div>
                    )}
                    <div className="flex gap-2 justify-end mt-4">
                      {customSelected.size > 1 && (
                        <button disabled={customExportLoading} onClick={() => handleCustomExport(true)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 disabled:opacity-50 transition shadow-lg shadow-indigo-100">
                          {customExportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                          Tải &amp; gộp
                        </button>
                      )}
                      <button disabled={customSelected.size === 0 || customExportLoading} onClick={() => handleCustomExport(false)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-2xl font-black text-sm hover:bg-orange-700 disabled:opacity-50 transition shadow-lg shadow-orange-100">
                        {customExportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        Tải xuống ({customSelected.size})
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CompanyExportPage;
