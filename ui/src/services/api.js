import axios from 'axios';

const TOKEN_KEY = 'cenvi_access_token';
const REFRESH_KEY = 'cenvi_refresh_token';
const AUTH_BASE = 'https://api.cenvi.vn/api/v1/admin/auth';
const GOV_BASE = 'https://api.cenviplatform.com';
// const GOV_BASE = 'http://localhost:8000/api/v1'

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

export const exportApi = {
  exportHkd: (hkdId, templateIds) =>
    api.post(`/export/hkd/${hkdId}`, { template_ids: templateIds }, { responseType: 'blob' }),
};

export const govApi = {
  submitHkd: (data, token) =>
    axios.post(`${GOV_BASE}/hbiz_register/`, data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getJobStatus: (jobId, token) =>
    axios.get(`${GOV_BASE}/hbiz_register/status/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  // screenshot trả về blob image/jpeg
  getScreenshot: (jobId, token) =>
    axios.get(`${GOV_BASE}/screenshot/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    }),
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

export const ocrApi = {
  extract: (docType, file) => {
    const form = new FormData();
    form.append('file', file);
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
