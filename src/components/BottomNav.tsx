import React from 'react';
import { Home, CheckCircle2, User, Download, Search, Plus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();
  
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: CheckCircle2, label: 'Prime', path: '/prime' },
    { icon: Plus, label: 'Watchlist', path: '/subscriptions' },
    { icon: Download, label: 'Downloads', path: '/downloads' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 border-t border-white/10 px-2 py-2 flex items-center justify-around md:hidden">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.label}
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive ? 'text-white' : 'text-gray-500'
            }`}
          >
            <div className={`p-0.5 rounded-full ${isActive && (item.label === 'Watchlist' || item.label === 'Profile') ? 'bg-blue-400' : ''}`}>
              <item.icon className={`w-6 h-6 ${isActive && item.label === 'Prime' ? 'fill-blue-400 text-black' : ''} ${isActive && (item.label === 'Watchlist' || item.label === 'Profile') ? 'text-black' : ''}`} />
            </div>
            <span className="text-[10px] font-medium">
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
