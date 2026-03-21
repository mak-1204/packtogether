'use client';
/**
 * @fileOverview Custom hook for managing the landing page background slideshow state.
 * Handles fetching from Firestore, preloading images, and timed transitions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSlideshowSlides, type SlideshowSlide } from '@/lib/slideshowService';
import { SLIDE_DURATION, FADE_DURATION } from '@/lib/slides';

export function useSlideshow() {
  const [slides, setSlides] = useState<SlideshowSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [slidesLoading, setSlidesLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Advance to the next slide with a crossfade transition
  const nextSlide = useCallback(() => {
    if (slides.length <= 1) return;

    setTransitioning(true);
    
    // We update the index AFTER the fade duration would have reasonably started
    // to allow the UI to handle the "transitioning" state for layering.
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
      setTransitioning(false);
    }, FADE_DURATION);
  }, [slides.length]);

  useEffect(() => {
    async function initSlideshow() {
      const fetchedSlides = await getSlideshowSlides();
      setSlides(fetchedSlides);
      setSlidesLoading(false);

      if (fetchedSlides.length === 0) {
        setIsReady(true);
        return;
      }

      // Preload all images
      let loadedCount = 0;
      fetchedSlides.forEach((slide, index) => {
        const img = new Image();
        img.src = slide.imageUrl;
        img.onload = () => {
          loadedCount++;
          // Start the slideshow logic once the first image is ready
          if (index === 0) {
            setIsReady(true);
          }
        };
      });
    }

    initSlideshow();
  }, []);

  useEffect(() => {
    if (isReady && slides.length > 1) {
      intervalRef.current = setInterval(nextSlide, SLIDE_DURATION);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isReady, slides.length, nextSlide]);

  return {
    currentSlide: slides[currentIndex] || null,
    currentIndex,
    transitioning,
    slidesLoading: slidesLoading || (!isReady && slides.length > 0),
    slides
  };
}
