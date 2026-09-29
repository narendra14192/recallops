import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.response.use(
  res => res,
  err => {
    const message = err.response?.data?.error || err.message || 'Unknown error';
    return Promise.reject(new Error(message));
  }
);

export const incidentApi = {
  create: (data) => api.post('/incidents', data).then(r => r.data),
  getAll: (status) => api.get('/incidents', { params: status ? { status } : {} }).then(r => r.data),
  getById: (id) => api.get(`/incidents/${id}`).then(r => r.data),
  investigate: (id) => api.post(`/incidents/${id}/investigate`).then(r => r.data),
  resolve: (id, data) => api.post(`/incidents/${id}/resolve`, data).then(r => r.data),
  feedback: (id, data) => api.post(`/incidents/${id}/feedback`, data).then(r => r.data),
  postmortem: (id) => api.get(`/incidents/${id}/postmortem`).then(r => r.data),
  events: (id) => api.get(`/incidents/${id}/events`).then(r => r.data),
};

export const memoryApi = {
  search: (q) => api.get('/memory/search', { params: { q } }).then(r => r.data),
  count: () => api.get('/memory/count').then(r => r.data),
};

export const dashboardApi = {
  stats: () => api.get('/dashboard').then(r => r.data),
};

export const adminApi = {
  seedMemory: () => api.post('/admin/seed-memory').then(r => r.data),
  resetDemo: () => api.post('/admin/reset-demo').then(r => r.data),
};

export const healthApi = {
  check: () => api.get('/health').then(r => r.data),
};

export default api;
