'use client';

import Image from 'next/image';
import { Compass, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSlideshow } from '@/hooks/useSlideshow';

export default function Hero() {
  const { currentSlide, slides, currentIndex, slidesLoading } = useSlideshow();

  return (
    <section className="relative h-screen w-full overflow-hidden bg-zinc-950">
      {/* Slideshow Container */}
      {!slidesLoading && slides.length > 0 && (
        <div className="absolute inset-0">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={slide.imageUrl}
                alt={slide.location}
                fill
                priority={index === 0}
                className={`object-cover ${index === currentIndex ? 'animate-ken-burns' : ''}`}
                sizes="100vw"
              />
            </div>
          ))}
        </div>
      )}

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />

      {/* Header / Logo */}
      <header className="absolute top-0 left-0 p-8 z-20">
        <div className="flex items-center gap-2 group cursor-pointer">
          <Compass className="w-8 h-8 text-primary transition-transform group-hover:rotate-45 duration-500" />
          <span className="text-2xl font-bold tracking-tight text-white font-headline">PackTogether</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4 max-w-5xl mx-auto">
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

      {/* Location Pill */}
      {!slidesLoading && currentSlide && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white/90 text-sm font-medium animate-in fade-in zoom-in duration-500">
            <MapPin className="w-4 h-4 text-accent" />
            <span>{currentSlide.location}</span>
          </div>
        </div>
      )}
    </section>
  );
}
