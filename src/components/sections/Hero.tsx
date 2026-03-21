'use client';

import { Compass, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSlideshow } from '@/hooks/useSlideshow';
import { FADE_DURATION } from '@/lib/slides';

export default function Hero() {
  const { currentSlide, prevSlide, transitioning, slidesLoading } = useSlideshow();

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#0F172A]">
      {/* Layer 1 — outgoing slide (fades out) */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: prevSlide ? `url(${prevSlide.imageUrl})` : "none",
          opacity: transitioning ? 1 : 0,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
        }}
      />

      {/* Layer 2 — incoming slide (always visible) */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: currentSlide ? `url(${currentSlide.imageUrl})` : "none",
          opacity: transitioning ? 0 : 1,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
        }}
      />

      {/* Permanent gradient overlay — never animate this */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background: "linear-gradient(to bottom, rgba(15,23,42,0.45) 0%, rgba(15,23,42,0.55) 50%, rgba(15,23,42,0.75) 100%)"
        }}
      />

      {/* Header / Logo */}
      <header className="absolute top-0 left-0 p-8 z-20">
        <div className="flex items-center gap-2 group cursor-pointer">
          <Compass className="w-8 h-8 text-primary transition-transform group-hover:rotate-45 duration-500" />
          <span className="text-2xl font-bold tracking-tight text-white font-headline">PackTogether</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-4 max-w-5xl mx-auto">
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
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white/90 border border-white/10 backdrop-blur-md"
          style={{
            backgroundColor: "rgba(15,23,42,0.6)",
            opacity: transitioning ? 0 : 1,
            transition: "opacity 0.5s ease-in-out"
          }}
        >
          <MapPin className="w-4 h-4 text-accent" />
          <span>{currentSlide.location}</span>
        </div>
      )}
    </section>
  );
}
