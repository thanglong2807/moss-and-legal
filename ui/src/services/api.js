import axios from 'axios';

const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY || 'cenvi_access_token';
const REFRESH_KEY = import.meta.env.VITE_REFRESH_KEY || 'cenvi_refresh_token';
const AUTH_BASE = '/api/v1/auth';
const GOV_BASE = import.meta.env.VITE_GOV_BASE || 'https://api.cenviplatform.com';
console.log('[api.js] GOV_BASE =', GOV_BASE, '| VITE_GOV_BASE raw =', import.meta.env.VITE_GOV_BASE);

const govHeaders = (token) => ({ Authorization: `Bearer ${token}` });

const api = axios.create({
  baseURL: '/api/v1',
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401: try refresh once, then redirect to login
let _refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retried) {
      original._retried = true;
      if (!_refreshing) {
        _refreshing = (async () => {
          const rt = localStorage.getItem(REFRESH_KEY);
          if (!rt) return null;
          try {
            const res = await axios.get(`${AUTH_BASE}/refresh-token`, {
              headers: { Authorization: `Bearer ${rt}` },
            });
            const { access_token, refresh_token } = res.data;
            localStorage.setItem(TOKEN_KEY, access_token);
            if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
            return access_token;
          } catch {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_KEY);
            window.location.href = '/login';
            return null;
          } finally {
            _refreshing = null;
          }
        })();
      }
      const newToken = await _refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(err);
  }
);

export const hkdApi = {
  list: (params) => api.get('/hkd/', { params }),
  get: (id) => api.get(`/hkd/${id}`),
  create: (data) => api.post('/hkd/', data),
  update: (id, data) => api.put(`/hkd/${id}`, data),
  delete: (id) => api.delete(`/hkd/${id}`),
  syncCRM: (id) => api.post(`/hkd/${id}/sync-crm`),
};

