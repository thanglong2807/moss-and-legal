import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { govApi, govJobStorage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_CONFIG = {
  pending:     { label: 'Đang chờ xử lý', color: 'text-slate-500',  icon: Clock,         spin: false },
  in_progress: { label: 'Đang thực hiện', color: 'text-blue-600',   icon: RefreshCw,     spin: true  },
  completed:   { label: 'Hoàn thành',      color: 'text-emerald-600', icon: CheckCircle2,  spin: false },
  failed:      { label: 'Thất bại',         color: 'text-red-600',    icon: XCircle,       spin: false },
};

const POLL_SCREENSHOT_MS = 3000;
const POLL_STATUS_MS = 5000;

const GovProgressModal = ({ isOpen, onClose, jobId, hkdId }) => {
  const { token } = useAuth();
  const [status, setStatus] = useState('pending');
  const [imgUrl, setImgUrl] = useState(null);
  const [error, setError] = useState('');
  const screenshotTimer = useRef(null);
  const statusTimer = useRef(null);
  const prevImgUrl = useRef(null);

  const isDone = status === 'completed' || status === 'failed';

  const fetchScreenshot = async () => {
    if (!jobId || !token) return;
    try {
      const res = await govApi.getScreenshot(jobId, token);
      const url = URL.createObjectURL(res.data);
      if (prevImgUrl.current) URL.revokeObjectURL(prevImgUrl.current);
      prevImgUrl.current = url;
      setImgUrl(url);
    } catch {
      // silent — screenshot không quan trọng bằng status
    }
  };

  const fetchStatus = async () => {
    if (!jobId || !token) return;
    try {
      const res = await govApi.getJobStatus(jobId, token);
      const newStatus = res.data.status;
      const newError = res.data.error || '';
      setStatus(newStatus);
      setError(newError);
      if ((newStatus === 'completed' || newStatus === 'failed') && hkdId) {
        govJobStorage.updateStatus(hkdId, newStatus, newError);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Lỗi kết nối');
    }
  };

  useEffect(() => {
    if (!isOpen || !jobId) return;

    fetchStatus();
    fetchScreenshot();

    statusTimer.current = setInterval(() => {
      if (!isDone) fetchStatus();
    }, POLL_STATUS_MS);

    screenshotTimer.current = setInterval(() => {
      if (!isDone) fetchScreenshot();
    }, POLL_SCREENSHOT_MS);

    return () => {
      clearInterval(statusTimer.current);
      clearInterval(screenshotTimer.current);
      if (prevImgUrl.current) URL.revokeObjectURL(prevImgUrl.current);
    };
  }, [isOpen, jobId]);

  // Dừng poll khi done
  useEffect(() => {
    if (isDone) {
      clearInterval(statusTimer.current);
      clearInterval(screenshotTimer.current);
      fetchScreenshot(); // chụp ảnh cuối
    }
  }, [isDone]);

  if (!isOpen) return null;

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Tiến độ chuyển GOV</h2>
            <div className="text-[10px] font-bold text-slate-400 mt-0.5">Job ID: {jobId}</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-2xl text-slate-400 transition">
            <X size={18} />
          </button>
        </div>

        {/* Screenshot */}
        <div className="bg-slate-900 flex items-center justify-center" style={{ minHeight: 400 }}>
          {imgUrl ? (
            <img
              src={imgUrl}
              alt="Browser screenshot"
              className="w-full object-contain"
              style={{ maxHeight: 500 }}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-slate-600">
              <RefreshCw size={28} className="animate-spin opacity-40" />
              <span className="text-xs font-bold opacity-40">Đang tải màn hình...</span>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="px-6 py-4 flex items-center gap-3 border-t border-slate-100">
          <StatusIcon
            size={18}
            className={`${cfg.color} ${cfg.spin ? 'animate-spin' : ''} flex-shrink-0`}
          />
          <div className="flex-1">
            <span className={`text-sm font-black ${cfg.color}`}>{cfg.label}</span>
            {error && <p className="text-xs font-bold text-red-500 mt-0.5">{error}</p>}
          </div>
          {!isDone && (
            <span className="text-[10px] font-bold text-slate-400">
              Tự động cập nhật mỗi {POLL_SCREENSHOT_MS / 1000}s
            </span>
          )}
          {isDone && (
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs transition"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GovProgressModal;
