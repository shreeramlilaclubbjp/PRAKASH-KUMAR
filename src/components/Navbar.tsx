import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, LogOut, Menu, Play, Cast, Bell, ChevronLeft } from 'lucide-react';
import { auth, signInWithGoogle, logout } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function Navbar() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = React.useState('');

  const isHome = location.pathname === '/';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl px-4 md:px-8 py-3 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isHome && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 p-2.5 bg-white/10 hover:bg-white/20 rounded-full md:rounded-xl transition-all text-white group shadow-lg border border-white/5"
            >
              <ChevronLeft className="w-7 h-7 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden md:inline text-base font-black uppercase tracking-tighter">Back</span>
            </button>
          )}
          <Link to="/" className="flex items-center gap-2 text-2xl font-black tracking-tighter text-white">
            <Play className="fill-red-600 text-red-600 w-8 h-8" />
            OPRK+
          </Link>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <form onSubmit={handleSearch} className="hidden md:flex items-center relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies, series..."
              className="bg-white/10 border border-white/5 rounded-full py-1.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 w-64 transition-all focus:w-80"
            />
            <Search className="absolute left-3 w-4 h-4 text-gray-500" />
          </form>

          <button className="text-gray-300 hover:text-white transition-colors">
            <Cast className="w-6 h-6" />
          </button>
          
          <button className="text-gray-300 hover:text-white transition-colors">
            <Bell className="w-6 h-6" />
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/profile')}
                className="w-8 h-8 rounded-full overflow-hidden border border-white/20 hover:border-red-600 transition-colors"
              >
                <img src={user.photoURL || ''} alt={user.displayName || ''} referrerPolicy="no-referrer" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="text-gray-300 hover:text-white transition-colors"
            >
              <User className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-1">
        {[
          { label: 'Movies', path: '/movies' },
          { label: 'Serial', path: '/serial' },
          { label: 'Series', path: '/series' },
          { label: 'Sports', path: '/sports' }
        ].map((cat) => (
          <button
            key={cat.label}
            onClick={() => navigate(cat.path)}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border border-white/5 ${
              location.pathname === cat.path 
                ? 'bg-blue-600 text-white' 
                : 'bg-white/10 hover:bg-white/20 text-white/90'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
