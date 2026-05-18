import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('mosslegal_access_token')}`,
});

const PaymentResultPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const status = params.get('status');
  const orderId = params.get('order_id');
  const [confirmed, setConfirmed] = useState(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (status === 'success' && orderId) {
      const poll = async () => {
        setPolling(true);
        for (let i = 0; i < 6; i++) {
          try {
            const r = await axios.get(`/api/v1/payment/status/${orderId}`, { headers: authHeaders() });
            if (r.data.status === 'success') { setConfirmed('success'); setPolling(false); return; }
            if (r.data.status === 'failed') { setConfirmed('failed'); setPolling(false); return; }
          } catch { /* continue */ }
          await new Promise(res => setTimeout(res, 2000));
        }
        setConfirmed('pending');
        setPolling(false);
      };
      poll();
    }
  }, [status, orderId]);

  const icons = {
    success: <CheckCircle2 size={56} className="text-emerald-500" />,
    failed:  <XCircle size={56} className="text-red-500" />,
    invalid: <AlertCircle size={56} className="text-amber-500" />,
    pending: <RefreshCw size={56} className="text-amber-500 animate-spin" />,
  };

  const messages = {
    success: { title: 'Thanh toán thành công!', sub: 'Gói của bạn đã được kích hoạt. Cảm ơn bạn đã tin dùng MOSS&LEGAL.' },
    failed:  { title: 'Thanh toán thất bại', sub: 'Giao dịch không thành công. Vui lòng thử lại hoặc liên hệ hỗ trợ.' },
    invalid: { title: 'Chữ ký không hợp lệ', sub: 'Không thể xác thực giao dịch. Vui lòng liên hệ hỗ trợ.' },
    pending: { title: 'Đang xử lý...', sub: 'Hệ thống đang xác nhận giao dịch. Vui lòng chờ vài phút và kiểm tra lại.' },
  };

  const displayStatus = status === 'success' ? (confirmed || 'pending') : status;
  const icon = icons[displayStatus] || icons.pending;
  const msg = messages[displayStatus] || messages.pending;

  return (
    <div className="flex-1 flex items-center justify-center bg-page">
      <div className="max-w-sm mx-auto text-center px-6 py-10">
        <div className="flex justify-center mb-5">{polling ? <RefreshCw size={56} className="text-amber-400 animate-spin" /> : icon}</div>
        <h1 className="text-lg font-bold text-strong mb-2">{polling ? 'Đang kiểm tra...' : msg.title}</h1>
        <p className="text-sm text-weak mb-6">{polling ? 'Vui lòng chờ, đang xác nhận thanh toán.' : msg.sub}</p>
        {orderId && <p className="text-[11px] text-weak mb-6 font-mono">Mã đơn: {orderId}</p>}
        {!polling && (
          <div className="flex gap-3">
            <button onClick={() => navigate('/subscription')}
              className="flex-1 py-2.5 text-sm bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-medium">
              Xem gói đăng ký
            </button>
            {displayStatus !== 'success' && (
              <button onClick={() => navigate('/payment')}
                className="flex-1 py-2.5 text-sm border border-base text-body rounded-xl hover:bg-surface transition">
                Thử lại
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentResultPage;
