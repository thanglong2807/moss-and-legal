import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Common/Toast';
import { useUI } from '../context/UIContext';
import { companyApi, customerApi, configApi, adminUnitsApi, fieldsApi, industryApi, positionsApi } from '../services/api';
import CompanyCard from '../components/Company/CompanyCard';
import CompanyEditor from '../components/Company/CompanyEditor';
import CustomerSelectionModal from '../components/Customer/CustomerSelectionModal';
import QuickCustomerModal from '../components/Customer/QuickCustomerModal';
import Pagination from '../components/Common/Pagination';

const _staticCache = { data: null, promise: null };
const fetchStaticData = () => {
  if (_staticCache.data) return Promise.resolve(_staticCache.data);
  if (_staticCache.promise) return _staticCache.promise;
  _staticCache.promise = Promise.all([
    configApi.getStaff(), configApi.getSources(), configApi.getStatuses(),
    adminUnitsApi.getProvinces(), fieldsApi.list(), industryApi.list(),
  ]).then(([s, src, st, p, f, ind]) => {
    _staticCache.data = { staff: s.data, sources: src.data, statuses: st.data, provinces: p.data, fields: f.data, industries: ind.data };
    _staticCache.promise = null;
    return _staticCache.data;
  }).catch(err => { _staticCache.promise = null; throw err; });
  return _staticCache.promise;
};

