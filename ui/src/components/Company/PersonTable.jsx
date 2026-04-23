import React, { useState, useRef } from 'react';
import { Plus, Trash2, ChevronDown, Users, Upload, Loader2, CreditCard, X, Copy } from 'lucide-react';
import SearchableSelect from '../Common/SearchableSelect';
import PasteDropZone from '../Common/PasteDropZone';
import DriveFileLink from '../Common/DriveFileLink';
import { ocrApi, companyDriveApi } from '../../services/api';
import { compressImage } from '../../utils/validators';

const ADMIN_PREFIXES = ['thành phố', 'tỉnh', 'tp.', 'quận', 'huyện', 'thị xã', 'phường', 'xã', 'thị trấn'];
const stripAdminPrefix = (name) => {
  const lower = name.trim().toLowerCase();
  for (const p of ADMIN_PREFIXES) {
    if (lower.startsWith(p + ' ')) return name.trim().slice(p.length).trim();
  }
  return name.trim();
};
const matchAdminName = (name, options) => {
  if (!name || !options?.length) return null;
  const clean = stripAdminPrefix(name).toLowerCase();
  const found = options.find(o => stripAdminPrefix(o.name || o.label || '').toLowerCase() === clean);
  return found?.id || found?.value || null;
};

const PersonForm = ({
  person, index, positions, companyType, provinces, wardOptions, loadWards,
  onChange, onRemove, showOwnership, showPosition, groupIndex,
  companyId, onFolderCreated,
  customer, nonRepPersons, personTypeLabel,
}) => {
  const [open, setOpen] = useState(true);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [cccdUploading, setCccdUploading] = useState({ front: false, back: false });
  const [cccdDocs, setCccdDocs] = useState({ front: null, back: null });
  const [pasteTarget, setPasteTarget] = useState(null);
  const [copyFromIdx, setCopyFromIdx] = useState(0);
  const frontRef = useRef();
  const backRef = useRef();

  const upd = (field, val) => onChange(index, { ...person, [field]: val });

  const filteredPositions = positions.filter(p => {
    if (companyType === 1) return p.is_llc1;
    if (companyType === 2) return p.is_llc2;
    if (companyType === 3) return p.is_jsc;
    return true;
  });
  const posLabel = filteredPositions.find(p => p.id === person.position_id)?.name;

  const suffix = () => {
    const n = person.full_name?.trim() || person.id_number?.trim();
    return n ? `_${n.replace(/\s+/g, '_')}` : `_${index + 1}`;
  };

  const copyFromCustomer = () => {
    if (!customer) return;
    const updates = { ...person };
    if (customer.name) updates.full_name = customer.name;
    if (customer.phone) updates.phone = customer.phone;
    if (customer.gender != null) updates.gender = customer.gender;
    if (customer.birth_date) updates.birth_date = customer.birth_date;
    if (customer.id_number) updates.id_number = customer.id_number;
    if (customer.id_card) updates.id_number = customer.id_card;
    if (customer.province_id) { updates.province_id = customer.province_id; loadWards(`person_${index}`, customer.province_id); }
    if (customer.ward_id) updates.ward_id = customer.ward_id;
    if (customer.street) updates.street = customer.street;
    onChange(index, updates);
  };

  const copyFromPerson = (srcPerson) => {
    if (!srcPerson) return;
    onChange(index, {
      ...person,
      full_name: srcPerson.full_name || person.full_name,
      phone: srcPerson.phone || person.phone,
      gender: srcPerson.gender ?? person.gender,
      birth_date: srcPerson.birth_date || person.birth_date,
      id_number: srcPerson.id_number || person.id_number,
      province_id: srcPerson.province_id || person.province_id,
      ward_id: srcPerson.ward_id || person.ward_id,
      street: srcPerson.street || person.street,
      email: srcPerson.email || person.email,
    });
    if (srcPerson.province_id) loadWards(`person_${index}`, srcPerson.province_id);
  };

  const handleCccdUpload = async (side, file) => {
    if (!file) return;
    const labelCode = side === 'front' ? 'C000' : 'C001';
    const labelStr = side === 'front' ? 'mat_truoc' : 'mat_sau';
    const typeTag = person.person_type || 'unknown';
    const numTag = groupIndex !== undefined ? `_${groupIndex + 1}` : '_1';
    const compressed = await compressImage(file);
    const ext = compressed.name.split('.').pop() || 'jpg';
    const named = new File([compressed], `cccd_${labelStr}_${typeTag}${numTag}${suffix()}.${ext}`, { type: compressed.type });

    setCccdUploading(prev => ({ ...prev, [side]: true }));
    if (side === 'front') setOcrRunning(true);
    try {
      const uploadTask = companyId
        ? companyDriveApi.upload(companyId, labelCode, named).then(r => r.data).catch(() => null)
        : Promise.resolve(null);

      const ocrTask = side === 'front'
        ? ocrApi.extract('cccd', named, { serviceType: 'company' })
            .catch(e => { console.warn('OCR thất bại:', e.response?.data?.detail || e.message); return null; })
        : Promise.resolve(null);

      const [driveDoc, ocrRes] = await Promise.all([uploadTask, ocrTask]);

      if (driveDoc) {
        setCccdDocs(prev => ({ ...prev, [side]: driveDoc }));
        if (driveDoc.folder_id) onFolderCreated?.(driveDoc.folder_id);
      }

      if (ocrRes) {
        const raw = ocrRes.data?.raw || {};
        const updates = { ...person };
        if (raw.full_name) updates.full_name = raw.full_name.toUpperCase();
        if (raw.id_number) updates.id_number = raw.id_number;
        if (raw.birth_date) updates.birth_date = raw.birth_date;
        if (raw.gender !== undefined && raw.gender !== '') updates.gender = raw.gender === 'Nam' ? 0 : 1;
        if (raw.street) updates.street = raw.street;
        if (raw.province_name) {
          const pid = matchAdminName(raw.province_name, provinces);
          if (pid) { updates.province_id = pid; loadWards(`person_${index}`, pid); }
        }
        if (raw.ward_name) {
          const wid = matchAdminName(raw.ward_name, wardOptions[`person_${index}`] || []);
          if (wid) updates.ward_id = wid;
        }
        onChange(index, updates);
      }
    } catch (e) {
      alert('Lỗi upload CCCD: ' + (e.response?.data?.detail || e.message));
    } finally {
      setCccdUploading(prev => ({ ...prev, [side]: false }));
      if (side === 'front') setOcrRunning(false);
    }
  };

  const handleCccdDelete = async (side) => {
    const doc = cccdDocs[side];
    if (!doc) return;
    if (!window.confirm(`Xóa file "${doc.file_name}"?`)) return;
    try {
      await companyDriveApi.deleteDoc(doc.id);
      setCccdDocs(prev => ({ ...prev, [side]: null }));
    } catch (e) {
      alert('Lỗi xóa: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleRemove = () => {
    const name = person.full_name ? `"${person.full_name}"` : 'người này';
    if (!window.confirm(`Xóa ${name}? Hành động này không thể hoàn tác.`)) return;
    onRemove(index);
  };

  const headerTitle = groupIndex !== undefined
    ? `#${groupIndex + 1}${person.full_name ? ' — ' + person.full_name.toUpperCase() : ''}`
    : (person.full_name ? person.full_name.toUpperCase() : '(Chưa nhập tên)');

  return (
    <div className="bg-page rounded-2xl border border-base overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-input/50 transition select-none" onClick={() => setOpen(!open)}>
        <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
          <Users size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-black text-strong truncate">{headerTitle}</div>
          {showPosition && posLabel && <div className="text-[10px] font-bold text-weak">{posLabel}</div>}
        </div>
        {showOwnership && person.ownership_percentage != null && (
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full shrink-0">
            {person.ownership_percentage}%
          </span>
        )}
        {ocrRunning && <Loader2 size={12} className="animate-spin text-indigo-500 shrink-0" />}
        <button onClick={e => { e.stopPropagation(); handleRemove(); }} className="p-1.5 text-weak hover:text-red-500 rounded-lg transition shrink-0">
          <Trash2 size={12} />
        </button>
        <ChevronDown size={12} className={`text-weak transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-faint space-y-3">

          {/* Copy shortcuts */}
          <div className="flex flex-wrap gap-2">
            {customer && (
              <button onClick={copyFromCustomer}
                className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-[9px] font-black hover:bg-orange-100 transition">
                <Copy size={9} /> Giống thông tin KH
              </button>
            )}
            {showPosition && nonRepPersons?.length > 0 && (
              <div className="flex items-center gap-1">
                <button onClick={() => copyFromPerson(nonRepPersons[copyFromIdx])}
                  className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-[9px] font-black hover:bg-indigo-100 transition">
                  <Copy size={9} /> Giống {personTypeLabel} #{copyFromIdx + 1}
                </button>
                {nonRepPersons.length > 1 && (
                  <select value={copyFromIdx} onChange={e => setCopyFromIdx(parseInt(e.target.value))}
                    className="px-2 py-1 bg-page border border-base rounded-lg text-[9px] font-bold outline-none">
                    {nonRepPersons.map((p, i) => (
                      <option key={i} value={i}>#{i + 1}{p.full_name ? ` — ${p.full_name}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-6 gap-3">
            {/* Name */}
            <div className={showPosition ? 'col-span-4' : 'col-span-6'}>
              <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Họ và tên</label>
              <input className="w-full px-3 py-2.5 bg-surface border border-base rounded-xl font-black text-sm outline-none focus:border-indigo-400 transition uppercase"
                value={person.full_name || ''} onChange={e => upd('full_name', e.target.value.toUpperCase())} />
            </div>

            {showPosition && (
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Chức danh</label>
                <select className="w-full px-3 py-2.5 bg-surface border border-base rounded-xl text-xs font-bold outline-none appearance-none"
                  value={person.position_id || ''} onChange={e => upd('position_id', e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">-- Chọn --</option>
                  {filteredPositions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* CCCD photo slots */}
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <CreditCard size={12} className="text-indigo-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-body">Ảnh CCCD — up mặt trước có AI quét</span>
              {ocrRunning && <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1"><Loader2 size={9} className="animate-spin" /> Đang OCR...</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[{ side: 'front', label: 'Mặt trước', ref: frontRef }, { side: 'back', label: 'Mặt sau', ref: backRef }].map(({ side, label, ref }) => {
                const doc = cccdDocs[side];
                const uploading = cccdUploading[side];
                return (
                  <div key={side} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${doc ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800' : 'bg-surface border-base'}`}>
                    <input ref={ref} type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden"
                      onChange={e => { const f = e.target.files[0]; if (f) { handleCccdUpload(side, f); e.target.value = ''; } }} />
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                      <CreditCard size={13} className={doc ? 'text-indigo-600' : 'text-weak'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black text-body uppercase tracking-wide">{label}</div>
                      {doc
                        ? <DriveFileLink driveLink={doc.drive_link} fileName={doc.file_name} className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 max-w-[120px]" />
                        : <div className="text-[9px] font-bold text-weak italic">Chưa có ảnh</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {doc && <button onClick={() => handleCccdDelete(side)} className="p-1 text-weak hover:text-red-500 transition rounded-lg hover:bg-red-50"><X size={11} /></button>}
                      <button onClick={() => setPasteTarget(side)} disabled={uploading}
                        className="p-1.5 text-weak hover:text-indigo-600 border border-base hover:border-indigo-300 rounded-lg transition-all disabled:opacity-40">
                        {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Giới tính</label>
              <div className="flex gap-2">
                {[{ v: 0, label: 'Nam' }, { v: 1, label: 'Nữ' }].map(g => (
                  <button key={g.v} onClick={() => upd('gender', g.v)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all border ${person.gender === g.v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-surface text-body border-base hover:border-indigo-300'}`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Ngày sinh</label>
              <input type="date" className="w-full px-3 py-2.5 bg-surface border border-base rounded-xl font-black text-sm outline-none"
                value={(() => { const bd = person.birth_date; if (!bd) return ''; const p = bd.split('/'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : bd; })()}
                onChange={e => { const v = e.target.value; if (!v) { upd('birth_date', ''); return; } const [y, m, d] = v.split('-'); upd('birth_date', `${d}/${m}/${y}`); }} />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Số CCCD/CMND</label>
              <input className="w-full px-3 py-2.5 bg-surface border border-base rounded-xl font-black text-sm outline-none"
                value={person.id_number || ''} onChange={e => upd('id_number', e.target.value)} />
            </div>

            <div className="col-span-6 bg-page/50 p-4 rounded-2xl border border-dashed border-base">
              <h4 className="text-[10px] font-black text-body uppercase tracking-widest mb-3">Địa chỉ liên hệ</h4>
              <div className="grid grid-cols-3 gap-3">
                <SearchableSelect value={person.province_id || ''} onChange={id => { upd('province_id', id); if (id) loadWards(`person_${index}`, id); }} options={provinces} placeholder="Tỉnh/Thành" />
                <SearchableSelect value={person.ward_id || ''} onChange={id => upd('ward_id', id)} options={wardOptions[`person_${index}`] || []} placeholder="Phường/Xã" />
                <input className="px-3 py-2.5 rounded-xl bg-surface border border-base font-bold text-xs outline-none" placeholder="Số nhà, đường..."
                  value={person.street || ''} onChange={e => upd('street', e.target.value)} />
              </div>
            </div>

            <div className="col-span-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Điện thoại</label>
              <input className="w-full px-3 py-2.5 bg-surface border border-base rounded-xl font-black text-sm outline-none"
                value={person.phone || ''} onChange={e => upd('phone', e.target.value)} placeholder="09xx..." />
            </div>
            <div className="col-span-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Email</label>
              <input className="w-full px-3 py-2.5 bg-surface border border-base rounded-xl font-black text-sm outline-none"
                value={person.email || ''} onChange={e => upd('email', e.target.value)} placeholder="email@..." />
            </div>

            {showOwnership && (
              <div className="col-span-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-body mb-1 block px-1">Tỷ lệ vốn góp (%)</label>
                <input type="number" min="0" max="100" step="0.01"
                  className="w-full px-3 py-2.5 bg-surface border border-base rounded-xl font-black text-sm outline-none focus:border-emerald-400"
                  value={person.ownership_percentage ?? ''} onChange={e => upd('ownership_percentage', e.target.value !== '' ? parseFloat(e.target.value) : null)} />
              </div>
            )}
          </div>
        </div>
      )}

      <PasteDropZone isOpen={!!pasteTarget} onClose={() => setPasteTarget(null)}
        title={`CCCD — ${pasteTarget === 'front' ? 'Mặt trước' : 'Mặt sau'}`}
        onFile={(file) => { setPasteTarget(null); handleCccdUpload(pasteTarget, file); }} />
    </div>
  );
};

const PERSON_TYPE_LABEL = { owner: 'Chủ sở hữu', member: 'Thành viên', founder: 'Cổ đông' };

const NON_REP_GROUPS = {
  1: [{ type: 'owner', label: 'Chủ sở hữu', single: true, showOwnership: false }],
  2: [{ type: 'member', label: 'Thành viên góp vốn', single: false, showOwnership: true }],
  3: [{ type: 'founder', label: 'Cổ đông sáng lập', single: false, showOwnership: true }],
};

const PersonTable = ({ persons, companyType, positions, provinces, wardOptions, loadWards, onChange, companyId, onFolderCreated, customer }) => {
  const list = persons || [];
  const nonRepGroups = NON_REP_GROUPS[companyType] || [];
  const nonRepPersons = list.filter(p => p.person_type !== 'representative');
  const repPersons = list.filter(p => p.person_type === 'representative');

  const addPerson = (type) => onChange([...list, { person_type: type }]);
  const updatePerson = (index, updated) => { const next = [...list]; next[index] = updated; onChange(next); };
  const removePerson = (index) => onChange(list.filter((_, i) => i !== index));

  const repTypeLabel = nonRepGroups[0]?.label || 'Thành viên';

  const commonProps = { positions, companyType, provinces, wardOptions, loadWards, onChange: updatePerson, onRemove: removePerson, companyId, onFolderCreated, customer };

  return (
    <div className="space-y-6">
      {/* Non-rep groups: owner / member / founder */}
      {nonRepGroups.map(({ type, label, single, showOwnership }) => {
        const group = list.map((p, i) => ({ p, i })).filter(({ p }) => p.person_type === type);
        return (
          <div key={type}>
            <div className="mb-3">
              <span className="text-[10px] font-black text-weak uppercase tracking-widest">{label}</span>
            </div>
            <div className="space-y-2">
              {group.map(({ p, i }, groupIdx) => (
                <PersonForm key={i} person={p} index={i} {...commonProps}
                  showOwnership={showOwnership} showPosition={false}
                  groupIndex={single ? undefined : groupIdx}
                  personTypeLabel={PERSON_TYPE_LABEL[type] || label}
                  nonRepPersons={null}
                />
              ))}
              {group.length === 0 && <div className="py-4 text-center text-[10px] text-weak italic border border-dashed border-base rounded-xl">Chưa có {label.toLowerCase()}</div>}
            </div>
            {(!single || group.length === 0) && (
              <button onClick={() => addPerson(type)} className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-indigo-300 text-indigo-600 rounded-xl font-black text-[10px] hover:bg-indigo-50 transition">
                <Plus size={10} /> Thêm {label}
              </button>
            )}
          </div>
        );
      })}

      {/* Representatives — separate section */}
      <div className="pt-4 border-t-2 border-dashed border-indigo-100 dark:border-indigo-900/30">
        <div className="mb-3 flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
            <Users size={11} className="text-indigo-600" />
          </div>
          <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">Người đại diện pháp luật</span>
        </div>
        <div className="space-y-2">
          {repPersons.map((p, groupIdx) => {
            const i = list.indexOf(p);
            return (
              <PersonForm key={i} person={p} index={i} {...commonProps}
                showOwnership={false} showPosition={true}
                groupIndex={groupIdx}
                personTypeLabel={repTypeLabel}
                nonRepPersons={nonRepPersons}
              />
            );
          })}
          {repPersons.length === 0 && <div className="py-4 text-center text-[10px] text-weak italic border border-dashed border-indigo-200 rounded-xl">Chưa có người đại diện pháp luật</div>}
        </div>
        <button onClick={() => addPerson('representative')} className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-indigo-300 text-indigo-600 rounded-xl font-black text-[10px] hover:bg-indigo-50 transition">
          <Plus size={10} /> Thêm người đại diện
        </button>
      </div>
    </div>
  );
};

export default PersonTable;
