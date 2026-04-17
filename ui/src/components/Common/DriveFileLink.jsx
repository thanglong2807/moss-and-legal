import { useState } from 'react';
import { X, ExternalLink, FileText } from 'lucide-react';

/**
 * Renders a clickable file name that opens a Google Drive preview modal.
 * Props:
 *   driveLink  — full Google Drive URL (https://drive.google.com/file/d/ID/view?...)
 *   fileName   — display name
 *   className  — extra classes on the trigger element
 */
const DriveFileLink = ({ driveLink, fileName, className = '' }) => {
  const [open, setOpen] = useState(false);

  if (!driveLink || !fileName) return null;

  // Convert any drive.google.com URL to the embeddable preview URL
  const getPreviewUrl = (url) => {
    const match = url.match(/\/file\/d\/([^/]+)/);
    if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
    // Fallback: Google Docs Viewer for non-Drive URLs
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  };

  const previewUrl = getPreviewUrl(driveLink);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 text-left hover:underline underline-offset-2 transition-colors ${className}`}
      >
        <FileText size={10} className="shrink-0" />
        <span className="truncate">{fileName}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div
            className="relative z-10 bg-surface rounded-2xl shadow-2xl border border-faint flex flex-col overflow-hidden"
            style={{ width: 'min(860px, 95vw)', height: 'min(640px, 90vh)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-base bg-surface shrink-0">
              <span className="text-sm font-black text-strong truncate max-w-[calc(100%-3rem)]">{fileName}</span>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={driveLink}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-weak hover:text-body hover:bg-input transition-colors"
                  title="Mở trong Drive"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-weak hover:text-body hover:bg-input transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Preview iframe */}
            <iframe
              src={previewUrl}
              title={fileName}
              className="flex-1 w-full border-0"
              allow="autoplay"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default DriveFileLink;
