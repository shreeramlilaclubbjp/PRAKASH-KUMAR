import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, LogOut, Menu, Play, Cast, Bell, ChevronLeft, Bot, Download, Crown } from 'lucide-react';
import { auth, signInWithGoogle, logout } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useUserProfile } from '../hooks/useUserProfile';

interface NavbarProps {
  onToggleChatbot?: () => void;
  onOpenMembership?: () => void;
}

export default function Navbar({ onToggleChatbot, onOpenMembership }: NavbarProps) {
  const [user] = useAuthState(auth);
  const { userProfile } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = React.useState(false);

  React.useEffect(() => {
    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    });
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      setTimeout(() => setShowIOSInstructions(false), 5000);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const isHome = location.pathname === '/';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black via-black/80 to-transparent px-4 md:px-8 py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl rotate-6 group-hover:rotate-0 transition-transform duration-300 shadow-lg shadow-blue-500/20" />
              <div className="absolute inset-0 bg-black rounded-xl border border-white/10 flex items-center justify-center">
                <Play className="w-5 h-5 text-blue-400 fill-blue-400" />
              </div>
            </div>
            <div className="flex flex-col -gap-1">
              <span className="text-xl font-black tracking-tighter text-white leading-none">OPRK</span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-blue-400 uppercase leading-none ml-0.5">PLUS</span>
            </div>
          </Link>
          
          <div className="hidden lg:flex items-center gap-6 ml-4">
            {[
              { label: 'Home', path: '/' },
              { label: 'Movies', path: '/movies' },
              { label: 'Series', path: '/series' },
              { label: 'Sports', path: '/sports' },
              { label: 'Live TV', path: '/live' },
              { label: 'Store', path: '/store' }
            ].map((item) => (
              <Link 
                key={item.label} 
                to={item.path}
                className={`text-sm font-bold transition-colors ${
                  location.pathname === item.path ? 'text-white underline underline-offset-8 decoration-2' : 'text-gray-400 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <form onSubmit={handleSearch} className="hidden md:flex items-center relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="bg-white/10 border border-white/5 rounded-full py-1.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 w-48 transition-all focus:w-64"
            />
            <Search className="absolute left-3 w-4 h-4 text-gray-500" />
          </form>

          <button className="text-gray-300 hover:text-white transition-colors">
            <Cast className="w-6 h-6" />
          </button>
          
          <button 
            onClick={() => onToggleChatbot?.()}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Bot className="w-6 h-6" />
          </button>

          {user && !userProfile?.isPremium && (
            <button 
              onClick={onOpenMembership}
              className="hidden md:flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-yellow-500/20"
            >
              <Crown className="w-4 h-4" />
              Go Premium
            </button>
          )}

          {userProfile?.isPremium && (
            <div className="hidden md:flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-full">
              <Crown className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Premium</span>
            </div>
          )}

          {(showInstallBtn || isIOS) && (
            <div className="relative">
              <button 
                onClick={handleInstallClick}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Install App</span>
              </button>
              
              {showIOSInstructions && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white text-black p-3 rounded-lg text-[10px] shadow-xl z-[60] animate-in fade-in slide-in-from-top-2">
                  <p className="font-bold mb-1">To Install on iOS:</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Tap the <b>Share</b> button (square with arrow)</li>
                    <li>Scroll down and tap <b>'Add to Home Screen'</b></li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {user ? (
            <button
              onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full overflow-hidden border border-white/20 hover:border-blue-400 transition-colors"
            >
              <img src={user.photoURL || ''} alt={user.displayName || ''} referrerPolicy="no-referrer" />
            </button>
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
          { label: 'Series', path: '/series' },
          { label: 'Sports', path: '/sports' },
          { label: 'Live TV', path: '/live' }
        ].map((cat) => (
          <button
            key={cat.label}
            onClick={() => navigate(cat.path)}
            className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              location.pathname === cat.path 
                ? 'bg-white text-black' 
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