export const customerApi = {
  list: (params) => api.get('/customers/', { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers/', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  syncCRM: (id) => api.post(`/customers/${id}/sync-crm`),
};

export const configApi = {
  getStaff: () => api.get('/configs/staff'),
  createStaff: (data) => api.post('/configs/staff', data),
  updateStaff: (id, data) => api.put(`/configs/staff/${id}`, data),
  getSources: () => api.get('/configs/sources'),
  createSource: (data) => api.post('/configs/sources', data),
  updateSource: (id, data) => api.put(`/configs/sources/${id}`, data),
  getStatuses: () => api.get('/configs/statuses'),
  createStatus: (data) => api.post('/configs/statuses', data),
  updateStatus: (id, data) => api.put(`/configs/statuses/${id}`, data),
  delete: (type, id) => api.delete(`/configs/${type}/${id}`),
};

export const adminUnitsApi = {
  getProvinces: () => api.get('/admin-units/provinces'),
  getChildren: (id) => api.get(`/admin-units/${id}/children`),
};

export const fieldsApi = {
  list: () => api.get('/fields/'),
  create: (data) => api.post('/fields/', data),
  update: (id, data) => api.put(`/fields/${id}`, data),
  delete: (id) => api.delete(`/fields/${id}`),
  linkIndustry: (fieldId, industryCode, note) => api.post(`/fields/${fieldId}/industries/?industry_code=${industryCode}${note ? `&note=${encodeURIComponent(note)}` : ''}`),
  updateIndustryNote: (fieldId, industryCode, note) => api.patch(`/fields/${fieldId}/industries/?industry_code=${industryCode}${note != null ? `&note=${encodeURIComponent(note)}` : ''}`),
  unlinkIndustry: (fieldId, industryCode) => api.delete(`/fields/${fieldId}/industries/?industry_code=${industryCode}`),
};

export const industryApi = {
  list: () => api.get('/industries/'),
  create: (data) => api.post('/industries/', data),
  update: (id, data) => api.put(`/industries/${id}`, data),
  delete: (id) => api.delete(`/industries/${id}`),
};

export const companyApi = {
  list: (params) => api.get('/company/', { params }),
  get: (id) => api.get(`/company/${id}`),
  create: (data) => api.post('/company/', data),
  update: (id, data) => api.put(`/company/${id}`, data),
  delete: (id) => api.delete(`/company/${id}`),
};

export const companyTranslateApi = {
  translateName: (name, company_type) => api.post('/company/translate-name', { name, company_type }),
};

export const positionsApi = {
  list: (companyType) => api.get('/company/positions', { params: companyType ? { company_type: companyType } : {} }),
};

export const companyExportApi = {
  export: (companyId, templateIds) =>
    api.post(`/company/${companyId}/export`, { template_ids: templateIds }, { responseType: 'blob' }),
};

export const companyDriveApi = {
  createFolder: (companyId) => api.post(`/company/${companyId}/create-folder`),
  getLabels: (companyType) => api.get(`/company/labels/${companyType}`),
  listDocs: (companyId) => api.get(`/company/${companyId}/documents`),
  upload: (companyId, label, file) => {
    const form = new FormData();
    form.append('label', label);
    form.append('file', file);
    return api.post(`/company/${companyId}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteDoc: (docId) => api.delete(`/company/documents/${docId}`),
};

export const companyGovApi = {
  submit: (companyId) => api.post(`/company/${companyId}/gov`),
};

export const govSubmissionApi = {
  create: (data) => api.post('/gov-submissions/', data),
  list: (recordId, recordType) => api.get('/gov-submissions/', { params: { record_id: recordId, record_type: recordType } }),
  patch: (id, data) => api.patch(`/gov-submissions/${id}`, data),
};

export const exportApi = {
  exportHkd: (hkdId, templateIds) =>
    api.post(`/export/hkd/${hkdId}`, { template_ids: templateIds }, { responseType: 'blob' }),
};

export const govApi = {
  // HKD
  submitHkd: (data, token) =>
    axios.post(`${GOV_BASE}/hbiz_register/`, data, { headers: govHeaders(token) }),
  getHkdJobStatus: (jobId, token) =>
    axios.get(`${GOV_BASE}/hbiz_register/status/${jobId}`, { headers: govHeaders(token) }),
  // TLDN
  submitTLDN: (typePath, payload, token) =>
    axios.post(`${GOV_BASE}/biz_register/${typePath}`, payload, { headers: govHeaders(token) }),
  getTLDNJobStatus: (jobId, token) =>
    axios.get(`${GOV_BASE}/biz_register/status/${jobId}`, { headers: govHeaders(token) }),
  // screenshot dùng chung
  getScreenshot: (jobId, token) =>
    axios.get(`${GOV_BASE}/screenshot/${jobId}`, { headers: govHeaders(token), responseType: 'blob' }),
  // alias cũ
  getJobStatus: (jobId, token) =>
    axios.get(`${GOV_BASE}/hbiz_register/status/${jobId}`, { headers: govHeaders(token) }),
};

// ── GOV job localStorage helpers ─────────────────────────────────────────────
const GOV_JOBS_KEY = 'cenvi_gov_jobs';

const GOV_JOB_TTL_MS = 60 * 60 * 1000; // 1 hour

export const govJobStorage = {
  save: (hkdId, jobId) => {
    const jobs = govJobStorage.getAll();
    jobs[hkdId] = { jobId, submittedAt: Date.now(), status: 'pending', error: '' };
    localStorage.setItem(GOV_JOBS_KEY, JSON.stringify(jobs));
  },
  updateStatus: (hkdId, status, error = '') => {
    const jobs = govJobStorage.getAll();
    if (jobs[hkdId]) {
      jobs[hkdId].status = status;
      jobs[hkdId].error = error;
      localStorage.setItem(GOV_JOBS_KEY, JSON.stringify(jobs));
    }
  },
  get: (hkdId) => {
    const jobs = govJobStorage.getAll();
    const job = jobs[hkdId];
    if (!job) return null;
    // Expire after 1h unless completed/failed
    if (job.status !== 'completed' && job.status !== 'failed') {
      if (Date.now() - job.submittedAt > GOV_JOB_TTL_MS) {
        delete jobs[hkdId];
        localStorage.setItem(GOV_JOBS_KEY, JSON.stringify(jobs));
        return null;
      }
    }
    return job;
  },
  getAll: () => {
    try { return JSON.parse(localStorage.getItem(GOV_JOBS_KEY) || '{}'); }
    catch { return {}; }
  },
  remove: (hkdId) => {
    const jobs = govJobStorage.getAll();
    delete jobs[hkdId];
    localStorage.setItem(GOV_JOBS_KEY, JSON.stringify(jobs));
  },
};

export const adminApi = {
  // Users
  getUsers: (params) => api.get('/auth/users', { params }),
  createUser: (data) => api.post('/auth/users', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  // Roles
  getRoles: () => api.get('/auth/roles'),
  createRole: (data) => api.post('/auth/roles', data),
  updateRole: (id, data) => api.put(`/auth/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/auth/roles/${id}`),
  setPermissions: (roleId, permissions) => api.put(`/auth/roles/${roleId}/permissions`, permissions),
};

export const ocrApi = {
  extract: (docType, file, { serviceType, driveFileId, driveLink } = {}) => {
    const form = new FormData();
    form.append('file', file);
    if (serviceType) form.append('service_type', serviceType);
    if (driveFileId) form.append('drive_file_id', driveFileId);
    if (driveLink) form.append('drive_link', driveLink);
    return api.post(`/ocr/${docType}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const driveApi = {
  list: (hkdId) => api.get(`/drive/hkd/${hkdId}`),
  createFolder: (hkdId) => api.post(`/drive/hkd/${hkdId}/create-folder`),
  upload: (hkdId, label, file) => {
    const form = new FormData();
    form.append('label', label);
    form.append('file', file);
    return api.post(`/drive/hkd/${hkdId}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteDoc: (docId) => api.delete(`/drive/documents/${docId}`),
};

export default api;
