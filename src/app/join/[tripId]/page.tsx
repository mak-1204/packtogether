'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';
import { joinTrip } from '@/lib/firestore-actions';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Wallet, Loader2, Compass, Mail, ArrowRight, UserPlus } from 'lucide-react';
import Image from 'next/image';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { toDate } from '@/lib/utils';

export default function JoinTripPage() {
  const params = useParams();
  const tripId = params?.tripId as string;
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);

  const tripRef = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    return doc(firestore, 'trips', tripId);
  }, [firestore, tripId]);

  const { data: trip, isLoading: isTripLoading } = useDoc(tripRef);

  const handleJoin = async () => {
    if (!user || !firestore || !tripId) return;
    if (isJoining) return;
    
    setIsJoining(true);
    try {
      await joinTrip(firestore, tripId, {
        name: user.displayName || user.email?.split('@')[0] || 'Member',
        email: user.email || '',
        uid: user.uid,
        photoURL: user.photoURL
      });
      sessionStorage.setItem("justJoined", tripId);
      router.push(`/trip/${tripId}`);
    } catch (error) {
      console.error("Join error:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not join trip.' });
      setIsJoining(false);
    }
  };

  useEffect(() => {
    if (user && trip && !isJoining) {
      if (trip.members && trip.members[user.uid]) {
        sessionStorage.setItem("justJoined", tripId);
        router.push(`/trip/${tripId}`);
      } else {
        handleJoin();
      }
    }
  }, [user, trip, isJoining, tripId, router]);

  const handleGoogleSignIn = async () => {
    try {
      sessionStorage.setItem("pendingJoinTripId", tripId);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
    }
  };

  if (isTripLoading || isUserLoading || isJoining || (user && trip)) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-slate-700 border-t-teal-500 animate-spin" />
        
        {trip && (
          <div className="text-center max-w-xs">
            <p className="text-white text-lg sm:text-xl font-bold truncate">{trip.destination}</p>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 truncate">{trip.name}</p>
          </div>
        )}

        <p className="text-teal-400 text-[10px] sm:text-xs tracking-widest uppercase animate-pulse font-black text-center">
          Preparing your boarding pass...
        </p>
      </div>
    );
  }

  if (!trip && !isTripLoading) return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white p-6 text-center">
      <Compass className="w-14 h-14 sm:w-16 sm:h-16 text-teal-500 mb-6" />
      <h1 className="text-2xl sm:text-3xl font-black mb-2">Trip not found</h1>
      <p className="text-zinc-400 mb-8 text-sm sm:text-base max-w-xs mx-auto">The trip you're looking for doesn't exist or has been deleted.</p>
      <Link href="/"><Button className="bg-teal-500 hover:bg-teal-600 rounded-2xl h-14 px-8 font-black">Go Home</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <Card className="max-w-sm w-full border-white/5 bg-white/5 shadow-2xl rounded-[2rem] overflow-hidden">
        <div className="relative h-48 sm:h-56 w-full">
          <Image 
            src={trip.coverImageUrl || `https://picsum.photos/seed/${trip.id}/600/400`} 
            alt={trip.destination} 
            fill 
            className="object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent" />
          <div className="absolute bottom-4 left-6 right-6">
            <Badge className="mb-2 bg-teal-500 text-white font-black px-3 py-1 rounded-lg shadow-xl text-[10px]">{trip.vibe || 'Trip'}</Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight truncate">{trip.destination}</h1>
            <p className="text-zinc-300 text-[10px] font-medium opacity-80 mt-0.5 truncate">{trip.name}</p>
          </div>
        </div>
        <CardContent className="p-6 sm:p-8 space-y-6 sm:space-y-8">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-teal-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Join the gang! ✈️</h2>
            <p className="text-zinc-500 text-xs sm:text-sm font-medium px-4">Sign in to collaborate on the plan for {trip.destination}.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-black/20 p-4 rounded-2xl border border-white/5">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[8px] sm:text-[10px] font-black uppercase tracking-widest truncate">
                <Calendar className="w-3 h-3 text-teal-500 shrink-0" /> Dates
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-white truncate">
                {toDate(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[8px] sm:text-[10px] font-black uppercase tracking-widest truncate">
                <Wallet className="w-3 h-3 text-teal-500 shrink-0" /> Budget
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-white truncate">₹{trip.budgetPerHead?.toLocaleString() || '0'} pp</span>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <Button 
              onClick={handleGoogleSignIn}
              className="w-full h-14 sm:h-16 bg-white hover:bg-zinc-100 text-zinc-900 font-black rounded-2xl gap-3 text-base sm:text-lg shadow-xl"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81.42z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center text-[8px] sm:text-[10px] uppercase font-black text-zinc-500 bg-[#0F172A] px-2">or</div>
            </div>

            <Link 
              href={`/join/${tripId}/email`} 
              className="block w-full"
              onClick={() => sessionStorage.setItem("pendingJoinTripId", tripId)}
            >
              <Button variant="outline" className="w-full h-14 sm:h-16 border-white/10 hover:border-teal-500 bg-transparent text-white font-black rounded-2xl gap-3 text-base sm:text-lg">
                <Mail className="w-5 h-5" /> Email
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}