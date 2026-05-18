import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Building2, FileText, ScanLine, Download, ShieldCheck,
  CheckCircle2, Mail, ArrowRight, ChevronDown,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Users,
    title: 'Quản lý khách hàng',
    desc: 'Lưu trữ và tra cứu thông tin khách hàng cá nhân & doanh nghiệp một cách có hệ thống.',
  },
  {
    icon: Building2,
    title: 'Thành lập doanh nghiệp',
    desc: 'Quản lý toàn bộ hồ sơ thành lập doanh nghiệp, theo dõi tiến trình và xuất văn bản.',
  },
  {
    icon: FileText,
    title: 'Hộ kinh doanh',
    desc: 'Xử lý hồ sơ đăng ký hộ kinh doanh nhanh chóng, đầy đủ biểu mẫu theo quy định.',
  },
  {
    icon: ScanLine,
    title: 'OCR tự động',
    desc: 'Nhận dạng và trích xuất thông tin từ CCCD, hộ chiếu, giấy tờ pháp lý tự động.',
  },
  {
    icon: Download,
    title: 'Xuất văn bản',
    desc: 'Xuất hồ sơ, hợp đồng, giấy tờ ra định dạng Word / PDF theo đúng mẫu quy định.',
  },
  {
    icon: ShieldCheck,
    title: 'Phân quyền nhân viên',
    desc: 'Thiết lập quyền truy cập chi tiết cho từng nhân viên theo module và chức năng.',
  },
];

const PLANS = [
  {
    name: 'Basic',
    price: '1.500.000',
    duration: '3 tháng',
    features: ['Tối đa 3 nhân viên', 'Quản lý khách hàng', 'Hộ kinh doanh', 'Hỗ trợ email'],
    highlight: false,
  },
  {
    name: 'Pro',
    price: '3.000.000',
    duration: '3 tháng',
    features: ['Tối đa 10 nhân viên', 'Tất cả tính năng Basic', 'Thành lập doanh nghiệp', 'OCR tự động', 'Xuất văn bản Word/PDF', 'Hỗ trợ ưu tiên'],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '5.000.000',
    duration: '3 tháng',
    features: ['Nhân viên không giới hạn', 'Tất cả tính năng Pro', 'Tùy chỉnh biểu mẫu', 'API tích hợp', 'Hỗ trợ 24/7', 'Triển khai riêng'],
    highlight: false,
  },
];

const LandingPage = () => {
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-black text-orange-600 tracking-tight text-base uppercase">MOSS&LEGAL</span>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-500">
            <button onClick={scrollToFeatures} className="hover:text-orange-600 transition">Tính năng</button>
            <a href="#pricing" className="hover:text-orange-600 transition">Bảng giá</a>
            <a href="#contact" className="hover:text-orange-600 transition">Liên hệ</a>
          </nav>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-1.5 bg-orange-600 text-white text-sm rounded-xl hover:bg-orange-700 transition font-medium"
          >
            Đăng nhập
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-orange-50 via-white to-amber-50 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block mb-4 text-xs font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full uppercase tracking-wider">
            Nền tảng SaaS cho công ty luật
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-6">
            MOSS&LEGAL
            <br />
            <span className="text-orange-600">Quản lý hồ sơ pháp lý</span>
            <br />
            chuyên nghiệp
          </h1>
          <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Nền tảng quản lý hồ sơ pháp lý toàn diện dành riêng cho các công ty luật Việt Nam.
            Tự động hóa quy trình, tiết kiệm thời gian, nâng cao chất lượng dịch vụ.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-8 py-3 bg-orange-600 text-white font-semibold rounded-2xl hover:bg-orange-700 transition text-sm shadow-lg shadow-orange-200"
            >
              Dùng thử miễn phí
              <ArrowRight size={16} />
            </button>
            <button
              onClick={scrollToFeatures}
              className="flex items-center gap-2 px-8 py-3 border border-gray-200 text-gray-600 font-semibold rounded-2xl hover:border-orange-300 hover:text-orange-600 transition text-sm"
            >
              Xem tính năng
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Decorative blur */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-orange-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-amber-200/40 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-black text-gray-900 mb-3">Tính năng chính</h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              Đầy đủ công cụ để quản lý toàn bộ quy trình pháp lý từ tiếp nhận đến hoàn thiện hồ sơ.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 border border-gray-100 rounded-2xl hover:border-orange-200 hover:shadow-md transition-all group">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-600 transition-colors">
                  <f.icon size={18} className="text-orange-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{f.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-black text-gray-900 mb-3">Bảng giá</h2>
            <p className="text-gray-500 text-sm">Linh hoạt phù hợp với mọi quy mô công ty luật.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-6 rounded-2xl border flex flex-col ${
                  plan.highlight
                    ? 'border-orange-500 bg-orange-600 text-white shadow-xl shadow-orange-200'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                    Phổ biến
                  </div>
                )}
                <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${plan.highlight ? 'text-orange-200' : 'text-orange-600'}`}>
                  {plan.name}
                </div>
                <div className="mb-1">
                  <span className={`text-3xl font-black ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price}₫
                  </span>
                </div>
                <div className={`text-xs mb-6 ${plan.highlight ? 'text-orange-200' : 'text-gray-400'}`}>
                  / {plan.duration}
                </div>
                <ul className="flex-1 space-y-2.5 mb-6">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-xs">
                      <CheckCircle2
                        size={13}
                        className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-orange-200' : 'text-emerald-500'}`}
                      />
                      <span className={plan.highlight ? 'text-orange-100' : 'text-gray-600'}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/login')}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
                    plan.highlight
                      ? 'bg-white text-orange-600 hover:bg-orange-50'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  Bắt đầu
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="font-black text-white text-base uppercase tracking-tight mb-1">MOSS&LEGAL</div>
            <div className="text-xs">Nền tảng quản lý hồ sơ pháp lý cho công ty luật Việt Nam</div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Mail size={13} className="text-orange-500" />
            <a href="mailto:support@mosslegal.vn" className="hover:text-white transition">
              support@mosslegal.vn
            </a>
          </div>
          <div className="text-xs">© {new Date().getFullYear()} MOSS&LEGAL. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
