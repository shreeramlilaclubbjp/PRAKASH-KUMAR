import React from 'react';
import { Play, Info, Star, CheckCircle2 } from 'lucide-react';
import { Movie } from '../types';
import { motion } from 'motion/react';

interface HeroProps {
  movie: Movie;
  onPlay: (movie: Movie) => void;
}

export default function Hero({ movie, onPlay }: HeroProps) {
  return (
    <div className="relative h-[65vh] md:h-[80vh] w-full overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={movie.thumbnail}
          alt={movie.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent" />
      </div>

      <div className="relative h-full flex flex-col justify-end px-4 md:px-12 pb-24 md:pb-32 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <img src="https://picsum.photos/seed/logo/40/40" className="w-12 h-6 object-contain brightness-200" alt="logo" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-tight">
            {movie.title}
          </h1>

          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm mb-6">
            <CheckCircle2 className="w-4 h-4 fill-blue-400 text-black" />
            Included with OPRK+
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === 1 ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
