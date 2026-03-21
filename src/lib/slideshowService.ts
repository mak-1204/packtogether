'use client';
/**
 * @fileOverview Service for interacting with the slideshow collection in Firestore with detailed logging.
 */

import { initializeFirebase } from "@/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

export interface SlideshowSlide {
  id: string;
  location: string;
  imageUrl: string;
  order: number;
  active: boolean;
  createdAt?: any;
}

/**
 * Fetches all active slideshow slides from Firestore, ordered by their display sequence.
 */
export async function getSlideshowSlides(): Promise<SlideshowSlide[]> {
  const { firestore } = initializeFirebase();
  try {
    console.log("Fetching slideshow from Firestore...");
    const q = query(
      collection(firestore, "slideshow"),
      where("active", "==", true),
      orderBy("order", "asc")
    );
    const snapshot = await getDocs(q);
    console.log("Slideshow docs count:", snapshot.docs.length);
    
    const slides = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log("Slide doc found:", doc.id, data);
      return {
        id: doc.id,
        ...data
      } as SlideshowSlide;
    });

    return slides;
  } catch (error: any) {
    console.error("Slideshow fetch error:", error.code, error.message);
    return [];
  }
}
