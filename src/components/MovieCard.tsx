import React from 'react';
import { Play, Star, Plus, Check, CheckCircle2 } from 'lucide-react';
import { Movie } from '../types';
import { motion } from 'motion/react';

interface MovieCardProps {
  movie: Movie;
  onPlay: (movie: Movie) => void;
  isInWatchlist?: boolean;
  onToggleWatchlist?: (movie: Movie) => void;
  variant?: 'landscape' | 'portrait';
}

export default function MovieCard({ 
  movie, 
  onPlay, 
  isInWatchlist, 
  onToggleWatchlist,
  variant = 'landscape'
}: MovieCardProps) {
  const isLandscape = variant === 'landscape';

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      onClick={() => onPlay(movie)}
      className={`relative group cursor-pointer overflow-hidden rounded-lg bg-[#1a242f] border border-white/5 transition-all hover:border-white/20 ${
        isLandscape ? 'aspect-[16/9]' : 'aspect-[2/3]'
      }`}
    >
      <img
        src={movie.thumbnail}
        alt={movie.title}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate text-sm">{movie.title}</h3>
            <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-bold">
              <CheckCircle2 className="w-3 h-3 fill-blue-400 text-black" />
              OPRK+
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist?.(movie);
            }}
            className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"
          >
            {isInWatchlist ? <Check className="w-4 h-4 text-blue-400" /> : <Plus className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>

      {/* Play icon overlay on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-black/40 backdrop-blur-sm p-4 rounded-full">
          <Play className="fill-white text-white w-8 h-8" />
        </div>
      </div>
    </motion.div>
  );
}
