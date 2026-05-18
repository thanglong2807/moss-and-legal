import React, { useState } from 'react';
import { Download, Users, Building2, FileText, Info } from 'lucide-react';

const API = '/api/v1/tenant/export';

const downloadCSV = async (endpoint, filename, setLoading) => {
  setLoading(true);
  try {
    const token = localStorage.getItem('mosslegal_access_token');
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      let detail = 'Xuất dữ liệu thất bại';
      try { detail = JSON.parse(text)?.detail || detail; } catch { /* ignore */ }
      alert(detail);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    alert('Có lỗi xảy ra khi xuất dữ liệu.');
  } finally {
    setLoading(false);
  }
};

const ExportCard = ({ icon: Icon, title, desc, endpoint, filename }) => {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex items-center justify-between p-5 border border-base rounded-2xl bg-surface hover:border-orange-200 transition-all group">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-orange-600 transition-colors">
          <Icon size={18} className="text-orange-600 group-hover:text-white transition-colors" />
        </div>
        <div>
          <div className="text-sm font-semibold text-strong mb-0.5">{title}</div>
          <div className="text-xs text-weak">{desc}</div>
        </div>
      </div>
      <button
        onClick={() => downloadCSV(endpoint, filename, setLoading)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 text-white text-xs rounded-xl hover:bg-orange-700 transition disabled:opacity-50 shrink-0 ml-4"
      >
        {loading ? (
          <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Download size={13} />
        )}
        {loading ? 'Đang xuất...' : 'Xuất CSV'}
      </button>
    </div>
  );
};

const EXPORTS = [
  {
    icon: Users,
    title: 'Danh sách khách hàng',
    desc: 'Xuất toàn bộ thông tin khách hàng cá nhân và doanh nghiệp.',
    endpoint: `${API}/customers`,
    filename: 'khach-hang.csv',
  },
  {
    icon: Building2,
    title: 'Danh sách công ty',
    desc: 'Xuất hồ sơ thành lập doanh nghiệp và thông tin công ty.',
    endpoint: `${API}/companies`,
    filename: 'cong-ty.csv',
  },
  {
    icon: FileText,
    title: 'Hộ kinh doanh',
    desc: 'Xuất danh sách hồ sơ đăng ký hộ kinh doanh.',
    endpoint: `${API}/hkd`,
    filename: 'ho-kinh-doanh.csv',
  },
];

const ExportPage = () => {
  return (
    <div className="flex-1 flex flex-col bg-page overflow-auto">
      <div className="px-6 py-6 max-w-3xl mx-auto w-full space-y-5">

        {/* Header */}
        <div className="flex items-center gap-2">
          <Download size={18} className="text-orange-600" />
          <h1 className="text-base font-bold text-strong">Xuất dữ liệu</h1>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-2.5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
          <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Dữ liệu xuất ra chỉ bao gồm hồ sơ của công ty bạn. File được xuất dưới định dạng CSV, có thể mở bằng Excel hoặc Google Sheets.
          </p>
        </div>

        {/* Export cards */}
        <div className="space-y-3">
          {EXPORTS.map((item) => (
            <ExportCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExportPage;
