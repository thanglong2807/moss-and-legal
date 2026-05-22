import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, CheckSquare, Square, AlertCircle, Merge, Plus, Settings } from 'lucide-react';
import axios from 'axios';
import { companyApi, companyExportApi } from '../services/api';

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('mosslegal_access_token')}` });

// ── Checkbox list ─────────────────────────────────────────────────────────────
const TemplateList = ({ templates, selected, onToggle }) => (
  <div className="space-y-1.5">
    {templates.map(t => {
      const disabled = !!t.disabled;
      const checked = !disabled && selected.has(t.id);
      return (
        <div key={t.id} onClick={() => !disabled && onToggle(t.id)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all border ${
            disabled
              ? 'border-faint opacity-50 cursor-not-allowed'
              : checked
                ? 'bg-orange-50 border-orange-200 cursor-pointer'
                : 'border-faint hover:border-base cursor-pointer'
          }`}>
          {checked
            ? <CheckSquare size={15} className="text-orange-600 shrink-0" />
            : <Square size={15} className={`${disabled ? 'text-weak/40' : 'text-weak'} shrink-0`} />}
          <span className={`text-sm font-bold flex-1 ${disabled ? 'text-weak/40' : checked ? 'text-orange-800' : 'text-body'}`}>
            {t.name}
          </span>
          {disabled
            ? <span className="text-[9px] text-weak/60 italic shrink-0 flex items-center gap-1">
                <AlertCircle size={10} /> Chưa có file
              </span>
            : null}
        </div>
      );
    })}
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const CompanyExportPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // Custom tenant templates
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [customLoading, setCustomLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportErr, setExportErr] = useState('');

  useEffect(() => {
    companyApi.get(id).then(r => {
      setCompany(r.data);
      setLoading(false);

      // Load all active doc types cho loại hình này
      setCustomLoading(true);
      const typeToCategory = { 1: 'tldn_1', 2: 'tldn_2', 3: 'tldn_3' };
      const cat = typeToCategory[r.data.company_type] || 'tldn_1';
      Promise.all([
        axios.get(`/api/v1/tenant/document-types?category=${cat}`, { headers: authHeaders() }),
        axios.get('/api/v1/tenant/document-types?category=company', { headers: authHeaders() }),
      ])
        .then(([r1, r2]) => {
          const items1 = (r1.data.items || []).filter(t => t.is_active);
          const items2 = (r2.data.items || []).filter(t => t.is_active);
          const seen = new Set(items1.map(t => t.id));
          const merged = [...items1, ...items2.filter(t => !seen.has(t.id))];
          setTemplates(merged);
          // Chỉ auto-select những loại đã có file
          setSelected(new Set(merged.filter(t => t.has_template).map(t => t.template_key)));
        })
        .catch(() => {})
        .finally(() => setCustomLoading(false));
    }).catch(() => setLoading(false));
  }, [id]);

  const toggle = (tid) => setSelected(s => {
    const n = new Set(s); n.has(tid) ? n.delete(tid) : n.add(tid); return n;
  });

  const selectAll = () => {
    const available = templates.filter(t => t.has_template).map(t => t.template_key);
    if (selected.size === available.length && available.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(available));
    }
  };

  const handleExport = async (isMerge) => {
    if (!selected.size) return;
    setExportLoading(true); setExportErr('');
    try {
      const res = await companyExportApi.export(company.id, [...selected], isMerge);
      const ct = res.headers['content-type'] || '';
      const disp = res.headers['content-disposition'] || '';
      const match = disp.match(/filename\*=UTF-8''(.+)/i) || disp.match(/filename="?([^"]+)"?/i);
      const filename = match
        ? decodeURIComponent(match[1])
        : `HoSo_${company?.code || id}.${isMerge ? 'docx' : selected.size > 1 ? 'zip' : 'docx'}`;
      const url = URL.createObjectURL(new Blob([res.data], { type: ct }));
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      let msg = 'Lỗi khi tạo file';
      if (e.response?.data) {
        try {
          const text = typeof e.response.data.text === 'function'
            ? await e.response.data.text()
            : new TextDecoder().decode(e.response.data);
          msg = JSON.parse(text)?.detail || msg;
        } catch { /* */ }
      }
      setExportErr(msg);
    } finally { setExportLoading(false); }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-page">
      <Loader2 className="animate-spin text-orange-500" size={28} />
    </div>
  );

  const typeLabel = ['TNHH 1TV', 'TNHH 2TV+', 'Cổ phần'][(company?.company_type || 1) - 1];
  const availableCount = templates.filter(t => t.has_template).length;
  const allAvailableSelected = selected.size === availableCount && availableCount > 0;

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
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Card danh sách mẫu */}
          <div className="bg-surface rounded-2xl border border-base overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-faint bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-strong">Hồ sơ xuất</span>
                <span className="text-[10px] text-weak font-semibold">— {typeLabel}</span>
                {!customLoading && templates.length > 0 && (
                  <span className="text-[10px] font-bold text-weak/60">
                    ({availableCount}/{templates.length} sẵn sàng)
                  </span>
                )}
              </div>
              <a href="/settings"
                className="text-[10px] text-orange-600 hover:underline font-semibold flex items-center gap-1">
                <Settings size={10} /> Cài đặt mẫu
              </a>
            </div>

            <div className="p-5">
              {customLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={22} className="animate-spin text-orange-500" />
                </div>
              ) : templates.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm text-weak font-semibold">Chưa có loại hồ sơ nào được cài đặt.</p>
                  <a href="/settings"
                    className="inline-flex items-center gap-1.5 text-xs font-black text-orange-600 hover:underline">
                    <Plus size={12} /> Thêm trong Cài đặt → Loại hồ sơ
                  </a>
                </div>
              ) : (
                <>
                  {/* Select all */}
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={selectAll}
                      className="text-[10px] font-black text-orange-600 hover:underline">
                      {allAvailableSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                    <span className="text-[10px] text-weak font-semibold">
                      {selected.size}/{availableCount} mẫu có file
                    </span>
                  </div>

                  <TemplateList
                    templates={templates.map(t => ({
                      id: t.template_key,
                      name: t.name,
                      disabled: !t.has_template,
                    }))}
                    selected={selected}
                    onToggle={toggle}
                  />

                  {exportErr && (
                    <div className="flex items-center gap-2 mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                      <AlertCircle size={13} /> {exportErr}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end mt-4">
                    {selected.size > 1 && (
                      <button disabled={exportLoading} onClick={() => handleExport(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 disabled:opacity-50 transition shadow-lg shadow-indigo-100">
                        {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Merge size={14} />}
                        Tải &amp; gộp file
                      </button>
                    )}
                    <button disabled={selected.size === 0 || exportLoading} onClick={() => handleExport(false)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-2xl font-black text-sm hover:bg-orange-700 disabled:opacity-50 transition shadow-lg shadow-orange-100">
                      {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      Tải xuống ({selected.size})
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CompanyExportPage;
