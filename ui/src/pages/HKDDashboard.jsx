import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, XCircle, FileText } from 'lucide-react';
import Pagination from '../components/Common/Pagination';
import { hkdApi, customerApi, configApi, adminUnitsApi, fieldsApi, industryApi } from '../services/api';
import HKDCard from '../components/HKD/HKDCard';
import HKDEditor from '../components/HKD/HKDEditor';
import CustomerSelectionModal from '../components/Customer/CustomerSelectionModal';
import QuickCustomerModal from '../components/Customer/QuickCustomerModal';
import { BRANCHES } from '../constants';

const fmtMoney = (v) => v ? new Intl.NumberFormat('vi-VN').format(v) : '—';

const HKDDashboard = ({ customerFilter, setCustomerFilter }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [hkds, setHkds] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [sources, setSources] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [fields, setFields] = useState([]);
  const [allIndustries, setAllIndustries] = useState([]);
  const [wardOptions, setWardOptions] = useState({ hkd: [], owner: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [formData, setFormData] = useState(null);
  const [syncAddress, setSyncAddress] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [showSelector, setShowSelector] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => { fetchInitialData(); }, []);

  useEffect(() => {
    if (id) handleSelectHkd(id);
    else setFormData(null);
  }, [id]);

  const fetchInitialData = async () => {
    const [h, c, s, src, st, p, f, ind] = await Promise.all([
      hkdApi.list(), customerApi.list(), configApi.getStaff(),
      configApi.getSources(), configApi.getStatuses(),
      adminUnitsApi.getProvinces(), fieldsApi.list(), industryApi.list()
    ]);
    setHkds(h.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setCustomers(c.data);
    setStaff(s.data);
    setSources(src.data);
    setStatuses(st.data);
    setProvinces(p.data);
    setFields(f.data);
    setAllIndustries(ind.data);
  };

  const handleSelectHkd = async (hkdId) => {
    try {
      const res = await hkdApi.get(hkdId);
      setFormData(res.data);
      if (res.data.company_info?.address?.province_id) loadWards('hkd', res.data.company_info.address.province_id);
      if (res.data.owner_info?.contact_address?.province_id) loadWards('owner', res.data.owner_info.contact_address.province_id);
    } catch (e) { navigate('/hkd'); }
  };

  const loadWards = async (type, provinceId) => {
    if (!provinceId) return;
    const res = await adminUnitsApi.getChildren(provinceId);
    setWardOptions(prev => ({ ...prev, [type]: res.data }));
  };

  const startNewHKD = (customer) => {
    setFormData({
      company_full_name: '',
      company_info: { address: {}, contact: {} },
      owner_info: {
        personal_info: { full_name: customer.name },
        contact_address: {},
        contact_info: { phone: customer.phone }
      },
      industries: [],
      customer_id: customer.id,
      customer: customer,
      status_id: statuses[0]?.id || null,
      note: ''
    });
    setShowSelector(false);
    setShowQuickCreate(false);
  };

  const updateFormData = (path, value) => {
    setFormData(prev => applyPath(prev, path, value));
  };

  const applyPath = (prev, path, value) => {
    const next = { ...prev };
    const keys = path.split('.');
    let cur = next;
    for (let i = 0; i < keys.length - 1; i++) { cur[keys[i]] = { ...cur[keys[i]] }; cur = cur[keys[i]]; }
    cur[keys[keys.length - 1]] = value;
    return next;
  };

  const batchUpdateFormData = (updates) => {
    setFormData(prev => updates.reduce((acc, [path, value]) => applyPath(acc, path, value), prev));
  };

  const buildPayload = (fd) => ({
    company_full_name: fd.company_full_name,
    company_info: fd.company_info,
    owner: fd.owner_info,   // backend schema key is "owner", FE stores as "owner_info"
    industries: fd.industries,
    customer_id: fd.customer_id,
    handling_staff_id: fd.handling_staff_id,
    supporting_staff_id: fd.supporting_staff_id,
    status_id: fd.status_id,
    source_id: fd.source_id,
    note: fd.note,
    paid_amount: fd.paid_amount,
  });

  const handleDelete = async () => {
    if (!formData?.id) return;
    if (!window.confirm(`Xóa hồ sơ "${formData.company_full_name || formData.code}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await hkdApi.delete(formData.id);
      navigate('/hkd');
      fetchInitialData();
    } catch (e) { alert("Lỗi khi xóa: " + (e.response?.data?.detail || e.message)); }
  };

  const handleSave = async () => {
    if (!formData.customer_id) { alert("Hồ sơ phải gắn với khách hàng."); return; }
    const industries = formData.industries || [];
    const emptyCodes = industries.filter(i => !i.code?.trim());
    if (emptyCodes.length > 0) { alert("Có ngành nghề chưa chọn mã. Vui lòng chọn hoặc xóa bỏ."); return; }
    const codes = industries.map(i => i.code.trim());
    const duplicates = codes.filter((c, idx) => codes.indexOf(c) !== idx);
    if (duplicates.length > 0) { alert(`Mã ngành bị trùng: ${[...new Set(duplicates)].join(', ')}`); return; }
    try {
      if (formData.id) {
        await hkdApi.update(formData.id, buildPayload(formData));
      } else {
        const res = await hkdApi.create(buildPayload(formData));
        navigate(`/hkd/${res.data.id}`);
      }
      fetchInitialData();
      alert("Đã lưu hồ sơ thành công!");
    } catch (e) { alert("Lỗi khi lưu: " + (e.response?.data?.detail || e.message)); }
  };

  const copyAllIndustries = () => {
    const field = fields.find(f => f.id === parseInt(selectedFieldId));
    if (!field) return;
    const existing = formData.industries || [];
    const existingCodes = new Set(existing.map(i => i.code));
    const toAdd = field.industries
      .filter(i => !existingCodes.has(i.industry.code))
      .map(i => ({ code: i.industry.code, name: i.industry.name, is_main: false, note: i.note }));
    if (toAdd.length > 0) updateFormData('industries', [...existing, ...toAdd]);
  };

  useEffect(() => {
    if (syncAddress && formData?.company_info?.address)
      updateFormData('owner_info.contact_address', { ...formData.company_info.address });
  }, [syncAddress, formData?.company_info?.address]);

  const filteredHkds = hkds.filter(h => {
    const s = searchQuery.toLowerCase();
    const matchSearch = h.company_full_name?.toLowerCase().includes(s) ||
      h.code?.toLowerCase().includes(s) || h.customer?.name?.toLowerCase().includes(s) ||
      h.customer?.phone?.includes(s);
    const matchCustomer = !customerFilter || h.customer_id === customerFilter;
    const matchBranch = !branchFilter || h.customer?.branch_name === branchFilter;
    const matchStaff = !staffFilter || h.handling_staff_id === parseInt(staffFilter) || h.supporting_staff_id === parseInt(staffFilter);
    return matchSearch && matchCustomer && matchBranch && matchStaff;
  });

  useEffect(() => { setPage(1); }, [searchQuery, branchFilter, staffFilter, customerFilter]);

  const pagedHkds = filteredHkds.slice((page - 1) * pageSize, page * pageSize);

  const activeCustomerName = customerFilter ? customers.find(c => c.id === customerFilter)?.name : null;
  const showEditor = !!(id || formData);

  return (
    <div className="flex-1 flex overflow-hidden">

      {/* LEFT PANEL: full-width table OR narrow card list */}
      {showEditor ? (
        // COLLAPSED: narrow card sidebar
        <div className="w-72 shrink-0 border-r border-base flex flex-col bg-surface overflow-hidden">
          <div className="p-4 border-b border-faint flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-body uppercase tracking-widest">
                {activeCustomerName ? activeCustomerName : 'Hồ sơ HKD'}
              </span>
              <div className="flex gap-1.5">
                {customerFilter && (
                  <button onClick={() => setCustomerFilter(null)} className="p-1.5 text-weak hover:text-orange-600 bg-orange-50 rounded-lg transition">
                    <XCircle size={12} />
                  </button>
                )}
                <button onClick={() => setShowSelector(true)} className="bg-orange-600 text-white p-1.5 rounded-lg hover:bg-orange-700 transition shadow-md shadow-orange-100">
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-weak" size={12} />
              <input type="text" placeholder="Tìm kiếm..." className="w-full pl-8 pr-3 py-2 bg-input text-strong rounded-xl text-xs font-bold outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <select className="w-full px-3 py-2 bg-input text-strong rounded-xl text-xs font-bold outline-none appearance-none" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
              <option value="">-- Tất cả NV --</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredHkds.map(h => (
              <HKDCard
                key={h.id}
                hkd={h}
                isActive={parseInt(id) === h.id}
                onClick={() => navigate(`/hkd/${h.id}`)}
              />
            ))}
            {filteredHkds.length === 0 && (
              <div className="py-12 text-center text-weak text-xs font-bold italic">Không có hồ sơ</div>
            )}
          </div>
        </div>
      ) : (
        // EXPANDED: full-width table
        <div className="flex-1 flex flex-col bg-surface overflow-hidden">
          <div className="p-5 border-b border-faint flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-black tracking-tight text-strong">
                  {activeCustomerName ? `Hồ sơ: ${activeCustomerName}` : 'Hồ sơ HKD'}
                </h1>
                <p className="text-[11px] font-bold text-weak uppercase tracking-widest mt-0.5">{filteredHkds.length} hồ sơ</p>
              </div>
              <div className="flex items-center gap-2">
                {customerFilter && (
                  <button onClick={() => setCustomerFilter(null)} className="flex items-center gap-1 text-[10px] font-black hover:text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-xl border border-orange-100 transition uppercase">
                    <XCircle size={12} /> Bỏ lọc
                  </button>
                )}
                <button onClick={() => setShowSelector(true)} className="bg-orange-600 text-white px-4 py-2 rounded-2xl hover:bg-orange-700 transition shadow-lg shadow-orange-100 flex items-center gap-2 font-black text-xs">
                  <Plus size={16} /> MỚI
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-weak" size={14} />
                <input type="text" placeholder="Tìm tên KH, HKD, SĐT..." className="w-full pl-9 pr-3 py-2 bg-input text-strong rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <select className="px-3 py-2 bg-input text-strong rounded-xl text-xs font-bold outline-none appearance-none focus:ring-2 focus:ring-orange-400" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="">Tất cả chi nhánh</option>
                {BRANCHES.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
              <select className="px-3 py-2 bg-input text-strong rounded-xl text-xs font-bold outline-none appearance-none focus:ring-2 focus:ring-orange-400" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
                <option value="">Tất cả NV</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredHkds.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 text-weak">
                <FileText size={40} className="mb-3 opacity-10" /><p className="text-sm font-bold">Không có hồ sơ nào</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-page z-10">
                  <tr>
                    {['Khách hàng', 'SĐT', 'Chi nhánh', 'Tên HKD', 'Số tiền TT', 'NV xử lý', 'NV hỗ trợ', 'Ghi chú'].map(col => (
                      <th key={col} className="px-4 py-2.5 font-black text-weak uppercase tracking-widest text-[9px] whitespace-nowrap border-b border-base">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedHkds.map(h => (
                    <tr key={h.id} onClick={() => navigate(`/hkd/${h.id}`)} className={`cursor-pointer transition-all border-b border-base hover:bg-orange-50/40 dark:hover:bg-orange-900/10 ${h.crm_link ? 'border-l-2 border-l-emerald-400' : ''}`}>
                      <td className="px-3 py-2 font-black text-strong whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {h.crm_link && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />}
                          {h.customer?.name || 'Vãng lai'}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-weak font-bold whitespace-nowrap">{h.customer?.phone || '—'}</td>
                      <td className="px-3 py-2 text-weak font-bold whitespace-nowrap">{h.customer?.branch_name || '—'}</td>
                      <td className="px-3 py-2 font-bold text-body max-w-[200px] truncate">{h.company_full_name || '—'}</td>
                      <td className="px-3 py-2 font-black text-emerald-600 whitespace-nowrap">{fmtMoney(h.paid_amount)}</td>
                      <td className="px-3 py-2 text-body font-bold whitespace-nowrap">{h.handling_staff?.name || '—'}</td>
                      <td className="px-3 py-2 text-body font-bold whitespace-nowrap">{h.supporting_staff?.name || '—'}</td>
                      <td className="px-3 py-2 text-weak max-w-[160px] truncate italic">{h.note || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Pagination page={page} pageSize={pageSize} total={filteredHkds.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      )}

      {/* RIGHT: Editor or empty state */}
      {formData ? (
        <HKDEditor
          formData={formData} updateFormData={updateFormData} batchUpdateFormData={batchUpdateFormData} onSave={handleSave} onDelete={handleDelete} onClose={() => navigate('/hkd')}
          provinces={provinces} staff={staff} sources={sources} statuses={statuses} customers={customers} fields={fields}
          wardOptions={wardOptions} loadWards={loadWards} syncAddress={syncAddress} setSyncAddress={setSyncAddress}
          copyAllIndustries={copyAllIndustries} selectedFieldId={selectedFieldId} setSelectedFieldId={setSelectedFieldId}
          allIndustries={allIndustries}
        />
      ) : null}

      <CustomerSelectionModal isOpen={showSelector} onClose={() => setShowSelector(false)} onSelect={(c) => startNewHKD(c)} onCreateNew={() => { setShowSelector(false); setShowQuickCreate(true); }} />
      <QuickCustomerModal isOpen={showQuickCreate} onClose={() => setShowQuickCreate(false)} onCreated={(c) => startNewHKD(c)} sources={sources} staff={staff} />
    </div>
  );
};

export default HKDDashboard;
