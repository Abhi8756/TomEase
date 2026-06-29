import axios from 'axios';

// ⚠️ Change this to your IceCloud URL when deploying
export const API_BASE = 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

// Inject JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken });
          localStorage.setItem('access_token', data.access_token);
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api.request(error.config);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────
export const authApi = {
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),
};

// ─── Disease Detection ───────────────────────────────
export const predictApi = {
  predict: (file: File, plot_id?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (plot_id) {
      formData.append('plot_id', plot_id);
    }
    return api.post('/predict', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  recentScans: (limit = 50) => api.get(`/analytics/recent-scans?limit=${limit}`),
};

export const analyticsApi = {
  getRecentScans: (limit: number = 50) => api.get(`/analytics/recent-scans?limit=${limit}`),
  getAlerts: () => api.get('/alerts'),
  markAlertRead: (id: number) => api.post(`/alerts/${id}/read`),
};

export const plotsApi = {
  create: (data: { name: string; latitude?: number; longitude?: number }) => api.post('/plots/', data),
  getAll: () => api.get('/plots/'),
  getById: (id: string) => api.get(`/plots/${id}`),
  getMembers: (id: string) => api.get(`/plots/${id}/members`),
  inviteMember: (id: string, email: string) => api.post(`/plots/${id}/members`, { email }),
  getNdvi: (id: string) => api.get(`/plots/${id}/ndvi`),
};

// ─── Model ───────────────────────────────────────────
export const modelApi = {
  info: () => api.get('/model/info'),
  health: () => api.get('/health'),
  history: () => api.get('/admin/model-history'),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/admin/upload-model', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 min for large model files
    });
  },
  download: async (version: string) => {
    const token = localStorage.getItem('access_token');
    // Using fetch so we can trigger a browser download instead of handling blobs in axios
    const response = await fetch(`${API_BASE}/admin/download-model/${version}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model_${version}.pth`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};

export default api;
