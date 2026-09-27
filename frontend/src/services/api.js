// Central axios instance: attaches the JWT automatically and points at the backend.
//
// Tuned for low-connectivity / mobile use:
//  - a finite timeout so a request never hangs forever on a bad connection
//  - one automatic retry for GET requests that fail purely due to a network
//    drop or timeout (not for 4xx/5xx responses, which are real errors)
//  - a global 401 handler that clears the stale session instead of leaving
//    the app stuck silently retrying with an expired token
import axios from 'axios';

const REQUEST_TIMEOUT_MS = 15000; // fail fast instead of hanging on flaky networks
const RETRY_DELAY_MS = 1200;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: REQUEST_TIMEOUT_MS,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ks_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// True when the request never reached the server (offline, timeout, DNS
// failure, dropped connection) as opposed to a normal 4xx/5xx API error.
export function isNetworkError(err) {
  return !!err && !err.response && (err.code === 'ECONNABORTED' || err.message === 'Network Error' || !navigator.onLine);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error;

    // Retry idempotent GET requests exactly once after a short pause if the
    // failure looks like a transient network blip rather than a real error.
    if (config && config.method === 'get' && !config.__retried && isNetworkError(error)) {
      config.__retried = true;
      await delay(RETRY_DELAY_MS);
      return api(config);
    }

    // Expired/invalid token: clear the stale session so the UI doesn't get
    // stuck in a broken logged-in state. Skip this on the login/register
    // calls themselves, where a 401 just means "wrong password".
    const url = config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('ks_token');
      localStorage.removeItem('ks_user');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
