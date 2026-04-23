import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, ChevronRight } from 'lucide-react';
import { adminApi } from '../../services/api';

const MODULES = [
  { key: 'hkd',       label: 'Hồ sơ HKD' },
  { key: 'company',   label: 'Hồ sơ Doanh nghiệp' },
  { key: 'customers', label: 'Khách hàng' },
  { key: 'fields',    label: 'Lĩnh vực / Ngành nghề' },
  { key: 'config',    label: 'Cấu hình hệ thống' },
  { key: 'users',     label: 'Nhân viên & Vai trò' },
];

const ACTIONS = [
  { key: 'can_view',   label: 'Xem' },
  { key: 'can_create', label: 'Thêm' },
  { key: 'can_update', label: 'Sửa' },
  { key: 'can_delete', label: 'Xóa' },
];

const emptyPermissions = () =>
  MODULES.reduce((acc, m) => {
    acc[m.key] = { can_view: false, can_create: false, can_update: false, can_delete: false };
    return acc;
  }, {});

const permissionsFromRole = (role) => {
  const base = emptyPermissions();
  (role.permissions || []).forEach(p => {
    if (base[p.module]) base[p.module] = { can_view: p.can_view, can_create: p.can_create, can_update: p.can_update, can_delete: p.can_delete };
  });
  return base;
};

const buildTree = (roles) => {
  const map = {};
  roles.forEach(r => { map[r.id] = { ...r, children: [] }; });
  const roots = [];
  roles.forEach(r => {
    if (r.parent_id && map[r.parent_id]) map[r.parent_id].children.push(map[r.id]);
    else roots.push(map[r.id]);
  });
  return roots;
};

