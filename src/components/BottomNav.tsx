import React from 'react';
import { Home, Star, Bookmark, Download, Search, ChevronLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Star, label: 'Luxury+', path: '/luxury-plus' },
    { icon: Bookmark, label: 'Watching List', path: '/watchlist' },
    { icon: Download, label: 'Download', path: '/downloads' },
    { icon: Search, label: 'Search', path: '/search' },
  ];

  const isHome = location.pathname === '/';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-2xl border-t border-white/10 px-2 py-3 flex items-center justify-around md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.label}
            to={item.path}
            className={`flex flex-col items-center gap-1.5 px-2 py-1 transition-all duration-300 relative group ${
              isActive ? 'text-blue-500' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {isActive && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
            )}
            <item.icon className={`w-6 h-6 transition-transform duration-300 ${isActive ? 'scale-110 fill-blue-500/20' : 'group-active:scale-90'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest transition-all ${isActive ? 'opacity-100 translate-y-0' : 'opacity-70'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
