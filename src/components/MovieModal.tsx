import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2 } from 'lucide-react';
import YouTube from 'react-youtube';
import { Movie } from '../types';

interface MovieModalProps {
  movie: Movie;
  onClose: () => void;
}

export default function MovieModal({ movie, onClose }: MovieModalProps) {
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl"
    >
      <div className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <button 
            onClick={handleShare}
            className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-white/20 transition-all"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-black transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {movie.instagramId ? (
          <iframe
            src={`https://www.instagram.com/reel/${movie.instagramId}/embed`}
            className="w-full h-full border-none"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <YouTube
            videoId={movie.youtubeId}
            className="w-full h-full"
            opts={{
              width: '100%',
              height: '100%',
              playerVars: { autoplay: 1, rel: 0, modestbranding: 1 }
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
