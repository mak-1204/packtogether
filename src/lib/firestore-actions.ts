'use client';

import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  getDoc,
  serverTimestamp,
  Firestore,
  orderBy
} from 'firebase/firestore';

export async function createTrip(db: Firestore, tripData: any, userId: string) {
  const tripRef = collection(db, 'trips');
  const docRef = await addDoc(tripRef, {
    ...tripData,
    organizerId: userId,
    members: { [userId]: 'organizer' },
    status: 'Planning',
    totalPlannedBudget: 0,
    totalActualBudget: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function joinTrip(db: Firestore, tripId: string, memberData: { name: string, mobile: string, userId?: string }) {
  const membersRef = collection(db, 'trips', tripId, 'members');
  const memberId = memberData.userId || doc(collection(db, 'temp')).id;
  
  await setDoc(doc(membersRef, memberId), {
    ...memberData,
    tripId,
    role: 'member',
    createdAt: serverTimestamp(),
  });

  // Also update parent trip members map for security rules
  const tripRef = doc(db, 'trips', tripId);
  const tripSnap = await getDoc(tripRef);
  if (tripSnap.exists()) {
    const currentMembers = tripSnap.data().members || {};
    await updateDoc(tripRef, {
      [`members.${memberId}`]: 'member'
    });
  }
  
  return memberId;
}

export async function addItineraryItem(db: Firestore, tripId: string, itemData: any) {
  const itemsRef = collection(db, 'trips', tripId, 'itineraryItems');
  return addDoc(itemsRef, {
    ...itemData,
    tripId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateActualBudget(db: Firestore, tripId: string, itemId: string, amount: number) {
  const itemRef = doc(db, 'trips', tripId, 'itineraryItems', itemId);
  return updateDoc(itemRef, {
    actualBudget: amount,
    updatedAt: serverTimestamp(),
  });
}

export async function addSuggestion(db: Firestore, tripId: string, suggestion: any) {
  const suggestionsRef = collection(db, 'trips', tripId, 'suggestions');
  return addDoc(suggestionsRef, {
    ...suggestion,
    tripId,
    isAiRecommended: false,
    createdAt: serverTimestamp(),
  });
}

export async function addPackingItem(db: Firestore, tripId: string, item: any) {
  const packingRef = collection(db, 'trips', tripId, 'packingItems');
  return addDoc(packingRef, {
    ...item,
    tripId,
    isPacked: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function togglePackedStatus(db: Firestore, tripId: string, itemId: string, currentStatus: boolean) {
  const itemRef = doc(db, 'trips', tripId, 'packingItems', itemId);
  return updateDoc(itemRef, {
    isPacked: !currentStatus,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePackingItem(db: Firestore, tripId: string, itemId: string) {
  const itemRef = doc(db, 'trips', tripId, 'packingItems', itemId);
  return deleteDoc(itemRef);
}

export async function markTripComplete(db: Firestore, tripId: string) {
  const tripRef = doc(db, 'trips', tripId);
  return updateDoc(tripRef, {
    status: 'Completed',
    updatedAt: serverTimestamp(),
  });
}

export function saveMemberSession(tripId: string, data: { name: string, mobile: string, memberId: string }) {
  localStorage.setItem(`packtogether_session_${tripId}`, JSON.stringify(data));
}

export function getMemberSession(tripId: string) {
  if (typeof window === 'undefined') return null;
  const session = localStorage.getItem(`packtogether_session_${tripId}`);
  return session ? JSON.parse(session) : null;
}
