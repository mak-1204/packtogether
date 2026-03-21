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
  orderBy,
  Timestamp
} from 'firebase/firestore';

export async function createTrip(db: Firestore, tripData: any, userId: string) {
  try {
    console.log("Creating trip with data:", tripData, "userId:", userId);
    
    const tripRef = collection(db, 'trips');
    const docRef = await addDoc(tripRef, {
      ...tripData,
      // Ensure dates are stored as Firestore Timestamps
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
    
    console.log("Trip created successfully with ID:", docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error("createTrip error — code:", error.code, "message:", error.message);
    throw error;
  }
}

export async function joinTrip(db: Firestore, tripId: string, memberData: { name: string, email: string, uid: string, photoURL?: string | null }) {
  const membersRef = collection(db, 'trips', tripId, 'members');
  const memberId = memberData.uid;
  
  // Check if member already exists in subcollection to avoid duplicates
  const memberDocRef = doc(membersRef, memberId);
  const memberSnap = await getDoc(memberDocRef);
  
  if (!memberSnap.exists()) {
    await setDoc(memberDocRef, {
      ...memberData,
      tripId,
      role: 'member',
      joinedAt: serverTimestamp(),
    });

    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      [`members.${memberId}`]: 'member'
    });
  }
  
  return memberId;
}

export async function addItineraryItem(db: Firestore, tripId: string, itemData: any) {
  const itemsRef = collection(db, 'trips', tripId, 'itineraryItems');
  const docRef = await addDoc(itemsRef, {
    ...itemData,
    tripId,
    actualBudget: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (itemData.category === 'travel') {
    const checklistRef = collection(db, 'trips', tripId, 'itineraryItems', docRef.id, 'checklistItems');
    const defaults = ['Tickets Downloaded', 'Hotel Confirmation', 'Local Cash Ready', 'Bags Packed'];
    for (let i = 0; i < defaults.length; i++) {
      await addDoc(checklistRef, {
        description: defaults[i],
        status: 'red',
        order: i,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }
  return docRef.id;
}

export async function updateActualBudget(db: Firestore, tripId: string, itemId: string, amount: number) {
  const itemRef = doc(db, 'trips', tripId, 'itineraryItems', itemId);
  return updateDoc(itemRef, {
    actualBudget: amount,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItineraryItem(db: Firestore, tripId: string, itemId: string) {
  const itemRef = doc(db, 'trips', tripId, 'itineraryItems', itemId);
  return deleteDoc(itemRef);
}

export async function updateChecklistItemStatus(db: Firestore, tripId: string, itemId: string, checklistId: string, newStatus: string) {
  const checkRef = doc(db, 'trips', tripId, 'itineraryItems', itemId, 'checklistItems', checklistId);
  return updateDoc(checkRef, {
    status: newStatus,
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

export async function markAiRecommended(db: Firestore, tripId: string, suggestionId: string, reason: string) {
  const suggestionRef = doc(db, 'trips', tripId, 'suggestions', suggestionId);
  return updateDoc(suggestionRef, {
    isAiRecommended: true,
    aiReason: reason
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