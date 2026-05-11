import { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const SearchableSelect = ({ value, onChange, options, placeholder = 'Chọn...', disabled = false, className = '' }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const listRef = useRef();

  const selected = options.find(o => o.id === value);
  const displayValue = open ? query : (selected ? selected.name : '');
  const filtered = query
    ? options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (opt) => {
    onChange(opt.id);
    setQuery('');
    setOpen(false);
    setHi(-1);
  };

  const handleKeyDown = (e) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); setHi(0); e.preventDefault(); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => { const n = Math.min(h + 1, filtered.length - 1); scrollToItem(n); return n; }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => { const n = Math.max(h - 1, 0); scrollToItem(n); return n; }); }
    else if (e.key === 'Enter') { e.preventDefault(); if (hi >= 0 && filtered[hi]) handleSelect(filtered[hi]); }
    else if (e.key === 'Escape') { setOpen(false); setHi(-1); }
  };

  const scrollToItem = (idx) => {
    if (!listRef.current) return;
    const item = listRef.current.children[idx];
    if (item) item.scrollIntoView({ block: 'nearest' });
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`flex items-center px-3 py-2.5 bg-page border rounded-xl ${disabled ? 'opacity-50' : 'border-base'}`}>
        <input
          disabled={disabled}
          className="flex-1 bg-transparent outline-none font-black text-sm min-w-0"
          placeholder={selected ? selected.name : placeholder}
          value={displayValue}
          onChange={e => { setQuery(e.target.value); setOpen(true); setHi(0); }}
          onFocus={() => { setQuery(''); setOpen(true); setHi(-1); }}
          onBlur={() => setTimeout(() => { setOpen(false); setHi(-1); }, 150)}
          onKeyDown={handleKeyDown}
        />
        <ChevronDown size={12} className="text-weak shrink-0 ml-1" />
      </div>
      {open && filtered.length > 0 && (
        <div ref={listRef} className="absolute z-50 mt-1 w-full bg-surface border border-base rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((o, i) => (
            <div
              key={o.id}
              className={`px-3 py-2 text-sm cursor-pointer ${i === hi ? 'bg-orange-100 font-black text-orange-700' : o.id === value ? 'bg-orange-50 font-black text-orange-700' : 'text-body hover:bg-orange-50'}`}
              onMouseDown={() => handleSelect(o)}
              onMouseEnter={() => setHi(i)}
            >
              {o.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