const RoleItem = ({ node, depth, selectedId, onSelect, onEdit, onDelete }) => {
  const isSelected = selectedId === node.id;
  return (
    <>
      <div
        onClick={() => onSelect(node.id)}
        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-orange-600 text-white' : 'hover:bg-input text-body'}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {depth > 0 && <ChevronRight size={10} className="shrink-0 opacity-50" />}
          <span className="text-xs font-black truncate">{node.name}</span>
          {node.parent_name && depth === 0 && (
            <span className="text-[9px] opacity-60 shrink-0">Lv.{node.level}</span>
          )}
        </div>
        <div className={`flex gap-1 shrink-0 ml-2 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          <button onClick={e => { e.stopPropagation(); onEdit(node); }}
            className="p-1 rounded hover:bg-white/20"><Pencil size={11} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(node); }}
            className="p-1 rounded hover:bg-white/20"><Trash2 size={11} /></button>
        </div>
      </div>
      {node.children.map(child => (
        <RoleItem key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  );
};

const CreateRoleModal = ({ roles, onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const parent = roles.find(r => r.id === parseInt(parentId));
      const level = parent ? parent.level + 1 : 1;
      await adminApi.createRole({ name: name.trim(), level, parent_id: parentId ? parseInt(parentId) : null });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative z-10 bg-surface rounded-3xl shadow-2xl border border-faint w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-base">
          <h2 className="text-sm font-black text-strong uppercase tracking-widest">Thêm vai trò</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-input text-weak"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1.5 block">Tên role *</label>
            <input autoFocus className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none focus:border-orange-400"
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
              placeholder="VD: Trưởng phòng" />
          </div>
          <div>
            <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1.5 block">Role cấp cao hơn</label>
            <select className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none focus:border-orange-400"
              value={parentId} onChange={e => setParentId(e.target.value)}>
              <option value="">— Cấp cao nhất —</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {'  '.repeat(r.level - 1)}{r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-base flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-body hover:bg-input rounded-xl transition-colors">Huỷ</button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="px-5 py-2 text-sm font-black text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RoleEditor = () => {
  const [roles, setRoles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [perms, setPerms] = useState(emptyPermissions());
  const [permsDirty, setPermsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editRoleValue, setEditRoleValue] = useState('');
  const [editParentId, setEditParentId] = useState('');

  const load = async () => {
    const res = await adminApi.getRoles();
    setRoles(res.data);
    if (!selectedId && res.data.length > 0) setSelectedId(res.data[0].id);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const role = roles.find(r => r.id === selectedId);
    if (role) { setPerms(permissionsFromRole(role)); setPermsDirty(false); }
  }, [selectedId, roles]);

  const togglePerm = (module, action) => {
    setPerms(prev => ({ ...prev, [module]: { ...prev[module], [action]: !prev[module][action] } }));
    setPermsDirty(true);
  };

  const handleSavePerms = async () => {
    setSaving(true);
    try {
      const payload = MODULES.map(m => ({ module: m.key, ...perms[m.key] }));
      await adminApi.setPermissions(selectedId, payload);
      setPermsDirty(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role.id);
    setEditRoleValue(role.name);
    setEditParentId(role.parent_id ? String(role.parent_id) : '');
  };

  const handleRenameRole = async () => {
    if (!editRoleValue.trim()) return;
    const parent = roles.find(r => r.id === parseInt(editParentId));
    const level = parent ? parent.level + 1 : 1;
    await adminApi.updateRole(editingRole, { name: editRoleValue.trim(), level, parent_id: editParentId ? parseInt(editParentId) : null });
    setEditingRole(null);
    await load();
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Xoá vai trò "${role.name}"? Nhân viên thuộc vai trò này sẽ mất vai trò.`)) return;
    await adminApi.deleteRole(role.id);
    setSelectedId(null);
    await load();
  };

  const tree = buildTree(roles);
  const selectedRole = roles.find(r => r.id === selectedId);

  return (
    <div className="grid grid-cols-[260px_1fr] gap-6 min-h-[400px]">
      {/* Left: role tree */}
      <div className="bg-page/60 rounded-2xl border border-base p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black text-body uppercase tracking-widest">Danh sách vai trò</span>
          <button onClick={() => setShowCreateModal(true)} className="p-1 rounded-lg hover:bg-input text-weak hover:text-orange-600 transition-colors">
            <Plus size={14} />
          </button>
        </div>

        {tree.map(node => (
          <RoleItem key={node.id} node={node} depth={0} selectedId={selectedId}
            onSelect={setSelectedId} onEdit={handleEditRole} onDelete={handleDeleteRole} />
        ))}

        {roles.length === 0 && (
          <div className="text-center py-6 text-weak text-xs">Chưa có vai trò nào</div>
        )}
      </div>

      {/* Rename inline modal */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditingRole(null)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative z-10 bg-surface rounded-3xl shadow-2xl border border-faint w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-base">
              <h2 className="text-sm font-black text-strong uppercase tracking-widest">Sửa vai trò</h2>
              <button onClick={() => setEditingRole(null)} className="p-1.5 rounded-xl hover:bg-input text-weak"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1.5 block">Tên role</label>
                <input autoFocus className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none focus:border-orange-400"
                  value={editRoleValue} onChange={e => setEditRoleValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameRole(); if (e.key === 'Escape') setEditingRole(null); }} />
              </div>
              <div>
                <label className="text-[10px] font-black text-body uppercase tracking-widest mb-1.5 block">Role cấp cao hơn</label>
                <select className="w-full px-3 py-2.5 bg-page border border-base rounded-xl text-sm font-bold outline-none focus:border-orange-400"
                  value={editParentId} onChange={e => setEditParentId(e.target.value)}>
                  <option value="">— Cấp cao nhất —</option>
                  {roles.filter(r => r.id !== editingRole).map(r => (
                    <option key={r.id} value={r.id}>{'  '.repeat(r.level - 1)}{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-base flex justify-end gap-3">
              <button onClick={() => setEditingRole(null)} className="px-5 py-2 text-sm font-bold text-body hover:bg-input rounded-xl transition-colors">Huỷ</button>
              <button onClick={handleRenameRole}
                className="px-5 py-2 text-sm font-black text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-colors">
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right: permission matrix */}
      <div>
        {selectedRole ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black text-strong">
                Phân quyền — <span className="text-orange-600">{selectedRole.name}</span>
                {selectedRole.parent_name && (
                  <span className="ml-2 text-xs font-bold text-weak">↑ {selectedRole.parent_name}</span>
                )}
              </h4>
              <button onClick={handleSavePerms} disabled={!permsDirty || saving}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-xs font-black rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-40">
                <Save size={13} /> {saving ? 'Đang lưu...' : 'Lưu quyền'}
              </button>
            </div>

            <div className="rounded-2xl border border-base overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-page border-b border-base">
                    <th className="px-5 py-3 text-left text-[10px] font-black text-body uppercase tracking-widest w-1/3">Module</th>
                    {ACTIONS.map(a => (
                      <th key={a.key} className="px-4 py-3 text-center text-[10px] font-black text-body uppercase tracking-widest">{a.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod, idx) => (
                    <tr key={mod.key} className={`border-b border-faint last:border-none ${idx % 2 === 0 ? '' : 'bg-page/30'}`}>
                      <td className="px-5 py-3.5 text-sm font-bold text-strong">{mod.label}</td>
                      {ACTIONS.map(action => (
                        <td key={action.key} className="px-4 py-3.5 text-center">
                          <button onClick={() => togglePerm(mod.key, action.key)}
                            className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center mx-auto
                              ${perms[mod.key][action.key]
                                ? 'bg-orange-600 border-orange-600'
                                : 'border-base hover:border-orange-400 bg-surface'}`}>
                            {perms[mod.key][action.key] && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {permsDirty && (
              <p className="text-[10px] font-bold text-orange-500 mt-2 px-1">● Có thay đổi chưa lưu</p>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-weak text-sm">
            Chọn một vai trò để phân quyền
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateRoleModal roles={roles} onClose={() => setShowCreateModal(false)} onSaved={load} />
      )}
    </div>
  );
};

export default RoleEditor;
