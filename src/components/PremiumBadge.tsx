import React from 'react';
import { Crown } from 'lucide-react';

interface PremiumBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export default function PremiumBadge({ className = "", size = 'sm' }: PremiumBadgeProps) {
  const crownSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';
  const fontSize = size === 'sm' ? 'text-[10px]' : 'text-[12px]';
  const padding = size === 'sm' ? 'p-0.5' : 'p-1';
  const minWidth = size === 'sm' ? 'min-w-[20px]' : 'min-w-[28px]';

  return (
    <div className={`inline-flex flex-col items-center justify-center bg-gradient-to-b from-[#FFD700] via-[#FFC000] to-[#B8860B] ${padding} rounded shadow-lg border border-yellow-200/50 ${minWidth} ${className}`}>
      <Crown className={`${crownSize} text-black -mb-0.5 drop-shadow-sm`} />
      <span className={`${fontSize} font-black text-black leading-none drop-shadow-sm`}>₹</span>
    </div>
  );
}
