import React, { useState, useEffect } from 'react';
import { Search, Plus, Users, Phone, MapPin, Check } from 'lucide-react';
import Modal from '../Common/Modal';
import { customerApi, configApi } from '../../services/api';

const CustomerSelectionModal = ({ isOpen, onClose, onSelect, onCreateNew }) => {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) { setSearchQuery(''); setCustomers([]); return; }
    fetchCustomers('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => fetchCustomers(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchCustomers = async (search) => {
    setLoading(true);
    try {
      const res = await customerApi.list({ limit: 50, skip: 0, ...(search && { search }) });
      setCustomers(res.data.items ?? res.data);
    } catch (e) {}
    setLoading(false);
  };

  const filtered = customers;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Chọn chủ sở hữu hồ sơ"
      footer={
        <button 
          onClick={onCreateNew}
          className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 shadow-xl shadow-orange-100 font-black text-sm transition-all"
        >
          <Plus size={18} /> TẠO KHÁCH HÀNG MỚI
        </button>
      }
    >
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-weak" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên hoặc số điện thoại..." 
            className="w-full pl-11 pr-4 py-3 bg-page border border-faint rounded-2xl focus:bg-surface focus:ring-2 focus:ring-orange-500 transition-all text-sm font-bold outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {filtered.map(c => (
            <div 
              key={c.id} 
              onClick={() => onSelect(c)}
              className="flex justify-between items-center p-4 bg-page border border-transparent rounded-[24px] hover:bg-surface hover:border-orange-200 cursor-pointer transition-all group"
            >
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center text-orange-600 shadow-sm border border-faint">
                   <Users size={18} />
                </div>
                <div>
                  <h4 className="font-black text-strong text-sm group-hover:text-orange-600 transition-colors">{c.name}</h4>
                  <p className="text-[11px] font-bold text-weak flex items-center gap-1 mt-0.5"><Phone size={10} /> {c.phone}</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-surface rounded-lg text-[9px] font-black text-weak border border-faint uppercase tracking-widest group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-600 transition-all">
                CHỌN
              </div>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="py-12 text-center text-weak italic font-bold text-sm">Không tìm thấy khách hàng nào</div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CustomerSelectionModal;
