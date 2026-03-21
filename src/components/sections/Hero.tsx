'use client';

import { Compass, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSlideshow } from '@/hooks/useSlideshow';

export default function Hero() {
  const { slides, currentSlide, currentIndex, transitioning, slidesLoading } = useSlideshow();

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#0F172A]">
      {/* ===== BACKGROUND LAYER — DO NOT MODIFY ANYTHING BELOW THIS LINE ===== */}
      
      {/* All slides rendered simultaneously, only active one is visible */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className="absolute inset-0"
          style={{
            zIndex: index === currentIndex ? 2 : 1,
            opacity: index === currentIndex ? 1 : 0,
            transition: "opacity 2000ms ease-in-out",
          }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${slide.imageUrl})`,
              transform: index === currentIndex ? "scale(1.08)" : "scale(1.0)",
              transition: index === currentIndex 
                ? "transform 6000ms ease-in-out" 
                : "none",
              transformOrigin: "center center",
            }}
          />
        </div>
      ))}

      {/* Gradient overlay — smooth fade on all sides, heaviest at bottom */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom,
              rgba(15,23,42,0.5) 0%,
              rgba(15,23,42,0.2) 20%,
              rgba(15,23,42,0.1) 50%,
              rgba(15,23,42,0.6) 75%,
              rgba(15,23,42,1.0) 100%
            )
          `,
          zIndex: 3,
          pointerEvents: "none",
        }}
      />

      {/* ===== END BACKGROUND LAYER ===== */}

      {/* Header / Logo */}
      <header className="absolute top-0 left-0 p-8 z-[4]">
        <div className="flex items-center gap-2 group cursor-pointer">
          <Compass className="w-8 h-8 text-primary transition-transform group-hover:rotate-45 duration-500" />
          <span className="text-2xl font-bold tracking-tight text-white font-headline">PackTogether</span>
        </div>
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
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-white text-lg px-8 h-14 rounded-full font-medium">
            Create a Trip
          </Button>
          <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 h-14 rounded-full font-medium">
            Join a Trip
          </Button>
        </div>
      </div>

      {/* Location pill — synced to current slide */}
      {!slidesLoading && currentSlide && (
        <div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[4] flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white border border-white/10 backdrop-blur-md"
          style={{
            backgroundColor: "rgba(15,23,42,0.7)",
            opacity: transitioning ? 0 : 1,
            transition: "opacity 600ms ease-in-out"
          }}
        >
          <MapPin className="w-4 h-4 text-white/80" />
          {currentSlide.location}
        </div>
      )}
    </section>
  );
}
