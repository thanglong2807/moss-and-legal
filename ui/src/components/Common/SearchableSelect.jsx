import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const SearchableSelect = ({ value, onChange, options, placeholder = 'Chọn...', disabled = false, className = '' }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = options.find(o => o.id === value);
  const displayValue = open ? query : (selected ? selected.name : '');
  const filtered = query
    ? options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (opt) => {
    onChange(opt.id);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`flex items-center px-3 py-2.5 bg-slate-50 border rounded-xl ${disabled ? 'opacity-50' : 'border-slate-200'}`}>
        <input
          disabled={disabled}
          className="flex-1 bg-transparent outline-none font-black text-sm min-w-0"
          placeholder={selected ? selected.name : placeholder}
          value={displayValue}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setQuery(''); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        <ChevronDown size={12} className="text-slate-400 shrink-0 ml-1" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.map(o => (
            <div
              key={o.id}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 ${o.id === value ? 'bg-orange-50 font-black text-orange-700' : 'text-slate-700'}`}
              onMouseDown={() => handleSelect(o)}
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
