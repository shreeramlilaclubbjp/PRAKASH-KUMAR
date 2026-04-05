import React, { useState, useEffect, useCallback } from 'react';
import { Play, Info, CheckCircle2, ChevronLeft, ChevronRight, Volume2, VolumeX, Star, TrendingUp, Plus, Check } from 'lucide-react';
import { Movie } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import YouTube from 'react-youtube';
import PremiumBadge from './PremiumBadge';

interface HeroProps {
  movies: Movie[];
  onPlay: (movie: Movie) => void;
  onToggleWatchlist?: (movie: Movie) => void;
  isInWatchlist?: (movie: Movie) => boolean;
}

export default function Hero({ movies, onPlay, onToggleWatchlist, isInWatchlist }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // 1 for right, -1 for left
  const [isMuted, setIsMuted] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  const slideNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % movies.length);
    setIsLoaded(false);
  }, [movies.length]);

  const slidePrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
    setIsLoaded(false);
  }, [movies.length]);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '20%' : '-20%',
      opacity: 0,
      scale: 1.1
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '20%' : '-20%',
      opacity: 0,
      scale: 0.95
    })
  };

  const movie = movies[currentIndex];

  const onPlayerReady = (event: any) => {
    event.target.playVideo();
    setIsLoaded(true);
  };

  const onPlayerEnd = () => {
    slideNext();
  };

  if (!movie) {
    return (
      <div className="relative h-[65vh] md:h-[85vh] w-full overflow-hidden bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-[70vh] md:h-[90vh] w-full overflow-hidden bg-black">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 100, damping: 20 },
            opacity: { duration: 0.4 },
            scale: { duration: 0.6 }
          }}
          className="absolute inset-0"
        >
          {/* Background Content */}
          <div className="absolute inset-0 w-full h-full">
            {movie.youtubeId ? (
              <div className="relative w-full h-full pointer-events-none">
                <YouTube
                  videoId={movie.youtubeId}
                  className="absolute inset-0 w-full h-full scale-[1.5] md:scale-[1.2]"
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: {
                      autoplay: 1,
                      controls: 0,
                      rel: 0,
                      modestbranding: 1,
                      mute: isMuted ? 1 : 0,
                      showinfo: 0,
                      iv_load_policy: 3,
                      disablekb: 1,
                      fs: 0,
                    },
                  }}
                  onReady={onPlayerReady}
                  onEnd={onPlayerEnd}
                />
                {!isLoaded && (
                  <img 
                    src={movie.thumbnail} 
                    alt={movie.title} 
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            ) : (
              <img 
                src={movie.thumbnail} 
                alt={movie.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
          </div>
          
          {/* Content */}
          <div className="relative h-full flex flex-col justify-end px-6 md:px-16 pb-24 md:pb-32 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="space-y-6"
            >
              {/* Title Logo Style */}
              <h1 className="text-4xl md:text-7xl font-black text-white leading-tight tracking-tighter uppercase drop-shadow-2xl">
                {movie.title}
              </h1>

              {movie.isPremium ? (
                <div className="flex items-center gap-2">
                  <PremiumBadge size="md" />
                  <span className="text-yellow-500 font-bold text-sm uppercase tracking-wider">Premium Content</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 fill-blue-400 text-black" />
                  Included with Prime
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onPlay(movie)}
                  className="flex items-center gap-2 bg-white text-black px-5 py-2 rounded-md font-bold text-sm hover:bg-gray-200 transition-all active:scale-95 shadow-xl"
                >
                  <Play className="w-4 h-4 fill-black" />
                  Watch Now
                </button>
                
                <button 
                  onClick={() => onToggleWatchlist?.(movie)}
                  className="p-2 bg-white/10 backdrop-blur-md text-white rounded-md hover:bg-white/20 transition-all border border-white/10 active:scale-95"
                  title="Add to Watchlist"
                >
                  {isInWatchlist?.(movie) ? <Check className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5" />}
                </button>

                <button 
                  className="p-2 bg-white/10 backdrop-blur-md text-white rounded-md hover:bg-white/20 transition-all border border-white/10 active:scale-95"
                  title="Details"
                >
                  <Info className="w-5 h-5" />
                </button>

                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 bg-white/10 backdrop-blur-md text-white rounded-md hover:bg-white/20 transition-all border border-white/10 active:scale-95"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Indicators */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {movies.map((_, i) => (
          <button
            key={`hero-dot-${i}`}
            onClick={() => {
              setDirection(i > currentIndex ? 1 : -1);
              setCurrentIndex(i);
            }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === currentIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
