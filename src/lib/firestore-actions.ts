'use client';

import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  Firestore,
  Timestamp,
  getDoc,
  deleteField
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Utility to remove undefined properties from an object before sending to Firestore.
 */
function cleanData(data: any) {
  const cleaned = { ...data };
  Object.keys(cleaned).forEach(key => cleaned[key] === undefined && delete cleaned[key]);
  return cleaned;
}

/**
 * Generates a specific checklist based on the category and mode of travel/stay.
 */
function generateChecklist(category: string, mode?: string) {
  const checklists: Record<string, { item: string, status: string }[]> = {
    train: [
      { item: "Tickets booked", status: "red" },
      { item: "PNR number saved", status: "red" },
      { item: "Confirmation status — Confirmed / RAC / Waitlist", status: "yellow" },
      { item: "Tickets downloaded / screenshot saved", status: "red" },
      { item: "Boarding station confirmed", status: "red" },
      { item: "Everyone on the same booking", status: "yellow" },
      { item: "Departure time noted by everyone", status: "red" },
    ],
    flight: [
      { item: "Tickets booked", status: "red" },
      { item: "Web check-in done", status: "red" },
      { item: "Boarding pass downloaded", status: "red" },
      { item: "Baggage within allowed limits", status: "yellow" },
      { item: "Cab to airport booked", status: "red" },
      { item: "Reach airport 2hrs before departure", status: "yellow" },
      { item: "Passport / ID ready", status: "red" },
    ],
    bus: [
      { item: "Ticket booked", status: "red" },
      { item: "Boarding point confirmed", status: "red" },
      { item: "Bus operator contact saved", status: "yellow" },
      { item: "Departure time noted", status: "red" },
      { item: "Everyone has their ticket", status: "red" },
    ],
    roadtrip: [
      { item: "Vehicle confirmed", status: "red" },
      { item: "Driver confirmed and contact saved", status: "red" },
      { item: "Fuel checked", status: "yellow" },
      { item: "Route saved on Google Maps", status: "yellow" },
      { item: "Toll cash or FASTag ready", status: "yellow" },
      { item: "Meeting point and departure time set", status: "red" },
      { item: "Everyone knows the pickup point", status: "red" },
    ],
    stay: [
      { item: "Booking confirmed", status: "red" },
      { item: "Confirmation email / voucher saved", status: "red" },
      { item: "Check-in time noted", status: "yellow" },
      { item: "Check-out time noted", status: "yellow" },
      { item: "Property contact number saved", status: "red" },
      { item: "Address saved on Google Maps", status: "yellow" },
      { item: "Early check-in requested if needed", status: "yellow" },
    ],
  };

  const key = mode || category;
  return checklists[key] || [];
}

/**
 * Creates a new trip with a pre-generated ID for optimistic navigation.
 */
export function createTrip(db: Firestore, tripData: any, userId: string, tripId: string) {
  const tripRef = doc(db, 'trips', tripId);
  const data = cleanData({
    ...tripData,
    startDate: tripData.startDate instanceof Date 
      ? Timestamp.fromDate(tripData.startDate) 
      : tripData.startDate,
    endDate: tripData.endDate instanceof Date 
      ? Timestamp.fromDate(tripData.endDate) 
      : tripData.endDate,
    organizerId: userId,
    members: { [userId]: 'organizer' },
    status: 'Planning',
    totalPlannedBudget: 0,
    totalActualBudget: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  setDoc(tripRef, data).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: tripRef.path,
      operation: 'create',
      requestResourceData: data,
    } satisfies SecurityRuleContext));
  });

  return tripId;
}

export function updateTripDetails(db: Firestore, tripId: string, data: any) {
  const tripRef = doc(db, 'trips', tripId);
  const updateData = cleanData({
    ...data,
    startDate: data.startDate instanceof Date ? Timestamp.fromDate(data.startDate) : data.startDate,
    endDate: data.endDate instanceof Date ? Timestamp.fromDate(data.endDate) : data.endDate,
    updatedAt: serverTimestamp(),
  });
  
  updateDoc(tripRef, updateData).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: tripRef.path,
      operation: 'update',
      requestResourceData: updateData,
    } satisfies SecurityRuleContext));
  });
}

export function deleteTrip(db: Firestore, tripId: string) {
  const tripRef = doc(db, 'trips', tripId);
  deleteDoc(tripRef).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: tripRef.path,
      operation: 'delete',
    } satisfies SecurityRuleContext));
  });
}

/**
 * Joining requires a read check first, so it remains partially async.
 */
