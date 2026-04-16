import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Briefcase, Users, Flag, Save } from 'lucide-react';
import { configApi } from '../services/api';
import Modal from '../components/Common/Modal';

const ConfigModal = ({ isOpen, onClose, onSave, item, type }) => {
  const [formData, setFormData] = useState({ crm_id: '', name: '' });
  
  useEffect(() => {
    if (item) setFormData({ crm_id: item.crm_id, name: item.name });
    else setFormData({ crm_id: '', name: '' });
  }, [item, isOpen]);

  const handleSave = () => {
    if (!formData.crm_id || !formData.name) return alert("Vui lòng nhập đầy đủ");
    onSave(formData);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={item ? `Sửa ${type}` : `Thêm ${type}`}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-weak font-bold text-sm uppercase">Hủy</button>
          <button onClick={handleSave} className="flex items-center gap-2 px-8 py-2.5 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 shadow-xl shadow-orange-100 font-black text-sm transition-all uppercase tracking-tight">
            <Save size={18} /> Lưu thông tin
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-weak mb-1.5 block px-1">ID CRM</label>
          <input 
            className="w-full px-5 py-3.5 bg-page border border-faint rounded-2xl focus:bg-surface focus:ring-2 focus:ring-orange-500 transition-all text-sm font-bold outline-none"
            placeholder="VD: staff_01..."
            value={formData.crm_id}
            onChange={(e) => setFormData({...formData, crm_id: e.target.value})}
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-weak mb-1.5 block px-1">Tên hiển thị</label>
          <input 
            className="w-full px-5 py-3.5 bg-page border border-faint rounded-2xl focus:bg-surface focus:ring-2 focus:ring-orange-500 transition-all text-sm font-bold outline-none"
            placeholder="VD: Nguyễn Văn A..."
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
      </div>
    </Modal>
  );
};

const ConfigSection = ({ title, icon: Icon, data, onAdd, onEdit, onDelete, type }) => (
  <div className="bg-surface rounded-[32px] p-8 border border-faint shadow-sm flex flex-col h-full hover:shadow-lg hover:shadow-orange-100/20 transition-all">
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
          <Icon size={20} />
        </div>
        <h3 className="font-black text-strong uppercase tracking-tight text-sm">{title}</h3>
      </div>
      <button 
        onClick={() => onAdd(type)}
        className="p-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
      >
        <Plus size={16} />
      </button>
    </div>
    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
      {data.map(item => (
        <div key={item.id} className="flex justify-between items-center p-4 bg-page/50 rounded-2xl group border border-transparent hover:border-orange-100 hover:bg-surface transition-all">
          <div>
            <div className="text-[10px] font-black text-weak uppercase tracking-widest mb-0.5">ID CRM: {item.crm_id}</div>
            <div className="text-sm font-black text-body">{item.name}</div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button 
              onClick={() => onEdit(type, item)}
              className="p-2 text-weak hover:text-orange-500 transition-all"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={() => onDelete(type, item.id)}
              className="p-2 text-weak hover:text-red-500 transition-all"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
      {data.length === 0 && (
         <div className="py-10 text-center text-weak italic text-xs font-bold">Chưa có dữ liệu</div>
      )}
    </div>
  </div>
);

const ConfigPage = () => {
  const [staff, setStaff] = useState([]);
  const [sources, setSources] = useState([]);
  const [statuses, setStatuses] = useState([]);
  
  const [modalState, setModalState] = useState({ isOpen: false, type: '', item: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [st, src, stats] = await Promise.all([
        configApi.getStaff(),
        configApi.getSources(),
        configApi.getStatuses()
      ]);
      setStaff(st.data);
      setSources(src.data);
      setStatuses(stats.data);
    } catch (e) {}
  };

  const openModal = (type, item = null) => {
    setModalState({ isOpen: true, type, item });
  };

  const handleSave = async (formData) => {
    const { type, item } = modalState;
    try {
      if (item) {
        // Edit logic (We need to add put endpoints to configApi if not there, for now assuming they exist or using a generic update)
        if (type === 'staff') await configApi.updateStaff(item.id, formData);
        if (type === 'sources') await configApi.updateSource(item.id, formData);
        if (type === 'statuses') await configApi.updateStatus(item.id, formData);
      } else {
        if (type === 'staff') await configApi.createStaff(formData);
        if (type === 'sources') await configApi.createSource(formData);
        if (type === 'statuses') await configApi.createStatus(formData);
      }
      setModalState({ isOpen: false, type: '', item: null });
      fetchData();
    } catch (e) { alert("Lỗi khi lưu thông tin"); }
  };

  const handleDelete = async (type, id) => {
    if (!confirm("Xóa mục này?")) return;
    try {
      await configApi.delete(type, id);
      fetchData();
    } catch (e) { alert("Lỗi khi xóa"); }
  };

  return (
    <div className="flex-1 flex flex-col bg-page p-10 overflow-hidden">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-strong italic uppercase">Cấu hình hệ thống</h1>
        <p className="text-weak text-[11px] font-black uppercase tracking-widest mt-1">Quản lý danh mục nhân viên, nguồn khách và trạng thái hồ sơ</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden pb-10">
        <ConfigSection title="Nhân viên" icon={Briefcase} data={staff} type="staff" onAdd={openModal} onEdit={openModal} onDelete={handleDelete} />
        <ConfigSection title="Nguồn khách" icon={Users} data={sources} type="sources" onAdd={openModal} onEdit={openModal} onDelete={handleDelete} />
        <ConfigSection title="Trạng thái" icon={Flag} data={statuses} type="statuses" onAdd={openModal} onEdit={openModal} onDelete={handleDelete} />
      </div>

      <ConfigModal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ ...modalState, isOpen: false })} 
        onSave={handleSave}
        item={modalState.item}
        type={modalState.type === 'staff' ? 'Nhân viên' : modalState.type === 'sources' ? 'Nguồn khách' : 'Trạng thái'}
      />
    </div>
  );
};

export default ConfigPage;
