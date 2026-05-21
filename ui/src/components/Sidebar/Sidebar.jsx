import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Users, Settings, ChevronLeft, ChevronRight,
  FileText, Home, LayoutGrid, LogOut, Sun, Moon, ShieldCheck, Building2,
  KeyRound, User, X, Minimize2, CreditCard, Globe, Users2, Download,
  AlertCircle, Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useUI } from '../../context/UIContext';
import axios from 'axios';

/* ── Avatar color palette ── */
const AVATAR_COLORS = [
  'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  'bg-blue-100   text-blue-700   dark:bg-blue-900/50   dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  'bg-amber-100  text-amber-700  dark:bg-amber-900/50  dark:text-amber-300',
  'bg-rose-100   text-rose-700   dark:bg-rose-900/50   dark:text-rose-300',
];

const avatarColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

/* ── Nav Item ─────────────────────────────────────────────────────────────── */
const SidebarItem = ({ icon: Icon, label, itemKey, isCollapsed, badge }) => (
  <NavLink
    to={`/${itemKey}`}
    className={({ isActive }) =>
      `relative flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all group ${
        isActive
          ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
          : 'text-body hover:text-strong hover:bg-page dark:hover:bg-white/5'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <div className={`shrink-0 transition-all duration-200 ${isActive ? 'scale-[1.08]' : 'group-hover:scale-[1.05]'}`}>
          <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
          {badge && !isCollapsed && (
            <span className="absolute top-2 left-5 w-1.5 h-1.5 bg-amber-500 rounded-full ring-2 ring-surface" />
          )}
          {badge && isCollapsed && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full ring-2 ring-surface" />
          )}
        </div>

        {!isCollapsed && (
          <span className={`text-[12.5px] flex-1 transition-all ${isActive ? 'font-medium' : ''}`}>
            {label}
          </span>
        )}

        {!isCollapsed && badge && (
          <span className="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold leading-none">
            !
          </span>
        )}

        {/* Tooltip when collapsed */}
        {isCollapsed && (
          <div className="absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-[11px] rounded-lg
                          opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap
                          transition-all duration-150 translate-x-1 group-hover:translate-x-0 shadow-lg">
            {label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800 dark:border-r-slate-700" />
          </div>
        )}
      </>
    )}
  </NavLink>
);

/* ── Profile Modal ────────────────────────────────────────────────────────── */
const ProfileModal = ({ user, onClose }) => {
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

  const clearFeedback = () => { setMsg(''); setErr(''); };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    clearFeedback();
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
    clearFeedback();
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

  const inputCls = 'input-base py-2';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base">
          <div>
            <div className="text-sm font-medium text-strong">Tài khoản</div>
            <div className="text-[11px] text-weak mt-0.5">{user?.email}</div>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={15} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-base bg-page/50">
          {[{ key: 'info', icon: User, label: 'Thông tin' }, { key: 'password', icon: KeyRound, label: 'Mật khẩu' }].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); clearFeedback(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs transition-all ${
                tab === t.key
                  ? 'text-orange-600 border-b-2 border-orange-600 font-medium bg-surface'
                  : 'text-weak hover:text-body'
              }`}>
              <t.icon size={12} />{t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {msg && <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2.5 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"/>  {msg}</div>}
          {err && <div className="mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5 flex items-center gap-2"><AlertCircle size={12} className="shrink-0"/> {err}</div>}

          {tab === 'info' && (
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-3">
              <div>
                <label className="section-label">Email</label>
                <input disabled value={user?.email || ''} className={`${inputCls} opacity-60 cursor-not-allowed`} />
              </div>
              <div>
                <label className="section-label">Họ tên</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} className={inputCls} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-1">
                {loading ? <span className="spinner w-3.5 h-3.5" /> : 'Lưu thay đổi'}
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
                  <label className="section-label">{f.label}</label>
                  <input type="password" value={f.val} onChange={e => f.set(e.target.value)} required className={inputCls} />
                </div>
              ))}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-1">
                {loading ? <span className="spinner w-3.5 h-3.5" /> : 'Đổi mật khẩu'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Sidebar ──────────────────────────────────────────────────────────────── */
const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(
    () => localStorage.getItem('ui_sidebar_collapsed') === 'true'
  );
  const [showProfile, setShowProfile] = React.useState(false);
  const { user, can, logout, isSuperAdmin, isTenantAdmin } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const { ultraCollapsed, setUltraCollapsed } = useUI();

  const handleCollapse = (val) => {
    setIsCollapsed(val);
    localStorage.setItem('ui_sidebar_collapsed', val ? 'true' : 'false');
    if (!val) setUltraCollapsed(false);
  };

  const handleUltraCollapse = () => {
    handleCollapse(true);
    setUltraCollapsed(true);
    localStorage.setItem('editorRightHidden', '1');
    window.dispatchEvent(new CustomEvent('sidebarUltraCollapse'));
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
        { icon: Home,        label: 'Tổng quan',      key: 'home',        always: true },
        { icon: Globe,       label: 'Quản lý Tenant', key: 'super-admin', always: true },
        { icon: Zap,         label: 'Tích hợp',       key: 'integration', always: true },
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
        ...(isTenantAdmin ? [
          { icon: Building2,  label: 'Cài đặt công ty', key: 'settings',     always: true },
          { icon: CreditCard, label: 'Gói đăng ký',     key: 'subscription', always: true, badge: subWarning },
        ] : []),
      ].filter(item => item.always || can(item.module));

  const displayName = user?.display_name || user?.displayname || user?.full_name || user?.name || user?.email || '';
  const initials = displayName
    ? displayName.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()
    : (user ? 'U' : '??');
  const avatarCls = avatarColor(displayName);

  return (
    <>
      <aside className={`
        bg-surface border-r border-base flex flex-col transition-all duration-300 ease-in-out
        relative z-30 h-full shrink-0
        ${isCollapsed ? 'w-[52px]' : 'w-[204px]'}
      `}>

        {/* ── Brand ─────────────────────────────────────────────────────── */}
        <div className={`flex items-center border-b border-base/60 shrink-0 ${isCollapsed ? 'justify-center px-2 py-4' : 'px-4 py-4'}`}>
          {isCollapsed ? (
            <span className="font-black text-orange-600 text-sm select-none tracking-tight">M&amp;L</span>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-orange-600 flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-black">M</span>
              </div>
              <span className="font-black text-strong tracking-tight text-[13px] select-none">MOSS<span className="text-orange-600">&amp;</span>LEGAL</span>
            </div>
          )}
        </div>

        {/* ── Nav ───────────────────────────────────────────────────────── */}
        <nav className={`flex-1 py-3 space-y-0.5 overflow-y-auto ${isCollapsed ? 'px-1.5' : 'px-2'}`}>
          {menuItems.map(item => (
            <SidebarItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              itemKey={item.key}
              isCollapsed={isCollapsed}
              badge={item.badge}
            />
          ))}
        </nav>

        {/* ── Sub expiry warning ─────────────────────────────────────────── */}
        {subWarning && !isCollapsed && (
          <div className="mx-2 mb-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-[11px] font-medium">
              <AlertCircle size={12} />
              Còn {daysLeft} ngày hết hạn
            </div>
          </div>
        )}

        {/* ── User row ──────────────────────────────────────────────────── */}
        {user && (
          <div className={`shrink-0 border-t border-base px-2 py-2.5 ${isCollapsed ? 'flex flex-col items-center gap-1.5' : 'flex items-center gap-1.5'}`}>
            <button
              onClick={() => setShowProfile(true)}
              title={isCollapsed ? displayName : undefined}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 transition-all hover:opacity-80 ${avatarCls}`}
            >
              {initials}
            </button>

            {!isCollapsed && (
              <button onClick={() => setShowProfile(true)} className="flex-1 min-w-0 text-left hover:opacity-70 transition-opacity py-0.5">
                <div className="text-[12px] text-strong font-medium truncate leading-tight">{displayName}</div>
                <div className="text-[10px] text-weak truncate leading-tight mt-0.5">
                  {user.roles?.join(', ') || 'Chưa có vai trò'}
                </div>
              </button>
            )}

            {/* Theme + Logout */}
            <div className={`flex items-center gap-0.5 ${isCollapsed ? 'flex-col' : ''}`}>
              <button onClick={toggleTheme} title={dark ? 'Chế độ sáng' : 'Chế độ tối'}
                className="btn-icon text-weak hover:text-amber-500">
                {dark ? <Sun size={13} /> : <Moon size={13} />}
              </button>
              <button onClick={handleLogout} title="Đăng xuất"
                className="btn-icon text-weak hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                <LogOut size={13} />
              </button>
            </div>
          </div>
        )}

        {/* ── Collapse controls ─────────────────────────────────────────── */}
        <div className={`shrink-0 border-t border-base/60 px-2 py-2 flex flex-col gap-1`}>
          <button
            onClick={() => handleCollapse(!isCollapsed)}
            className={`w-full h-7 flex items-center justify-center gap-1.5 rounded-xl text-[11px] text-weak
                        hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all`}
          >
            {isCollapsed
              ? <ChevronRight size={14} />
              : <><ChevronLeft size={14} /><span>Thu gọn</span></>
            }
          </button>

          {!isCollapsed && (
            <button onClick={handleUltraCollapse}
              className="w-full h-6 flex items-center justify-center gap-1 rounded-xl text-[10px] text-weak
                         hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all">
              <Minimize2 size={11} />
              <span>Siêu thu gọn</span>
            </button>
          )}

          {isCollapsed && ultraCollapsed && (
            <button onClick={() => { handleCollapse(false); setUltraCollapsed(false); }}
              className="w-full h-6 flex items-center justify-center text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all">
              <Minimize2 size={11} />
            </button>
          )}
        </div>
      </aside>

      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
    </>
  );
};

export default Sidebar;