export async function joinTrip(db: Firestore, tripId: string, memberData: { name: string, email: string, uid: string, photoURL?: string | null }) {
  const memberId = memberData.uid;
  const memberDocRef = doc(db, 'trips', tripId, 'members', memberId);
  
  const memberSnap = await getDoc(memberDocRef);
  
  if (!memberSnap.exists()) {
    const data = cleanData({
      ...memberData,
      tripId,
      role: 'member',
      joinedAt: serverTimestamp(),
    });

    setDoc(memberDocRef, data).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: memberDocRef.path,
        operation: 'create',
        requestResourceData: data,
      } satisfies SecurityRuleContext));
    });

    const tripRef = doc(db, 'trips', tripId);
    updateDoc(tripRef, {
      [`members.${memberId}`]: 'member'
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: tripRef.path,
        operation: 'update',
        requestResourceData: { [`members.${memberId}`]: 'member' },
      } satisfies SecurityRuleContext));
    });
  }
  
  return memberId;
}

export function updateMemberRole(db: Firestore, tripId: string, memberId: string, newRole: string) {
  const memberDocRef = doc(db, 'trips', tripId, 'members', memberId);
  const tripRef = doc(db, 'trips', tripId);

  updateDoc(memberDocRef, { role: newRole }).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: memberDocRef.path,
      operation: 'update',
      requestResourceData: { role: newRole }
    }));
  });

  updateDoc(tripRef, { [`members.${memberId}`]: newRole }).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: tripRef.path,
      operation: 'update',
      requestResourceData: { [`members.${memberId}`]: newRole }
    }));
  });
}

export function removeMember(db: Firestore, tripId: string, memberId: string) {
  const memberDocRef = doc(db, 'trips', tripId, 'members', memberId);
  const tripRef = doc(db, 'trips', tripId);

  deleteDoc(memberDocRef).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: memberDocRef.path,
      operation: 'delete'
    }));
  });

  updateDoc(tripRef, { [`members.${memberId}`]: deleteField() }).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: tripRef.path,
      operation: 'update',
      requestResourceData: { [`members.${memberId}`]: 'deleted' }
    }));
  });
}

export function addItineraryItem(db: Firestore, tripId: string, itemData: any) {
  const itemRef = doc(collection(db, 'trips', tripId, 'itineraryItems'));
  const checklist = generateChecklist(itemData.category, itemData.mode);
  
  const data = cleanData({
    ...itemData,
    tripId,
    checklist,
    actualBudget: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  setDoc(itemRef, data).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: itemRef.path,
      operation: 'create',
      requestResourceData: data,
    } satisfies SecurityRuleContext));
  });
  
  return itemRef.id;
}

export function updateItineraryItem(db: Firestore, tripId: string, itemId: string, itemData: any) {
  const itemRef = doc(db, 'trips', tripId, 'itineraryItems', itemId);
  const data = cleanData({
    ...itemData,
    updatedAt: serverTimestamp(),
  });

  updateDoc(itemRef, data).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: itemRef.path,
      operation: 'update',
      requestResourceData: data,
    } satisfies SecurityRuleContext));
  });
}

export function updateActualBudget(db: Firestore, tripId: string, itemId: string, amount: number) {
  const itemRef = doc(db, 'trips', tripId, 'itineraryItems', itemId);
  updateDoc(itemRef, {
    actualBudget: amount,
    updatedAt: serverTimestamp(),
  }).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: itemRef.path,
      operation: 'update',
      requestResourceData: { actualBudget: amount },
    } satisfies SecurityRuleContext));
  });
}

export function deleteItineraryItem(db: Firestore, tripId: string, itemId: string) {
  const itemRef = doc(db, 'trips', tripId, 'itineraryItems', itemId);
  deleteDoc(itemRef).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: itemRef.path,
      operation: 'delete',
    } satisfies SecurityRuleContext));
  });
}

export async function updateChecklistItemStatus(db: Firestore, tripId: string, itemId: string, checklistIndex: number, currentStatus: string) {
  const next =
    currentStatus === "red" ? "yellow" :
    currentStatus === "yellow" ? "green" : "red";

  const itemRef = doc(db, 'trips', tripId, 'itineraryItems', itemId);
  
  try {
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) return;
    
    const checklist = [...itemSnap.data().checklist];
    checklist[checklistIndex] = { ...checklist[checklistIndex], status: next };

    updateDoc(itemRef, { 
      checklist,
      updatedAt: serverTimestamp()
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: itemRef.path,
        operation: 'update',
        requestResourceData: { checklist },
      } satisfies SecurityRuleContext));
    });
  } catch (error) {
    console.error("Error updating checklist status:", error);
  }
}

