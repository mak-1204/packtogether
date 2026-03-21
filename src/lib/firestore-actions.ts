'use client';

import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  getDoc,
  serverTimestamp,
  Firestore,
  Timestamp
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Creates a new trip with a pre-generated ID for optimistic navigation.
 */
export function createTrip(db: Firestore, tripData: any, userId: string, tripId: string) {
  const tripRef = doc(db, 'trips', tripId);
  const data = {
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
  };

  setDoc(tripRef, data).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: tripRef.path,
      operation: 'create',
      requestResourceData: data,
    } satisfies SecurityRuleContext));
  });

  return tripId;
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
    const data = {
      ...memberData,
      tripId,
      role: 'member',
      joinedAt: serverTimestamp(),
    };

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

export function addItineraryItem(db: Firestore, tripId: string, itemData: any) {
  const itemRef = doc(collection(db, 'trips', tripId, 'itineraryItems'));
  const data = {
    ...itemData,
    tripId,
    actualBudget: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  setDoc(itemRef, data).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: itemRef.path,
      operation: 'create',
      requestResourceData: data,
    } satisfies SecurityRuleContext));
  });

  if (itemData.category === 'travel') {
    const checklistRef = collection(db, 'trips', tripId, 'itineraryItems', itemRef.id, 'checklistItems');
    const defaults = ['Tickets Downloaded', 'Hotel Confirmation', 'Local Cash Ready', 'Bags Packed'];
    
    defaults.forEach((description, index) => {
      const checkDocRef = doc(checklistRef);
      const checkData = {
        description,
        status: 'red',
        order: index,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      setDoc(checkDocRef, checkData).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: checkDocRef.path,
          operation: 'create',
          requestResourceData: checkData,
        } satisfies SecurityRuleContext));
      });
    });
  }
  
  return itemRef.id;
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

export function updateChecklistItemStatus(db: Firestore, tripId: string, itemId: string, checklistId: string, newStatus: string) {
  const checkRef = doc(db, 'trips', tripId, 'itineraryItems', itemId, 'checklistItems', checklistId);
  updateDoc(checkRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  }).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: checkRef.path,
      operation: 'update',
      requestResourceData: { status: newStatus },
    } satisfies SecurityRuleContext));
  });
}

export function addSuggestion(db: Firestore, tripId: string, suggestion: any) {
  const suggestionRef = doc(collection(db, 'trips', tripId, 'suggestions'));
  const data = {
    ...suggestion,
    tripId,
    isAiRecommended: false,
    createdAt: serverTimestamp(),
  };
  
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

export function addPackingItem(db: Firestore, tripId: string, item: any) {
  const packingRef = doc(collection(db, 'trips', tripId, 'packingItems'));
  const data = {
    ...item,
    tripId,
    isPacked: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
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
