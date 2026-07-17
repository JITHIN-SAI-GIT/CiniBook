import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Loader2,
  Settings,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { watchHistoryApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function VideoPlayer({
  movieId,
  videoUrl,
  initialProgressSeconds = 0,
  subtitleUrl,
  movieTitle,
  onClose,
}) {
  const { profile, isLoggedIn } = useAuth();
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAudioInfo, setShowAudioInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const subtitlesEnabled = true;

  const controlsTimeoutRef = useRef(null);

  // Resume progress on load
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      video.volume = volume;
      video.muted = isMuted;
      if (
        initialProgressSeconds > 0 &&
        initialProgressSeconds < video.duration
      ) {
        video.currentTime = initialProgressSeconds;
      }
      setIsLoading(false);
    };

    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [initialProgressSeconds, volume, isMuted]);

  // Periodic progress saving
  useEffect(() => {
    if (!isLoggedIn || !profile) return;

    const saveInterval = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        watchHistoryApi
          .saveProgress(profile.id, movieId, Math.round(video.currentTime))
          .catch(console.error);
      }
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [isLoggedIn, profile, movieId]);

  // Activity detection to hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettings(false);
        setShowAudioInfo(false);
      }
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Sync volume and mute states with video element
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = isMuted;
    }
  }, [volume, isMuted, videoUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.volume = volume;
      video.muted = isMuted;
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) setCurrentTime(video.currentTime);
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleSkip = (seconds) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(
      0,
      Math.min(video.duration, video.currentTime + seconds)
    );
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const changeSpeed = (rate) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(console.error);
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(console.error);
    }
  };

  const formatTimeStr = (secs) => {
    if (isNaN(secs)) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const pad = (n) => n.toString().padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkip(10);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const nextVol = Math.min(1, volume + 0.1);
        setVolume(nextVol);
        setIsMuted(nextVol === 0);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        const nextVol = Math.max(0, volume - 0.1);
        setVolume(nextVol);
        setIsMuted(nextVol === 0);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
      className="relative w-full h-full bg-black overflow-hidden select-none group font-outfit"
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40">
          <Loader2 className="w-16 h-16 text-[#e50914] animate-spin" />
        </div>
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      >
        {subtitleUrl && (
          <track
            label="English"
            kind="subtitles"
            srcLang="en"
            src={subtitleUrl}
            default={subtitlesEnabled}
          />
        )}
      </video>

      {/* Controls Overlay (Netflix Style) */}
      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 z-30 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top bar */}
        <div className="w-full pt-6 pb-20 px-8 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors drop-shadow-md"
            >
              <ArrowLeft className="w-8 h-8" />
            </button>
            {movieTitle && (
              <h2 className="text-white text-2xl font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {movieTitle}
              </h2>
            )}
          </div>
        </div>

        {/* Play/Pause indicator center (Only shows when paused and controls are visible) */}
        {!isPlaying && !isLoading && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110">
            <button
              onClick={togglePlay}
              className="w-20 h-20 rounded-full bg-black/50 border-2 border-white/80 flex items-center justify-center text-white backdrop-blur-sm transition-all"
            >
              <Play className="w-10 h-10 fill-current ml-2" />
            </button>
          </div>
        )}

        {/* Bottom controls panel */}
        <div className="w-full pb-6 pt-24 px-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          {/* Timeline / Progress Bar */}
          <div className="relative w-full h-1.5 group/timeline cursor-pointer mb-6 flex items-center">
            {/* Custom Range Track */}
            <div className="absolute left-0 w-full h-full bg-white/20 rounded-full overflow-hidden transition-all group-hover/timeline:h-2.5">
              <div
                className="h-full bg-[#e50914]"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            {/* Invisible Input for Scrubbing */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute w-full h-full opacity-0 cursor-pointer z-10"
            />
          </div>

          <div className="flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center gap-6">
              <button
                onClick={togglePlay}
                className="text-white hover:text-gray-300 transition-transform hover:scale-110"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-current" />
                ) : (
                  <Play className="w-8 h-8 fill-current" />
                )}
              </button>

              <button
                onClick={() => handleSkip(-10)}
                className="text-white hover:text-gray-300 transition-transform hover:scale-110 flex items-center justify-center relative"
              >
                <RotateCcw className="w-7 h-7" />
                <span className="absolute text-[10px] font-bold mt-0.5">
                  10
                </span>
              </button>

              <button
                onClick={() => handleSkip(10)}
                className="text-white hover:text-gray-300 transition-transform hover:scale-110 flex items-center justify-center relative"
              >
                <RotateCw className="w-7 h-7" />
                <span className="absolute text-[10px] font-bold mt-0.5">
                  10
                </span>
              </button>

              {/* Volume block with hover slider */}
              <div className="flex items-center gap-2 group/volume relative">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-gray-300 transition-transform hover:scale-110"
                >
                  {isMuted ? (
                    <VolumeX className="w-7 h-7" />
                  ) : (
                    <Volume2 className="w-7 h-7" />
                  )}
                </button>
                <div className="w-0 overflow-hidden transition-all duration-300 ease-out group-hover/volume:w-24 flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 ml-2 accent-[#e50914] h-1.5 cursor-pointer bg-white/20 rounded-full"
                  />
                </div>
              </div>

              {/* Time display */}
              <div className="text-white text-sm font-medium tracking-wide">
                {formatTimeStr(currentTime)}{' '}
                <span className="text-gray-400 mx-1">/</span>{' '}
                {formatTimeStr(duration)}
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-6 relative">
              {/* No Audio Help */}
              <div className="relative">
                <button
                  onClick={() => setShowAudioInfo(!showAudioInfo)}
                  className="text-white hover:text-gray-300 transition-colors flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-md text-xs font-medium"
                >
                  <Info className="w-4 h-4" />
                  No Audio?
                </button>

                {showAudioInfo && (
                  <div className="absolute bottom-full right-0 mb-4 w-64 bg-[#141414] border border-white/10 rounded-lg p-4 shadow-2xl animate-fade-in z-50">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      If the video plays but there is no sound, the uploaded
                      file may be using an unsupported audio codec (like AC3 or
                      DTS). Try uploading an MP4 file with AAC audio instead.
                    </p>
                  </div>
                )}
              </div>

              {/* Settings / Playback Speed */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-white hover:text-gray-300 transition-transform hover:scale-110"
                >
                  <Settings className="w-6 h-6" />
                </button>

                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-4 w-40 bg-[#141414] border border-white/10 rounded-lg py-2 shadow-2xl animate-fade-in">
                    <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/10 mb-1">
                      Speed
                    </div>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changeSpeed(rate)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${
                          playbackRate === rate
                            ? 'text-white font-bold'
                            : 'text-gray-300'
                        }`}
                      >
                        {rate === 1 ? 'Normal' : `${rate}x`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-gray-300 transition-transform hover:scale-110"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-7 h-7" />
                ) : (
                  <Maximize2 className="w-7 h-7" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Netflix-style Skip Intro button */}
      {showControls && currentTime >= 10 && currentTime <= 90 && (
        <button
          onClick={() => handleSkip(90 - currentTime)}
          className="absolute bottom-32 right-8 bg-black/60 hover:bg-black/80 text-white px-6 py-2 rounded text-sm font-bold shadow-lg border border-white/20 transition-all z-40"
        >
          Skip Intro
        </button>
      )}
    </div>
  );
}
