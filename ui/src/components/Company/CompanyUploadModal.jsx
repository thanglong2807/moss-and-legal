import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Loader2, FolderPlus, CheckCircle2 } from 'lucide-react';
import Modal from '../Common/Modal';
import DriveFileLink from '../Common/DriveFileLink';
import { companyDriveApi } from '../../services/api';
import { compressImage } from '../../utils/validators';

const CompanyUploadModal = ({ isOpen, onClose, companyId, companyType, folderId, onFolderCreated }) => {
  const [labels, setLabels] = useState({});     // { code: name }
  const [docs, setDocs] = useState([]);
  const [pending, setPending] = useState({});   // { labelCode: File }
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const fileRefs = useRef({});

  useEffect(() => {
    if (!companyType) return;
    companyDriveApi.getLabels(companyType).then(r => setLabels(r.data)).catch(() => {});
  }, [companyType]);

  useEffect(() => {
    if (isOpen && companyId && folderId) fetchDocs();
    if (!isOpen) setPending({});
  }, [isOpen, companyId, folderId]);

  const fetchDocs = async () => {
    try {
      const res = await companyDriveApi.listDocs(companyId);
      setDocs(res.data);
    } catch {}
  };

  const handleCreateFolder = async () => {
    setCreatingFolder(true);
    try {
      const res = await companyDriveApi.createFolder(companyId);
      onFolderCreated(res.data.folder_id);
    } catch (err) {
      alert('Lỗi tạo folder: ' + (err?.response?.data?.detail || err.message));
    } finally { setCreatingFolder(false); }
  };

  const handleFileChange = (labelCode, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPending(prev => ({ ...prev, [labelCode]: file }));
    e.target.value = '';
  };

  const handleConfirmUpload = async () => {
    const entries = Object.entries(pending);
    if (!entries.length) return;
    setUploading(true);
    const results = await Promise.allSettled(
      entries.map(async ([label, file]) => {
        const compressed = await compressImage(file);
        return companyDriveApi.upload(companyId, label, compressed);
      })
    );
    const uploaded = [];
    const errors = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') uploaded.push(result.value.data);
      else errors.push(`${entries[i][0]}: ${result.reason?.response?.data?.detail || result.reason?.message}`);
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
      await companyDriveApi.deleteDoc(doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } catch (err) {
      alert('Lỗi xóa: ' + (err?.response?.data?.detail || err.message));
    } finally { setDeleting(null); }
  };

  const docByLabel = (code) => docs.find(d => d.label === code);
  const pendingCount = Object.keys(pending).length;
  const labelEntries = Object.entries(labels);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload hồ sơ lên Drive"
      footer={
        !folderId ? null : (
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold text-weak">
              {pendingCount > 0 ? `${pendingCount} file đã chọn` : 'Chọn file để upload'}
            </span>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-6 py-2.5 text-weak font-bold text-sm">Đóng</button>
              <button
                onClick={handleConfirmUpload}
                disabled={!pendingCount || uploading}
                className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black text-sm shadow-lg shadow-blue-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploading
                  ? <><Loader2 size={15} className="animate-spin" /> Đang upload...</>
                  : <><Upload size={15} /> Xác nhận upload</>}
              </button>
            </div>
          </div>
        )
      }
    >
      {!folderId ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-400">
            <FolderPlus size={32} />
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-strong mb-1">Chưa có folder Drive</p>
            <p className="text-xs font-bold text-weak">Tạo folder để bắt đầu lưu trữ hồ sơ</p>
          </div>
          <button
            onClick={handleCreateFolder}
            disabled={creatingFolder}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black text-sm shadow-lg shadow-blue-100 transition disabled:opacity-50"
          >
            {creatingFolder
              ? <><Loader2 size={15} className="animate-spin" /> Đang tạo...</>
              : <><FolderPlus size={15} /> Tạo folder Drive</>}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {labelEntries.map(([code, name]) => {
            const existing = docByLabel(code);
            const pendingFile = pending[code];
            return (
              <div key={code} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                pendingFile ? 'bg-blue-50 border-blue-200' : 'bg-page border-faint hover:border-base'
              }`}>
                <input
                  ref={el => fileRefs.current[code] = el}
                  type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
                  onChange={e => handleFileChange(code, e)}
                />
                <div className="flex-shrink-0">
                  {pendingFile
                    ? <CheckCircle2 size={18} className="text-blue-500" />
                    : existing
                      ? <CheckCircle2 size={18} className="text-emerald-400" />
                      : <div className="w-[18px] h-[18px] rounded-full border-2 border-base" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-0.5">{code}</div>
                  <div className="text-sm font-black text-strong">{name}</div>
                  {pendingFile && <div className="text-[11px] font-bold text-blue-600 mt-0.5 truncate">→ {pendingFile.name}</div>}
                  {!pendingFile && existing && (
                    <DriveFileLink driveLink={existing.drive_link} fileName={existing.file_name} className="text-[10px] font-bold text-emerald-500 hover:text-emerald-700 mt-0.5" />
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {pendingFile ? (
                    <button onClick={() => setPending(prev => { const n = { ...prev }; delete n[code]; return n; })}
                      className="p-2 text-weak hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  ) : existing ? (
                    <button onClick={() => handleDelete(existing)} disabled={deleting === existing.id}
                      className="p-2 text-weak hover:text-red-500 transition-colors disabled:opacity-40">
                      {deleting === existing.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  ) : null}
                  <button
                    onClick={() => fileRefs.current[code]?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-base text-body rounded-xl hover:border-blue-400 hover:text-blue-600 font-black text-xs transition disabled:opacity-40"
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

export default CompanyUploadModal;
