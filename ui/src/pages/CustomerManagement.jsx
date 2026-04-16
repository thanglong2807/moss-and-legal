import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Phone, ExternalLink, Edit2, Link, RefreshCw, ArrowLeft, Trash2 } from 'lucide-react';
import { customerApi, configApi } from '../services/api';
import QuickCustomerModal from '../components/Customer/QuickCustomerModal';
import CustomerDetailModal from '../components/Customer/CustomerDetailModal';
import Pagination from '../components/Common/Pagination';

const CustomerCard = ({ customer, isSelected, onClick }) => (
  <div
    onClick={onClick}
    className={`px-4 py-3 rounded-2xl cursor-pointer transition-all border ${
      isSelected
        ? 'bg-orange-50 border-orange-300'
        : 'border-faint bg-surface hover:bg-orange-50/40 hover:border-orange-200'
    }`}
  >
    <div className="flex items-center gap-2 mb-0.5">
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${customer.crm_link ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      <span className={`text-sm font-black truncate ${isSelected ? 'text-orange-800' : 'text-strong'}`}>{customer.name}</span>
      {customer.crm_link && <Link size={10} className="text-emerald-500 shrink-0" />}
    </div>
    <div className="flex items-center gap-1.5 pl-3.5">
      <Phone size={10} className="text-weak shrink-0" />
      <span className="text-xs font-bold text-weak">{customer.phone}</span>
    </div>
  </div>
);

const CustomerManagement = ({ onShowHKDs }) => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [sources, setSources] = useState([]);
  const [staff, setStaff] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [c, src, s] = await Promise.all([customerApi.list(), configApi.getSources(), configApi.getStaff()]);
    setCustomers(c.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setSources(src.data);
    setStaff(s.data);
  };

  const handleShowHKDs = (id) => { onShowHKDs(id); navigate('/hkd'); };

  const handleDelete = async () => {
    if (!window.confirm(`Xóa khách hàng "${selectedCustomer.name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await customerApi.delete(selectedCustomer.id);
      setSelectedCustomer(null);
      fetchAll();
    } catch (e) { alert("Lỗi khi xóa: " + (e.response?.data?.detail || e.message)); }
  };

  const handleSyncCRM = async () => {
    if (!window.confirm("Đồng bộ khách hàng này lên CRM?")) return;
    setSyncing(true);
    try {
      await customerApi.syncCRM(selectedCustomer.id);
      alert("Đồng bộ CRM thành công!");
      fetchAll();
    } catch (e) { alert("Lỗi đồng bộ CRM"); }
    finally { setSyncing(false); }
  };

  const filtered = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchSearch = c.name?.toLowerCase().includes(q) || c.phone?.includes(q);
    const matchStaff = !staffFilter || c.staff_id === parseInt(staffFilter);
    return matchSearch && matchStaff;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSearchChange = (v) => { setSearchQuery(v); setPage(1); };
  const handleStaffFilterChange = (v) => { setStaffFilter(v); setPage(1); };

  const showPanel = !!selectedCustomer;

  return (
    <div className="flex-1 flex overflow-hidden">

      {/* LEFT */}
      {showPanel ? (
        <div className="w-72 shrink-0 border-r border-base flex flex-col bg-surface overflow-hidden">
          <div className="p-4 border-b border-base flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-body uppercase tracking-widest">Khách hàng</span>
              <button onClick={() => setShowCreate(true)} className="bg-orange-600 text-white p-1.5 rounded-lg hover:bg-orange-700 transition shadow-md shadow-orange-100">
                <Plus size={14} />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-weak" size={12} />
              <input type="text" placeholder="Tìm kiếm..." className="w-full pl-8 pr-3 py-2 bg-input/60 rounded-xl text-xs font-bold outline-none" value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} />
            </div>
            <select className="w-full px-3 py-2 bg-input/60 rounded-xl text-xs font-bold outline-none appearance-none" value={staffFilter} onChange={(e) => handleStaffFilterChange(e.target.value)}>
              <option value="">-- Tất cả nhân viên --</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {filtered.map(c => (
              <CustomerCard key={c.id} customer={c} isSelected={selectedCustomer?.id === c.id} onClick={() => setSelectedCustomer(c)} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-surface overflow-hidden">
          <div className="p-5 border-b border-base flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-black tracking-tight text-strong italic uppercase">Khách hàng</h1>
                <p className="text-weak text-[11px] font-black uppercase tracking-widest mt-0.5">{filtered.length} / {customers.length} khách</p>
              </div>
              <button onClick={() => setShowCreate(true)} className="bg-orange-600 text-white px-4 py-2 rounded-2xl hover:bg-orange-700 transition shadow-lg shadow-orange-100 font-black text-xs uppercase flex items-center gap-2">
                <Plus size={16} /> Thêm
              </button>
            </div>
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-weak" size={14} />
                <input type="text" placeholder="Tìm tên hoặc số điện thoại..." className="w-full pl-9 pr-3 py-2 bg-input/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-400" value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} />
              </div>
              <select className="px-3 py-2 bg-input/60 rounded-xl text-xs font-bold outline-none appearance-none" value={staffFilter} onChange={(e) => handleStaffFilterChange(e.target.value)}>
                <option value="">-- Tất cả NV --</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 text-weak"><Users size={40} className="mb-3 opacity-10" /><p className="text-sm font-bold italic">Không tìm thấy khách hàng nào</p></div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-page z-10">
                  <tr>
                    {['ID CRM', 'Tên khách hàng', 'Số điện thoại', 'Nguồn', 'Chi nhánh', 'CRM'].map(col => (
                      <th key={col} className="px-4 py-2.5 font-black text-body uppercase tracking-widest text-[9px] border-b border-base whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(c => (
                    <tr key={c.id} onClick={() => setSelectedCustomer(c)} className={`cursor-pointer transition-all border-b border-base hover:bg-orange-50/40 dark:hover:bg-orange-900/10 ${c.crm_link ? 'border-l-2 border-l-emerald-400' : ''}`}>
                      <td className="px-3 py-2.5 text-body font-bold text-[10px]">{c.id_crm || '—'}</td>
                      <td className="px-3 py-2.5 font-black text-strong">
                        <div className="flex items-center gap-2">
                          {c.crm_link && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />}
                          {c.name}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-body font-bold">{c.phone}</td>
                      <td className="px-3 py-2.5"><span className="bg-input text-body px-2 py-0.5 rounded-lg font-black text-[9px] uppercase">{c.source?.name || '—'}</span></td>
                      <td className="px-3 py-2.5 text-body font-bold">{c.branch_name || '—'}</td>
                      <td className="px-3 py-2.5">
                        {c.crm_link
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-black uppercase border border-emerald-100">● CRM</span>
                          : <span className="w-2 h-2 rounded-full bg-slate-200 inline-block" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      )}

      {/* RIGHT detail panel */}
      {selectedCustomer && (
        <div className="flex-1 flex flex-col bg-page overflow-hidden">
          <div className="bg-surface border-b border-base px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-page rounded-2xl text-weak transition">
                <ArrowLeft size={18} />
              </button>
              <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 border border-orange-100">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-base font-black text-strong">{selectedCustomer.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Phone size={10} className="text-weak" />
                  <span className="text-xs font-bold text-body">{selectedCustomer.phone}</span>
                  {selectedCustomer.crm_link && <Link size={10} className="text-emerald-500" />}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSyncCRM} disabled={syncing} className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black text-xs border transition ${selectedCustomer.crm_link ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-surface border-base text-body hover:border-emerald-400 hover:text-emerald-600'}`}>
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                {selectedCustomer.crm_link ? 'Cập nhật CRM' : 'Đồng bộ CRM'}
              </button>
              <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 px-4 py-2 bg-surface border border-base text-body rounded-2xl font-black text-xs hover:border-orange-400 hover:text-orange-600 transition">
                <Edit2 size={13} /> Chỉnh sửa
              </button>
              <button onClick={handleDelete} className="flex items-center gap-1.5 px-4 py-2 bg-surface border border-red-200 text-red-500 rounded-2xl font-black text-xs hover:bg-red-50 hover:border-red-400 transition">
                <Trash2 size={13} /> Xóa
              </button>
              <button onClick={() => handleShowHKDs(selectedCustomer.id)} className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-2xl font-black text-xs hover:bg-orange-700 shadow-lg shadow-orange-100 transition">
                Xem hồ sơ <ExternalLink size={12} />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto">
            <div className="bg-surface rounded-[24px] border border-faint shadow-sm p-6 grid grid-cols-2 gap-5 max-w-2xl">
              {[
                ['ID CRM', selectedCustomer.id_crm || '—'],
                ['ID Hệ thống', `#${selectedCustomer.id}`],
                ['Nguồn khách', selectedCustomer.source?.name || '—'],
                ['Chi nhánh', selectedCustomer.branch_name || '—'],
                ['Giới tính', selectedCustomer.gender === 0 ? 'Nam' : selectedCustomer.gender === 1 ? 'Nữ' : '—'],
                ['Ngày sinh', selectedCustomer.birth_date || '—'],
                ['CCCD / CMND', selectedCustomer.id_card || '—'],
                ['Địa chỉ', [selectedCustomer.street, selectedCustomer.ward?.name, selectedCustomer.province?.name].filter(Boolean).join(', ') || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-[9px] font-black uppercase tracking-widest text-weak mb-1">{label}</div>
                  <div className="text-sm font-black text-strong">{value}</div>
                </div>
              ))}
              <div className="col-span-2 pt-3 border-t border-faint flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${selectedCustomer.crm_link ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' : 'bg-slate-200'}`} />
                <span className="text-xs font-black text-body">{selectedCustomer.crm_link ? 'Đã đồng bộ CRM' : 'Chưa đồng bộ CRM'}</span>
                {selectedCustomer.crm_link && (
                  <a href={selectedCustomer.crm_link} target="_blank" rel="noreferrer" className="ml-auto text-emerald-600 flex items-center gap-1 text-[10px] font-black hover:underline">
                    <ExternalLink size={10} /> Mở CRM
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <QuickCustomerModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { fetchAll(); setShowCreate(false); }} sources={sources} staff={staff} />
      <CustomerDetailModal customer={showEdit ? selectedCustomer : null} onClose={() => setShowEdit(false)} onUpdated={(updated) => { fetchAll(); setSelectedCustomer(updated); setShowEdit(false); }} sources={sources} staff={staff} />
    </div>
  );
};

export default CustomerManagement;
