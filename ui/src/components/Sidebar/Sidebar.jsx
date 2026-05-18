import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Users, Settings, ChevronLeft, ChevronRight,
  FileText, Home, LayoutGrid, LogOut, Sun, Moon, ShieldCheck, Building2,
  KeyRound, User, X, Minimize2, CreditCard, Globe, Users2, Download,
} from 'lucide-react';
import logoImage from '../../assets/logo.webp';
import logoMini from '../../assets/logo_mini.png';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useUI } from '../../context/UIContext';
import axios from 'axios';

const SidebarItem = ({ icon: Icon, label, itemKey, isCollapsed, badge }) => (
  <NavLink
    to={`/${itemKey}`}
    className={({ isActive }) =>
      `relative flex items-center gap-3 w-full px-3 py-2.5 transition-all group overflow-hidden ${
        isActive
          ? 'text-orange-600'
          : 'text-body hover:text-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-900/20'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <div className="absolute left-0 top-2 bottom-2 w-1 bg-orange-600 rounded-r-full shadow-[0_0_10px_rgba(234,88,12,0.4)] animate-in slide-in-from-left duration-300" />
        )}
        <div className={`transition-all duration-300 shrink-0 relative ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
          <Icon size={18} className={isActive ? 'drop-shadow-[0_0_6px_rgba(234,88,12,0.3)]' : ''} />
          {badge && <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />}
        </div>
        {!isCollapsed && (
          <span className={`text-xs tracking-wide transition-all duration-300 flex-1 ${isActive ? 'translate-x-0.5 text-orange-600' : 'group-hover:translate-x-0.5'}`}>
            {label}
          </span>
        )}
        {!isCollapsed && badge && (
          <span className="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">!</span>
        )}
        {isCollapsed && (
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] tracking-wide rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
            {label}
          </div>
        )}
      </>
    )}
  </NavLink>
);

