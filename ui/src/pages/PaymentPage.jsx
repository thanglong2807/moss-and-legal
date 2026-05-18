import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Check, ChevronRight } from 'lucide-react';
import axios from 'axios';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('mosslegal_access_token')}`,
});

const formatMoney = (v) => new Intl.NumberFormat('vi-VN').format(v) + '₫';

const DURATIONS = [
  { months: 3,  label: '3 tháng',  priceKey: 'price_3m' },
  { months: 9,  label: '9 tháng',  priceKey: 'price_9m' },
  { months: 12, label: '12 tháng', priceKey: 'price_12m' },
  { months: 24, label: '24 tháng (2 năm)', priceKey: 'price_24m' },
  { months: 36, label: '36 tháng (3 năm)', priceKey: 'price_36m' },
];

const PROVIDERS = [
  { key: 'vnpay', label: 'VNPay', desc: 'Thanh toán qua VNPay (ATM/QR/Thẻ)' },
  { key: 'momo',  label: 'MoMo',  desc: 'Thanh toán qua ví MoMo' },
];

const STEPS = ['Chọn gói', 'Chọn thời hạn', 'Thanh toán'];

const PaymentPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await axios.get('/api/v1/tenant/plans', { headers: authHeaders() });
      setPlans(r.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!selectedPlan || !selectedDuration || !selectedProvider) return;
    setSubmitting(true);
    setError('');
    try {
      const r = await axios.post('/api/v1/tenant/subscription/upgrade', {
        plan_id: selectedPlan.id,
        duration_months: selectedDuration.months,
        provider: selectedProvider,
      }, { headers: authHeaders() });
      window.location.href = r.data.payment_url;
    } catch (e) {
      setError(e.response?.data?.detail || 'Có lỗi xảy ra, vui lòng thử lại.');
      setSubmitting(false);
    }
  };

  const price = selectedPlan && selectedDuration ? selectedPlan[selectedDuration.priceKey] : null;

  return (
    <div className="flex-1 flex flex-col bg-page overflow-auto">
      <div className="px-6 py-6 max-w-2xl mx-auto w-full">
        <h1 className="text-base font-bold text-strong mb-6">Đăng ký / Gia hạn gói</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors
                  ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-orange-600 text-white' : 'bg-page border border-base text-weak'}`}>
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-xs ${i === step ? 'text-strong font-medium' : 'text-weak'}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-base" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 0 — Chọn gói */}
        {step === 0 && (
          <div>
            {loading ? (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" /></div>
            ) : (
              <div className="grid gap-4">
                {plans.map(p => (
                  <button key={p.id} onClick={() => { setSelectedPlan(p); setSelectedDuration(null); }}
                    className={`text-left border rounded-xl p-4 transition-all ${selectedPlan?.id === p.id ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10' : 'border-base hover:border-orange-300 bg-surface'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-strong">{p.name}</div>
                        <div className="text-xs text-weak mt-0.5">{p.max_users === -1 ? 'Không giới hạn người dùng' : `Tối đa ${p.max_users} người dùng`}</div>
                      </div>
                      {selectedPlan?.id === p.id && <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center"><Check size={11} className="text-white" /></div>}
                    </div>
                    <div className="text-xs text-weak">Từ {formatMoney(p.price_3m)} / 3 tháng</div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setStep(1)} disabled={!selectedPlan}
              className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 bg-orange-600 text-white text-sm rounded-xl hover:bg-orange-700 transition disabled:opacity-50 font-medium">
              Tiếp theo <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Step 1 — Chọn thời hạn */}
        {step === 1 && selectedPlan && (
          <div>
            <div className="mb-4 text-sm text-strong font-medium">Gói: <span className="text-orange-600">{selectedPlan.name}</span></div>
            <div className="grid gap-3">
              {DURATIONS.map(d => {
                const p = selectedPlan[d.priceKey];
                return (
                  <button key={d.months} onClick={() => setSelectedDuration(d)}
                    className={`text-left border rounded-xl px-4 py-3 transition-all flex items-center justify-between ${selectedDuration?.months === d.months ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10' : 'border-base hover:border-orange-300 bg-surface'}`}>
                    <span className="text-sm text-strong">{d.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-orange-600">{formatMoney(p)}</span>
                      {selectedDuration?.months === d.months && <div className="w-4 h-4 bg-orange-600 rounded-full flex items-center justify-center"><Check size={10} className="text-white" /></div>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(0)} className="flex-1 py-2.5 border border-base text-sm rounded-xl text-body hover:bg-surface transition">Quay lại</button>
              <button onClick={() => setStep(2)} disabled={!selectedDuration}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-600 text-white text-sm rounded-xl hover:bg-orange-700 transition disabled:opacity-50 font-medium">
                Tiếp theo <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Chọn cổng thanh toán */}
        {step === 2 && selectedPlan && selectedDuration && (
          <div>
            {/* Summary */}
            <div className="border border-base rounded-xl p-4 mb-5 bg-surface space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-weak">Gói</span><span className="text-strong font-medium">{selectedPlan.name}</span></div>
              <div className="flex justify-between text-xs"><span className="text-weak">Thời hạn</span><span className="text-strong font-medium">{selectedDuration.label}</span></div>
              <div className="flex justify-between text-sm pt-1 border-t border-base mt-1"><span className="font-semibold text-strong">Tổng cộng</span><span className="font-bold text-orange-600">{formatMoney(price)}</span></div>
            </div>

            <div className="text-xs text-weak uppercase tracking-wider mb-3 font-medium">Chọn cổng thanh toán</div>
            <div className="grid gap-3 mb-6">
              {PROVIDERS.map(pv => (
                <button key={pv.key} onClick={() => setSelectedProvider(pv.key)}
                  className={`text-left border rounded-xl px-4 py-3 transition-all flex items-center gap-3 ${selectedProvider === pv.key ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10' : 'border-base hover:border-orange-300 bg-surface'}`}>
                  <CreditCard size={16} className={selectedProvider === pv.key ? 'text-orange-600' : 'text-weak'} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-strong">{pv.label}</div>
                    <div className="text-xs text-weak">{pv.desc}</div>
                  </div>
                  {selectedProvider === pv.key && <div className="w-4 h-4 bg-orange-600 rounded-full flex items-center justify-center"><Check size={10} className="text-white" /></div>}
                </button>
              ))}
            </div>

            {error && <div className="mb-4 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</div>}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-2.5 border border-base text-sm rounded-xl text-body hover:bg-surface transition">Quay lại</button>
              <button onClick={handleSubmit} disabled={!selectedProvider || submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-600 text-white text-sm rounded-xl hover:bg-orange-700 transition disabled:opacity-50 font-medium">
                {submitting ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <>Thanh toán <ChevronRight size={14} /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;
