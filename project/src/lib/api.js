import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://cinebook-backend-6e0a.onrender.com/api';

// ── Request timeout (15 seconds) ──────────────────────────────────────────────
const REQUEST_TIMEOUT = 15000;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: REQUEST_TIMEOUT,
});

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
        window.location.href = '/login';
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
    api.post('/auth/signup', { email, password, fullName }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  verifyOtp: (data) => api.post('/auth/verify-email-otp', data),
  resendOtp: (data) => api.post('/auth/resend-email-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (email, otp, newPassword) =>
    api.post('/auth/reset-password', { email, otp, newPassword }),
  googleLogin: (token) => api.post('/auth/google', { token }),
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
    }),

  uploadVideo: async (id, file, provider, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const params = provider ? { provider } : {};

    const uploadStartTime = Date.now();

    const res = await api.post(`/movies/${id}/video`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params,
      timeout: 0, // No timeout for large uploads
      onUploadProgress: (progressEvent) => {
        if (!progressEvent.total) return;
        const elapsed = (Date.now() - uploadStartTime) / 1000;
        const bytesPerSec = elapsed > 0 ? progressEvent.loaded / elapsed : 0;
        const remaining = bytesPerSec > 0 ? (progressEvent.total - progressEvent.loaded) / bytesPerSec : 0;

        onProgress?.({
          percent: Math.min(Math.round((progressEvent.loaded / progressEvent.total) * 100), 100),
          speed: Math.round(bytesPerSec / 1024),
          remaining: Math.round(remaining),
          status: 'uploading',
          provider: provider || 'auto',
          retryCount: 0,
        });
      },
    });

    onProgress?.({ percent: 100, speed: 0, remaining: 0, status: 'completed', provider: provider || 'auto', retryCount: 0 });

    return { success: true, ...res.data };
  },

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
