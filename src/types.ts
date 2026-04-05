export interface Episode {
  id: string;
  title: string;
  thumbnail: string;
  youtubeId?: string;
  instagramId?: string;
  duration: string;
  description: string;
  cast?: string[];
}

export interface Season {
  id: string;
  number: number;
  title: string;
  episodes: Episode[];
  trailerId?: string;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  youtubeId?: string;
  instagramId?: string;
  category: 'movie' | 'series' | 'serial' | 'sports';
  genre: string[];
  rating: number;
  releaseDate: string;
  seasons?: Season[];
  isFeatured?: boolean;
  isPremium?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  favorites: string[]; // Array of movie IDs
  watchlist: Movie[]; // Array of movie objects for quick access
  watchHistory: { movieId: string; timestamp: number }[];
  isPremium?: boolean;
  subscriptionExpiry?: number; // Timestamp
  subscriptionPlan?: 'monthly' | 'yearly';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

