'use client';

import { Compass, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSlideshow } from '@/hooks/useSlideshow';
import { KENBURNS_SCALE } from '@/lib/slides';
import Link from 'next/link';

export default function Hero() {
  const { slides, currentSlide, currentIndex, transitioning, slidesLoading, zoomProgress } = useSlideshow();

  // Calculate current scale based on RAF-driven progress
  const ZOOM_SCALE_START = 1.0;
  const currentScale = ZOOM_SCALE_START + (KENBURNS_SCALE - ZOOM_SCALE_START) * zoomProgress;

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#0F172A]">
      {/* ===== BACKGROUND LAYER ===== */}
      {slides.map((slide, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={slide.id}
            className="absolute inset-0 overflow-hidden"
            style={{
              zIndex: isActive ? 2 : 1,
              opacity: isActive ? 1 : 0,
              transition: "opacity 2000ms ease-in-out",
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${slide.imageUrl})`,
                transform: isActive 
                  ? `scale(${currentScale})` 
                  : "scale(1.0)",
                willChange: "transform",
                transformOrigin: "center center",
              }}
            />
          </div>
        );
      })}

      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom,
              rgba(15,23,42,0.7) 0%,
              rgba(15,23,42,0.3) 25%,
              rgba(15,23,42,0.2) 50%,
              rgba(15,23,42,0.8) 85%,
              rgba(15,23,42,1.0) 100%
            )
          `,
          zIndex: 3,
          pointerEvents: "none",
        }}
      />

      {/* Header / Logo */}
      <header className="absolute top-0 left-0 p-8 z-[4]">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <Compass className="w-8 h-8 text-[#0D9488] transition-transform group-hover:rotate-45 duration-500" />
          <span className="text-2xl font-bold tracking-tight text-white font-headline">PackTogether</span>
        </Link>
      </header>

      {/* Main Content */}
      <div className="relative z-[4] flex flex-col items-center justify-center h-full text-center px-4 max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 font-headline tracking-tighter leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
          Your Gang. <br /> One Plan.
        </h1>
        <p className="text-lg md:text-xl text-zinc-300 mb-10 max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-1000">
          Stop planning trips on WhatsApp. PackTogether gives your friend group one place to plan, decide, and track — together.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <Link href="/create-trip">
            <Button size="lg" className="bg-[#0D9488] hover:bg-[#0D9488]/90 text-white text-lg px-8 h-14 rounded-full font-bold w-full sm:w-auto">
              Create a Trip
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 h-14 rounded-full font-bold w-full sm:w-auto">
              My Trips
            </Button>
          </Link>
        </div>
      </div>

      {!slidesLoading && currentSlide && (
        <div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[4] flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-medium text-white/90 border border-white/5 backdrop-blur-xl shadow-2xl"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            opacity: transitioning ? 0 : 1,
            transition: "opacity 600ms ease-in-out"
          }}
        >
          <MapPin className="w-4 h-4 text-[#0D9488]/70" />
          <span className="tracking-wide">{currentSlide.location}</span>
        </div>
      )}
    </section>
  );
}
