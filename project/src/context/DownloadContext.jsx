import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { moviesApi, watchHistoryApi } from '../lib/api';
import { X, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

import { formatBytes } from '../lib/utils';

// Movie type imported from '../lib/types'
// formatBytes imported from '../lib/utils'

const DownloadContext = createContext(undefined);

export const DownloadProvider = ({ children }) => {
  const { isLoggedIn, profile } = useAuth();
  const { toast } = useToast();
  const [download, setDownload] = useState(null);
  const [downloadStatuses, setDownloadStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem('cinebook_downloaded_movies');
      if (saved) {
        const ids = JSON.parse(saved);
        const map = {};
        ids.forEach((id) => {
          map[id] = 'completed';
        });
        return map;
      }
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  const cancelDownload = () => {
    if (download?.xhr) {
      download.xhr.abort();
      toast('Download cancelled', 'info');
    }
    if (download) {
      setDownloadStatuses((prev) => ({ ...prev, [download.movieId]: 'idle' }));
    }
    setDownload(null);
  };

  const startDownload = async (movie, forceProvider) => {
    if (!isLoggedIn) {
      toast('Please log in to download movies', 'error');
      return;
    }

    setDownloadStatuses((prev) => ({ ...prev, [movie.id]: 'downloading' }));

    setDownload((prev) => {
      if (prev?.xhr) prev.xhr.abort();
      return {
        movieId: movie.id,
        movieTitle: movie.title,
        posterUrl: movie.posterUrl,
        percent: 0,
        speed: 0,
        remaining: 0,
        totalBytes: movie.fileSize || 0,
        loadedBytes: 0,
        status: forceProvider ? 'switching' : 'downloading',
        xhr: null,
        provider: forceProvider || movie.storageProvider || 'backblaze_b2',
        movie,
      };
    });

    toast(
      forceProvider
        ? `Switching storage provider for download...`
        : `Starting download: ${movie.title}`,
      'info'
    );

    try {
      const res = await moviesApi.getStreamUrl(movie.id, forceProvider);
      const { streamUrl, source, cloudSwitching } = res.data;

      if (cloudSwitching) {
        toast(
          `Dynamic switch: Sourced from secondary cloud (${source === 'google_drive' ? 'Google Drive' : 'Backblaze B2'})`,
          'info'
        );
      }

      const xhr = new XMLHttpRequest();
      xhr.open('GET', streamUrl, true);
      xhr.responseType = 'blob';

      let startTime = Date.now();
      let lastTime = startTime;
      let lastLoaded = 0;

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000;

          const loaded = event.loaded;
          const total = event.total;

          const bytesSinceLast = loaded - lastLoaded;
          const currentSpeed = timeDiff > 0 ? bytesSinceLast / timeDiff : 0;
          const remainingBytes = total - loaded;
          const eta = currentSpeed > 0 ? remainingBytes / currentSpeed : 0;

          lastTime = currentTime;
          lastLoaded = loaded;

          setDownload((prev) => {
            if (!prev || prev.movieId !== movie.id) return prev;
            return {
              ...prev,
              percent: Math.round((loaded / total) * 100),
              speed: Math.round(currentSpeed / 1024), // in KB/s
              remaining: Math.round(eta),
              loadedBytes: loaded,
              totalBytes: total,
              xhr,
            };
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const blob = xhr.response;
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          const extension = movie.videoFileName
            ? movie.videoFileName.split('.').pop()
            : 'mp4';
          link.download = `${movie.title.trim().replace(/\s+/g, '_')}_${movie.videoResolution || '1080p'}.${extension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(downloadUrl);

          setDownload((prev) => {
            if (!prev || prev.movieId !== movie.id) return prev;
            return { ...prev, status: 'completed', percent: 100, xhr: null };
          });
          setDownloadStatuses((prev) => ({ ...prev, [movie.id]: 'completed' }));

          if (profile?.id) {
            watchHistoryApi
              .saveProgress(profile.id, movie.id, 120)
              .catch(console.error);
          }

          try {
            const saved = localStorage.getItem('cinebook_downloaded_movies');
            const ids = saved ? JSON.parse(saved) : [];
            if (!ids.includes(movie.id)) {
              ids.push(movie.id);
              localStorage.setItem(
                'cinebook_downloaded_movies',
                JSON.stringify(ids)
              );
            }
          } catch (e) {
            console.error(e);
          }

          toast(`Download completed: ${movie.title}`, 'success');
        } else {
          handleDownloadError(movie, xhr.status);
        }
      };

      const handleDownloadError = (movieObj, status) => {
        console.error(`Download failed with status ${status}`);
        const currentProvider =
          forceProvider || movieObj.storageProvider || 'backblaze_b2';
        const fallback =
          currentProvider === 'backblaze_b2' ? 'google_drive' : 'backblaze_b2';

        if (!forceProvider) {
          toast(
            `Main server failed (${status}). Trying backup cloud server...`,
            'warning'
          );
          startDownload(movieObj, fallback);
        } else {
          setDownload((prev) => {
            if (!prev || prev.movieId !== movieObj.id) return prev;
            return { ...prev, status: 'failed', xhr: null };
          });
          setDownloadStatuses((prev) => ({ ...prev, [movieObj.id]: 'failed' }));
          toast(
            `All storage servers failed. Please check internet connection.`,
            'error'
          );
        }
      };

      xhr.onerror = () => {
        toast(
          `Programmatic download failed. Starting native fallback...`,
          'info'
        );
        const link = document.createElement('a');
        link.href = streamUrl;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownload((prev) => {
          if (!prev || prev.movieId !== movie.id) return prev;
          return { ...prev, status: 'completed', percent: 100, xhr: null };
        });
        setDownloadStatuses((prev) => ({ ...prev, [movie.id]: 'completed' }));
      };

      xhr.send();
    } catch (err) {
      console.error(err);
      setDownload((prev) => {
        if (!prev || prev.movieId !== movie.id) return prev;
        return { ...prev, status: 'failed', xhr: null };
      });
      setDownloadStatuses((prev) => ({ ...prev, [movie.id]: 'failed' }));
      toast(`Download error: unable to retrieve download path`, 'error');
    }
  };

  const handleRetry = () => {
    if (download?.movie) {
      startDownload(download.movie);
    }
  };

  return (
    <DownloadContext.Provider
      value={{ download, downloadStatuses, startDownload, cancelDownload }}
    >
      {children}
      {download && (
        <DownloadProgress
          download={download}
          onCancel={cancelDownload}
          onRetry={handleRetry}
        />
      )}
    </DownloadContext.Provider>
  );
};

export const useDownload = () => {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error('useDownload must be used within a DownloadProvider');
  }
  return context;
};

const DownloadProgress = ({ download, onCancel, onRetry }) => {
  const formatETA = (seconds) => {
    if (seconds === Infinity || isNaN(seconds)) return 'Calculating...';
    if (seconds < 60) return `${seconds}s remaining`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ${seconds % 60}s remaining`;
  };

  const formatSpeed = (speedKb) => {
    if (speedKb >= 1024) return `${(speedKb / 1024).toFixed(2)} MB/s`;
    return `${speedKb} KB/s`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-black/90 border border-white/15 backdrop-blur-xl rounded-2xl p-4 shadow-2xl animate-slide-up flex gap-3 text-sm">
      <img
        src={download.posterUrl}
        alt=""
        className="w-12 h-18 rounded object-cover border border-white/10 shrink-0"
      />

      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-start">
          <div className="max-w-[180px]">
            <h4
              className="font-bold text-white truncate text-xs"
              title={download.movieTitle}
            >
              {download.movieTitle}
            </h4>
            <span className="text-[10px] text-gray-400 capitalize">
              Server:{' '}
              {download.provider === 'google_drive'
                ? 'Google Drive'
                : 'Backblaze B2'}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-red-400 transition-colors p-0.5 hover:bg-white/5 rounded"
            title="Cancel Download"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {download.status === 'switching' && (
          <div className="text-xs text-yellow-400 flex items-center gap-1.5 animate-pulse py-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Switching to
            backup cloud server...
          </div>
        )}

        {download.status === 'downloading' && (
          <>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>{download.percent}%</span>
                <span>{formatETA(download.remaining)}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#e63946] to-[#ffd60a] rounded-full transition-all"
                  style={{ width: `${download.percent}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-gray-500 font-mono pt-1">
              <span>
                {formatSpeed(download.speed)} •{' '}
                {formatBytes(download.loadedBytes)} /{' '}
                {formatBytes(download.totalBytes)}
              </span>
              <button
                onClick={onCancel}
                className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded font-semibold text-[10px] transition-colors ml-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {download.status === 'completed' && (
          <div className="text-xs text-green-400 font-bold flex items-center gap-1.5 py-1">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Download Complete!
            Saved offline.
          </div>
        )}

        {download.status === 'failed' && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-red-400 font-semibold flex items-center gap-1">
              <AlertCircle className="w-4 h-4 shrink-0" /> Failed
            </span>
            <button
              onClick={onRetry}
              className="text-xs text-[#ffd60a] hover:underline flex items-center gap-1 font-bold"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
