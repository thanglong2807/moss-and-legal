import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  LayoutGrid,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SidebarItem = ({ icon: Icon, label, itemKey, isCollapsed }) => {
  return (
    <NavLink
      to={`/${itemKey}`}
      className={({ isActive }) => `relative flex items-center gap-4 w-full p-4 transition-all group overflow-hidden ${
        isActive
          ? 'text-orange-600'
          : 'text-slate-600 hover:text-orange-500 hover:bg-orange-50/50'
      }`}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-orange-600 rounded-r-full shadow-[0_0_12px_rgba(234,88,12,0.4)] animate-in slide-in-from-left duration-300" />
          )}
          <div className={`transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
            <Icon size={22} className={isActive ? 'drop-shadow-[0_0_8px_rgba(234,88,12,0.3)]' : ''} />
          </div>
          {!isCollapsed && (
            <span className={`text-sm font-black uppercase tracking-widest transition-all duration-300 ${
              isActive ? 'translate-x-1' : 'group-hover:translate-x-1'
            }`}>
              {label}
            </span>
          )}
          {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
              {label}
            </div>
          )}
        </>
      )}
    </NavLink>
  );
};

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const { user, can, logout } = useAuth();

  const menuItems = [
    { icon: Home, label: 'Tổng quan', key: 'home' },
    { icon: Users, label: 'Khách hàng', key: 'customers' },
    { icon: FileText, label: 'Hồ sơ HKD', key: 'hkd' },
    { icon: LayoutGrid, label: 'Lĩnh vực', key: 'fields' },
    // Config only visible to ADMIN
    ...(can('config') ? [{ icon: Settings, label: 'Cấu hình', key: 'config' }] : []),
  ];

  const displayName = user?.display_name || user?.displayname || user?.full_name || user?.name || user?.email || '';
  const initials = displayName
    ? displayName.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()
    : (user ? 'U' : '??');

  return (
    <aside
      className={`bg-white border-r border-slate-300 flex flex-col transition-all duration-500 ease-in-out relative z-30 h-full ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className={`p-8 mb-4 transition-all duration-500 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-[14px] flex items-center justify-center text-white shadow-xl shadow-orange-100 transform rotate-3 hover:rotate-0 transition-transform cursor-pointer">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-tighter text-slate-800">CENVI</h1>
              <div className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] leading-none">LAUNCH</div>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
            <BarChart3 size={20} />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <SidebarItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            itemKey={item.key}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* User info + logout */}
      {user && (
        <div className={`px-4 py-3 border-t border-slate-200 ${isCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-3'}`}>
          <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-black text-xs flex-shrink-0">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-slate-800 truncate">{user.displayname || user.email}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                {user.roles?.join(', ') || '—'}
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title="Đăng xuất"
            className="flex-shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}

      <div className="p-4 border-t border-slate-200">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full h-12 flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-2xl transition-all group"
        >
          {isCollapsed ? <ChevronRight size={20} /> : (
            <div className="flex items-center gap-3">
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest px-2">Thu gọn</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
