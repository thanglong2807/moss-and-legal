import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AUTH_BASE = 'https://api.cenvi.vn/api/v1/admin/auth';
const TOKEN_KEY = 'cenvi_access_token';
const REFRESH_KEY = 'cenvi_refresh_token';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const saveTokens = (access, refresh) => {
    localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    setToken(access);
  };

  const clearTokens = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.roles?.includes('ADMIN') ?? false;

  // ── Permission config ────────────────────────────────────────────────────────
  // module → action → roles[]
  //   []           = mọi role đã đăng nhập đều có quyền
  //   ['ADMIN']    = chỉ ADMIN
  //   không khai báo module/action → mặc định có quyền
  const PERMISSIONS = {
    config: {
      view: ['ADMIN'],
    },
    fields: {
      view: [],                      // mọi role xem được
      create: ['ADMIN'],
      update: ['ADMIN'],
      delete: ['ADMIN'],
    },
  };

  // can('fields')           → kiểm tra view (mặc định)
  // can('fields', 'delete') → kiểm tra action cụ thể
  const can = useCallback((module, action = 'view') => {
    if (!user) return false;
    const mod = PERMISSIONS[module];
    if (!mod) return true;                   // module ko khai báo → có quyền hết
    const allowed = mod[action];
    if (allowed === undefined) return true;  // action ko khai báo → có quyền hết
    if (allowed.length === 0) return true;   // [] → mọi role đã đăng nhập
    return user.roles?.some(r => allowed.includes(r)) ?? false;
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMe = useCallback(async (accessToken) => {
    try {
      const res = await axios.get(`${AUTH_BASE}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      // API trả về { success, data: { id, displayname, roles, ... } }
      setUser(res.data.data ?? res.data.user ?? res.data);
      return true;
    } catch {
      return false;
    }
  }, []);

  const refreshToken = useCallback(async () => {
    const rt = localStorage.getItem(REFRESH_KEY);
    if (!rt) return false;
    try {
      const res = await axios.get(`${AUTH_BASE}/refresh-token`, {
        headers: { Authorization: `Bearer ${rt}` },
      });
      const { access_token, refresh_token } = res.data;
      saveTokens(access_token, refresh_token);
      await fetchMe(access_token);
      return access_token;
    } catch {
      clearTokens();
      return false;
    }
  }, [fetchMe]);

  const login = async (email, password) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    params.append('grant_type', '');
    params.append('scope', '');
    params.append('client_id', '');
    params.append('client_secret', '');

    const res = await axios.post(`${AUTH_BASE}/login`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, refresh_token, user: userData } = res.data;
    saveTokens(access_token, refresh_token);
    // Use user data from login response directly; fall back to /me if missing
    if (userData) {
      setUser(userData);
    } else {
      await fetchMe(access_token);
    }
  };

  const logout = async () => {
    try {
      const t = localStorage.getItem(TOKEN_KEY);
      if (t) {
        await axios.post(`${AUTH_BASE}/logout`, {}, {
          headers: { Authorization: `Bearer ${t}` },
        });
      }
    } catch {
      // ignore
    } finally {
      clearTokens();
    }
  };

  // On mount: verify existing token
  useEffect(() => {
    const init = async () => {
      const t = localStorage.getItem(TOKEN_KEY);
      if (!t) { setLoading(false); return; }
      const ok = await fetchMe(t);
      if (!ok) await refreshToken();
      setLoading(false);
    };
    init();
  }, [fetchMe, refreshToken]);

  return (
    <AuthContext.Provider value={{ user, token, loading, isAdmin, can, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};
