import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Key, HardDrive, CreditCard, Smartphone,
  CheckCircle2, XCircle, Save, RefreshCw, Eye, EyeOff,
  Send, AlertTriangle, Info, Zap,
} from 'lucide-react';
import axios from 'axios';

const API = '/api/v1/super-admin';
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('mosslegal_access_token')}`,
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const StatusDot = ({ ok }) => ok
  ? <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full"><CheckCircle2 size={10} /> Đã cấu hình</span>
  : <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full"><XCircle size={10} /> Chưa cấu hình</span>;

const Field = ({ label, name, value, onChange, type = 'text', placeholder = '', hint = '' }) => {
  const [show, setShow] = useState(false);
  const isSecret = type === 'password';
  return (
    <div>
      <label className="section-label">{label}</label>
      <div className="relative">
        <input
          type={isSecret && !show ? 'password' : 'text'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="input-base text-xs py-2.5 pr-9"
          autoComplete="off"
        />
        {isSecret && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-weak hover:text-body transition">
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
      {hint && <div className="text-[10px] text-weak mt-1">{hint}</div>}
    </div>
  );
};

// ── Section card ──────────────────────────────────────────────────────────────
const Section = ({ icon: Icon, title, color, configured, children, onSave, saving, saved, error }) => {
  const colors = {
    blue:    'bg-blue-50    text-blue-600    dark:bg-blue-900/20',
    orange:  'bg-orange-50  text-orange-600  dark:bg-orange-900/20',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20',
    purple:  'bg-purple-50  text-purple-600  dark:bg-purple-900/20',
    rose:    'bg-rose-50    text-rose-600    dark:bg-rose-900/20',
  };
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-base">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
            <Icon size={17} />
          </div>
          <div>
            <div className="text-sm font-black text-strong">{title}</div>
          </div>
        </div>
        <StatusDot ok={configured} />
      </div>

      {/* Body */}
      <div className="p-5 space-y-3">
        {children}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5 border border-red-200 dark:border-red-800">
            <AlertTriangle size={13} className="shrink-0" /> {error}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2.5">
            <CheckCircle2 size={13} className="shrink-0" /> Đã lưu thành công!
          </div>
        )}

        <button onClick={onSave} disabled={saving}
          className="btn-primary w-full justify-center py-2.5 mt-1 shadow-sm">
          {saving ? <><span className="spinner w-3.5 h-3.5" /> Đang lưu...</> : <><Save size={13} /> Lưu cấu hình</>}
        </button>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const IntegrationPage = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Per-section form state
  const [smtp, setSmtp] = useState({ smtp_host: '', smtp_port: '587', smtp_user: '', smtp_password: '', smtp_from: '', smtp_tls: 'true' });
  const [gemini, setGemini] = useState({ gemini_api_key: '', gemini_model: '' });
  const [drive, setDrive] = useState({ google_token_base64: '', google_drive_hkd: '', google_drive_tldn: '' });
  const [vnpay, setVnpay] = useState({ vnpay_tmn_code: '', vnpay_hash_secret: '', vnpay_url: '', vnpay_return_url: '' });
  const [momo, setMomo] = useState({ momo_partner_code: '', momo_access_key: '', momo_secret_key: '', momo_endpoint: '', momo_return_url: '', momo_notify_url: '' });

  // Per-section saving/saved/error state
  const mkStatus = () => ({ saving: false, saved: false, error: '' });
  const [smtpS, setSmtpS] = useState(mkStatus());
  const [geminiS, setGeminiS] = useState(mkStatus());
  const [driveS, setDriveS] = useState(mkStatus());
  const [vnpayS, setVnpayS] = useState(mkStatus());
  const [momoS, setMomoS] = useState(mkStatus());

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/system/config`, { headers: authHeaders() });
      const c = r.data;
      setConfig(c);
      setSmtp({ smtp_host: c.smtp?.host || '', smtp_port: String(c.smtp?.port || 587), smtp_user: c.smtp?.user || '', smtp_password: '', smtp_from: c.smtp?.from || '', smtp_tls: String(c.smtp?.tls ?? true) });
      setGemini({ gemini_api_key: '', gemini_model: c.gemini?.model || '' });
      setDrive({ google_token_base64: '', google_drive_hkd: c.google_drive?.drive_hkd || '', google_drive_tldn: c.google_drive?.drive_tldn || '' });
      setVnpay({ vnpay_tmn_code: '', vnpay_hash_secret: '', vnpay_url: c.vnpay?.url || '', vnpay_return_url: c.vnpay?.return_url || '' });
      setMomo({ momo_partner_code: '', momo_access_key: '', momo_secret_key: '', momo_endpoint: c.momo?.endpoint || '', momo_return_url: c.momo?.return_url || '', momo_notify_url: c.momo?.notify_url || '' });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (data, setStatus) => {
    // Filter out empty strings so we don't overwrite existing secrets with blank
    const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== ''));
    if (Object.keys(payload).length === 0) {
      setStatus(s => ({ ...s, error: 'Không có thay đổi nào để lưu', saved: false }));
      return;
    }
    setStatus({ saving: true, saved: false, error: '' });
    try {
      await axios.put(`${API}/system/config`, payload, { headers: authHeaders() });
      setStatus({ saving: false, saved: true, error: '' });
      load(); // Reload to get fresh masked values
      setTimeout(() => setStatus(s => ({ ...s, saved: false })), 3000);
    } catch (e) {
      setStatus({ saving: false, saved: false, error: e.response?.data?.detail || 'Lỗi khi lưu cấu hình' });
    }
  };

  const handleTest = async () => {
    if (!testEmail) return;
    setTesting(true);
    setTestResult(null);
    try {
      await axios.post(`${API}/system/test-email?to_email=${encodeURIComponent(testEmail)}`, {}, { headers: authHeaders() });
      setTestResult({ ok: true, msg: `Email test đã gửi đến ${testEmail}` });
    } catch (e) {
      setTestResult({ ok: false, msg: e.response?.data?.detail || 'Gửi thất bại' });
    } finally {
      setTesting(false);
    }
  };

  const onChange = (setter) => (e) => setter(s => ({ ...s, [e.target.name]: e.target.value }));

  if (loading) return <div className="page-loading"><div className="spinner w-8 h-8" /></div>;

  const smtpOk = config?.smtp?.smtp_configured ?? false;
  const geminiOk = config?.gemini?.api_key !== '';
  const driveOk = config?.google_drive?.token_configured ?? false;
  const vnpayOk = config?.vnpay?.tmn_code !== '';
  const momoOk = config?.momo?.partner_code !== '';

  return (
    <div className="page-content">
      <div className="page-inner max-w-4xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Zap size={17} className="text-orange-600" />
            </div>
            <div>
              <h1 className="text-[15px] font-black text-strong">Tích hợp hệ thống</h1>
              <p className="text-xs text-weak">Cấu hình email, AI, lưu trữ và thanh toán</p>
            </div>
          </div>
          <button onClick={load} className="btn-icon" title="Tải lại"><RefreshCw size={14} /></button>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs text-blue-700 dark:text-blue-400">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>Để bảo mật, các trường mật khẩu / secret key hiển thị ký tự che. <strong>Chỉ nhập vào ô nếu muốn thay đổi</strong> — bỏ trống để giữ nguyên giá trị cũ.</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── SMTP Email ──────────────────────────────────────────────────── */}
          <Section icon={Mail} title="Email (SMTP)" color="blue" configured={smtpOk}
            onSave={() => save(smtp, setSmtpS)} saving={smtpS.saving} saved={smtpS.saved} error={smtpS.error}>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="SMTP Host" name="smtp_host" value={smtp.smtp_host} onChange={onChange(setSmtp)} placeholder="smtp.gmail.com" />
              </div>
              <Field label="Port" name="smtp_port" value={smtp.smtp_port} onChange={onChange(setSmtp)} placeholder="587" />
              <div>
                <label className="section-label">TLS</label>
                <select name="smtp_tls" value={smtp.smtp_tls} onChange={onChange(setSmtp)} className="input-base text-xs py-2.5">
                  <option value="true">Bật (khuyên dùng)</option>
                  <option value="false">Tắt</option>
                </select>
              </div>
              <div className="col-span-2">
                <Field label="Email đăng nhập" name="smtp_user" value={smtp.smtp_user} onChange={onChange(setSmtp)} placeholder="admin@gmail.com" />
              </div>
              <div className="col-span-2">
                <Field label="Mật khẩu / App Password" name="smtp_password" value={smtp.smtp_password} onChange={onChange(setSmtp)} type="password"
                  hint="Gmail: dùng App Password (Google Account → Security → 2FA → App passwords)" />
              </div>
              <div className="col-span-2">
                <Field label="Email gửi đi (From)" name="smtp_from" value={smtp.smtp_from} onChange={onChange(setSmtp)} placeholder="noreply@mosslegal.vn" />
              </div>
            </div>

            {/* Test email */}
            <div className="mt-1 pt-3 border-t border-base">
              <label className="section-label flex items-center gap-1"><Send size={9} /> Gửi email test</label>
              <div className="flex gap-2">
                <input value={testEmail} onChange={e => setTestEmail(e.target.value)}
                  placeholder="your@email.com" className="input-base text-xs py-2 flex-1" />
                <button onClick={handleTest} disabled={testing || !testEmail}
                  className="btn-ghost border border-base text-xs py-2 px-3 shrink-0 disabled:opacity-40">
                  {testing ? <span className="spinner w-3 h-3" /> : <Send size={12} />}
                </button>
              </div>
              {testResult && (
                <div className={`mt-2 text-xs rounded-xl px-3 py-2 flex items-center gap-1.5 ${testResult.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                  {testResult.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {testResult.msg}
                </div>
              )}
            </div>
          </Section>

          {/* ── Gemini AI ───────────────────────────────────────────────────── */}
          <Section icon={Key} title="Gemini AI (OCR)" color="purple" configured={geminiOk}
            onSave={() => save(gemini, setGeminiS)} saving={geminiS.saving} saved={geminiS.saved} error={geminiS.error}>
            <Field label="API Key" name="gemini_api_key" value={gemini.gemini_api_key} onChange={onChange(setGemini)}
              type="password" placeholder="AIzaSy••••••••••••••••••"
              hint="Lấy tại console.cloud.google.com → APIs & Services → Credentials" />
            <div>
              <label className="section-label">Model</label>
              <select name="gemini_model" value={gemini.gemini_model} onChange={onChange(setGemini)} className="input-base text-xs py-2.5">
                <option value="gemini-2.0-flash">gemini-2.0-flash (nhanh, giá rẻ)</option>
                <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite (nhẹ nhất)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (chất lượng cao)</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              </select>
            </div>
            <div className="text-[10px] text-weak bg-page rounded-xl p-3 border border-base">
              Gemini AI dùng để nhận dạng văn bản từ ảnh (OCR). Miễn phí đến 15 requests/phút với tài khoản Google.
            </div>
          </Section>

          {/* ── Google Drive ────────────────────────────────────────────────── */}
          <Section icon={HardDrive} title="Google Drive" color="emerald" configured={driveOk}
            onSave={() => save(drive, setDriveS)} saving={driveS.saving} saved={driveS.saved} error={driveS.error}>
            <Field label="Service Account Token (Base64)" name="google_token_base64" value={drive.google_token_base64} onChange={onChange(setDrive)}
              type="password" placeholder="eyJ0eXBlIjoi••••••"
              hint="Encode file JSON của Service Account sang Base64: cat credentials.json | base64" />
            <Field label="Folder ID — Hộ kinh doanh" name="google_drive_hkd" value={drive.google_drive_hkd} onChange={onChange(setDrive)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74"
              hint="ID folder trên Google Drive dùng để lưu file HKD" />
            <Field label="Folder ID — Thành lập DN" name="google_drive_tldn" value={drive.google_drive_tldn} onChange={onChange(setDrive)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74"
              hint="ID folder trên Google Drive dùng để lưu file thành lập DN" />
            <div className="text-[10px] text-weak bg-page rounded-xl p-3 border border-base">
              Tạo Service Account tại Google Cloud Console → IAM → Service Accounts. Share folder Drive cho email của Service Account.
            </div>
          </Section>

          {/* ── VNPay ───────────────────────────────────────────────────────── */}
          <Section icon={CreditCard} title="VNPay" color="orange" configured={vnpayOk}
            onSave={() => save(vnpay, setVnpayS)} saving={vnpayS.saving} saved={vnpayS.saved} error={vnpayS.error}>
            <Field label="TMN Code (Mã merchant)" name="vnpay_tmn_code" value={vnpay.vnpay_tmn_code} onChange={onChange(setVnpay)}
              placeholder="ABCD1234" />
            <Field label="Hash Secret Key" name="vnpay_hash_secret" value={vnpay.vnpay_hash_secret} onChange={onChange(setVnpay)}
              type="password" placeholder="••••••••••••••••" />
            <div>
              <label className="section-label">Môi trường</label>
              <select name="vnpay_url" value={vnpay.vnpay_url} onChange={onChange(setVnpay)} className="input-base text-xs py-2.5">
                <option value="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html">Sandbox (thử nghiệm)</option>
                <option value="https://pay.vnpay.vn/vpcpay/vpcpay.html">Production (thật)</option>
              </select>
            </div>
            <Field label="Return URL" name="vnpay_return_url" value={vnpay.vnpay_return_url} onChange={onChange(setVnpay)}
              placeholder="https://yourdomain.com/payment/vnpay/return"
              hint="URL VNPay redirect về sau khi thanh toán xong" />
            <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 border border-amber-200 dark:border-amber-800 flex items-start gap-1.5">
              <AlertTriangle size={11} className="shrink-0 mt-0.5" />
              Yêu cầu giấy phép kinh doanh để đăng ký merchant. Đăng ký tại sandbox.vnpayment.vn/devreg
            </div>
          </Section>

          {/* ── Momo ────────────────────────────────────────────────────────── */}
          <Section icon={Smartphone} title="MoMo" color="rose" configured={momoOk}
            onSave={() => save(momo, setMomoS)} saving={momoS.saving} saved={momoS.saved} error={momoS.error}>
            <Field label="Partner Code" name="momo_partner_code" value={momo.momo_partner_code} onChange={onChange(setMomo)} placeholder="MOMO••••" />
            <Field label="Access Key" name="momo_access_key" value={momo.momo_access_key} onChange={onChange(setMomo)} type="password" placeholder="••••••••••••••••" />
            <Field label="Secret Key" name="momo_secret_key" value={momo.momo_secret_key} onChange={onChange(setMomo)} type="password" placeholder="••••••••••••••••" />
            <div>
              <label className="section-label">Môi trường</label>
              <select name="momo_endpoint" value={momo.momo_endpoint} onChange={onChange(setMomo)} className="input-base text-xs py-2.5">
                <option value="https://test-payment.momo.vn/v2/gateway/api/create">Sandbox (thử nghiệm)</option>
                <option value="https://payment.momo.vn/v2/gateway/api/create">Production (thật)</option>
              </select>
            </div>
            <Field label="Return URL" name="momo_return_url" value={momo.momo_return_url} onChange={onChange(setMomo)} placeholder="https://yourdomain.com/payment/momo/return" />
            <Field label="Notify URL (IPN Webhook)" name="momo_notify_url" value={momo.momo_notify_url} onChange={onChange(setMomo)}
              placeholder="https://yourdomain.com/api/v1/payment/momo/notify"
              hint="URL nhận kết quả thanh toán server-to-server từ MoMo" />
          </Section>

        </div>
      </div>
    </div>
  );
};

export default IntegrationPage;
