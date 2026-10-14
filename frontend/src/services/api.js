import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for consistent error handling and 401 auto-logout
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('tokenExpiry');
      window.dispatchEvent(new CustomEvent('auth:unauthorized', {
        detail: { message: error.response?.data?.error || 'Session expired. Please log in again.' }
      }));
    }
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    const err = new Error(message);
    if (error.response) {
      err.response = error.response;
      err.status = error.response.status;
      err.data = error.response.data;
      err.conflict = error.response.data?.conflict;
      err.conflicts = error.response.data?.conflicts;
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  getDemoUsers: () => api.get('/auth/demo-users'),
  changePassword: (data) => api.post('/auth/change-password', data),
  // OTP System APIs
  sendLoginOtp: (data) => api.post('/auth/otp/send-login', data),
  verifyLoginOtp: (data) => api.post('/auth/otp/verify-login', data),
  sendRegisterOtp: (data) => api.post('/auth/otp/send-register', data),
  verifyRegisterOtp: (data) => api.post('/auth/otp/verify-register', data),
  sendCreateMemberOtp: (data) => api.post('/auth/otp/send-create-member', data),
  verifyCreateMemberOtp: (data) => api.post('/auth/otp/verify-create-member', data),
};

export const userApi = {
  getAll: () => api.get('/auth/users'),
  create: (data) => api.post('/auth/users', data),
  sendStaffOtp: (data) => api.post('/auth/users/send-staff-otp', data),
  createStaff: (data) => api.post('/auth/users/create-staff', data),
  sendOwnerOtps: (data) => api.post('/auth/users/send-owner-otps', data),
  createOwner: (data) => api.post('/auth/users/create-owner', data),
  createWithOtp: (data) => api.post('/auth/otp/verify-create-member', data),
  sendOtp: (data) => api.post('/auth/otp/send-create-member', data),
  sendDeleteOwnerOtps: (id) => api.post(`/auth/users/${id}/send-delete-owner-otps`),
  delete: (id, data) => api.delete(`/auth/users/${id}`, { data }),
  resetPassword: (id, newPassword) => api.put(`/auth/users/${id}/password`, { newPassword }),
};

export const invoiceApi = {
  upload: (formData, onUploadProgress) =>
    api.post('/invoices/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  processSample: (sampleKey) => api.post(`/invoices/process-sample/${sampleKey}`),
  recalculateReview: (reviewData) => api.post('/invoices/review/recalculate', reviewData),
  checkDuplicate: (data) => api.post('/invoices/check-duplicate', data),
  getSupportedUnits: () => api.get('/invoices/units'),
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  getItems: (id) => api.get(`/invoices/${id}/items`),
  save: (data) => api.post('/invoices', data),
  approveAndPay: (id, paymentData) => api.post(`/invoices/${id}/approve-pay`, paymentData),
  reject: (id, data) => api.post(`/invoices/${id}/reject`, data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
};

export const vendorApi = {
  getAll: (params) => api.get('/vendors', { params }),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
};

export const categoryApi = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const vendorTypeApi = {
  getAll: () => api.get('/vendor-types'),
  getVendorsByType: (idOrName) => api.get(`/vendor-types/${encodeURIComponent(idOrName)}/vendors`),
  create: (data) => api.post('/vendor-types', data),
};

export const requirementApi = {
  getAll: (params) => api.get('/requirements', { params }),
  create: (data) => api.post('/requirements', data),
  update: (id, data) => api.put(`/requirements/${id}`, data),
  delete: (id) => api.delete(`/requirements/${id}`),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard'),
};

export const notificationApi = {
  getUpdates: () => api.get('/notifications/updates'),
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.post('/notifications/clear-all'),
  markAllViewed: () => api.post('/notifications/mark-viewed'),
  markInvoiceViewed: (id) => api.post(`/notifications/invoices/${id}/view`),
  markAllInvoicesViewed: () => api.post('/notifications/invoices/mark-all-viewed'),
  markRequirementViewed: (id) => api.post(`/notifications/requirements/${id}/view`),
  markAllRequirementsViewed: () => api.post('/notifications/requirements/mark-all-viewed'),
};

export const sampleApi = {
  getAll: () => api.get('/samples'),
};

export const classifierApi = {
  test: (itemName) => api.post('/classifier/test', { itemName }),
};

export const aiTrainingApi = {
  getStats: () => api.get('/ai-training/stats'),
  train: () => api.post('/ai-training/train'),
  getSamples: (params) => api.get('/ai-training/samples', { params }),
  getBenchmark: () => api.get('/ai-training/benchmark'),
  exportDataset: (format) => api.get(`/ai-training/export/${format}`),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  save: (data) => api.post('/settings', data),
  testOpenAI: (data) => api.post('/settings/test-openai', data),
};

export default api;
