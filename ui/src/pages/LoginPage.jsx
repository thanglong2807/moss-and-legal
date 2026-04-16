import React, { useState } from 'react';
import { BarChart3, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Đăng nhập thất bại';
      setError(typeof msg === 'string' ? msg : 'Sai email hoặc mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-12 h-12 bg-orange-600 rounded-[16px] flex items-center justify-center text-white shadow-xl shadow-orange-200 transform rotate-3">
            <BarChart3 size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter text-strong">CENVI</h1>
            <div className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] leading-none">LAUNCH</div>
          </div>
        </div>

        <div className="bg-surface rounded-3xl shadow-sm border border-faint p-8">
          <h2 className="text-lg font-black uppercase tracking-widest text-strong mb-1">Đăng nhập</h2>
          <p className="text-xs text-weak font-medium mb-8">Nhập tài khoản để tiếp tục</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-weak mb-1.5 block px-1">Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@cenvi.vn"
                required
                className="w-full px-4 py-3 bg-page border border-faint rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-weak mb-1.5 block px-1">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-12 bg-page border border-faint rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-weak hover:text-body transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 shadow-xl shadow-orange-100 font-black text-sm transition-all uppercase tracking-tight disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Đăng nhập
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
