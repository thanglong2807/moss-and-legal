import React from 'react';
import { Clock, Phone, ExternalLink, User } from 'lucide-react';

const HKDCard = ({ hkd, isActive, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 rounded-2xl cursor-pointer transition-all border ${isActive
          ? 'bg-orange-50 border-orange-300 shadow-sm shadow-orange-100'
          : 'border-faint bg-surface hover:bg-orange-50/40 hover:border-orange-200'
        }`}
    >
      {/* Row 1: Customer name + date */}
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[9px] font-black text-weak uppercase shrink-0">KH:</span>
          <span className={`text-xs font-black truncate ${isActive ? 'text-orange-900' : 'text-strong'}`}>
            {hkd.customer?.name || '![Vãng lai]'}
          </span>
          {hkd.crm_link && <ExternalLink size={9} className="text-emerald-500 shrink-0" />}
        </div>
        <div className="flex items-center gap-1 shrink-0 text-[9px] font-bold text-weak">
          <Clock size={9} className="text-weak" />
          {new Date(hkd.created_at).toLocaleDateString('vi-VN')}
        </div>
      </div>

      {/* Row 2: Phone + sale staff */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1 min-w-0">
          <Phone size={9} className="text-weak shrink-0" />
          <span className="text-[10px] font-bold text-weak truncate">{hkd.customer?.phone || '—'}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 max-w-[45%]">
          <User size={9} className="text-weak shrink-0" />
          <span className="text-[9px] font-bold text-body truncate">{hkd.handling_staff?.name || '—'}</span>
        </div>
      </div>

      {/* Row 3: HKD name + support staff */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[9px] font-black text-weak uppercase shrink-0">HKD:</span>
          <span className={`text-[10px] font-black truncate ${isActive ? 'text-orange-700' : 'text-body'}`}>
            {hkd.company_full_name || '—'}
          </span>
        </div>
        {hkd.supporting_staff?.name && (
          <div className="flex items-center gap-1 shrink-0 max-w-[45%]">
            <User size={9} className="text-slate-200 shrink-0" />
            <span className="text-[9px] font-bold text-weak truncate">{hkd.supporting_staff.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HKDCard;
