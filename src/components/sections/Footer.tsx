"use client";

import { useState, useEffect } from 'react';
import { Compass } from 'lucide-react';

export default function Footer() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="py-16 px-6 bg-background border-t border-border/50">
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-4">
          <Compass className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-white font-headline">PackTogether</span>
        </div>
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Your Gang. One Plan.
        </p>
        <div className="mt-8 pt-8 border-t border-border/30 w-full max-w-xs text-xs text-muted-foreground/50">
          © {year || '...'} PackTogether. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
