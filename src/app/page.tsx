import Hero from '@/components/sections/Hero';
import Features from '@/components/sections/Features';
import HowItWorks from '@/components/sections/HowItWorks';
import Footer from '@/components/sections/Footer';

/**
 * Landing Page - Always visible as the first point of entry.
 * Authentication redirects are handled explicitly via user interaction on this page.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Features />
      <HowItWorks />
      <Footer />
    </main>
  );
}
