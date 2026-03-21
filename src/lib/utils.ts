import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Robustly converts various date formats (string, number, Date, Firestore Timestamp) 
 * into a standard JavaScript Date object.
 */
export function toDate(date: any): Date {
  if (!date) return new Date();
  
  // Handle Firestore Timestamp
  if (typeof date.toDate === 'function') {
    return date.toDate();
  }
  
  // Handle plain object Timestamp (seconds/nanoseconds)
  if (date.seconds !== undefined) {
    return new Date(date.seconds * 1000);
  }
  
  // Handle string, number, or Date
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}
