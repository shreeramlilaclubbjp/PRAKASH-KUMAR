import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Star, Calendar, Clock, ChevronRight, Info, Plus, Share2, ThumbsUp, Volume2, VolumeX, ChevronDown, Check, Menu, LayoutGrid, Download, Pause, RotateCcw, RotateCw } from 'lucide-react';
import YouTube from 'react-youtube';
import { Movie, Season, Episode } from '../types';
import PremiumBadge from './PremiumBadge';

interface SeriesModalProps {
  movie: Movie;
  onClose: () => void;
  onToggleWatchlist?: (movie: Movie) => void;
  isInWatchlist?: (movie: Movie) => boolean;
}

export function SeriesModal({ movie, onClose, onToggleWatchlist, isInWatchlist }: SeriesModalProps) {
  const [selectedSeason, setSelectedSeason] = React.useState<Season>(movie.seasons?.[0] || { id: '1', number: 1, title: 'Season 1', episodes: [] });
  const [selectedEpisode, setSelectedEpisode] = React.useState<Episode | null>(
    (movie.id === 'ramleela-series' || movie.id === 'mahishasur-vadh') ? (movie.seasons?.[0]?.episodes[0] || null) : null
  );
  const [isMuted, setIsMuted] = React.useState(true);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [showControls, setShowControls] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const playerRef = React.useRef<any>(null);
  const controlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const startProgressInterval = React.useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 1000);
  }, []);

  const stopProgressInterval = React.useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const resetControlsTimer = React.useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isPaused) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, isPaused]);

  React.useEffect(() => {
    if (isPlaying && !isPaused) {
      resetControlsTimer();
      startProgressInterval();
    } else {
      setShowControls(true);
      stopProgressInterval();
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      stopProgressInterval();
    };
  }, [isPlaying, isPaused, resetControlsTimer, startProgressInterval, stopProgressInterval]);

  // Keyboard controls
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      
      switch(e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayPause();
          resetControlsTimer();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(-10);
          resetControlsTimer();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(10);
          resetControlsTimer();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          resetControlsTimer();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isPaused, isMuted, resetControlsTimer]);

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    if (isPaused) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
    setIsPaused(!isPaused);
  };

  const handleSeek = (seconds: number) => {
    if (!playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime();
    playerRef.current.seekTo(currentTime + seconds, true);
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
    } else {
      playerRef.current.mute();
    }
    setIsMuted(!isMuted);
  };

  const handleShare = async () => {
    const shareData = {
      title: movie.title,
      text: movie.description,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[70] bg-black overflow-y-auto scrollbar-hide"
    >
      <div className="relative w-full max-w-4xl mx-auto min-h-screen bg-[#0a0a0a] flex flex-col">
        
        {/* Top Video Player Section */}
        <div 
          className="sticky top-0 z-50 w-full aspect-video bg-black shadow-2xl group"
          onMouseMove={resetControlsTimer}
          onClick={resetControlsTimer}
          onTouchStart={resetControlsTimer}
        >
          <div className="absolute inset-0 overflow-hidden">
            {selectedEpisode?.instagramId ? (
              <div className="relative w-full h-full scale-[1.5] origin-center translate-y-[-5%]">
                <iframe
                  src={`https://www.instagram.com/reel/${selectedEpisode.instagramId}/embed/`}
                  className="w-full h-full border-none"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                  title={selectedEpisode.title}
                />
              </div>
            ) : (
              <YouTube
                videoId={selectedEpisode?.youtubeId || selectedSeason.trailerId || movie.youtubeId}
                className="w-full h-full"
                onReady={(event) => {
                  playerRef.current = event.target;
                  setDuration(event.target.getDuration());
                }}
                onStateChange={(event) => {
                  // 1: playing, 2: paused, 0: ended
                  if (event.data === 1) {
                    setIsPaused(false);
                    setIsPlaying(true);
                  } else if (event.data === 2) {
                    setIsPaused(true);
                  } else if (event.data === 0) {
                    setIsPlaying(false);
                    setIsPaused(false);
                  }
                }}
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: { 
                    autoplay: 1, 
                    controls: 0, // Hide native controls
                    rel: 0, 
                    modestbranding: 1,
                    mute: isMuted ? 1 : 0,
                    showinfo: 0,
                    iv_load_policy: 3,
                    disablekb: 1 // Disable native keyboard shortcuts to use our own
                  }
                }}
              />
            )}
          </div>

          {/* Player Controls Overlay (Simplified) */}
          <div className="absolute top-4 left-4 z-50">
            <button
              onClick={onClose}
              className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-black transition-all"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>

          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button 
              onClick={handleShare}
              className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-white/20 transition-all"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Video Controls Overlay */}
          <AnimatePresence>
            {isPlaying && !selectedEpisode?.instagramId && showControls && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 bg-black/40 flex flex-col items-center justify-center pointer-events-none"
              >
                <div className="flex items-center gap-8 pointer-events-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSeek(-10); }}
                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-white/20 transition-all active:scale-90"
                    title="Rewind 10s"
                  >
                    <RotateCcw className="w-6 h-6" />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
                    className="p-5 bg-white text-black rounded-full hover:scale-110 transition-all shadow-xl active:scale-95"
                    title={isPaused ? "Play" : "Pause"}
                  >
                    {isPaused ? <Play className="w-8 h-8 fill-current" /> : <Pause className="w-8 h-8 fill-current" />}
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleSeek(10); }}
                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-white/20 transition-all active:scale-90"
                    title="Forward 10s"
                  >
                    <RotateCw className="w-6 h-6" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-24 left-6 right-6 pointer-events-auto">
                  <div className="relative h-1 w-full bg-white/20 rounded-full overflow-hidden group/progress cursor-pointer">
                    <div 
                      className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
                    <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>

                <div className="absolute bottom-16 right-6 pointer-events-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-white/20 transition-all active:scale-90"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>

                {/* Show Details Button integrated into overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsPlaying(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-white border border-white/20 text-xs font-black uppercase tracking-widest hover:bg-black transition-all"
                  >
                    <Info className="w-4 h-4" />
                    Show Details
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Show Details Button when playing - REMOVED as it's now in the overlay */}
        </div>

        {/* Content Section */}
        <AnimatePresence mode="wait">
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 px-4 py-6 space-y-6"
            >
              {/* Title & Metadata */}
              <div className="space-y-2">
                <h1 className="text-2xl font-black uppercase tracking-tight text-white leading-tight">
                  {selectedEpisode ? `${movie.title}: ${selectedEpisode.title}` : movie.title}
                </h1>
                <div className="flex items-center gap-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  {movie.isPremium && <PremiumBadge />}
                  <span className="text-green-500">98% Match</span>
                  <span>{movie.releaseDate.split('-')[0]}</span>
                  <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px]">U/A 13+</span>
                  <span>{movie.category === 'series' ? `${movie.seasons?.length} Seasons` : 'Original Movie'}</span>
                  <span className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-3 h-3 fill-current" />
                    {movie.rating}
                  </span>
                </div>
              </div>

              {/* Play Button */}
              <button
                onClick={() => setIsPlaying(true)}
                className="w-full py-3 bg-white text-black rounded-lg flex items-center justify-center gap-2 font-black uppercase tracking-widest hover:bg-gray-200 transition-colors"
              >
                <Play className="w-5 h-5 fill-current" />
                Play Now
              </button>

              {/* Action Buttons */}
              <div className="flex items-center gap-10 py-2">
                <button 
                  onClick={() => onToggleWatchlist?.(movie)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="p-2 rounded-full group-hover:bg-white/5 transition-colors">
                    {isInWatchlist?.(movie) ? (
                      <Check className="w-6 h-6 text-blue-500" />
                    ) : (
                      <Plus className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400 group-hover:text-white">My List</span>
                </button>

                <button className="flex flex-col items-center gap-1.5 group">
                  <div className="p-2 rounded-full group-hover:bg-white/5 transition-colors">
                    <Download className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400 group-hover:text-white">Download</span>
                </button>

                <button 
                  onClick={handleShare}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="p-2 rounded-full group-hover:bg-white/5 transition-colors">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400 group-hover:text-white">Share</span>
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-300 leading-relaxed font-medium line-clamp-3">
                {selectedEpisode?.description || movie.description}
              </p>

              {/* Cast */}
              <div className="pt-2">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Cast</p>
                <p className="text-xs text-gray-400 font-medium">
                  {(selectedEpisode?.cast || ['Arun Govil', 'Deepika Chikhalia', 'Sunil Lahri']).join(', ')}
                </p>
              </div>

              {/* Episodes Section */}
              <div className="pt-8 space-y-6 pb-20">
                <div className="space-y-4">
                  <h3 className="text-lg font-black uppercase tracking-tighter text-white">
                    {movie.category === 'series' ? 'Episodes' : 'Extras & Behind the Scenes'}
                  </h3>
                  
                  {/* Season Tabs */}
                  {movie.category === 'series' && (
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
                      {movie.seasons?.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedSeason(s)}
                          className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                            selectedSeason.id === s.id 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          {s.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {selectedSeason.episodes.map((episode, index) => (
                    <button
                      key={episode.id}
                      onClick={() => {
                        setSelectedEpisode(episode);
                        setIsPlaying(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all group ${
                        selectedEpisode?.id === episode.id 
                          ? 'bg-white/10 border border-white/10' 
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="relative w-32 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                        <img 
                          src={episode.thumbnail} 
                          alt={episode.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-8 h-8 fill-current text-white" />
                        </div>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-black uppercase tracking-tight truncate text-white group-hover:text-blue-400">
                            {movie.category === 'series' ? `${index + 1}. ` : ''}{episode.title}
                          </h4>
                          <span className="text-[10px] font-bold text-gray-500">{episode.duration}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-snug">
                          {episode.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
