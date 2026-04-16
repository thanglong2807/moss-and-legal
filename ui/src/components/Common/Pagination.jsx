import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];

const Pagination = ({ page, pageSize, total, onPageChange, onPageSizeChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  if (total === 0) return null;

  return (
    <div className="border-t border-base px-5 py-3 flex items-center justify-between bg-surface">
      <div className="flex items-center gap-2 text-xs font-bold text-body">
        <span>Hiển thị</span>
        <select
          className="px-2 py-1 bg-input rounded-lg font-black outline-none appearance-none text-strong"
          value={pageSize}
          onChange={e => { onPageSizeChange(parseInt(e.target.value)); onPageChange(1); }}
        >
          {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>/ trang — {total} kết quả</span>
      </div>
      <div className="flex items-center gap-1">
        <button disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}
          className="p-1.5 rounded-lg hover:bg-input disabled:opacity-30 transition">
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-black text-strong px-2">{safePage} / {totalPages}</span>
        <button disabled={safePage >= totalPages} onClick={() => onPageChange(safePage + 1)}
          className="p-1.5 rounded-lg hover:bg-input disabled:opacity-30 transition">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export { PAGE_SIZE_OPTIONS };
export default Pagination;
