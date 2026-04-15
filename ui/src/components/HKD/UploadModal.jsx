import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, ExternalLink, Loader2, FolderPlus, CheckCircle2 } from 'lucide-react';
import Modal from '../Common/Modal';
import { driveApi } from '../../services/api';

const DOCUMENT_LABELS = [
  // { id: '000', name: 'Hướng dẫn ký' },
  { id: '001', name: 'Giấy đề nghị đăng ký HKD' },
  { id: '002', name: 'Hợp đồng dịch vụ' },
  { id: '003', name: 'Công chứng 2 mặt CCCD' },
  { id: '004', name: 'Giấy giới thiệu nhận & nộp' },
];

const UploadModal = ({ isOpen, onClose, hkdId, folderId, onFolderCreated }) => {
  const [docs, setDocs] = useState([]);
  // pending: { [labelId]: File }
  const [pending, setPending] = useState({});
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const fileRefs = useRef({});

  useEffect(() => {
    if (isOpen && hkdId && folderId) fetchDocs();
    if (!isOpen) setPending({});
  }, [isOpen, hkdId, folderId]);

  const fetchDocs = async () => {
    try {
      const res = await driveApi.list(hkdId);
      setDocs(res.data);
    } catch {}
  };

  const handleCreateFolder = async () => {
    setCreatingFolder(true);
    try {
      const res = await driveApi.createFolder(hkdId);
      onFolderCreated(res.data.folder_id);
    } catch (err) {
      alert('Lỗi tạo folder: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setCreatingFolder(false);
    }
  };

  const handlePickFile = (labelId) => {
    fileRefs.current[labelId]?.click();
  };

  const handleFileChange = (labelId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPending(prev => ({ ...prev, [labelId]: file }));
    e.target.value = '';
  };

  const handleRemovePending = (labelId) => {
    setPending(prev => { const n = { ...prev }; delete n[labelId]; return n; });
  };

  const handleConfirmUpload = async () => {
    const entries = Object.entries(pending);
    if (!entries.length) return;
    setUploading(true);

    // Upload all files in parallel
    const results = await Promise.allSettled(
      entries.map(([label, file]) => driveApi.upload(hkdId, label, file))
    );

    const uploaded = [];
    const errors = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        uploaded.push(result.value.data);
      } else {
        const label = entries[i][0];
        errors.push(`${label}: ${result.reason?.response?.data?.detail || result.reason?.message}`);
      }
    });

    setDocs(prev => {
      const map = Object.fromEntries(prev.map(d => [d.label, d]));
      uploaded.forEach(d => { map[d.label] = d; });
      return Object.values(map);
    });
    setPending({});
    setUploading(false);
    if (errors.length) alert('Lỗi:\n' + errors.join('\n'));
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Xóa file "${doc.file_name}"?`)) return;
    setDeleting(doc.id);
    try {
      await driveApi.deleteDoc(doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } catch (err) {
      alert('Lỗi xóa: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setDeleting(null);
    }
  };

  const docByLabel = (labelId) => docs.find(d => d.label === labelId);
  const pendingCount = Object.keys(pending).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload hồ sơ lên Drive"
      footer={
        !folderId ? null : (
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold text-slate-400">
              {pendingCount > 0 ? `${pendingCount} file đã chọn` : 'Chọn file để upload'}
            </span>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-6 py-2.5 text-slate-400 font-bold text-sm">Đóng</button>
              <button
                onClick={handleConfirmUpload}
                disabled={!pendingCount || uploading}
                className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black text-sm shadow-lg shadow-blue-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploading
                  ? <><Loader2 size={15} className="animate-spin" /> Đang upload...</>
                  : <><Upload size={15} /> Xác nhận upload</>
                }
              </button>
            </div>
          </div>
        )
      }
    >
      {/* No folder yet */}
      {!folderId ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-400">
            <FolderPlus size={32} />
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-slate-800 mb-1">Chưa có folder Drive</p>
            <p className="text-xs font-bold text-slate-400">Tạo folder để bắt đầu lưu trữ hồ sơ</p>
          </div>
          <button
            onClick={handleCreateFolder}
            disabled={creatingFolder}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black text-sm shadow-lg shadow-blue-100 transition disabled:opacity-50"
          >
            {creatingFolder
              ? <><Loader2 size={15} className="animate-spin" /> Đang tạo...</>
              : <><FolderPlus size={15} /> Tạo folder Drive</>
            }
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {DOCUMENT_LABELS.map(({ id, name }) => {
            const existing = docByLabel(id);
            const pendingFile = pending[id];
            return (
              <div key={id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                pendingFile ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'
              }`}>
                {/* Hidden file input */}
                <input
                  ref={el => fileRefs.current[id] = el}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => handleFileChange(id, e)}
                />

                {/* Status icon */}
                <div className="flex-shrink-0">
                  {pendingFile
                    ? <CheckCircle2 size={18} className="text-blue-500" />
                    : existing
                      ? <CheckCircle2 size={18} className="text-emerald-400" />
                      : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-200" />
                  }
                </div>

                {/* Label + existing link or pending filename */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-0.5">{id}</div>
                  <div className="text-sm font-black text-slate-800">{name}</div>
                  {pendingFile && (
                    <div className="text-[11px] font-bold text-blue-600 mt-0.5 truncate">→ {pendingFile.name}</div>
                  )}
                  {!pendingFile && existing && (
                    <a href={existing.drive_link} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 hover:text-emerald-700 mt-0.5">
                      <ExternalLink size={10} /> {existing.file_name}
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {pendingFile ? (
                    <button onClick={() => handleRemovePending(id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  ) : existing ? (
                    <button onClick={() => handleDelete(existing)} disabled={deleting === existing.id}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40">
                      {deleting === existing.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  ) : null}
                  <button
                    onClick={() => handlePickFile(id)}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:border-blue-400 hover:text-blue-600 font-black text-xs transition disabled:opacity-40"
                  >
                    <Upload size={12} /> {existing || pendingFile ? 'Thay' : 'Chọn'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

export default UploadModal;
