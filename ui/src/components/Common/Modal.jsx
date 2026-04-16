import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="bg-surface rounded-[32px] w-full max-w-lg shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden border border-faint flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-faint flex justify-between items-center bg-surface sticky top-0">
          <h2 className="text-xl font-black text-strong tracking-tight uppercase italic">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-input rounded-2xl text-weak transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-8 py-6 border-t border-faint bg-page/50 flex justify-end gap-3 sticky bottom-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
