"use client";

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

export default function Footer() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="py-20 px-6 bg-[#0A0F1D] border-t border-border/20">
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="mb-4">
          <span className="text-2xl font-bold tracking-tight text-white font-headline">PackTogether</span>
        </div>
        <p className="text-primary text-sm font-medium tracking-wide">
          Your Gang. One Plan.
        </p>

        <div className="mt-12 text-[10px] text-muted-foreground/30 uppercase tracking-[0.2em] flex items-center justify-center gap-1.5">
          <span>Designed & Built with</span>
          <Heart className="w-3 h-3 text-primary fill-primary/20" />
          <span>by Mak</span>
        </div>

        <div className="mt-4 text-xs text-muted-foreground/40">
          © {year || '...'} PackTogether. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
