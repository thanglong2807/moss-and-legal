import React from 'react';
import { X, Building2 } from 'lucide-react';

const TYPES = [
  { value: 1, label: 'LLC 1 Thành viên', desc: 'Công ty TNHH 1 thành viên' },
  { value: 2, label: 'LLC 2+ Thành viên', desc: 'Công ty TNHH 2+ thành viên' },
  { value: 3, label: 'Cổ phần', desc: 'Công ty Cổ phần' },
];

const CompanyTypeModal = ({ onSelect, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-black text-strong uppercase tracking-widest">Chọn loại hình DN</h2>
        <button onClick={onClose} className="p-2 text-weak hover:text-strong rounded-lg transition"><X size={16} /></button>
      </div>
      <div className="space-y-2">
        {TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => onSelect(t.value)}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-faint hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-all text-left group"
          >
            <div className="p-2 bg-faint group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 rounded-xl transition-colors">
              <Building2 size={18} className="text-weak group-hover:text-orange-600 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-black text-strong">{t.label}</p>
              <p className="text-xs text-weak font-medium">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default CompanyTypeModal;
