'use client';
/**
 * @fileOverview Service for interacting with the slideshow collection in Firestore.
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
    const q = query(
      collection(firestore, "slideshow"),
      where("active", "==", true),
      orderBy("order", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SlideshowSlide[];
  } catch (error) {
    // In production, errors are handled by the global error listener
    console.error("Failed to fetch slideshow slides:", error);
    return [];
  }
}
