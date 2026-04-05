import React from 'react';
import { Play, Star, Plus, Check, CheckCircle2, Share2 } from 'lucide-react';
import { Movie } from '../types';
import { motion } from 'motion/react';
import PremiumBadge from './PremiumBadge';

interface MovieCardProps {
  movie: Movie;
  onPlay: (movie: Movie) => void;
  isInWatchlist?: boolean;
  onToggleWatchlist?: (movie: Movie) => void;
  variant?: 'landscape' | 'portrait';
}

export function MovieCardSkeleton({ variant = 'landscape' }: { variant?: 'landscape' | 'portrait' }) {
  const isLandscape = variant === 'landscape';
  return (
    <div className={`relative overflow-hidden rounded-lg bg-white/5 animate-pulse ${
      isLandscape ? 'aspect-[16/9]' : 'aspect-[2/3]'
    }`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="flex gap-2">
          <div className="h-3 bg-white/10 rounded w-1/4" />
          <div className="h-3 bg-white/10 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
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
      className={`relative group cursor-pointer overflow-hidden rounded-md bg-[#1a242f] transition-all ${
        isLandscape ? 'aspect-[16/9]' : 'aspect-[2/3]'
      }`}
    >
      <img
        src={movie.thumbnail}
        alt={movie.title}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      
      {/* Premium Badge */}
      {movie.isPremium && (
        <div className="absolute top-2 left-2 z-10">
          <PremiumBadge />
        </div>
      )}

      {/* Share Button */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          const shareData = {
            title: movie.title,
            text: movie.description,
            url: window.location.href,
          };
          try {
            if (navigator.share) navigator.share(shareData);
            else {
              navigator.clipboard.writeText(window.location.href);
              alert('Link copied to clipboard!');
            }
          } catch (err) { console.error('Error sharing:', err); }
        }}
        className="absolute top-2 right-2 z-10 p-1.5 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>

      {/* Play Icon Overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full border border-white/40">
          <Play className="w-6 h-6 fill-white text-white" />
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-blue-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 fill-blue-400 text-black" />
          </div>
          <h3 className="font-bold text-white truncate text-xs leading-tight">{movie.title}</h3>
        </div>
        {/* Play indicator like in screenshot */}
        <div className="mt-1 flex items-center gap-1 opacity-80">
          <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
            <Play className="w-2 h-2 fill-black text-black" />
          </div>
          <span className="text-[8px] font-bold tracking-tighter uppercase">Play</span>
        </div>
      </div>

      {/* Hover Overlay - Minimal */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 border-2 border-white/40 rounded-md" />
    </motion.div>
  );
}
