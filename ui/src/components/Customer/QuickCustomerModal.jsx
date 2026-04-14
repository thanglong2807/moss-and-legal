import React, { useState, useEffect } from 'react';
import { Save, UserPlus, Phone, LayoutGrid } from 'lucide-react';
import Modal from '../Common/Modal';
import { customerApi, adminUnitsApi } from '../../services/api';
import { BRANCHES } from '../../constants';

const QuickCustomerModal = ({ isOpen, onClose, onCreated, sources, staff }) => {
  const [formData, setFormData] = useState({
    name: '', phone: '', source_id: '', staff_id: '',
    branch_name: '', id_card: '', gender: '', birth_date: '',
    province_id: '', ward_id: '', street: '',
  });
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminUnitsApi.getProvinces().then(r => setProvinces(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', phone: '', source_id: sources[0]?.id || '', staff_id: '', branch_name: '', id_card: '', gender: '', birth_date: '', province_id: '', ward_id: '', street: '' });
      setWards([]);
    }
  }, [isOpen]);

  const loadWards = async (provinceId) => {
    if (!provinceId) { setWards([]); return; }
    const r = await adminUnitsApi.getChildren(provinceId);
    setWards(r.data);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone || !formData.source_id) {
      alert("Tên, Số điện thoại và Nguồn khách là bắt buộc");
      return;
    }
    setSaving(true);
    try {
      const res = await customerApi.create({
        ...formData,
        source_id: parseInt(formData.source_id),
        staff_id: formData.staff_id ? parseInt(formData.staff_id) : null,
        gender: formData.gender !== '' ? parseInt(formData.gender) : null,
        birth_date: formData.birth_date || null,
        province_id: formData.province_id ? parseInt(formData.province_id) : null,
        ward_id: formData.ward_id ? parseInt(formData.ward_id) : null,
      });
      onCreated(res.data);
      onClose();
    } catch (e) {
      alert("Lỗi khi tạo khách hàng: " + (e.response?.data?.detail || e.message));
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all text-sm font-bold outline-none';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo khách hàng mới"
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-slate-400 font-bold text-sm">HỦY</button>
          <button disabled={saving} onClick={handleSave} className="flex items-center gap-2 px-8 py-2.5 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 shadow-xl shadow-orange-100 font-black text-sm transition-all">
            <Save size={15} />{saving ? 'ĐANG LƯU...' : 'TẠO KHÁCH HÀNG'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">Tên khách hàng *</label>
            <input className={inp} placeholder="Họ và tên..." value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} autoFocus />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">Số điện thoại *</label>
            <input className={inp} placeholder="09xx..." value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">CCCD / CMND</label>
            <input className={inp} placeholder="0xxxxxxxxx..." value={formData.id_card} onChange={(e) => setFormData({ ...formData, id_card: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">Giới tính</label>
            <div className="flex gap-2">
              {[{ v: 0, label: 'Nam' }, { v: 1, label: 'Nữ' }].map(g => (
                <button key={g.v} type="button" onClick={() => setFormData({ ...formData, gender: g.v })}
                  className={`flex-1 py-3 rounded-2xl text-sm font-black transition-all border ${formData.gender === g.v ? 'bg-orange-600 text-white border-orange-600' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-orange-300'}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">Ngày sinh</label>
            <input type="date" className={inp} value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">Nguồn khách *</label>
            <select className={inp + ' appearance-none'} value={formData.source_id} onChange={(e) => setFormData({ ...formData, source_id: e.target.value })}>
              <option value="">-- Chọn nguồn --</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">NV phụ trách</label>
            <select className={inp + ' appearance-none'} value={formData.staff_id} onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}>
              <option value="">-- Chọn NV --</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">Chi nhánh</label>
            <select className={inp + ' appearance-none'} value={formData.branch_name} onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}>
              <option value="">-- Chọn chi nhánh --</option>
              {BRANCHES.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-50">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-1">Địa chỉ</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block px-1">Tỉnh / Thành phố</label>
              <select className={inp + ' appearance-none text-xs'} value={formData.province_id}
                onChange={(e) => { const v = e.target.value; setFormData({ ...formData, province_id: v, ward_id: '' }); loadWards(v); }}>
                <option value="">-- Chọn --</option>
                {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block px-1">Phường / Xã</label>
              <select className={inp + ' appearance-none text-xs'} value={formData.ward_id} onChange={(e) => setFormData({ ...formData, ward_id: e.target.value })} disabled={!wards.length}>
                <option value="">-- Chọn --</option>
                {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block px-1">Số nhà, tên đường</label>
              <input className={inp + ' text-xs'} placeholder="22 Nguyễn Trãi..." value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default QuickCustomerModal;
