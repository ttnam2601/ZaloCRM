import axios from 'axios';
import { router } from '@/router/index';
import { useToast } from '@/composables/use-toast';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

// JWT interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Throttle 5xx toast — tránh spam khi nhiều request fail cùng lúc
let last5xxToastAt = 0;
const TOAST_5XX_THROTTLE_MS = 4000;

// Response interceptor — global handle 401/404/5xx
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';

    if (status === 401) {
      localStorage.removeItem('token');
      // Use Vue Router instead of hard reload to prevent redirect loops
      const currentPath = router.currentRoute.value.path;
      if (currentPath !== '/login' && currentPath !== '/setup') {
        router.replace('/login');
      }
    } else if (status === 403) {
      // RBAC enforce 2026-06-08 — backend từ chối quyền. Toast, KHÔNG redirect
      // (403 có thể đến từ 1 widget phụ, không nên giật cả trang).
      try {
        useToast().error(error.response?.data?.error ?? 'Bạn không có quyền thực hiện thao tác này');
      } catch (e) {
        console.error('[api] 403 toast unavailable', e);
      }
    } else if (status === 404) {
      // 404 thường là logic (entity không tồn tại) — chỉ log, không toast
      console.warn(`[api] 404 Not Found: ${url}`);
    } else if (typeof status === 'number' && status >= 500) {
      console.error(`[api] ${status} server error: ${url}`, error.response?.data);
      const now = Date.now();
      if (now - last5xxToastAt > TOAST_5XX_THROTTLE_MS) {
        last5xxToastAt = now;
        try {
          useToast().error('Máy chủ lỗi, vui lòng thử lại');
        } catch (e) {
          // Fallback nếu toast queue chưa sẵn sàng (vd lỗi trong app init)
          console.error('[api] toast unavailable', e);
        }
      }
    }
    return Promise.reject(error);
  },
);

export { api };
