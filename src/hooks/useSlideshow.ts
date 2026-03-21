'use client';
/**
 * @fileOverview Custom hook for managing the landing page background slideshow state from Firestore with smooth transitions.
 */

import { useState, useEffect } from 'react';
import { getSlideshowSlides, type SlideshowSlide } from '@/lib/slideshowService';
import { SLIDE_DURATION } from '@/lib/slides';

export function useSlideshow() {
  const [slides, setSlides] = useState<SlideshowSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [slidesLoading, setSlidesLoading] = useState(true);

  // Fetch slides from Firestore on mount
  useEffect(() => {
    async function fetchSlides() {
      const data = await getSlideshowSlides();
      
      if (data.length > 0) {
        // Preload first image before starting
        const img = new Image();
        img.src = data[0].imageUrl;
        img.onload = () => {
          setSlides(data);
          setSlidesLoading(false);
        };
        
        // Preload remaining images in background
        data.slice(1).forEach(slide => {
          const i = new Image();
          i.src = slide.imageUrl;
        });
      } else {
        setSlidesLoading(false);
      }
    }
    fetchSlides();
  }, []);

  // Slideshow interval — only starts after slides are loaded
  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      // Start fading out the location pill
      setTransitioning(true);
      
      // Advance the index after a short delay (for the pill fade)
      // The background CSS transition handles its own crossfade simultaneously
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % slides.length);
        setTransitioning(false); // Pill fades back in for the new slide
      }, 600);
      
    }, SLIDE_DURATION);

    return () => clearInterval(interval);
  }, [slides, slides.length]);

  return {
    slides,
    currentSlide: slides[currentIndex] || null,
    currentIndex,
    transitioning,
    slidesLoading,
  };
}
