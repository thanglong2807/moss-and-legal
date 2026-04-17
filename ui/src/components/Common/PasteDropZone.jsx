import { useEffect, useRef, useState } from 'react';
import { Upload, X, Clipboard } from 'lucide-react';

/**
 * Full-screen overlay that accepts Ctrl+V paste or drag-and-drop.
 * Props:
 *   isOpen       — show/hide
 *   onClose      — called when user dismisses
 *   onFile(file) — called with the File object
 *   title        — label shown in the zone (e.g. "CCCD Mặt trước")
 *   accept       — MIME types for drag validation (default: image/*)
 */
const PasteDropZone = ({ isOpen, onClose, onFile, title = '', accept = 'image/*' }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
      if (!item) return;
      e.preventDefault();
      const file = item.getAsFile();
      if (file) { onFile(file); onClose(); }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onFile, onClose]);

  if (!isOpen) return null;

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { onFile(file); onClose(); }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) { onFile(file); onClose(); e.target.value = ''; }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-black text-white uppercase tracking-widest">{title}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed p-10 flex flex-col items-center gap-4 transition-all cursor-pointer
            ${dragging
              ? 'border-indigo-400 bg-indigo-500/20'
              : 'border-white/40 bg-white/10 hover:bg-white/15 hover:border-white/60'
            }`}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFileInput} />

          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
            {dragging ? <Upload size={24} className="text-indigo-300" /> : <Clipboard size={24} className="text-white/70" />}
          </div>

          <div className="text-center">
            <p className="text-sm font-black text-white mb-1">
              {dragging ? 'Thả ảnh vào đây' : 'Ctrl+V để dán'}
            </p>
            <p className="text-[11px] font-bold text-white/60">
              hoặc kéo thả · hoặc click để chọn file
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] font-bold text-white/40 mt-3">Nhấn Esc để đóng</p>
      </div>
    </div>
  );
};

export default PasteDropZone;
