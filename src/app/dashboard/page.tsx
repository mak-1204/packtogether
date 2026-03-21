'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, LogOut, Plane, MapPin, Users, Calendar, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import Image from 'next/image';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const tripsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'trips'),
      where(`members.${user.uid}`, '!=', null),
      orderBy(`members.${user.uid}`)
    );
  }, [firestore, user]);

  const { data: trips, isLoading: isTripsLoading } = useCollection(tripsQuery);

  if (isUserLoading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  if (!user) {
    router.push('/');
    return null;
  }

  const handleLogout = () => signOut(auth).then(() => router.push('/'));

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4 mx-auto">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Plane className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">PackTogether</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium">{user.displayName || 'Traveler'}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Hey {user.displayName?.split(' ')[0] || 'Traveler'} 👋</h1>
          <p className="text-muted-foreground text-lg">Ready for the next one?</p>
        </div>

        {isTripsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : !trips || trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <Plane className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No trips yet</h2>
            <p className="text-muted-foreground mb-8 max-w-sm">Create your first trip and start planning with your gang!</p>
            <Link href="/create-trip">
              <Button size="lg" className="rounded-full px-8">Create Trip</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card key={trip.id} className="overflow-hidden border-border/40 hover:shadow-2xl hover:shadow-primary/5 transition-all group">
                <div className="relative h-48 w-full">
                  <Image 
                    src={trip.coverImageUrl || `https://picsum.photos/seed/${trip.id}/400/200`} 
                    alt={trip.destination}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <h3 className="text-xl font-bold text-white">{trip.destination}</h3>
                    <p className="text-zinc-300 text-sm font-medium">{trip.name}</p>
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge variant={trip.status === 'Planning' ? 'secondary' : trip.status === 'Ongoing' ? 'default' : 'outline'} className="backdrop-blur-md bg-black/20">
                      {trip.status}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Users className="w-4 h-4" />
                      <span>{Object.keys(trip.members || {}).length} Members</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Wallet className="w-4 h-4" />
                      <span>₹{trip.budgetPerHead?.toLocaleString()} pp</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <MapPin className="w-4 h-4" />
                      <span>{trip.vibe}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/trip/${trip.id}`} className="flex-1">
                      <Button className="w-full">Open Trip</Button>
                    </Link>
                    <Button variant="outline" size="icon" title="Use as Template">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Link href="/create-trip">
        <Button size="icon" className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-2xl">
          <Plus className="w-6 h-6" />
        </Button>
      </Link>
    </div>
  );
}