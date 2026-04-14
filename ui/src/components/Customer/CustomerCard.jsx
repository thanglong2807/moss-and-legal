import React from 'react';
import { Users, Phone, LayoutGrid, ExternalLink, Link } from 'lucide-react';

const CustomerCard = ({ customer, isSelected, onSelect, onShowHKDs, onSyncCRM, syncing }) => {
  return (
    <div
      onClick={() => onSelect(customer)}
      className={`border rounded-[28px] p-5 cursor-pointer transition-all flex flex-col h-full relative overflow-hidden group ${
        isSelected
          ? 'bg-orange-50 border-orange-300 shadow-md shadow-orange-100'
          : 'bg-white border-slate-100 hover:bg-orange-50/40 hover:border-orange-200 hover:shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border transition-all ${
          isSelected
            ? 'bg-orange-600 text-white border-orange-600'
            : 'bg-white text-orange-500 border-slate-100 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-600'
        }`}>
          <Users size={18} />
        </div>

        {/* CRM icon — only if linked */}
        {customer.crm_link && (
          <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-xl border border-emerald-100">
            <Link size={13} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            customer.crm_link ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-slate-300'
          }`} />
          <h3 className={`text-base font-black leading-tight truncate transition-colors ${
            isSelected ? 'text-orange-700' : 'text-slate-800 group-hover:text-orange-600'
          }`}>{customer.name}</h3>
        </div>
        <p className="text-slate-400 font-bold text-xs mb-3 flex items-center gap-1.5">
          <Phone size={12} className="text-slate-300 shrink-0" />
          {customer.phone}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <LayoutGrid size={11} className="text-orange-400" />
          {customer.source?.name || 'Vãng lai'}
        </div>
      </div>

      {/* Footer */}
      <div
        className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
          {customer.crm_link ? 'Đã đồng bộ CRM' : 'Chưa đồng bộ'}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onShowHKDs(customer.id); }}
          className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${
            isSelected ? 'text-orange-600' : 'text-slate-400 hover:text-orange-600'
          }`}
        >
          Xem hồ sơ <ExternalLink size={10} />
        </button>
      </div>
    </div>
  );
};

export default CustomerCard;
