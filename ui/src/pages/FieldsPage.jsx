import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, LayoutGrid, ChevronRight, ArrowLeft, Edit2, Check, X } from 'lucide-react';
import { fieldsApi, industryApi } from '../services/api';
import Modal from '../components/Common/Modal';
import { useAuth } from '../context/AuthContext';

const IndustrySelectorModal = ({ isOpen, onClose, onSelect, industries }) => {
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const filtered = industries.filter(i =>
    i.code.toLowerCase().includes(query.toLowerCase()) ||
    i.name.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thêm ngành nghề vào lĩnh vực"
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-slate-400 font-bold text-sm uppercase">Hủy</button>
          <button onClick={() => { onSelect(query, note); setQuery(''); setNote(''); }} className="flex items-center gap-2 px-8 py-2.5 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 shadow-xl shadow-orange-100 font-black text-sm transition-all uppercase tracking-tight">
            Xác nhận thêm
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">Tìm mã / tên ngành nghề</label>
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500" placeholder="VD: 0111..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="mt-2 max-h-40 overflow-y-auto border border-slate-50 rounded-xl">
            {query.length > 1 && filtered.map(i => (
              <div key={i.code} onClick={() => setQuery(i.code)} className={`px-4 py-2 text-xs font-bold cursor-pointer hover:bg-orange-50 ${query === i.code ? 'bg-orange-600 text-white' : 'text-slate-600'}`}>
                {i.code} — {i.name}
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">Ghi chú (tùy chọn)</label>
          <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500 h-20" placeholder="Ghi chú nghiệp vụ..." value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
};

const FieldsPage = () => {
  const { can } = useAuth();
  const [fields, setFields] = useState([]);
  const [allIndustries, setAllIndustries] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [showAddInd, setShowAddInd] = useState(false);
  const [editingNote, setEditingNote] = useState(null); // { code, note }


  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [f, ind] = await Promise.all([fieldsApi.list(), industryApi.list()]);
      setFields(f.data);
      setAllIndustries(ind.data);
      // refresh selected
      if (selectedField) {
        const updated = f.data.find(x => x.id === selectedField.id);
        if (updated) setSelectedField(updated);
      }
    } catch (e) {}
  };

  const handleAddField = async () => {
    const name = prompt("Nhập tên lĩnh vực mới:");
    if (!name?.trim()) return;
    try {
      await fieldsApi.create({ name: name.trim() });
      fetchData();
    } catch (e) { alert("Lỗi khi tạo lĩnh vực"); }
  };

  const handleLink = async (code, note) => {
    try {
      await fieldsApi.linkIndustry(selectedField.id, code, note);
      fetchData();
      setShowAddInd(false);
    } catch (e) { alert("Lỗi khi thêm ngành nghề"); }
  };

  const handleUpdateNote = async (code, note) => {
    try {
      await fieldsApi.updateIndustryNote(selectedField.id, code, note);
      setEditingNote(null);
      fetchData();
    } catch (e) { alert("Lỗi khi cập nhật ghi chú"); }
  };

  const handleDeleteField = async () => {
    if (!window.confirm(`Xóa lĩnh vực "${selectedField.name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await fieldsApi.delete(selectedField.id);
      setSelectedField(null);
      fetchData();
    } catch (e) { alert("Lỗi khi xóa: " + (e.response?.data?.detail || e.message)); }
  };

  const handleUnlink = async (code) => {
    if (!confirm("Xóa ngành nghề này khỏi lĩnh vực?")) return;
    try {
      await fieldsApi.unlinkIndustry(selectedField.id, code);
      fetchData();
    } catch (e) { alert("Lỗi khi xóa"); }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* LEFT — field list */}
      <div className={`transition-all duration-300 border-r border-slate-100 flex flex-col bg-white overflow-hidden ${selectedField ? 'w-72' : 'flex-1'}`}>
        <div className="p-5 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800 italic uppercase">Lĩnh vực</h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{fields.length} lĩnh vực</p>
          </div>
          {can('fields', 'create') && (
            <button onClick={handleAddField} className="bg-orange-600 text-white px-4 py-2 rounded-2xl hover:bg-orange-700 transition shadow-lg shadow-orange-100 flex items-center gap-2 font-black text-xs">
              <Plus size={16} /> Thêm
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {fields.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedField(f)}
              className={`w-full text-left px-4 py-3 rounded-2xl transition-all border flex items-center justify-between ${
                selectedField?.id === f.id
                  ? 'bg-orange-50 border-orange-200 text-orange-700'
                  : 'border-transparent hover:bg-slate-50 text-slate-700 hover:border-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutGrid size={16} className={selectedField?.id === f.id ? 'text-orange-500' : 'text-slate-300'} />
                <span className="font-black text-sm">{f.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400">{f.industries?.length || 0}</span>
                <ChevronRight size={14} className="text-slate-300" />
              </div>
            </button>
          ))}
          {fields.length === 0 && (
            <div className="py-20 text-center text-slate-300 italic font-bold text-sm">Chưa có lĩnh vực nào</div>
          )}
        </div>
      </div>

      {/* RIGHT — detail */}
      {selectedField ? (
        <div className="flex-1 flex flex-col bg-[#F9FAFB] overflow-hidden">
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedField(null)} className="p-2 hover:bg-slate-50 rounded-2xl text-slate-400 transition">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-base font-black text-slate-800 uppercase italic">{selectedField.name}</h2>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{selectedField.industries?.length || 0} ngành nghề</p>
              </div>
            </div>
            <div className="flex gap-2">
              {can('fields', 'delete') && (
                <button onClick={handleDeleteField} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 text-red-400 rounded-2xl hover:bg-red-50 hover:border-red-400 hover:text-red-600 font-black text-xs transition">
                  <Trash2 size={13} /> Xóa lĩnh vực
                </button>
              )}
              {can('fields', 'create') && (
                <button onClick={() => setShowAddInd(true)} className="flex items-center gap-2 px-5 py-2 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 shadow-lg shadow-orange-100 font-black text-xs uppercase tracking-tight transition">
                  <Plus size={14} /> Thêm ngành nghề
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-3 max-w-2xl">
              {selectedField.industries?.map((li, idx) => (
                <div key={idx} className="p-4 bg-white rounded-[20px] border border-slate-100 shadow-sm group hover:border-orange-100 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-[10px] font-black text-orange-600 uppercase mb-0.5">{li.industry?.code}</div>
                      <div className="text-sm font-black text-slate-800">{li.industry?.name}</div>
                    </div>
                    {can('fields', 'update') && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => setEditingNote({ code: li.industry.code, note: li.note || '' })} className="p-2 text-slate-300 hover:text-orange-500">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleUnlink(li.industry.code)} className="p-2 text-slate-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  {editingNote?.code === li.industry.code ? (
                    <div className="mt-2 flex gap-2 items-center">
                      <input
                        autoFocus
                        className="flex-1 px-3 py-1.5 text-xs font-bold bg-slate-50 border border-orange-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-400"
                        value={editingNote.note}
                        onChange={(e) => setEditingNote({ ...editingNote, note: e.target.value })}
                        placeholder="Ghi chú nghiệp vụ..."
                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateNote(editingNote.code, editingNote.note); if (e.key === 'Escape') setEditingNote(null); }}
                      />
                      <button onClick={() => handleUpdateNote(editingNote.code, editingNote.note)} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"><Check size={13} /></button>
                      <button onClick={() => setEditingNote(null)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"><X size={13} /></button>
                    </div>
                  ) : (
                    li.note && <div className="text-[10px] text-slate-400 mt-1.5 italic">Ghi chú: {li.note}</div>
                  )}
                </div>
              ))}
              {(!selectedField.industries || selectedField.industries.length === 0) && (
                <div className="py-24 text-center text-slate-300 italic font-bold">Chưa có ngành nghề nào trong lĩnh vực này</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#F9FAFB] text-slate-300">
          <LayoutGrid size={48} className="mb-4 opacity-10" />
          <p className="text-sm font-black italic">Chọn lĩnh vực để xem chi tiết</p>
        </div>
      )}

      <IndustrySelectorModal isOpen={showAddInd} onClose={() => setShowAddInd(false)} industries={allIndustries} onSelect={handleLink} />
    </div>
  );
};

export default FieldsPage;
