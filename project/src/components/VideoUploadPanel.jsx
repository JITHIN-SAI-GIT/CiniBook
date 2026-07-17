import { useRef, useState, useEffect } from 'react';
import {
  Upload,
  Trash2,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Image,
  Video,
} from 'lucide-react';
import { moviesApi } from '../lib/api';
import { useToast } from '../context/ToastContext';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatSeconds(s) {
  if (!isFinite(s) || s <= 0) return '—';
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

export default function VideoUploadPanel({
  movieId,
  movieTitle,
  videoState,
  onUpdated,
}) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [storageStats, setStorageStats] = useState(null);

  // Storage Provider selection
  const [selectedProvider, setSelectedProvider] = useState('auto');

  // Dynamic TMDB/DB Movie Details
  const [movieDetails, setMovieDetails] = useState(null);

  useEffect(() => {
    moviesApi
      .getStorageStats()
      .then((r) => setStorageStats(r.data))
      .catch(() => {});

    // Fetch detailed movie info from DB (synopsis, poster, trailer links)
    moviesApi
      .getById(movieId)
      .then((res) => setMovieDetails(res.data))
      .catch(console.error);
  }, [movieId]);

  const ALLOWED_TYPES = [
    'video/mp4',
    'video/webm',
    'video/x-matroska',
    'video/quicktime',
  ];

  // Dynamic max size based on available cloud storage (no hardcoded limit)
  const getMaxUploadSize = () => {
    if (!storageStats?.providers) return Infinity;
    // Find remaining storage for the selected provider (or best available for 'auto')
    if (selectedProvider === 'auto') {
      const bestRemaining = storageStats.providers
        .filter((p) => p.configured && p.healthy)
        .reduce((max, p) => Math.max(max, p.storageRemaining || 0), 0);
      return bestRemaining > 0 ? bestRemaining : Infinity;
    }
    const provider = storageStats.providers.find(
      (p) => p.providerId === selectedProvider
    );
    return provider?.storageRemaining > 0 ? provider.storageRemaining : Infinity;
  };

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid type: ${file.type}. Allowed: MP4, WebM, MKV, MOV`;
    }
    const maxSize = getMaxUploadSize();
    if (maxSize !== Infinity && file.size > maxSize) {
      return `File too large: ${formatBytes(file.size)}. Available storage: ${formatBytes(maxSize)}`;
    }
    return null;
  };

  const startUpload = async (file) => {
    const err = validateFile(file);
    if (err) {
      setUploadError(err);
      toast(err, 'error');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setProgress({ percent: 0, speed: 0, remaining: 0 });

    const providerParam =
      selectedProvider === 'auto' ? undefined : selectedProvider;

    try {
      await moviesApi.uploadVideo(movieId, file, providerParam, (p) => {
        setProgress(p);
      });

      setProgress({ percent: 100, speed: 0, remaining: 0 });
      setUploadSuccess(true);

      const providerFriendly =
        selectedProvider === 'google_drive'
          ? 'Google Drive'
          : selectedProvider === 'backblaze_b2'
            ? 'Backblaze B2'
            : 'Cloud Storage';
      toast(
        `✅ "${movieTitle}" video uploaded to ${providerFriendly}!`,
        'success'
      );
      onUpdated();

      // Reload details to get new storage state
      moviesApi
        .getById(movieId)
        .then((res) => setMovieDetails(res.data))
        .catch(console.error);
    } catch (e) {
      const msg = e?.message || 'Upload failed. Please try again.';
      setUploadError(msg);
      toast(msg, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) startUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) startUpload(file);
  };

  const handleDelete = async () => {
    const providerName =
      videoState.storageProvider === 'google_drive'
        ? 'Google Drive'
        : 'Backblaze B2';
    if (
      !confirm(
        `Delete the video for "${movieTitle}" from ${providerName}? This cannot be undone.`
      )
    )
      return;
    setDeleting(true);
    try {
      await moviesApi.deleteVideo(movieId);
      toast(`Video deleted from ${providerName}`, 'success');
      setUploadSuccess(false);
      onUpdated();

      // Reload details to get new storage state
      moviesApi
        .getById(movieId)
        .then((res) => setMovieDetails(res.data))
        .catch(console.error);
    } catch (e) {
      toast(e?.response?.data?.message || 'Failed to delete video', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-4 space-y-4 bg-white/5 border border-white/5 rounded-2xl p-4 text-left">
      {/* Movie Details, Poster Preview & Trailer links fetched from TMDB/DB */}
      {movieDetails && (
        <div className="flex gap-4 p-3 bg-black/30 border border-white/10 rounded-xl">
          <img
            src={
              movieDetails.posterUrl ||
              'https://placehold.co/120x180/1a1a2e/ffffff?text=Poster'
            }
            alt="Poster"
            className="w-16 h-24 object-cover rounded border border-white/10 shrink-0 shadow-lg"
            onError={(e) => {
              e.target.src =
                'https://placehold.co/120x180/1a1a2e/ffffff?text=Poster';
            }}
          />

          <div className="flex-1 min-w-0 space-y-1.5 flex flex-col justify-center">
            <h4 className="font-bold text-white text-base truncate">
              {movieDetails.title}
            </h4>
            <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
              {movieDetails.synopsis || 'No synopsis details stored.'}
            </p>

            <div className="flex items-center gap-4 text-xs font-semibold pt-1">
              {movieDetails.posterUrl && (
                <a
                  href={movieDetails.posterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Image className="w-3.5 h-3.5" /> Poster Link
                </a>
              )}
              {movieDetails.trailerUrl && (
                <a
                  href={movieDetails.trailerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Video className="w-3.5 h-3.5" /> Trailer Link
                </a>
              )}
              {movieDetails.tmdbId && (
                <a
                  href={`https://www.themoviedb.org/movie/${movieDetails.tmdbId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  🎬 TMDB Details
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cloud Selector Button/Dropdown */}
      {!uploading && !videoState.hasVideo && (
        <div className="flex flex-col gap-1.5 bg-black/20 p-3 rounded-xl border border-white/5 max-w-sm">
          <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-purple-400" /> Target Storage
            Cloud:
          </label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <button
              type="button"
              onClick={() => setSelectedProvider('auto')}
              className={`py-1.5 px-2 text-[10px] rounded-lg font-bold border transition-all ${
                selectedProvider === 'auto'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              🔄 Auto Selection
            </button>
            <button
              type="button"
              onClick={() => setSelectedProvider('backblaze_b2')}
              className={`py-1.5 px-2 text-[10px] rounded-lg font-bold border transition-all ${
                selectedProvider === 'backblaze_b2'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              🔥 Backblaze B2
            </button>
            <button
              type="button"
              onClick={() => setSelectedProvider('google_drive')}
              className={`py-1.5 px-2 text-[10px] rounded-lg font-bold border transition-all ${
                selectedProvider === 'google_drive'
                  ? 'bg-green-500/20 border-green-500 text-green-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              🍀 Google Drive
            </button>
          </div>
        </div>
      )}

      {/* Current video status */}
      {videoState.hasVideo ? (
        <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/30 rounded-xl p-3">
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-green-400">
                Video Stored Online
              </span>
              <span className="px-2 py-0.5 bg-green-500/20 text-green-300 border border-green-500/30 rounded font-bold uppercase tracking-wider text-[9px]">
                {videoState.storageProvider === 'google_drive'
                  ? 'Google Drive'
                  : 'Backblaze B2'}
              </span>
            </div>
            {videoState.fileSize && (
              <p className="text-xs text-gray-400 mt-1">
                {formatBytes(videoState.fileSize)}
                {videoState.mimeType ? ` • ${videoState.mimeType}` : ''}
                {videoState.uploadDate
                  ? ` • ${new Date(videoState.uploadDate).toLocaleDateString()}`
                  : ''}
              </p>
            )}
            {videoState.videoFileName && (
              <p className="text-[10px] text-gray-500 mt-1.5 font-mono truncate">
                {videoState.videoFileName}
              </p>
            )}
          </div>
          {/* Replace / Delete buttons */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || deleting}
              title="Replace video"
              className="text-blue-400 hover:text-blue-300 p-1 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting || uploading}
              title="Delete video"
              className="text-red-400 hover:text-red-300 p-1 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5" /> No video uploaded yet.
        </p>
      )}

      {/* Upload area */}
      {!uploading && !videoState.hasVideo && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-[#e63946] bg-[#e63946]/10'
              : 'border-white/15 hover:border-[#e63946]/50 hover:bg-white/5'
          }`}
        >
          <Upload className="w-7 h-7 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-300 font-medium">
            {dragOver ? 'Drop to upload' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            MP4, WebM, MKV, MOV · No size limit · Multi-Cloud Resumable Upload
          </p>
        </div>
      )}

      {/* Progress bar */}
      {uploading && progress && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#e63946]" />
              <span className="text-sm font-semibold text-white">
                {progress.status === 'retrying'
                  ? `Retrying (attempt ${progress.retryCount || 1})...`
                  : `Uploading to ${progress.provider === 'google_drive'
                      ? 'Google Drive'
                      : progress.provider === 'backblaze_b2'
                        ? 'Backblaze B2'
                        : selectedProvider === 'google_drive'
                          ? 'Google Drive'
                          : selectedProvider === 'backblaze_b2'
                            ? 'Backblaze B2'
                            : 'Selected Cloud Server'}...`}
              </span>
            </div>
            <span className="text-sm font-bold text-[#ffd60a]">
              {progress.percent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress.status === 'retrying'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse'
                  : 'bg-gradient-to-r from-[#e63946] to-[#ffd60a]'
              }`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-xs text-gray-400">
            <span>
              <HardDrive className="inline w-3 h-3 mr-1" />
              {progress.speed > 1024
                ? `${(progress.speed / 1024).toFixed(1)} MB/s`
                : progress.speed > 0
                  ? `${progress.speed} KB/s`
                  : 'Calculating...'}
            </span>
            <span>
              ETA:{' '}
              {progress.remaining > 0 ? formatSeconds(progress.remaining) : '—'}
            </span>
            {progress.status && (
              <span className={`font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                progress.status === 'retrying'
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : progress.status === 'completed'
                    ? 'bg-green-500/20 text-green-300'
                    : progress.status === 'failed'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-blue-500/20 text-blue-300'
              }`}>
                {progress.status}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Success message */}
      {uploadSuccess && !uploading && (
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Video uploaded successfully! The movie is now live and streamable.
        </div>
      )}

      {/* Error message */}
      {uploadError && !uploading && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Cloud Storage Stats */}
      {!uploading && storageStats && storageStats.configured && (
        <div className="flex justify-between items-center text-xs text-gray-500 bg-white/5 rounded px-3 py-2 border border-white/5">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5" /> Cloud Storage Used
          </span>
          <span className="font-mono">
            {storageStats.totalSizeGb.toFixed(2)} GB
          </span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/x-matroska,video/quicktime,.mp4,.webm,.mkv,.mov"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
