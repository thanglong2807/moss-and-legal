import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Building2, RefreshCw, CheckCircle2, XCircle, Clock, Send, Loader2, AlertTriangle } from 'lucide-react';
import { govSubmissionApi, govApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';
import GovProgressModal from '../HKD/GovProgressModal';

const STATUS_UI = {
  pending:     { icon: <Clock size={13} className="text-yellow-500" />,       label: 'Chờ xử lý',   cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  in_progress: { icon: <RefreshCw size={13} className="text-blue-500 animate-spin" />, label: 'Đang xử lý', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed:   { icon: <CheckCircle2 size={13} className="text-emerald-500" />, label: 'Hoàn thành', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed:      { icon: <XCircle size={13} className="text-red-500" />,         label: 'Thất bại',    cls: 'bg-red-50 text-red-700 border-red-200' },
};

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

// ── History tab ───────────────────────────────────────────────────────────────
const HistoryTab = ({ recordId, recordType, service }) => {
  const { token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const jobsRef = useRef([]);

  useEffect(() => { jobsRef.current = jobs; }, [jobs]);

  const load = useCallback(async () => {
    try {
      const res = await govSubmissionApi.list(recordId, recordType);
      setJobs(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [recordId, recordType]);

  // Load on mount
  useEffect(() => { load(); }, [load]);

  // Poll active jobs every 10s — interval stable, reads jobs via ref
  useEffect(() => {
    const interval = setInterval(async () => {
      const active = jobsRef.current.filter(j => j.status === 'pending' || j.status === 'in_progress');
      if (!active.length) return;
      for (const sub of active) {
        try {
          const res = service === 'tldn'
            ? await govApi.getTLDNJobStatus(sub.job_id, token)
            : await govApi.getJobStatus(sub.job_id, token);
          const { status, progress, error } = res.data;
          if (status !== sub.status || progress !== sub.progress) {
            await govSubmissionApi.patch(sub.id, { status, progress: progress || null, error: error || null });
            setJobs(prev => prev.map(j => j.id === sub.id ? { ...j, status, progress, error } : j));
          }
        } catch { /* silent */ }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [token, service]);

  if (loading) return <div className="py-12 text-center text-weak text-xs font-bold">Đang tải...</div>;
  if (!jobs.length) return (
    <div className="py-12 text-center text-weak text-xs font-bold italic">Chưa có lần gửi nào.</div>
  );

  return (
    <>
      <div className="space-y-2">
        {jobs.map(sub => {
          const ui = STATUS_UI[sub.status] || STATUS_UI.pending;
          return (
            <div key={sub.id} className="flex items-center gap-3 p-3 rounded-2xl border border-base bg-page hover:bg-surface transition">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black shrink-0 ${ui.cls}`}>
                {ui.icon} {ui.label}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black text-body truncate">
                  {sub.progress || sub.job_id}
                </div>
                {sub.error && (
                  <div className="text-[9px] font-bold text-red-500 truncate mt-0.5">{sub.error}</div>
                )}
              </div>
              <div className="text-[9px] font-bold text-weak shrink-0">{fmtTime(sub.created_at)}</div>
              {sub.job_id && (
                <button
                  onClick={() => setViewing(sub)}
                  className="shrink-0 text-[9px] font-black text-indigo-600 hover:underline"
                >
                  Chi tiết
                </button>
              )}
            </div>
          );
        })}
      </div>

      {viewing && (
        <GovProgressModal
          isOpen
          onClose={() => setViewing(null)}
          jobId={viewing.job_id}
          hkdId={viewing.record_id}
          service={service}
        />
      )}
    </>
  );
};

// ── Main modal ────────────────────────────────────────────────────────────────
const GovJobModal = ({
  isOpen, onClose,
  recordId, recordType, recordName, service,
  previewContent,    // JSX summary shown in "Gửi mới" tab
  onSubmit,          // async fn() → { job_id }
  onSave,            // optional: save before submit
}) => {
  const showToast = useToast();
  const [tab, setTab] = useState('new');
  const [submitting, setSubmitting] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!recordId) { showToast('Vui lòng lưu hồ sơ trước khi chuyển GOV', 'warn'); return; }
    setSubmitting(true);
    try {
      if (onSave) await onSave();
      const { job_id } = await onSubmit();
      await govSubmissionApi.create({
        record_id: recordId,
        record_type: recordType,
        record_name: recordName || '',
        job_id,
        service,
      });
      showToast('Đã gửi hồ sơ lên GOV!');
      setHistoryKey(k => k + 1);
      setTab('history');
    } catch (e) {
      showToast('Lỗi chuyển GOV: ' + (e.response?.data?.detail || e.message), 'error');
    } finally { setSubmitting(false); }
  };

  const activeJobs = null; // loaded inside HistoryTab

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface rounded-[28px] shadow-2xl w-[540px] max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-faint">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Building2 size={18} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-strong uppercase tracking-tight">Chuyển GOV</h3>
              <p className="text-[10px] font-bold text-weak truncate max-w-[280px]">{recordName || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-input rounded-xl text-weak transition">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-8 pt-4">
          {[
            { key: 'new', label: 'Gửi mới' },
            { key: 'history', label: 'Lịch sử' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all ${
                tab === t.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-weak hover:bg-input'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-5">
          {tab === 'new' ? (
            <div className="space-y-4">
              {previewContent}
              <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-yellow-800">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Đảm bảo đã xuất và upload đủ file lên Drive trước khi gửi GOV.
              </div>
            </div>
          ) : (
            <HistoryTab key={historyKey} recordId={recordId} recordType={recordType} service={service} />
          )}
        </div>

        {/* Footer */}
        {tab === 'new' && (
          <div className="flex gap-3 justify-end px-8 py-5 border-t border-faint">
            <button onClick={onClose} className="px-6 py-2.5 text-weak font-bold text-sm">Đóng</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-7 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 disabled:opacity-50 transition shadow-lg shadow-indigo-100">
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {submitting ? 'Đang gửi...' : 'Gửi hồ sơ'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GovJobModal;