export function addSuggestion(db: Firestore, tripId: string, suggestion: any) {
  const suggestionRef = doc(collection(db, 'trips', tripId, 'suggestions'));
  const data = cleanData({
    ...suggestion,
    tripId,
    isAiRecommended: false,
    createdAt: serverTimestamp(),
  });
  
  setDoc(suggestionRef, data).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: suggestionRef.path,
      operation: 'create',
      requestResourceData: data,
    } satisfies SecurityRuleContext));
  });
}

/**
 * Adds a suggestion specifically for an itinerary item.
 */
export function addItemSuggestion(db: Firestore, tripId: string, itemId: string, suggestionData: any) {
  const suggestionRef = doc(collection(db, 'trips', tripId, 'itineraryItems', itemId, 'suggestions'));
  const data = cleanData({
    ...suggestionData,
    addedAt: serverTimestamp(),
    aiRecommended: false,
    aiReason: "",
  });

  setDoc(suggestionRef, data).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: suggestionRef.path,
      operation: 'create',
      requestResourceData: data,
    } satisfies SecurityRuleContext));
  });
}

export function markAiRecommended(db: Firestore, tripId: string, suggestionId: string, reason: string) {
  const suggestionRef = doc(db, 'trips', tripId, 'suggestions', suggestionId);
  updateDoc(suggestionRef, {
    isAiRecommended: true,
    aiReason: reason
  }).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: suggestionRef.path,
      operation: 'update',
      requestResourceData: { isAiRecommended: true, aiReason: reason },
    } satisfies SecurityRuleContext));
  });
}

/**
 * Marks an itinerary item suggestion as AI recommended.
 */
export function markItemSuggestionAiPick(db: Firestore, tripId: string, itemId: string, suggestionId: string, reason: string) {
  const suggestionRef = doc(db, 'trips', tripId, 'itineraryItems', itemId, 'suggestions', suggestionId);
  updateDoc(suggestionRef, {
    aiRecommended: true,
    aiReason: reason
  }).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: suggestionRef.path,
      operation: 'update',
      requestResourceData: { aiRecommended: true, aiReason: reason },
    } satisfies SecurityRuleContext));
  });
}

export function addPackingItem(db: Firestore, tripId: string, item: any) {
  const packingRef = doc(collection(db, 'trips', tripId, 'packingItems'));
  const data = cleanData({
    ...item,
    tripId,
    isPacked: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  setDoc(packingRef, data).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: packingRef.path,
      operation: 'create',
      requestResourceData: data,
    } satisfies SecurityRuleContext));
  });
}

export function togglePackedStatus(db: Firestore, tripId: string, itemId: string, currentStatus: boolean) {
  const itemRef = doc(db, 'trips', tripId, 'packingItems', itemId);
  updateDoc(itemRef, {
    isPacked: !currentStatus,
    updatedAt: serverTimestamp(),
  }).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: itemRef.path,
      operation: 'update',
      requestResourceData: { isPacked: !currentStatus },
    } satisfies SecurityRuleContext));
  });
}

export function deletePackingItem(db: Firestore, tripId: string, itemId: string) {
  const itemRef = doc(db, 'trips', tripId, 'packingItems', itemId);
  deleteDoc(itemRef).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: itemRef.path,
      operation: 'delete',
    } satisfies SecurityRuleContext));
  });
}

export function markTripComplete(db: Firestore, tripId: string) {
  const tripRef = doc(db, 'trips', tripId);
  updateDoc(tripRef, {
    status: 'Completed',
    updatedAt: serverTimestamp(),
  }).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: tripRef.path,
      operation: 'update',
      requestResourceData: { status: 'Completed' },
    } satisfies SecurityRuleContext));
  });
}

export function deleteSuggestion(db: Firestore, tripId: string, suggestionId: string) {
  const suggestionRef = doc(db, 'trips', tripId, 'suggestions', suggestionId);
  deleteDoc(suggestionRef).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: suggestionRef.path,
      operation: 'delete',
    } satisfies SecurityRuleContext));
  });
}

export function deleteItemSuggestion(db: Firestore, tripId: string, itemId: string, suggestionId: string) {
  const suggestionRef = doc(db, 'trips', tripId, 'itineraryItems', itemId, 'suggestions', suggestionId);
  deleteDoc(suggestionRef).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: suggestionRef.path,
      operation: 'delete',
    } satisfies SecurityRuleContext));
  });
}
