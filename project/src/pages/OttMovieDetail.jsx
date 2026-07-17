import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Plus,
  Share2,
  Star,
  Clock,
  Calendar,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Download,
  X,
  Check,
} from 'lucide-react';
import { moviesApi, watchlistApi, watchHistoryApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDownload } from '../context/DownloadContext';
import VideoPlayer from '../components/VideoPlayer';

import { formatBytes, getYoutubeId } from '../lib/utils';
import SafeImage from '../components/SafeImage';

// Movie type imported from '../lib/types'
// formatBytes and getYoutubeId imported from '../lib/utils'

export default function OttMovieDetail() {
  const { id } = useParams();
  const { profile, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [initialProgress, setInitialProgress] = useState(0);
  const [streamUrl, setStreamUrl] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(null);

  // Download State
  const { downloadStatuses, startDownload } = useDownload();
  const downloadStatus = downloadStatuses[Number(id)] || 'idle';

  const loadHistory = useCallback(() => {
    if (isLoggedIn && profile?.id && id) {
      watchHistoryApi
        .getUserHistory(profile.id)
        .then((res) => {
          const record = res.data.find((h) => h.movie?.id === Number(id));
          if (record) {
            setInitialProgress(record.progressSeconds || 0);
          }
        })
        .catch(console.error);
    }
  }, [id, isLoggedIn, profile]);

  useEffect(() => {
    if (!id) return;
    moviesApi
      .getById(Number(id))
      .then((res) => {
        setMovie(res.data);
      })
      .catch((err) => {
        console.error('Failed to load movie details:', err);
      })
      .finally(() => setLoading(false));

    loadHistory();

    // Check if in watchlist
    if (isLoggedIn && profile?.id && id) {
      watchlistApi
        .getUserWatchlist(profile.id)
        .then((res) => {
          const hasIt = res.data.some((w) => w.movie?.id === Number(id));
          setInWatchlist(hasIt);
        })
        .catch(console.error);
    }
  }, [id, isLoggedIn, profile, loadHistory]);

  const handleWatch = async () => {
    if (!isLoggedIn) {
      toast('Please log in to watch movies', 'error');
      return;
    }

    setStreamLoading(true);
    setStreamError(null);
    try {
      const res = await moviesApi.getStreamUrl(Number(id));
      const url = res.data.streamUrl;
      setStreamUrl(url);
      setIsStreaming(true);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to load stream. Please try again.';
      setStreamError(msg);
      toast(msg, 'error');
    } finally {
      setStreamLoading(false);
    }
  };

  const handleToggleWatchlist = () => {
    if (!isLoggedIn) {
      toast('Please log in to add to watchlist', 'error');
      return;
    }
    watchlistApi.toggleWatchlist(profile.id, Number(id)).then((res) => {
      setInWatchlist(res.data.status === 'added');
      toast(
        res.data.status === 'added'
          ? 'Added to Watchlist'
          : 'Removed from Watchlist',
        'success'
      );
    });
  };

  const triggerDownload = () => {
    if (movie) {
      startDownload(movie);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen pt-24 text-center text-white bg-[#0a0a0f] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#e63946]" /> Loading
        Details...
      </div>
    );

  if (!movie)
    return (
      <div className="min-h-screen pt-24 text-center text-white bg-[#0a0a0f]">
        Movie not found
      </div>
    );

  const videoId = getYoutubeId(movie.trailerUrl);
  const hasVideo = !!(movie.videoFileName || movie.streamUrl);

  return (
    <div className="bg-[#0a0a0f] min-h-screen pb-16 relative overflow-x-hidden text-gray-200">
      {/* Back Button */}
      <div className="absolute top-24 left-6 md:left-12 z-50">
        <button
          onClick={() => navigate('/ott')}
          className="flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-white/10 text-white rounded-full transition-all border border-white/10 backdrop-blur"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Browse
        </button>
      </div>

      {/* Banner Backdrop */}
      <div className="relative h-[70vh] md:h-[80vh] w-full">
        {isStreaming && streamUrl ? (
          <div className="absolute top-24 bottom-4 left-4 right-4 z-20 bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <VideoPlayer
              movieId={movie.id}
              videoUrl={streamUrl}
              movieTitle={movie.title}
              initialProgressSeconds={initialProgress}
              onClose={() => {
                setIsStreaming(false);
                setStreamUrl(null);
                loadHistory();
              }}
            />
          </div>
        ) : isPlaying && videoId ? (
          <div className="absolute top-24 bottom-4 left-4 right-4 z-20 bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            ></iframe>
            <button
              onClick={() => setIsPlaying(false)}
              className="absolute top-4 right-4 bg-black/80 text-white p-2.5 rounded-full hover:bg-[#e63946] transition-all border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <div className="absolute inset-0">
              <SafeImage
                src={
                  movie.bannerUrl ||
                  movie.posterUrl ||
                  `https://placehold.co/1920x1080/0c0c14/333?text=${encodeURIComponent(movie.title)}`
                }
                alt={movie.title}
                className="w-full h-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent" />
            </div>

            <div className="absolute bottom-0 left-0 w-full p-6 md:p-16 lg:p-24 z-10 flex flex-col md:flex-row items-end justify-between gap-8 h-full">
              <div className="max-w-4xl animate-slide-up w-full flex flex-col md:flex-row gap-8 items-center md:items-end max-w-7xl mx-auto">
                <SafeImage
                  src={
                    movie.posterUrl ||
                    `https://placehold.co/500x750/0c0c14/333?text=${encodeURIComponent(movie.title)}`
                  }
                  alt={movie.title}
                  className="w-48 md:w-56 rounded-2xl shadow-2xl border border-white/10 hidden md:block transition-all duration-300 transform hover:scale-105"
                />

                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-4 flex-wrap text-xs">
                    <span className="px-2.5 py-0.5 bg-[#e63946] text-white font-bold rounded-full uppercase tracking-wider">
                      {movie.ottPlatform || 'OTT PREMIERE'}
                    </span>
                    <span className="text-[#ffd60a] font-bold flex items-center gap-0.5">
                      <Star className="w-4 h-4 fill-current text-[#ffd60a]" />{' '}
                      {movie.rating}/10
                    </span>
                    <span className="text-gray-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {movie.duration} min
                    </span>
                    <span className="text-gray-300 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />{' '}
                      {movie.createdAt
                        ? new Date(movie.createdAt).getFullYear()
                        : '2026'}
                    </span>
                    <span className="px-1.5 py-0.5 border border-white/20 rounded text-gray-300 font-mono uppercase">
                      {movie.language}
                    </span>
                  </div>

                  <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 font-outfit drop-shadow-md leading-tight">
                    {movie.title}
                  </h1>

                  <p className="text-gray-300 mb-8 max-w-2xl text-shadow leading-relaxed text-sm md:text-base">
                    {movie.synopsis}
                  </p>

                  {streamError && (
                    <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 mb-4 max-w-sm mx-auto md:mx-0">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {streamError}
                    </div>
                  )}

                  <div className="flex items-center justify-center md:justify-start gap-4 flex-wrap">
                    {hasVideo && (
                      <button
                        onClick={handleWatch}
                        disabled={streamLoading}
                        className="btn-primary flex items-center gap-2 !px-8 !py-4 text-base rounded-xl transition-all shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 disabled:opacity-75"
                      >
                        {streamLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />{' '}
                            Loading...
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5 fill-current" /> Watch Now
                          </>
                        )}
                      </button>
                    )}

                    {videoId && (
                      <button
                        onClick={() => setIsPlaying(true)}
                        className="btn-ghost flex items-center gap-2 !px-6 !py-4 text-base rounded-xl bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md"
                      >
                        Watch Trailer
                      </button>
                    )}

                    {movie.downloadEnabled && (
                      <button
                        onClick={() => triggerDownload()}
                        className="btn-ghost flex items-center gap-2 !px-6 !py-4 text-base rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 backdrop-blur-md transition-all"
                      >
                        {downloadStatus === 'completed' ? (
                          <>
                            <Check className="w-5 h-5" /> Saved Offline
                          </>
                        ) : downloadStatus === 'downloading' ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />{' '}
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="w-5 h-5" /> Download Movie
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={handleToggleWatchlist}
                      className="btn-ghost flex items-center gap-2 !px-6 !py-4 text-base rounded-xl bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md"
                    >
                      {inWatchlist ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                      {inWatchlist ? 'In My List' : 'My List'}
                    </button>

                    <button className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur border border-white/5 active:scale-95">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Details & Specs Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* Top Cast Card Grid */}
          {movie.castList && movie.castList.length > 0 && (
            <section>
              <h3 className="text-2xl font-bold text-white mb-6 font-outfit border-l-4 border-[#e63946] pl-2 leading-none">
                Top Cast
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {movie.castList.map((actor, idx) => (
                  <div
                    key={idx}
                    className="glass rounded-2xl p-4 flex items-center gap-3 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#e63946] to-[#ffd60a] flex items-center justify-center font-bold text-white shadow-inner shrink-0 text-sm">
                      {actor[0]}
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-white text-xs font-semibold truncate"
                        title={actor}
                      >
                        {actor}
                      </p>
                      <p className="text-gray-500 text-[10px]">Actor</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Technical Specs & About Metadata */}
          <section>
            <h3 className="text-2xl font-bold text-white mb-6 font-outfit border-l-4 border-[#ffd60a] pl-2 leading-none">
              About the Content
            </h3>
            <div className="glass rounded-3xl p-6 md:p-8 space-y-4 border border-white/5">
              <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-4 text-sm">
                <span className="text-gray-500">Genres</span>
                <span className="col-span-2 text-white font-medium">
                  {movie.genre}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-4 text-sm">
                <span className="text-gray-500">Audio Languages</span>
                <span className="col-span-2 text-white font-medium">
                  {movie.language}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-4 text-sm">
                <span className="text-gray-500">Cloud Storage Server</span>
                <span className="col-span-2 text-[#ffd60a] font-medium uppercase">
                  {movie.storageProvider === 'google_drive'
                    ? 'Google Drive (Proxy)'
                    : movie.storageProvider === 'backblaze_b2'
                      ? 'Backblaze B2 (S3-compatible)'
                      : 'CineBook Primary Storage'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-4 text-sm">
                <span className="text-gray-500">Download Resolution</span>
                <span className="col-span-2 text-white font-mono font-medium">
                  {movie.videoResolution || '1080p Full HD'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-4 text-sm">
                <span className="text-gray-500">Download File Size</span>
                <span className="col-span-2 text-white font-mono font-medium">
                  {formatBytes(movie.fileSize || 0)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <span className="text-gray-500">Maturity Rating</span>
                <span className="col-span-2">
                  <span className="px-2 py-0.5 bg-white/10 text-white rounded text-xs font-bold border border-white/20 font-mono">
                    U/A 16+
                  </span>
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Sidebar Score Cards */}
        <div className="space-y-8">
          <div className="glass-strong rounded-3xl p-6 border-t-4 border-[#e63946] border border-white/5">
            <h4 className="text-white font-bold mb-2 flex items-center gap-2 text-sm font-outfit">
              <Star className="text-[#ffd60a] w-4.5 h-4.5 fill-current" />{' '}
              CineBook Score
            </h4>
            <div className="text-4xl font-extrabold text-white font-outfit">
              {movie.rating}{' '}
              <span className="text-gray-500 text-lg font-normal">/ 10</span>
            </div>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Aggregated rating computed based on theatrical performance and
              user reviews.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 border border-white/5 space-y-3">
            <h4 className="text-white font-bold text-sm font-outfit">
              Quality Info
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              This movie is fully optimized for smooth downloading with
              high-quality range request support. Resumes directly if
              interrupted.
            </p>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-bold font-mono uppercase">
                {movie.videoResolution || '1080P'}
              </span>
              <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-bold font-mono uppercase">
                {movie.videoFileName
                  ? movie.videoFileName.split('.').pop()
                  : 'MP4'}
              </span>
              <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-bold font-mono">
                AAC 2.0
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
