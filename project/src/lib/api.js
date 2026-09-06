import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Derive the backend origin (without /api suffix) for constructing absolute URLs
// from relative paths returned by the backend (e.g., Google Drive proxy URLs).
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

// ── Request timeout ───────────────────────────────────────────────────────────
const REQUEST_TIMEOUT = 15000; // 15s default (local backend)
const AUTH_TIMEOUT = 30000;    // 30s for auth (signup sends email which can be slow)

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: REQUEST_TIMEOUT,
});

// ── Pre-warm the backend on page load ─────────────────────────────────────────
// Fire a lightweight GET to warm up the backend connection pool.
if (typeof window !== 'undefined') {
  fetch('/api/health', { method: 'GET' }).catch(() => {});
}

// ── In-flight request deduplication ───────────────────────────────────────────
const inflightRequests = new Map();

function deduplicatedGet(url, config = {}) {
  const key = url + JSON.stringify(config.params || {});
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }
  const promise = api.get(url, config).finally(() => {
    inflightRequests.delete(key);
  });
  inflightRequests.set(key, promise);
  return promise;
}

// ── Simple response cache (stale-while-revalidate) ────────────────────────────
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cachedGet(url, config = {}) {
  const key = 'cache:' + url + JSON.stringify(config.params || {});
  const cached = responseCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Promise.resolve(cached.response);
  }

  return deduplicatedGet(url, config).then((response) => {
    responseCache.set(key, { response, timestamp: Date.now() });
    // Evict old entries if cache grows too large
    if (responseCache.size > 50) {
      const oldest = responseCache.keys().next().value;
      responseCache.delete(oldest);
    }
    return response;
  });
}

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global Response Interceptor for Error Handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/signup' &&
        window.location.pathname !== '/admin/login' &&
        window.location.pathname !== '/forgot-password'
      ) {
        localStorage.removeItem('cb_token');
        // Dispatch a custom event instead of hard refreshing the page
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

// ── Retry wrapper for GET requests ────────────────────────────────────────────
function withRetry(fn, retries = 2, delay = 1000) {
  return fn().catch((err) => {
    if (retries <= 0 || err.response?.status < 500) throw err;
    return new Promise((resolve) => setTimeout(resolve, delay)).then(() =>
      withRetry(fn, retries - 1, delay * 2)
    );
  });
}

// ---- Auth ----
export const authApi = {
  signup: (email, password, fullName) =>
    api.post('/auth/signup', { email, password, fullName }, { timeout: AUTH_TIMEOUT }),
  login: (email, password) => api.post('/auth/login', { email, password }, { timeout: AUTH_TIMEOUT }),
  me: () => api.get('/auth/me'),
  verifyOtp: (data) => api.post('/auth/verify-email-otp', data, { timeout: AUTH_TIMEOUT }),
  resendOtp: (data) => api.post('/auth/resend-email-otp', data, { timeout: AUTH_TIMEOUT }),
  forgotPassword: (data) => api.post('/auth/forgot-password', data, { timeout: AUTH_TIMEOUT }),
  resetPassword: (email, otp, newPassword) =>
    api.post('/auth/reset-password', { email, otp, newPassword }, { timeout: AUTH_TIMEOUT }),
  googleLogin: (token) => api.post('/auth/google', { token }, { timeout: AUTH_TIMEOUT }),
};

// ---- Movies ----
export const moviesApi = {
  getAll: () => api.get('/movies'),
  getOttMovies: () => api.get('/movies', { params: { isOtt: true } }),
  getOttTrending: () =>
    api.get('/movies', { params: { isOtt: true, trending: true } }),
  getById: (id) => api.get(`/movies/${id}`),
  search: (q) => api.get('/movies', { params: { search: q } }),
  getTrending: () => api.get('/movies', { params: { trending: true } }),
  getTopRated: () => api.get('/movies', { params: { topRated: true } }),
  getByLanguage: (lang) => api.get('/movies', { params: { language: lang } }),
  checkBookingAvailability: (tmdbId) =>
    api.get(`/movies/tmdb/${tmdbId}/availability`),
  initializeBooking: (tmdbId) =>
    api.post(`/movies/tmdb/${tmdbId}/initialize-booking`),
  create: (data) => api.post('/movies', data),
  update: (id, data) => api.put(`/movies/${id}`, data),
  delete: (id) => api.delete(`/movies/${id}`),

  // ── Backblaze B2 Video ──────────────────────────────────────────────────
  getStreamUrl: (id, provider) =>
    api.get(`/movies/${id}/stream`, {
      params: { provider },
      timeout: 60000, // 60s timeout — Render free tier cold starts can take 30-60s
    }),

  uploadVideo: async (id, file, provider, onProgress) => {
    // ── STEP 1: Ask backend for a presigned upload URL ──
    onProgress?.({ percent: 0, speed: 0, remaining: 0, status: 'preparing', provider: provider || 'auto', retryCount: 0 });

    const presignRes = await api.get(`/movies/${id}/presigned-upload-url`, {
      params: {
        fileName: file.name,
        contentType: file.type || 'video/mp4',
        fileSize: file.size,
        provider: provider || undefined,
      },
      timeout: 30000,
    });

    const { uploadUrl, objectKey, provider: resolvedProvider } = presignRes.data;

    // ── STEP 2: Upload the file directly to the cloud (bypasses Render) ──
    const uploadStartTime = Date.now();

    const finalObjectKey = await new Promise(async (resolve, reject) => {
      if (resolvedProvider === 'google_drive') {
        const chunkSize = 10 * 1024 * 1024; // 10MB chunks
        let offset = 0;
        let fileId = null;

        const uploadChunk = (retryCount = 0) => {
          return new Promise((resChunk, rejChunk) => {
            const chunkEnd = Math.min(offset + chunkSize, file.size);
            const chunk = file.slice(offset, chunkEnd);
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl, true);
            xhr.setRequestHeader('Content-Range', `bytes ${offset}-${chunkEnd - 1}/${file.size}`);

            xhr.upload.onprogress = (e) => {
              if (!e.lengthComputable) return;
              const totalLoaded = offset + e.loaded;
              const elapsed = (Date.now() - uploadStartTime) / 1000;
              const bytesPerSec = elapsed > 0 ? totalLoaded / elapsed : 0;
              const remaining = bytesPerSec > 0 ? (file.size - totalLoaded) / bytesPerSec : 0;
              onProgress?.({
                percent: Math.min(Math.round((totalLoaded / file.size) * 100), 99),
                speed: Math.round(bytesPerSec / 1024),
                remaining: Math.round(remaining),
                status: 'uploading',
                provider: resolvedProvider || provider || 'auto',
                retryCount,
              });
            };

            xhr.onload = () => {
              if (xhr.status === 308) {
                const range = xhr.getResponseHeader('Range');
                if (range) {
                  offset = parseInt(range.split('-')[1], 10) + 1;
                } else {
                  offset = chunkEnd;
                }
                resChunk(false);
              } else if (xhr.status === 200 || xhr.status === 201) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  fileId = response.id;
                  resChunk(true);
                } catch (err) {
                  rejChunk(new Error('Failed to parse Google Drive response'));
                }
              } else {
                if (retryCount < 3) {
                  console.warn(`Chunk upload failed with ${xhr.status}, retrying...`);
                  setTimeout(() => resChunk('retry'), 2000 * (retryCount + 1));
                } else {
                  rejChunk(new Error(`Chunk upload failed: HTTP ${xhr.status}`));
                }
              }
            };
            xhr.onerror = () => {
              if (retryCount < 3) {
                setTimeout(() => resChunk('retry'), 2000 * (retryCount + 1));
              } else {
                rejChunk(new Error('Network error during chunk upload'));
              }
            };
            xhr.send(chunk);
          });
        };

        try {
          while (offset < file.size) {
            let result = 'retry';
            let retries = 0;
            while (result === 'retry' && retries <= 3) {
              result = await uploadChunk(retries);
              if (result === 'retry') retries++;
            }
            if (result === true) {
              resolve(fileId);
              return;
            }
          }
          resolve(fileId);
        } catch (err) {
          reject(err);
        }
      } else {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          const elapsed = (Date.now() - uploadStartTime) / 1000;
          const bytesPerSec = elapsed > 0 ? e.loaded / elapsed : 0;
          const remaining = bytesPerSec > 0 ? (e.total - e.loaded) / bytesPerSec : 0;
          onProgress?.({
            percent: Math.min(Math.round((e.loaded / e.total) * 100), 99),
            speed: Math.round(bytesPerSec / 1024),
            remaining: Math.round(remaining),
            status: 'uploading',
            provider: resolvedProvider || provider || 'auto',
            retryCount: 0,
          });
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(objectKey);
          } else {
            reject(new Error(`Direct cloud upload failed: HTTP ${xhr.status} ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during direct cloud upload'));
        xhr.ontimeout = () => reject(new Error('Upload timed out'));
        xhr.send(file);
      }
    });

    // ── STEP 3: Confirm upload with the backend ──
    onProgress?.({ percent: 99, speed: 0, remaining: 0, status: 'confirming', provider: resolvedProvider || provider || 'auto', retryCount: 0 });

    const confirmRes = await api.post(`/movies/${id}/confirm-upload`, {
      objectKey: finalObjectKey,
      fileSize: file.size,
      contentType: file.type || 'video/mp4',
      provider: resolvedProvider,
    });

    onProgress?.({ percent: 100, speed: 0, remaining: 0, status: 'completed', provider: resolvedProvider || provider || 'auto', retryCount: 0 });

    return { success: true, ...confirmRes.data };
  },

  syncFileSize: (id) => api.post(`/movies/${id}/sync-file-size`),

  deleteVideo: (id) => api.delete(`/movies/${id}/video`),
  getStorageStats: () => api.get('/movies/storage/stats'),
};

// ---- TMDB (with caching + deduplication) ----
export const tmdbApi = {
  getNowPlaying: (page = 1) => cachedGet(`/tmdb/now-playing?page=${page}`),
  getUpcoming: (page = 1) => cachedGet(`/tmdb/upcoming?page=${page}`),
  getPopular: (page = 1) => cachedGet(`/tmdb/popular?page=${page}`),
  getTrending: () => cachedGet(`/tmdb/trending`),
  getTopRated: (page = 1) => cachedGet(`/tmdb/top-rated?page=${page}`),
  search: (query, page = 1) =>
    cachedGet(`/tmdb/search?query=${encodeURIComponent(query)}&page=${page}`),
  getMovieDetails: (tmdbId) => cachedGet(`/tmdb/movie/${tmdbId}`),
  /** Single call that returns all homepage TMDB data */
  getHomepageBundle: () =>
    withRetry(() => cachedGet('/tmdb/homepage-bundle')),
};

// ---- Theatres ----
export const theatresApi = {
  getAll: (params) => api.get('/theatres', { params }),
  getById: (id) => cachedGet(`/theatres/${id}`),
  getNearby: (lat, lng, radius = 50) =>
    api.get('/theatres/nearby', { params: { lat, lng, radius } }),
  getByCity: (city) => api.get('/theatres', { params: { city } }),
  search: (q) => api.get('/theatres', { params: { search: q } }),
  getTheatreMovies: (id) => api.get(`/theatres/${id}/movies`),
  create: (data) => api.post('/theatres', data),
  update: (id, data) => api.put(`/theatres/${id}`, data),
  delete: (id) => api.delete(`/theatres/${id}`),
};

// ---- Showtimes ----
export const showtimesApi = {
  getAll: () => api.get('/showtimes'),
  getById: (id) => api.get(`/showtimes/${id}`),
  getByMovie: (movieId) => api.get(`/showtimes/movie/${movieId}`),
  getBookedSeats: (showtimeId) =>
    api.get(`/showtimes/${showtimeId}/booked-seats`),
  getLockedSeats: (showtimeId) =>
    api.get(`/showtimes/${showtimeId}/locked-seats`),
  create: (data) => api.post('/showtimes', data),
  update: (id, data) => api.put(`/showtimes/${id}`, data),
  delete: (id) => api.delete(`/showtimes/${id}`),
};

// ---- Seat Locks ----
export const seatLocksApi = {
  lock: (showtimeId, seatLabel) =>
    api.post('/seat-locks/lock', { showtimeId, seatLabel }),
  unlock: (showtimeId, seatLabel) =>
    api.post('/seat-locks/unlock', { showtimeId, seatLabel }),
  unlockAll: (showtimeId) => api.post('/seat-locks/unlock-all', { showtimeId }),
  refresh: (showtimeId) => api.post('/seat-locks/refresh', { showtimeId }),
};

// ---- Bookings ----
export const bookingsApi = {
  getMyBookings: () => api.get('/bookings/my'),
  getAll: () => api.get('/bookings/all'),
  getStats: () => api.get('/bookings/stats'),
  create: (showtimeId, seats, totalAmount) =>
    api.post('/bookings', { showtimeId, seats, totalAmount }),
  cancel: (id) => api.put(`/bookings/${id}/cancel`),
  adminCancel: (id) => api.put(`/bookings/${id}/admin-cancel`),
};

// ---- Rewards ----
export const rewardsApi = {
  getUserRewards: (userId) => api.get(`/rewards/user/${userId}`),
};

// ---- Watchlist ----
export const watchlistApi = {
  getUserWatchlist: (userId) => api.get(`/watchlist/user/${userId}`),
  toggleWatchlist: (userId, movieId) =>
    api.post('/watchlist', { userId, movieId }),
};

// ---- Watch History ----
export const watchHistoryApi = {
  getUserHistory: (userId) => api.get(`/watch-history/user/${userId}`),
  saveProgress: (userId, movieId, progressSeconds) =>
    api.post('/watch-history', { userId, movieId, progressSeconds }),
  remove: (userId, movieId) =>
    api.delete(`/watch-history/user/${userId}/movie/${movieId}`),
  restart: (userId, movieId) =>
    api.post(`/watch-history/user/${userId}/movie/${movieId}/restart`),
};

// ---- Vouchers ----
export const vouchersApi = {
  getAll: () => api.get('/vouchers'),
  create: (data) => api.post('/vouchers', data),
  delete: (id) => api.delete(`/vouchers/${id}`),
};
