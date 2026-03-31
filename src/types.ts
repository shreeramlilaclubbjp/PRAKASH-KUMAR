export interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  youtubeId: string;
  category: 'movie' | 'series' | 'serial' | 'sports';
  genre: string[];
  rating: number;
  releaseDate: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  favorites: string[]; // Array of movie IDs
  watchlist: Movie[]; // Array of movie objects for quick access
  watchHistory: { movieId: string; timestamp: number }[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
