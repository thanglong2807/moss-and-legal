import { useState } from 'react';
import { Users, Shield } from 'lucide-react';
import UserList from '../components/Admin/UserList';
import RoleEditor from '../components/Admin/RoleEditor';

const TABS = [
  { key: 'users', label: 'Nhân viên', icon: Users },
  { key: 'roles', label: 'Vai trò & Phân quyền', icon: Shield },
];

const AdminPage = () => {
  const [tab, setTab] = useState('users');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-page">
      {/* Header */}
      <div className="bg-surface border-b border-base px-8 py-5 shrink-0">
        <h1 className="text-xl font-black text-strong uppercase tracking-tight italic mb-4">Quản trị hệ thống</h1>
        <div className="flex gap-1">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  tab === t.key
                    ? 'bg-orange-600 text-white'
                    : 'text-body hover:bg-input'
                }`}>
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {tab === 'users' && <UserList />}
        {tab === 'roles' && <RoleEditor />}
      </div>
    </div>
  );
};

export default AdminPage;
