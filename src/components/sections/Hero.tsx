'use client';

import { Compass, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSlideshow } from '@/hooks/useSlideshow';
import { KENBURNS_SCALE } from '@/lib/slides';
import Link from 'next/link';
import { useUser, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function Hero() {
  const { slides, currentSlide, currentIndex, transitioning, slidesLoading, zoomProgress } = useSlideshow();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  // Calculate current scale based on RAF-driven progress
  const ZOOM_SCALE_START = 1.0;
  const currentScale = ZOOM_SCALE_START + (KENBURNS_SCALE - ZOOM_SCALE_START) * zoomProgress;

  const handleCreateTrip = async () => {
    if (user) {
      router.push('/create-trip');
    } else {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        router.push('/create-trip');
      } catch (error) {
        console.error("Sign in failed:", error);
      }
    }
  };

  const handleMyTrips = async () => {
    if (user) {
      router.push('/dashboard');
    } else {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        router.push('/dashboard');
      } catch (error) {
        console.error("Sign in failed:", error);
      }
    }
  };

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
      <header className="absolute top-0 left-0 p-6 z-[4]">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <Compass className="w-6 h-6 sm:w-8 sm:h-8 text-[#0D9488] transition-transform group-hover:rotate-45 duration-500" />
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-headline">PackTogether</span>
        </Link>
      </header>

      {/* Main Content */}
      <div className="relative z-[4] flex flex-col items-center justify-center h-full text-center px-4 max-w-5xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 font-headline tracking-tighter leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
          Your Gang. <br /> One Plan.
        </h1>
        <p className="text-sm sm:text-base md:text-xl text-zinc-300 mb-10 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000">
          Stop planning trips on WhatsApp. PackTogether gives your friend group one place to plan, decide, and track — together.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 px-6 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <Button 
            onClick={handleCreateTrip}
            size="lg" 
            className="w-full sm:w-auto bg-[#0D9488] hover:bg-[#0D9488]/90 text-white text-lg px-8 h-14 rounded-full font-bold shadow-2xl shadow-[#0D9488]/20"
          >
            Create a Trip
          </Button>
          <Button 
            onClick={handleMyTrips}
            size="lg" 
            variant="outline" 
            className="w-full sm:w-auto border-white text-white hover:bg-white/10 text-lg px-8 h-14 rounded-full font-bold"
          >
            My Trips
          </Button>
        </div>
      </div>

      {!slidesLoading && currentSlide && (
        <div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[4] flex items-center gap-2.5 px-5 py-2.5 rounded-full text-xs font-medium text-white/90 border border-white/5 backdrop-blur-xl shadow-2xl"
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