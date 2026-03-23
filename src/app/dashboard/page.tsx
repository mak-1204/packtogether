'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, LogOut, Plane, MapPin, Users, Calendar, Wallet, Copy, Compass, Loader2, Trash2, Share2 
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import Image from 'next/image';
import { toast } from '@/hooks/use-toast';
import { toDate } from '@/lib/utils';
import { deleteTrip } from '@/lib/firestore-actions';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);

  // Protection & Redirect Logic
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      const pendingJoin = sessionStorage.getItem("pendingJoinTripId");
      if (pendingJoin) {
        sessionStorage.removeItem("pendingJoinTripId");
        router.push(`/join/${pendingJoin}`);
        return;
      }
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user && firestore) {
      getDoc(doc(firestore, 'users', user.uid)).then(snap => {
        if (snap.exists()) setUserProfile(snap.data());
      });
    }
  }, [user, firestore]);

  const tripsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    try {
      return query(
        collection(firestore, 'trips'),
        where(`members.${user.uid}`, '!=', null)
      );
    } catch (e) {
      return null;
    }
  }, [firestore, user]);

  const { data: trips, isLoading: isTripsLoading } = useCollection(tripsQuery);

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-slate-700 border-t-teal-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleCloneTemplate = async (trip: any) => {
    if (!firestore || !user) return;
    try {
      const newTripData = {
        name: `${trip.name} (Copy)`,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        budgetPerHead: trip.budgetPerHead,
        vibe: trip.vibe,
        coverImageUrl: trip.coverImageUrl,
        organizerId: user.uid,
        members: { [user.uid]: 'organizer' },
        status: 'Planning',
        totalPlannedBudget: 0,
        totalActualBudget: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(firestore, 'trips'), newTripData);
      toast({ title: "Template Cloned!", description: `New trip to ${trip.destination} created.` });
      router.push(`/trip/${docRef.id}`);
    } catch (error) {
      toast({ variant: 'destructive', title: "Error cloning trip", description: "Please try again." });
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!firestore) return;
    try {
      await deleteTrip(firestore, tripId);
      toast({ title: "Trip Deleted", description: "The trip has been removed from your list." });
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Error", description: error.message || "Could not delete trip." });
    }
  };

  const handleShare = (tripId: string, destination: string) => {
    const shareLink = `${window.location.origin}/join/${tripId}`;
    navigator.clipboard.writeText(shareLink);
    toast({ 
      title: "Link Copied!", 
      description: `Share this link with your gang to join the trip to ${destination}.` 
    });
  };

  const firstName = userProfile?.firstName || user.displayName?.split(" ")[0] || 'Traveler';

  const canDeleteTrip = (trip: any) => {
    if (!user) return false;
    return trip.organizerId === user.uid || (trip.members && trip.members[user.uid] === 'admin');
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white pb-24 selection:bg-[#0D9488] selection:text-white">
      <header className="border-b border-white/5 bg-[#0F172A]/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
          <Link href="/" className="flex items-center gap-2">
            <Compass className="w-6 h-6 sm:w-8 sm:h-8 text-[#0D9488]" />
            <span className="text-lg sm:text-xl font-black tracking-tighter">PackTogether</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-sm font-black text-white leading-tight">{firstName}</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{user.email}</span>
            </div>
            <Avatar className="h-9 w-9 border border-white/10 shadow-lg shrink-0">
              <AvatarImage src={user.photoURL || ''} />
              <AvatarFallback className="bg-[#0D9488] text-white font-bold">
                {firstName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all h-9 w-9">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tight">
            Hey {firstName} 👋
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg">Ready for the next one?</p>
        </div>

        {isTripsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-64 sm:h-80 rounded-[2rem] bg-white/5 animate-pulse" />)}
          </div>
        ) : !trips || trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white/5 rounded-[2.5rem] border border-white/5 px-6 shadow-2xl">
            <div className="w-20 h-20 bg-[#0D9488]/10 rounded-full flex items-center justify-center mb-8 border border-[#0D9488]/20">
              <Plane className="w-10 h-10 text-[#0D9488]" />
            </div>
            <h2 className="text-2xl font-bold mb-3">No trips yet</h2>
            <p className="text-zinc-400 mb-8 max-w-xs text-sm">Create your first trip and start planning with your gang!</p>
            <Link href="/create-trip">
              <Button size="lg" className="bg-[#0D9488] hover:bg-[#0D9488]/90 rounded-full px-8 h-12 text-base font-bold shadow-2xl shadow-[#0D9488]/20 transition-all active:scale-95 w-full sm:w-auto">
                Create Trip
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {trips.map((trip) => (
              <Card key={trip.id} className="overflow-hidden border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all group rounded-[2rem] sm:rounded-[2.5rem] shadow-xl">
                <div className="relative h-40 sm:h-48 w-full">
                  <Image 
                    src={trip.coverImageUrl || `https://picsum.photos/seed/${trip.id}/400/200`} 
                    alt={trip.destination}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/20 to-transparent" />
                  <div className="absolute bottom-4 left-5 sm:left-6">
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">{trip.destination}</h3>
                    <p className="text-zinc-300 text-xs sm:text-sm font-medium opacity-80">{trip.name}</p>
                  </div>
                  <div className="absolute top-4 right-5 sm:right-6 flex gap-2">
                    <Badge className="bg-[#0D9488] text-white font-black px-2 py-0.5 sm:px-3 sm:py-1 border-none shadow-lg text-[10px] sm:text-xs">
                      {trip.status}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-5 sm:p-6">
                  <div className="grid grid-cols-2 gap-y-4 mb-6 sm:mb-8">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs sm:text-sm font-medium">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0D9488]" />
                      <span>{toDate(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400 text-xs sm:text-sm font-medium">
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0D9488]" />
                      <span>{Object.keys(trip.members || {}).length} Members</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400 text-xs sm:text-sm font-medium">
                      <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0D9488]" />
                      <span>₹{trip.budgetPerHead?.toLocaleString()} pp</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400 text-xs sm:text-sm font-medium">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0D9488]" />
                      <span className="truncate">{trip.vibe}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Link href={`/trip/${trip.id}`} className="flex-1 min-w-[120px]">
                      <Button className="w-full bg-[#0D9488] hover:bg-[#0D9488]/90 font-black rounded-xl h-11 sm:h-12 transition-all active:scale-95 shadow-lg shadow-[#0D9488]/10 text-sm">
                        Open Trip
                      </Button>
                    </Link>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="border-white/10 bg-transparent hover:border-[#0D9488] hover:bg-[#0D9488]/10 rounded-xl h-11 w-11 sm:h-12 sm:w-12 transition-all active:scale-90 shrink-0"
                        title="Share Trip Link"
                        onClick={() => handleShare(trip.id, trip.destination)}
                      >
                        <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#0D9488]" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="border-white/10 bg-transparent hover:bg-white/5 rounded-xl h-11 w-11 sm:h-12 sm:w-12 transition-all active:scale-90 shrink-0"
                        title="Use as Template"
                        onClick={() => handleCloneTemplate(trip)}
                      >
                        <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
                      </Button>
                      {canDeleteTrip(trip) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="border-white/10 bg-transparent hover:bg-red-500/10 hover:border-red-500 rounded-xl h-11 w-11 sm:h-12 sm:w-12 transition-all active:scale-90 shrink-0"
                              title="Delete Trip"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#0F172A] border-white/10 rounded-[1.5rem] sm:rounded-[2rem] w-[95vw] sm:max-w-lg">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white font-black text-lg sm:text-xl">Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription className="text-zinc-400 text-sm">
                                This will permanently delete the trip to {trip.destination}. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-4">
                              <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl">Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteTrip(trip.id)}
                                className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold"
                              >
                                Delete Trip
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Link href="/create-trip">
        <Button size="icon" className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#0D9488] hover:bg-[#0D9488]/90 shadow-2xl shadow-[#0D9488]/40 z-50 transition-all active:scale-90">
          <Plus className="w-7 h-7 sm:w-8 sm:h-8" />
        </Button>
      </Link>
    </div>
  );
}