const ProfileModal = ({ user, onClose }) => {
  const { login } = useAuth();
  const [tab, setTab] = React.useState('info');
  const [displayName, setDisplayName] = React.useState(user?.display_name || user?.displayname || '');
  const [currentPw, setCurrentPw] = React.useState('');
  const [newPw, setNewPw] = React.useState('');
  const [confirmPw, setConfirmPw] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const token = localStorage.getItem('mosslegal_access_token');
  const headers = { Authorization: `Bearer ${token}` };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('display_name', displayName);
      await axios.put('/api/v1/auth/me/profile', fd, { headers });
      setMsg('Cập nhật thành công!');
    } catch (e) {
      setErr(e.response?.data?.detail || 'Lỗi cập nhật');
    } finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    if (newPw !== confirmPw) { setErr('Mật khẩu mới không khớp'); return; }
    if (newPw.length < 6) { setErr('Mật khẩu tối thiểu 6 ký tự'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('current_password', currentPw);
      fd.append('new_password', newPw);
      await axios.put('/api/v1/auth/me/password', fd, { headers });
      setMsg('Đổi mật khẩu thành công!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e) {
      setErr(e.response?.data?.detail || 'Lỗi đổi mật khẩu');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-base">
          <span className="text-sm text-strong">Tài khoản</span>
          <button onClick={onClose} className="text-weak hover:text-strong transition-colors"><X size={16} /></button>
        </div>

        <div className="flex border-b border-base">
          {[
            { key: 'info', icon: User, label: 'Thông tin' },
            { key: 'password', icon: KeyRound, label: 'Mật khẩu' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setMsg(''); setErr(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs transition-colors ${tab === t.key ? 'text-orange-600 border-b-2 border-orange-600' : 'text-weak hover:text-body'}`}>
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {msg && <div className="mb-3 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">{msg}</div>}
          {err && <div className="mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{err}</div>}

          {tab === 'info' && (
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Email</label>
                <input disabled value={user?.email || ''} className="w-full bg-input text-weak text-xs rounded-lg px-3 py-2 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">Họ tên</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500" />
              </div>
              <button type="submit" disabled={loading}
                className="mt-1 w-full py-2 bg-orange-600 text-white text-xs rounded-xl hover:bg-orange-700 transition disabled:opacity-50">
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
              {[
                { label: 'Mật khẩu hiện tại', val: currentPw, set: setCurrentPw },
                { label: 'Mật khẩu mới', val: newPw, set: setNewPw },
                { label: 'Xác nhận mật khẩu mới', val: confirmPw, set: setConfirmPw },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-[10px] text-weak uppercase tracking-wider block mb-1">{f.label}</label>
                  <input type="password" value={f.val} onChange={e => f.set(e.target.value)} required
                    className="w-full bg-input text-strong text-xs rounded-lg px-3 py-2 border border-base focus:outline-none focus:border-orange-500" />
                </div>
              ))}
              <button type="submit" disabled={loading}
                className="mt-1 w-full py-2 bg-orange-600 text-white text-xs rounded-xl hover:bg-orange-700 transition disabled:opacity-50">
                {loading ? 'Đang đổi...' : 'Đổi mật khẩu'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(
    () => localStorage.getItem('ui_ultra_collapsed') === 'true'
  );
  const [showProfile, setShowProfile] = React.useState(false);
  const { user, can, logout, isSuperAdmin, isTenantAdmin } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const { ultraCollapsed, setUltraCollapsed } = useUI();

  const handleUltraCollapse = () => {
    setIsCollapsed(true);
    setUltraCollapsed(true);
    localStorage.setItem('editorRightHidden', '1');
    window.dispatchEvent(new CustomEvent('sidebarUltraCollapse'));
  };

  const handleExpand = () => {
    setIsCollapsed(false);
    setUltraCollapsed(false);
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất không?')) logout();
  };

  const daysLeft = user?.subscription?.end_date
    ? Math.ceil((new Date(user.subscription.end_date) - new Date()) / 86400000)
    : null;
  const subWarning = !isSuperAdmin && daysLeft !== null && daysLeft <= 14;

  const menuItems = isSuperAdmin
    ? [
        { icon: Globe,       label: 'Quản lý Tenant', key: 'super-admin', always: true },
        { icon: Home,        label: 'Tổng quan',      key: 'home',        always: true },
      ]
    : [
        { icon: Home,        label: 'Tổng quan',      key: 'home',        always: true },
        { icon: Users,       label: 'Khách hàng',     key: 'customers',   module: 'customers' },
        { icon: Users2,      label: 'Nhân viên',      key: 'staff',       module: 'users' },
        { icon: Building2,   label: 'Thành lập DN',   key: 'company',     module: 'company' },
        { icon: FileText,    label: 'Hộ kinh doanh',  key: 'hkd',         module: 'hkd' },
        { icon: LayoutGrid,  label: 'Lĩnh vực',       key: 'fields',      module: 'fields' },
        { icon: Download,    label: 'Xuất dữ liệu',   key: 'export-data', always: true },
        { icon: Settings,    label: 'Cấu hình',        key: 'config',      module: 'config' },
        { icon: ShieldCheck, label: 'Quản trị',       key: 'admin',       module: 'users' },
        ...(isTenantAdmin ? [{ icon: CreditCard, label: 'Gói đăng ký', key: 'subscription', always: true, badge: subWarning }] : []),
      ].filter(item => item.always || can(item.module));

  const displayName = user?.display_name || user?.displayname || user?.full_name || user?.name || user?.email || '';
  const initials = displayName
    ? displayName.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()
    : (user ? 'U' : '??');

  return (
    <>
      <aside className={`bg-surface border-r border-base flex flex-col transition-all duration-500 ease-in-out relative z-30 h-full ${isCollapsed ? 'w-14' : 'w-[200px]'}`}>

        {/* Logo */}
        <div className={`px-4 py-5 mb-2 transition-all duration-500 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <span className="font-black text-orange-600 tracking-tight text-sm uppercase select-none">MOSS&amp;LEGAL</span>
          )}
          {isCollapsed && (
            <span className="font-black text-orange-600 text-xs select-none">M&amp;L</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5">
          {menuItems.map(item => (
            <SidebarItem key={item.key} icon={item.icon} label={item.label} itemKey={item.key} isCollapsed={isCollapsed} badge={item.badge} />
          ))}
        </nav>

        {/* User row */}
        {user && (
          <div className={`px-2 py-3 border-t border-base ${isCollapsed ? 'flex flex-col items-center gap-1.5' : 'flex items-center gap-2'}`}>
            <button
              onClick={() => setShowProfile(true)}
              title="Tài khoản"
              className="w-8 h-8 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center text-orange-600 text-xs shrink-0 hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-colors"
            >
              {initials}
            </button>
            {!isCollapsed && (
              <button onClick={() => setShowProfile(true)} className="flex-1 min-w-0 text-left hover:opacity-70 transition-opacity">
                <div className="text-xs text-strong truncate">{displayName}</div>
                <div className="text-[10px] text-weak uppercase tracking-wide truncate">
                  {user.roles?.join(', ') || '—'}
                </div>
              </button>
            )}
            <button onClick={toggleTheme} title={dark ? 'Chế độ sáng' : 'Chế độ tối'}
              className="shrink-0 p-1.5 text-weak hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-all">
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button onClick={handleLogout} title="Đăng xuất"
              className="shrink-0 p-1.5 text-weak hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
              <LogOut size={14} />
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <div className="px-2 pb-3 border-t border-base pt-2 flex flex-col gap-1">
          <button onClick={() => { setIsCollapsed(!isCollapsed); if (isCollapsed) setUltraCollapsed(false); }}
            className="w-full h-8 flex items-center justify-center text-weak hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all group">
            {isCollapsed ? <ChevronRight size={16} /> : (
              <div className="flex items-center gap-2">
                <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-[10px] tracking-wide">Thu gọn</span>
              </div>
            )}
          </button>
          {!isCollapsed && (
            <button onClick={handleUltraCollapse} title="Siêu thu gọn: ẩn danh sách card"
              className="w-full h-7 flex items-center justify-center gap-1.5 text-weak hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all text-[10px]">
              <Minimize2 size={12} />
              <span className="tracking-wide">Siêu thu gọn</span>
            </button>
          )}
          {isCollapsed && ultraCollapsed && (
            <button onClick={handleExpand} title="Mở rộng lại"
              className="w-full h-7 flex items-center justify-center text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all">
              <Minimize2 size={12} />
            </button>
          )}
        </div>
      </aside>

      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
    </>
  );
};

export default Sidebar;
