import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

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
    // Optional: Global handling for 401 Unauthorized
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
  /** Get a pre-signed streaming URL for the movie video. Requires auth. */
  getStreamUrl: (id, provider) =>
    api.get(`/movies/${id}/stream`, {
      params: { provider },
    }),

  /** Upload a video with chunked resumable upload (Google Drive) or single PUT with retry (Backblaze). Admin only. */
  uploadVideo: async (id, file, provider, onProgress) => {
    // 1. Get presigned/resumable upload URL from backend
    const res = await api.get(`/movies/${id}/presigned-upload-url`, {
      params: {
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        provider,
      },
    });
    const { uploadUrl, objectKey, provider: resolvedProvider } = res.data;

    // Enhanced progress helper
    const reportProgress = (percent, speed, remaining, status, retryCount = 0) => {
      onProgress?.({
        percent: Math.min(Math.round(percent), 100),
        speed: Math.round(speed),
        remaining: Math.round(remaining),
        status,
        provider: resolvedProvider,
        retryCount,
      });
    };

    // ── Google Drive: Chunked Resumable Upload ──
    if (resolvedProvider === 'google_drive') {
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB (must be multiple of 256 KB)
      const totalSize = file.size;
      let bytesSent = 0;
      const uploadStartTime = Date.now();

      while (bytesSent < totalSize) {
        const chunkEnd = Math.min(bytesSent + CHUNK_SIZE, totalSize);
        const chunk = file.slice(bytesSent, chunkEnd);
        const contentRange = `bytes ${bytesSent}-${chunkEnd - 1}/${totalSize}`;

        let chunkUploaded = false;
        let retryCount = 0;
        const maxRetries = 5;

        while (!chunkUploaded && retryCount <= maxRetries) {
          try {
            if (retryCount > 0) {
              reportProgress((bytesSent / totalSize) * 100, 0, 0, 'retrying', retryCount);
              // Exponential backoff: 1s, 2s, 4s, 8s, 16s
              await new Promise(r => setTimeout(r, Math.pow(2, retryCount - 1) * 1000));

              // Query Google to find last committed byte (resume point)
              try {
                const statusRes = await fetch(uploadUrl, {
                  method: 'PUT',
                  headers: { 'Content-Range': `bytes */${totalSize}` },
                });
                if (statusRes.status === 308) {
                  const rangeHeader = statusRes.headers.get('Range');
                  if (rangeHeader && rangeHeader.startsWith('bytes=0-')) {
                    const serverReceived = parseInt(rangeHeader.split('-')[1], 10) + 1;
                    if (serverReceived > bytesSent) {
                      bytesSent = serverReceived;
                      // Recalculate chunk boundaries
                      break; // Break inner retry loop, outer while will recalculate
                    }
                  }
                } else if (statusRes.status === 200 || statusRes.status === 201) {
                  // Upload was already completed
                  const responseData = await statusRes.json();
                  const finalKey = responseData?.id || objectKey;
                  await api.post(`/movies/${id}/confirm-upload`, {
                    objectKey: finalKey,
                    fileSize: file.size,
                    contentType: file.type,
                    provider: resolvedProvider,
                  });
                  reportProgress(100, 0, 0, 'completed');
                  return { success: true, fileName: finalKey, size: file.size, mimeType: file.type };
                }
              } catch (queryErr) {
                console.warn('Failed to query upload status, continuing retry:', queryErr);
              }
            }

            const chunkResponse = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Range': contentRange,
                'Content-Length': String(chunkEnd - bytesSent),
              },
              body: chunk,
            });

            if (chunkResponse.status === 200 || chunkResponse.status === 201) {
              // Upload complete
              const responseData = await chunkResponse.json();
              const finalKey = responseData?.id || objectKey;

              await api.post(`/movies/${id}/confirm-upload`, {
                objectKey: finalKey,
                fileSize: file.size,
                contentType: file.type,
                provider: resolvedProvider,
              });

              reportProgress(100, 0, 0, 'completed');
              return { success: true, fileName: finalKey, size: file.size, mimeType: file.type };

            } else if (chunkResponse.status === 308) {
              // Chunk accepted, continue
              const rangeHeader = chunkResponse.headers.get('Range');
              if (rangeHeader && rangeHeader.startsWith('bytes=0-')) {
                bytesSent = parseInt(rangeHeader.split('-')[1], 10) + 1;
              } else {
                bytesSent = chunkEnd;
              }
              chunkUploaded = true;

              // Calculate progress
              const elapsed = (Date.now() - uploadStartTime) / 1000;
              const bytesPerSec = elapsed > 0 ? bytesSent / elapsed : 0;
              const remaining = bytesPerSec > 0 ? (totalSize - bytesSent) / bytesPerSec : 0;
              reportProgress((bytesSent / totalSize) * 100, bytesPerSec / 1024, remaining, 'uploading');

            } else if (chunkResponse.status >= 500) {
              retryCount++;
              if (retryCount > maxRetries) {
                throw new Error(`Google Drive upload failed with server error ${chunkResponse.status} after ${maxRetries} retries`);
              }
            } else {
              const errorText = await chunkResponse.text().catch(() => '');
              throw new Error(`Google Drive chunk upload failed: ${chunkResponse.status} ${errorText}`);
            }
          } catch (err) {
            if (err.name === 'TypeError' || err.message === 'Failed to fetch') {
              // Network error
              retryCount++;
              if (retryCount > maxRetries) {
                throw new Error('Network error during Google Drive upload. Please check your connection and try again.');
              }
            } else if (!err.message?.includes('retries')) {
              throw err;
            }
          }
        }
      }
      throw new Error('Google Drive upload ended without completion.');
    }

    // ── Backblaze / Other: Single PUT with retry ──
    return new Promise((resolve, reject) => {
      const maxRetries = 3;
      let retryCount = 0;

      const attemptUpload = () => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);

        const uploadStartTime = Date.now();

        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          const elapsed = (Date.now() - uploadStartTime) / 1000;
          const bytesPerSec = elapsed > 0 ? e.loaded / elapsed : 0;
          const remaining = bytesPerSec > 0 ? (e.total - e.loaded) / bytesPerSec : 0;

          reportProgress(
            (e.loaded / e.total) * 100,
            bytesPerSec / 1024,
            remaining,
            'uploading'
          );
        };

        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              let finalKey = objectKey;

              if (resolvedProvider === 'google_drive') {
                try {
                  const responseData = JSON.parse(xhr.responseText);
                  if (responseData?.id) finalKey = responseData.id;
                } catch (parseErr) {
                  console.error('Failed to parse upload response:', parseErr);
                }
              }

              await api.post(`/movies/${id}/confirm-upload`, {
                objectKey: finalKey,
                fileSize: file.size,
                contentType: file.type,
                provider: resolvedProvider,
              });

              reportProgress(100, 0, 0, 'completed');
              resolve({ success: true, fileName: finalKey, size: file.size, mimeType: file.type });
            } catch (confirmErr) {
              reject(new Error(confirmErr.response?.data?.message || 'Failed to confirm upload on backend'));
            }
          } else if (xhr.status >= 500 && retryCount < maxRetries) {
            retryCount++;
            reportProgress(0, 0, 0, 'retrying', retryCount);
            setTimeout(attemptUpload, Math.pow(2, retryCount - 1) * 1000);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          if (retryCount < maxRetries) {
            retryCount++;
            reportProgress(0, 0, 0, 'retrying', retryCount);
            setTimeout(attemptUpload, Math.pow(2, retryCount - 1) * 1000);
          } else {
            reject(new Error('Network error during upload. Please check your connection.'));
          }
        };

        xhr.ontimeout = () => {
          if (retryCount < maxRetries) {
            retryCount++;
            reportProgress(0, 0, 0, 'retrying', retryCount);
            setTimeout(attemptUpload, Math.pow(2, retryCount - 1) * 1000);
          } else {
            reject(new Error('Upload timed out after multiple retries.'));
          }
        };

        xhr.send(file);
      };

      attemptUpload();
    });
  },

  /** Delete a movie's video. Admin only. */
  deleteVideo: (id) => api.delete(`/movies/${id}/video`),

  /** Get storage statistics. Admin only. */
  getStorageStats: () => api.get('/movies/storage/stats'),
};

// ---- TMDB ----
export const tmdbApi = {
  getNowPlaying: (page = 1) => api.get(`/tmdb/now-playing?page=${page}`),
  getUpcoming: (page = 1) => api.get(`/tmdb/upcoming?page=${page}`),
  getPopular: (page = 1) => api.get(`/tmdb/popular?page=${page}`),
  getTrending: () => api.get(`/tmdb/trending`),
  getTopRated: (page = 1) => api.get(`/tmdb/top-rated?page=${page}`),
  search: (query, page = 1) =>
    api.get(`/tmdb/search?query=${encodeURIComponent(query)}&page=${page}`),
  getMovieDetails: (tmdbId) => api.get(`/tmdb/movie/${tmdbId}`),
};

// ---- Theatres ----
export const theatresApi = {
  getAll: (params) => api.get('/theatres', { params }),
  getById: (id) => api.get(`/theatres/${id}`),
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
