import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, FileText, User, Building2, AlertCircle } from 'lucide-react';
import { companyApi, templateExportApi } from '../services/api';
import { VIETTEL_SHEETS } from '../services/templates/tldn/hopdongViettel/config';

const AutoField = ({ label, value }) => (
  <div className="flex items-start justify-between py-2 border-b border-faint last:border-0">
    <span className="text-[10px] font-black uppercase text-weak shrink-0 w-40">{label}</span>
    <span className="text-[11px] font-bold text-strong text-right">{value || <span className="text-weak italic">—</span>}</span>
  </div>
);

const ManualField = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="text-[10px] font-black uppercase text-weak block mb-1">
      {label} <span className="text-red-500">*</span>
    </label>
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-page border border-faint rounded-xl px-4 py-2.5 text-[11px] font-bold text-strong outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition placeholder:text-weak/50"
    />
  </div>
);

const ViettelContractPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [error, setError] = useState('');
  const [manual, setManual] = useState({ rep_id_date: '', rep_id_place: 'Cục Cảnh sát', company_biz_reg_place: 'Sở tài chính' });

  useEffect(() => {
    companyApi.get(id).then(r => { setCompany(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  const rep = company?.persons?.find(p => p.person_type === 'representative');

  const isReady = manual.rep_id_date.trim() && manual.rep_id_place.trim() && manual.company_biz_reg_place.trim();

  const handleExport = async (sheetKey) => {
    if (!isReady) { setError('Vui lòng nhập đủ 3 thông tin bắt buộc.'); return; }
    setError('');
    setExporting(sheetKey);
    try {
      const res = await templateExportApi.viettelContract(sheetKey, { company_id: parseInt(id), ...manual });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `HopDong_Viettel_${sheetKey}_${company?.code || id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(`Lỗi xuất file: ${e?.response?.data?.detail || e.message}`);
    } finally {
      setExporting(null);
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-page">
      <Loader2 className="animate-spin text-orange-500" size={28} />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-page overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-faint bg-surface flex items-center gap-3 shrink-0">
        <button onClick={() => navigate(`/company/${id}/export`)}
          className="flex items-center gap-1.5 text-weak hover:text-strong transition text-xs font-black">
          <ArrowLeft size={14} /> Quay lại
        </button>
        <span className="text-weak/40">|</span>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-red-50 flex items-center justify-center">
            <FileText size={11} className="text-red-500" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-strong">Hợp đồng Viettel CA</span>
        </div>
        {company && (
          <span className="ml-auto text-[11px] font-bold text-weak truncate max-w-xs">
            {company.company_full_name}
          </span>
        )}
      </div>

      {/* Body — 2 cột */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto flex gap-5 items-start">

          {/* Cột trái — thông tin */}
          <div className="flex-1 space-y-4 min-w-0">

            {/* Thông tin doanh nghiệp */}
            <div className="bg-surface rounded-2xl border border-base overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-faint bg-slate-50 dark:bg-slate-800/40">
                <Building2 size={13} className="text-orange-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-strong">Doanh nghiệp</span>
                <span className="ml-auto text-[10px] text-weak font-semibold">Tự động</span>
              </div>
              <div className="px-5 py-2">
                <AutoField label="Tên DN" value={company?.company_full_name} />
                <AutoField label="Mã số thuế" value={company?.tax_code} />
                <AutoField label="Ngày cấp ĐKKD" value={company?.approval_date} />
                <AutoField label="Ngày đăng ký" value={company?.registration_date} />
              </div>
            </div>

            {/* Thông tin đại diện */}
            <div className="bg-surface rounded-2xl border border-base overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-faint bg-slate-50 dark:bg-slate-800/40">
                <User size={13} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-strong">Người đại diện</span>
                <span className="ml-auto text-[10px] text-weak font-semibold">Tự động</span>
              </div>
              <div className="px-5 py-2">
                <AutoField label="Họ tên" value={rep?.full_name} />
                <AutoField label="Chức danh" value={rep?.position?.name} />
                <AutoField label="Số CCCD" value={rep?.id_number} />
              </div>
            </div>

            {/* Thông tin nhập tay */}
            <div className={`bg-surface rounded-2xl overflow-hidden border ${isReady ? 'border-base' : 'border-red-200 dark:border-red-800'}`}>
              <div className={`flex items-center gap-2 px-5 py-3.5 border-b ${isReady ? 'border-faint bg-slate-50 dark:bg-slate-800/40' : 'border-red-100 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}`}>
                <AlertCircle size={13} className={isReady ? 'text-weak' : 'text-red-500'} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${isReady ? 'text-strong' : 'text-red-600 dark:text-red-400'}`}>
                  {isReady ? 'Thông tin bổ sung' : 'Cần nhập thêm'}
                </span>
              </div>
              <div className="px-5 py-4 space-y-3">
                <ManualField label="Ngày cấp CCCD" placeholder="dd/mm/yyyy"
                  value={manual.rep_id_date}
                  onChange={v => setManual(m => ({ ...m, rep_id_date: v }))} />
                <ManualField label="Nơi cấp CCCD" placeholder="Cục Cảnh sát QLHC về TTXH..."
                  value={manual.rep_id_place}
                  onChange={v => setManual(m => ({ ...m, rep_id_place: v }))} />
                <ManualField label="Nơi cấp ĐKKD" placeholder="Sở Kế hoạch và Đầu tư..."
                  value={manual.company_biz_reg_place}
                  onChange={v => setManual(m => ({ ...m, company_biz_reg_place: v }))} />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                <AlertCircle size={13} /> {error}
              </div>
            )}
          </div>

          {/* Cột phải — xuất file */}
          <div className="w-64 shrink-0 sticky top-0">
            <div className="bg-surface rounded-2xl border border-base overflow-hidden">
              <div className="px-5 py-3.5 border-b border-faint bg-slate-50 dark:bg-slate-800/40">
                <span className="text-[10px] font-black uppercase tracking-widest text-strong">Xuất file</span>
                {!isReady && (
                  <p className="text-[10px] text-weak mt-1">Điền đủ thông tin bên trái để xuất.</p>
                )}
              </div>
              <div className="p-3 space-y-2">
                {VIETTEL_SHEETS.map(sheet => (
                  <button
                    key={sheet.key}
                    onClick={() => handleExport(sheet.key)}
                    disabled={!!exporting || !isReady}
                    className={[
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition',
                      isReady
                        ? 'bg-page border-faint hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 cursor-pointer'
                        : 'bg-page border-faint opacity-40 cursor-not-allowed',
                    ].join(' ')}
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      {exporting === sheet.key
                        ? <Loader2 size={13} className="animate-spin text-emerald-500" />
                        : <Download size={13} className="text-emerald-500" />}
                    </div>
                    <span className="text-[11px] font-black text-strong leading-tight">{sheet.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ViettelContractPage;
