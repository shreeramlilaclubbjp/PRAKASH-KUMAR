import React from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, getDocFromServer } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Hero from './components/Hero';
import MovieCard from './components/MovieCard';
import Chatbot from './components/Chatbot';
import { Movie, UserProfile } from './types';
import { searchMovies, getRecommendations } from './services/geminiService';
import YouTube from 'react-youtube';
import { Play, X, Star, Calendar, Tag, ChevronRight, ChevronLeft, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const FEATURED_MOVIE: Movie = {
  id: 'featured-1',
  title: 'The Rings of Power',
  description: 'In a world where everything is at stake, one hero must rise to protect the innocent from an ancient evil that has returned to claim the throne.',
  thumbnail: 'https://picsum.photos/seed/rings/1920/1080',
  youtubeId: 'dQw4w9WgXcQ', // Placeholder
  category: 'movie',
  genre: ['Fantasy', 'Adventure'],
  rating: 4.8,
  releaseDate: '2024-05-15',
};

function HomePage() {
  const [movies, setMovies] = React.useState<Movie[]>([]);
  const [series, setSeries] = React.useState<Movie[]>([]);
  const [sports, setSports] = React.useState<Movie[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null);
  const [user, loadingAuth] = useAuthState(auth);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [movieData, seriesData, sportsData] = await Promise.all([
          getRecommendations(['action', 'sci-fi', 'thriller']),
          getRecommendations(['drama', 'comedy', 'mystery']),
          getRecommendations(['football', 'cricket', 'tennis'])
        ]);
        setMovies(movieData);
        setSeries(seriesData);
        setSports(sportsData);
      } catch (error) {
        // If it's not a quota error (which is handled by fallback in service), log it
        const errorStr = JSON.stringify(error).toLowerCase();
        if (!errorStr.includes("429") && !errorStr.includes("quota") && !errorStr.includes("resource_exhausted")) {
          console.error('Error fetching data:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  React.useEffect(() => {
    if (!loadingAuth && user) {
      const fetchProfile = async () => {
        const docRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              favorites: [],
              watchlist: [],
              watchHistory: []
            };
            await setDoc(docRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      };
      fetchProfile();
    }
  }, [user, loadingAuth]);

  const toggleWatchlist = async (movie: Movie) => {
    if (!user || !userProfile) {
      signInWithGoogle();
      return;
    }
    const docRef = doc(db, 'users', user.uid);
    const isInWatchlist = userProfile.watchlist?.some(m => m.id === movie.id);
    
    try {
      const updatedWatchlist = isInWatchlist
        ? userProfile.watchlist.filter(m => m.id !== movie.id)
        : [...(userProfile.watchlist || []), movie];

      await updateDoc(docRef, { watchlist: updatedWatchlist });
      setUserProfile(prev => prev ? ({ ...prev, watchlist: updatedWatchlist }) : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white pb-24">
      <Hero movie={FEATURED_MOVIE} onPlay={setSelectedMovie} />
      
      <div className="px-4 md:px-12 -mt-16 relative z-10 space-y-10">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              OPRK+ movies
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
            {movies.map(movie => (
              <div key={movie.id} className="w-[280px] md:w-[320px] flex-shrink-0">
                <MovieCard
                  movie={movie}
                  onPlay={setSelectedMovie}
                  isInWatchlist={userProfile?.watchlist?.some(m => m.id === movie.id)}
                  onToggleWatchlist={toggleWatchlist}
                  variant="landscape"
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 group cursor-pointer">
              OPRK+ Originals
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
            {series.map(movie => (
              <div key={movie.id} className="w-[140px] md:w-[180px] flex-shrink-0">
                <MovieCard
                  movie={movie}
                  onPlay={setSelectedMovie}
                  isInWatchlist={userProfile?.watchlist?.some(m => m.id === movie.id)}
                  onToggleWatchlist={toggleWatchlist}
                  variant="portrait"
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight">
              Action & Thriller
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
            {sports.map(movie => (
              <div key={movie.id} className="w-[280px] md:w-[320px] flex-shrink-0">
                <MovieCard
                  movie={movie}
                  onPlay={setSelectedMovie}
                  isInWatchlist={userProfile?.watchlist?.some(m => m.id === movie.id)}
                  onToggleWatchlist={toggleWatchlist}
                  variant="landscape"
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl"
          >
            <div className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <button
                onClick={() => setSelectedMovie(null)}
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black p-2 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <YouTube
                videoId={selectedMovie.youtubeId}
                className="w-full h-full"
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: { autoplay: 1, controls: 1, rel: 0, modestbranding: 1 },
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = React.useState<Movie[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null);
  const [user, loadingAuth] = useAuthState(auth);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    if (!loadingAuth && user) {
      const fetchProfile = async () => {
        const docRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      };
      fetchProfile();
    }
  }, [user, loadingAuth]);

  const toggleWatchlist = async (movie: Movie) => {
    if (!user || !userProfile) {
      signInWithGoogle();
      return;
    }
    const docRef = doc(db, 'users', user.uid);
    const isInWatchlist = userProfile.watchlist?.some(m => m.id === movie.id);
    
    try {
      const updatedWatchlist = isInWatchlist
        ? userProfile.watchlist.filter(m => m.id !== movie.id)
        : [...(userProfile.watchlist || []), movie];

      await updateDoc(docRef, { watchlist: updatedWatchlist });
      setUserProfile(prev => prev ? ({ ...prev, watchlist: updatedWatchlist }) : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const getPageTitle = () => {
    if (location.pathname === '/movies') return 'Movies';
    if (location.pathname === '/serial') return 'Serial';
    if (location.pathname === '/series') return 'TV Series';
    if (location.pathname === '/sports') return 'Sports';
    if (location.pathname === '/store') return 'Store';
    if (location.pathname === '/luxury-plus') return 'Luxury+';
    if (location.pathname === '/watchlist') return 'Watching List';
    if (location.pathname === '/categories') return 'Categories';
    if (location.pathname === '/downloads') return 'Downloads';
    return `Search results for: "${query}"`;
  };

  React.useEffect(() => {
    const performSearch = async () => {
      if (location.pathname === '/watchlist') {
        setResults(userProfile?.watchlist || []);
        setLoading(false);
        return;
      }
      const searchQuery = query || getPageTitle();
      setLoading(true);
      try {
        const data = await searchMovies(searchQuery);
        setResults(data);
      } catch (error) {
        const errorStr = JSON.stringify(error).toLowerCase();
        if (!errorStr.includes("429") && !errorStr.includes("quota") && !errorStr.includes("resource_exhausted")) {
          console.error('Search error:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    performSearch();
  }, [query, location.pathname, userProfile?.watchlist]);

  return (
    <div className="bg-black min-h-screen pt-24 px-4 md:px-12 text-white">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white/10 rounded-2xl text-blue-400 hover:bg-white/20 transition-all shadow-xl border border-white/5 active:scale-95"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">
          {location.pathname === '/search' ? (
            <>Search results for: <span className="text-blue-400">"{query}"</span></>
          ) : (
            <span className="text-blue-400">{getPageTitle()}</span>
          )}
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {results.map(movie => (
            <MovieCard 
              key={movie.id} 
              movie={movie} 
              onPlay={setSelectedMovie}
              isInWatchlist={userProfile?.watchlist?.some(m => m.id === movie.id)}
              onToggleWatchlist={toggleWatchlist}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          {location.pathname === '/watchlist' 
            ? "Your watchlist is empty. Start adding movies and series you want to watch later!"
            : `No results found for "${query}". Try searching for something else.`}
        </div>
      )}

      <AnimatePresence>
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl"
          >
            <div className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <button
                onClick={() => setSelectedMovie(null)}
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black p-2 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <YouTube
                videoId={selectedMovie.youtubeId}
                className="w-full h-full"
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: { autoplay: 1, rel: 0, modestbranding: 1 }
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfilePage() {
  const [user, loadingAuth] = useAuthState(auth);
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null);

  React.useEffect(() => {
    if (!loadingAuth && user) {
      const fetchProfile = async () => {
        const docRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      };
      fetchProfile();
    }
  }, [user, loadingAuth]);

  const toggleWatchlist = async (movie: Movie) => {
    if (!user || !userProfile) return;
    const docRef = doc(db, 'users', user.uid);
    const isInWatchlist = userProfile.watchlist?.some(m => m.id === movie.id);
    
    try {
      const updatedWatchlist = isInWatchlist
        ? userProfile.watchlist.filter(m => m.id !== movie.id)
        : [...(userProfile.watchlist || []), movie];

      await updateDoc(docRef, { watchlist: updatedWatchlist });
      setUserProfile(prev => prev ? ({ ...prev, watchlist: updatedWatchlist }) : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  if (!user) {
    return (
      <div className="bg-black min-h-screen pt-24 px-4 md:px-12 text-white flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-black mb-4 uppercase tracking-tighter">Sign in to view your profile</h1>
        <button
          onClick={signInWithGoogle}
          className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition-colors"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen pt-24 px-4 md:px-12 text-white">
      <div className="max-w-4xl mx-auto pb-20">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 rounded-2xl text-blue-400 hover:bg-white/20 transition-all shadow-xl border border-white/5 active:scale-95"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">Your Profile</h1>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 mb-12 p-8 bg-white/5 rounded-3xl border border-white/10">
          <img
            src={user.photoURL || ''}
            alt={user.displayName || ''}
            className="w-32 h-32 rounded-full border-4 border-blue-600"
            referrerPolicy="no-referrer"
          />
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">{user.displayName}</h1>
            <p className="text-gray-400 mb-6">{user.email}</p>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full transition-colors text-sm font-bold"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Watching List</h2>
            <button 
              onClick={() => navigate('/watchlist')}
              className="text-blue-400 text-sm font-bold hover:underline"
            >
              View All
            </button>
          </div>
          
          {userProfile?.watchlist && userProfile.watchlist.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {userProfile.watchlist.slice(0, 4).map(movie => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  onPlay={setSelectedMovie}
                  isInWatchlist={true}
                  onToggleWatchlist={toggleWatchlist}
                />
              ))}
            </div>
          ) : (
            <div className="aspect-video bg-white/5 rounded-2xl border border-dashed border-white/20 flex items-center justify-center text-gray-500">
              No items in your watchlist yet
            </div>
          )}
        </section>

        <AnimatePresence>
          {selectedMovie && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl"
            >
              <div className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <button
                  onClick={() => setSelectedMovie(null)}
                  className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black p-2 rounded-full text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <YouTube
                  videoId={selectedMovie.youtubeId}
                  className="w-full h-full"
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: { autoplay: 1, rel: 0, modestbranding: 1 }
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="bg-black min-h-screen font-sans selection:bg-blue-600 selection:text-white pb-20 md:pb-0">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/movies" element={<SearchPage />} />
          <Route path="/serial" element={<SearchPage />} />
          <Route path="/series" element={<SearchPage />} />
          <Route path="/sports" element={<SearchPage />} />
          <Route path="/store" element={<SearchPage />} />
          <Route path="/luxury-plus" element={<SearchPage />} />
          <Route path="/watchlist" element={<SearchPage />} />
          <Route path="/categories" element={<SearchPage />} />
          <Route path="/downloads" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
        <BottomNav />
        <Chatbot />
      </div>
    </Router>
  );
}