const TYPE_LABELS = { 1: 'TNHH 1TV', 2: 'TNHH 2TV+', 3: 'Cổ phần' };
const TYPE_COLORS = {
  1: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  3: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const fmtMoney = (v) => v ? new Intl.NumberFormat('vi-VN').format(v) : '—';

const defaultPersons = (type) => {
  if (type === 1) return [{ person_type: 'owner' }, { person_type: 'representative' }];
  if (type === 2) return [{ person_type: 'member' }, { person_type: 'representative' }];
  if (type === 3) return [{ person_type: 'founder' }, { person_type: 'representative' }];
  return [];
};

const newBlankForm = (customer, type = 1) => ({
  company_type: type,
  company_full_name: '',
  company_info: { address: {}, contact: {}, name: {}, charter_capital: null },
  persons: defaultPersons(type),
  industries: [],
  customer_id: customer?.id || null,
  customer: customer || null,
  handling_staff_id: null,
  supporting_staff_id: null,
  status_id: null,
  source_id: null,
  note: '',
  paid_amount: null,
  accounting_name: '',
  accounting_phone: '',
});

const CompanyDashboard = ({ customerFilter, setCustomerFilter }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { ultraCollapsed } = useUI();
  const showToast = useToast();

  const [companies, setCompanies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [sources, setSources] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [fields, setFields] = useState([]);
  const [allIndustries, setAllIndustries] = useState([]);
  const [positions, setPositions] = useState([]);
  const [wardOptions, setWardOptions] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [formData, setFormData] = useState(null);
  const [showSelector, setShowSelector] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const skipNextClear = useRef(false);

  useEffect(() => { fetchInitialData(); }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => { setPage(1); }, [debouncedSearch, staffFilter, customerFilter]);

  useEffect(() => { fetchCompanies(); }, [page, pageSize, debouncedSearch, staffFilter, customerFilter]);

  useEffect(() => {
    if (id) handleSelectCompany(id);
    else if (skipNextClear.current) skipNextClear.current = false;
    else setFormData(null);
  }, [id]);

  const fetchInitialData = async () => {
    fetchStaticData().then(({ staff, sources, statuses, provinces, fields, industries }) => {
      setStaff(staff);
      setSources(sources);
      setStatuses(statuses);
      setProvinces(provinces);
      setFields(fields);
      setAllIndustries(industries);
    }).catch(() => {});

    try {
      const [custRes, posRes] = await Promise.all([
        customerApi.list({ limit: 200, skip: 0 }), positionsApi.list(),
      ]);
      setCustomers(custRes.data.items ?? custRes.data);
      setPositions(posRes.data);
    } catch {
      setCustomers([]);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await companyApi.list({
        skip: (page - 1) * pageSize, limit: pageSize,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(staffFilter && { staff_id: staffFilter }),
        ...(customerFilter && { customer_id: customerFilter }),
      });
      setCompanies(res.data.items);
      setTotal(res.data.total);
    } catch {
      setCompanies([]); setTotal(0);
    }
  };

  const handleSelectCompany = async (companyId) => {
    try {
      const res = await companyApi.get(companyId);
      const d = res.data;
      setFormData(d);
      if (d.company_info?.address?.province_id) loadWards('company', d.company_info.address.province_id);
    } catch { navigate('/company'); }
  };

  const loadWards = async (key, provinceId) => {
    if (!provinceId) return;
    const res = await adminUnitsApi.getChildren(provinceId);
    setWardOptions(prev => ({ ...prev, [key]: res.data }));
  };

  const startNew = (customer) => {
    skipNextClear.current = true;
    setFormData(newBlankForm(customer));
    setShowSelector(false);
    setShowQuickCreate(false);
    navigate('/company');
  };

  const applyPath = (prev, path, value) => {
    const next = { ...prev };
    const keys = path.split('.');
    let cur = next;
    for (let i = 0; i < keys.length - 1; i++) { cur[keys[i]] = { ...cur[keys[i]] }; cur = cur[keys[i]]; }
    cur[keys[keys.length - 1]] = value;
    return next;
  };

  const updateFormData = (path, value) => setFormData(prev => applyPath(prev, path, value));

  const buildPayload = (fd) => ({
    company_type: fd.company_type,
    company_full_name: fd.company_full_name,
    company_info: fd.company_info,
    persons: fd.persons || [],
    industries: fd.industries || [],
    customer_id: fd.customer_id,
    handling_staff_id: fd.handling_staff_id,
    supporting_staff_id: fd.supporting_staff_id,
    status_id: fd.status_id,
    source_id: fd.source_id,
    note: fd.note,
    paid_amount: fd.paid_amount,
    accounting_name: fd.accounting_name,
    accounting_phone: fd.accounting_phone,
    accounting_gender: fd.accounting_gender ?? null,
    accounting_birth_date: fd.accounting_birth_date || null,
    accounting_id_number: fd.accounting_id_number || null,
  });

  const handleDelete = async () => {
    if (!formData?.id) return;
    if (!window.confirm(`Xóa hồ sơ "${formData.company_full_name || formData.code}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await companyApi.delete(formData.id);
      navigate('/company');
      fetchCompanies();
    } catch (e) { showToast('Lỗi khi xóa: ' + (e.response?.data?.detail || e.message), 'error'); }
  };

  const handleSave = async () => {
    if (!formData.customer_id) { showToast('Hồ sơ phải gắn với khách hàng.', 'error'); return; }
    if (!formData.company_type) { showToast('Vui lòng chọn loại hình doanh nghiệp.', 'error'); return; }
    const industries = formData.industries || [];
    const emptyCodes = industries.filter(i => !i.code?.trim());
    if (emptyCodes.length > 0) { showToast('Có ngành nghề chưa chọn mã.', 'error'); return; }
    const codes = industries.map(i => i.code.trim());
    const dups = codes.filter((c, idx) => codes.indexOf(c) !== idx);
    if (dups.length > 0) { showToast(`Mã ngành bị trùng: ${[...new Set(dups)].join(', ')}`, 'error'); return; }
    try {
      if (formData.id) {
        await companyApi.update(formData.id, buildPayload(formData));
        showToast('Đã lưu hồ sơ thành công!');
        fetchCompanies();
      } else {
        const res = await companyApi.create(buildPayload(formData));
        showToast('Đã tạo hồ sơ thành công!');
        fetchCompanies();
        navigate(`/company/${res.data.id}`);
      }
    } catch (e) { showToast('Lỗi khi lưu: ' + (e.response?.data?.detail || e.message), 'error'); }
  };

  const pagedCompanies = companies;

  const showEditor = !!(id || formData);
  const activeCustomerName = customerFilter ? customers.find(c => c.id === customerFilter)?.name : null;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ── Left panel (card list or full table) ── */}
      {showEditor ? (
        <div className={`w-72 shrink-0 border-r border-base flex flex-col bg-surface overflow-hidden transition-all duration-300 ${ultraCollapsed ? 'hidden' : ''}`}>
          <div className="p-4 border-b border-faint flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-body uppercase tracking-widest truncate">
                {activeCustomerName || 'Doanh nghiệp'}
              </span>
              <div className="flex gap-1.5 shrink-0">
                {customerFilter && (
                  <button onClick={() => setCustomerFilter?.(null)} className="p-1.5 text-weak hover:text-indigo-600 bg-indigo-50 rounded-lg transition">
                    <XCircle size={12} />
                  </button>
                )}
                {can('company', 'create') && (
                  <button onClick={() => setShowSelector(true)} className="bg-orange-600 text-white p-1.5 rounded-lg hover:bg-orange-700 transition shadow-md shadow-orange-100">
                    <Plus size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-weak" size={12} />
              <input type="text" placeholder="Tìm kiếm..." className="w-full pl-8 pr-3 py-2 bg-input text-strong rounded-xl text-xs font-bold outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <select className="w-full px-3 py-2 bg-input text-strong rounded-xl text-xs font-bold outline-none appearance-none" value={staffFilter} onChange={e => setStaffFilter(e.target.value)}>
              <option value="">-- Tất cả NV --</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {companies.map(c => (
              <CompanyCard key={c.id} company={c} isActive={parseInt(id) === c.id} onClick={() => navigate(`/company/${c.id}`)} />
            ))}
            {total === 0 && (
              <div className="py-12 text-center text-weak text-xs font-bold italic">Không có doanh nghiệp</div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-surface overflow-hidden">
          <div className="p-5 border-b border-faint flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-black tracking-tight text-strong">
                  {activeCustomerName ? `Hồ sơ: ${activeCustomerName}` : 'Hồ sơ Doanh nghiệp'}
                </h1>
                <p className="text-[11px] font-bold text-weak uppercase tracking-widest mt-0.5">{total} hồ sơ</p>
              </div>
              <div className="flex items-center gap-2">
                {customerFilter && (
                  <button onClick={() => setCustomerFilter?.(null)} className="flex items-center gap-1 text-[10px] font-black hover:text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-xl border border-indigo-100 transition uppercase">
                    <XCircle size={12} /> Bỏ lọc
                  </button>
                )}
                {can('company', 'create') && (
                  <button onClick={() => setShowSelector(true)} className="bg-orange-600 text-white px-4 py-2 rounded-2xl hover:bg-orange-700 transition shadow-lg shadow-orange-100 flex items-center gap-2 font-black text-xs">
                    <Plus size={16} /> MỚI
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-weak" size={14} />
                <input type="text" placeholder="Tìm tên KH, DN, mã..." className="w-full pl-9 pr-3 py-2 bg-input text-strong rounded-xl text-xs font-bold outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <select className="px-3 py-2 bg-input text-strong rounded-xl text-xs font-bold outline-none appearance-none" value={staffFilter} onChange={e => setStaffFilter(e.target.value)}>
                <option value="">Tất cả NV</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {total === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 text-weak">
                <p className="text-sm font-bold">Không có hồ sơ nào</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-page z-10">
                  <tr>
                    {['Mã', 'Loại hình', 'Tên DN', 'Khách hàng', 'Thanh toán', 'NV xử lý', 'NV hỗ trợ', 'Trạng thái', 'Ghi chú'].map(col => (
                      <th key={col} className="px-4 py-2.5 font-black text-weak uppercase tracking-widest text-[9px] whitespace-nowrap border-b border-base">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedCompanies.map(c => (
                    <tr key={c.id} onClick={() => navigate(`/company/${c.id}`)} className="cursor-pointer transition-all border-b border-base hover:bg-orange-50/40 dark:hover:bg-orange-900/10">
                      <td className="px-3 py-2 font-mono font-bold text-orange-600 whitespace-nowrap">{c.code}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${TYPE_COLORS[c.company_type] || ''}`}>
                          {TYPE_LABELS[c.company_type] || '?'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-bold text-strong max-w-[200px] truncate">{c.company_full_name || '—'}</td>
                      <td className="px-3 py-2 text-body font-bold whitespace-nowrap">{c.customer?.name || '—'}</td>
                      <td className="px-3 py-2 font-black text-emerald-600 whitespace-nowrap">{fmtMoney(c.paid_amount)}</td>
                      <td className="px-3 py-2 text-body font-bold whitespace-nowrap">{c.handling_staff?.name || '—'}</td>
                      <td className="px-3 py-2 text-body font-bold whitespace-nowrap">{c.supporting_staff?.name || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {c.status ? <span className="text-[9px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 rounded-full">{c.status.name}</span> : '—'}
                      </td>
                      <td className="px-3 py-2 text-weak font-bold max-w-[160px] truncate">{c.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      )}

      {/* ── Editor ── */}
      {showEditor && formData && (
        <CompanyEditor
          formData={formData}
          updateFormData={updateFormData}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => { setFormData(null); navigate('/company'); }}
          staff={staff}
          sources={sources}
          statuses={statuses}
          provinces={provinces}
          fields={fields}
          allIndustries={allIndustries}
          positions={positions}
          wardOptions={wardOptions}
          loadWards={loadWards}
          customers={customers}
        />
      )}

      <CustomerSelectionModal isOpen={showSelector} onClose={() => setShowSelector(false)} onSelect={startNew} onCreateNew={() => { setShowSelector(false); setShowQuickCreate(true); }} />
      <QuickCustomerModal isOpen={showQuickCreate} onClose={() => setShowQuickCreate(false)} onCreated={startNew} sources={sources} staff={staff} />
    </div>
  );
};

export default CompanyDashboard;
