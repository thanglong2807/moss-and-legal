import React from 'react';

const TYPE_LABELS = { 1: 'TNHH 1TV', 2: 'TNHH 2TV+', 3: 'Cổ phần' };
const TYPE_COLORS = {
  1: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  3: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const CompanyCard = ({ company, isActive, onClick }) => (
  <div
    onClick={onClick}
    className={`px-3 py-2.5 rounded-2xl cursor-pointer transition-all border ${
      isActive
        ? 'bg-orange-50 border-orange-300 shadow-sm shadow-orange-100'
        : 'border-faint bg-surface hover:bg-orange-50/40 hover:border-orange-200'
    }`}
  >
    {/* Row 1: KH name + SĐT */}
    <div className="flex items-center justify-between gap-2 mb-0.5">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[9px] font-black text-weak uppercase shrink-0">KH:</span>
        <span className={`text-xs font-black truncate ${isActive ? 'text-orange-900' : 'text-strong'}`}>
          {company.customer?.name || '—'}
        </span>
      </div>
      <span className="shrink-0 text-[9px] font-bold text-weak">{company.customer?.phone || ''}</span>
    </div>

    {/* Row 2: Loại hình + NV xử lý */}
    <div className="flex items-center justify-between gap-2 mb-0.5">
      <span className={`shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${TYPE_COLORS[company.company_type] || ''}`}>
        {TYPE_LABELS[company.company_type] || '?'}
      </span>
      {company.handling_staff?.name && (
        <span className="text-[9px] font-bold text-body truncate">{company.handling_staff.name}</span>
      )}
    </div>

    {/* Row 3: Tên công ty + NV hỗ trợ */}
    <div className="flex items-center justify-between gap-2">
      <span className={`text-[10px] font-black truncate ${isActive ? 'text-orange-700' : 'text-body'}`}>
        {company.company_full_name || '(Chưa đặt tên)'}
      </span>
      {company.supporting_staff?.name && (
        <span className="text-[9px] font-bold text-weak shrink-0 max-w-[45%] truncate">{company.supporting_staff.name}</span>
      )}
    </div>
  </div>
);

export default CompanyCard;
