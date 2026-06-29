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
  predict: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/predict', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  recentScans: (limit = 50) => api.get(`/analytics/recent-scans?limit=${limit}`),
};

// ─── Model ───────────────────────────────────────────
export const modelApi = {
  info: () => api.get('/model/info'),
  health: () => api.get('/health'),
  history: (apiKey: string) =>
    api.get('/admin/model-history', { headers: { 'X-API-Key': apiKey } }),
  upload: (file: File, apiKey: string) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/admin/upload-model', form, {
      headers: { 'Content-Type': 'multipart/form-data', 'X-API-Key': apiKey },
      timeout: 300000, // 5 min for large model files
    });
  },
};

export default api;
