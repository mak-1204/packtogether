'use client';
/**
 * @fileOverview Custom hook for managing the landing page background slideshow state from Firestore with debugging.
 */

import { useState, useEffect } from 'react';
import { getSlideshowSlides, type SlideshowSlide } from '@/lib/slideshowService';
import { SLIDE_DURATION, FADE_DURATION } from '@/lib/slides';

export function useSlideshow() {
  const [slides, setSlides] = useState<SlideshowSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [slidesLoading, setSlidesLoading] = useState(true);

  // Fetch slides from Firestore on mount
  useEffect(() => {
    async function fetchSlides() {
      const data = await getSlideshowSlides();
      console.log("useSlideshow received:", data.length, "slides");
      
      if (data.length > 0) {
        // Preload first image before starting
        const img = new Image();
        img.src = data[0].imageUrl;
        img.onload = () => {
          console.log("First image preloaded:", data[0].imageUrl);
          setSlides(data);
          setSlidesLoading(false);
        };
        img.onerror = (e) => {
          console.error("Failed to preload first image:", data[0].imageUrl, e);
          setSlides(data);
          setSlidesLoading(false);
        };
        
        // Preload remaining images in background
        data.slice(1).forEach(slide => {
          const i = new Image();
          i.src = slide.imageUrl;
        });
      } else {
        console.warn("No slides found in Firestore.");
        setSlidesLoading(false);
      }
    }
    fetchSlides();
  }, []);

  // Slideshow interval — only starts after slides are loaded
  useEffect(() => {
    if (slides.length === 0) return;

    const interval = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % slides.length);
        setTransitioning(false);
      }, FADE_DURATION);
    }, SLIDE_DURATION);

    return () => clearInterval(interval);
  }, [slides]);

  return {
    currentSlide: slides[currentIndex] || null,
    currentIndex,
    transitioning,
    slidesLoading,
  };
}
