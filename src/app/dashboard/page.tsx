'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, LogOut, Plane, MapPin, Users, Calendar, Wallet, Copy, Compass, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import Image from 'next/image';
import { toast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
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
    return query(
      collection(firestore, 'trips'),
      where(`members.${user.uid}`, '!=', null)
    );
  }, [firestore, user]);

  const { data: trips, isLoading: isTripsLoading } = useCollection(tripsQuery);

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-[#0D9488]">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const handleLogout = () => signOut(auth).then(() => router.push('/'));

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

  const displayName = userProfile?.firstName || user.displayName || 'Traveler';
  const displayMobile = userProfile?.mobile || '';

  return (
    <div className="min-h-screen bg-[#0F172A] text-white pb-24 selection:bg-[#0D9488] selection:text-white">
      {/* Top Bar */}
      <header className="border-b border-white/5 bg-[#0F172A]/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Compass className="w-8 h-8 text-[#0D9488]" />
            <span className="text-xl font-black tracking-tighter">PackTogether</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end mr-1">
              <span className="text-sm font-black text-white leading-tight">{displayName}</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{displayMobile}</span>
            </div>
            <Avatar className="h-9 w-9 border border-white/10 shadow-lg">
              <AvatarImage src={user.photoURL || ''} />
              <AvatarFallback className="bg-[#0D9488] text-white font-bold">
                {displayName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">
            Hey {displayName.split(' ')[0]} 👋
          </h1>
          <p className="text-zinc-400 text-lg">Ready for the next one?</p>
        </div>

        {isTripsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => <div key={i} className="h-80 rounded-[2rem] bg-white/5 animate-pulse" />)}
          </div>
        ) : !trips || trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 rounded-[2.5rem] border border-white/5 px-6 shadow-2xl">
            <div className="w-24 h-24 bg-[#0D9488]/10 rounded-full flex items-center justify-center mb-8 border border-[#0D9488]/20">
              <Plane className="w-12 h-12 text-[#0D9488]" />
            </div>
            <h2 className="text-2xl font-bold mb-3">No trips yet</h2>
            <p className="text-zinc-400 mb-10 max-w-sm">Create your first trip and start planning with your gang!</p>
            <Link href="/create-trip">
              <Button size="lg" className="bg-[#0D9488] hover:bg-[#0D9488]/90 rounded-full px-10 h-14 text-lg font-bold shadow-2xl shadow-[#0D9488]/20 transition-all active:scale-95">
                Create Trip
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trips.map((trip) => (
              <Card key={trip.id} className="overflow-hidden border-white/5 bg-white/5 hover:bg-white/[0.08] transition-all group rounded-[2.5rem] shadow-xl">
                <div className="relative h-48 w-full">
                  <Image 
                    src={trip.coverImageUrl || `https://picsum.photos/seed/${trip.id}/400/200`} 
                    alt={trip.destination}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/20 to-transparent" />
                  <div className="absolute bottom-4 left-6">
                    <h3 className="text-2xl font-black text-white leading-tight tracking-tight">{trip.destination}</h3>
                    <p className="text-zinc-300 text-sm font-medium opacity-80">{trip.name}</p>
                  </div>
                  <div className="absolute top-4 right-6">
                    <Badge className="bg-[#0D9488] text-white font-black px-3 py-1 border-none shadow-lg">
                      {trip.status}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-6 pt-5">
                  <div className="grid grid-cols-2 gap-y-4 mb-8">
                    <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                      <Calendar className="w-4 h-4 text-[#0D9488]" />
                      <span>{new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                      <Users className="w-4 h-4 text-[#0D9488]" />
                      <span>{Object.keys(trip.members || {}).length} Members</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                      <Wallet className="w-4 h-4 text-[#0D9488]" />
                      <span>₹{trip.budgetPerHead?.toLocaleString()} pp</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                      <MapPin className="w-4 h-4 text-[#0D9488]" />
                      <span className="truncate">{trip.vibe}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link href={`/trip/${trip.id}`} className="flex-1">
                      <Button className="w-full bg-[#0D9488] hover:bg-[#0D9488]/90 font-black rounded-xl h-12 transition-all active:scale-95 shadow-lg shadow-[#0D9488]/10">
                        Open Trip
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="border-white/10 bg-transparent hover:bg-white/5 rounded-xl h-12 w-12 transition-all active:scale-90"
                      title="Use as Template"
                      onClick={() => handleCloneTemplate(trip)}
                    >
                      <Copy className="w-5 h-5 text-zinc-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Link href="/create-trip">
        <Button size="icon" className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-[#0D9488] hover:bg-[#0D9488]/90 shadow-2xl shadow-[#0D9488]/40 z-50 transition-all active:scale-90">
          <Plus className="w-8 h-8" />
        </Button>
      </Link>
    </div>
  );
}
