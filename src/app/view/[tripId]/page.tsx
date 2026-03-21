'use client';

import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Wallet, Plane, Bus, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function PublicTripViewPage() {
  const { tripId } = useParams() as { tripId: string };
  const { firestore } = useFirestore();

  const tripRef = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    return doc(firestore, 'trips', tripId);
  }, [firestore, tripId]);

  const itineraryQuery = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    return query(collection(firestore, 'trips', tripId, 'itineraryItems'), orderBy('dayNumber'), orderBy('createdAt'));
  }, [firestore, tripId]);

  const { data: trip, isLoading: isTripLoading } = useDoc(tripRef);
  const { data: itinerary } = useCollection(itineraryQuery);

  if (isTripLoading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  if (!trip) return <div className="min-h-screen bg-background flex items-center justify-center">Trip not found.</div>;

  const totalPlanned = itinerary?.reduce((sum, item) => sum + (item.plannedBudget || 0), 0) || 0;
  const days = Array.from(new Set(itinerary?.map((i: any) => i.dayNumber) || [1])).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative h-72 w-full">
        <Image src={trip.coverImageUrl || `https://picsum.photos/seed/${trip.id}/1200/600`} alt={trip.destination} fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center w-full px-4">
          <Badge className="mb-4 bg-primary text-white backdrop-blur-md uppercase tracking-widest">{trip.vibe}</Badge>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-2">{trip.destination}</h1>
          <p className="text-zinc-300 text-lg">{trip.name}</p>
        </div>
      </div>

      <main className="container max-w-lg mx-auto p-6 space-y-10">
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card/50 border-border/40">
            <CardContent className="p-4 text-center space-y-1">
              <Calendar className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase">Dates</p>
              <p className="text-sm font-bold">{new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/40">
            <CardContent className="p-4 text-center space-y-1">
              <Wallet className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase">Budget pp</p>
              <p className="text-sm font-bold">₹{trip.budgetPerHead?.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <h3 className="text-2xl font-bold border-l-4 border-primary pl-4">The Itinerary</h3>
          {days.map(dayNum => {
            const items = itinerary?.filter((i: any) => i.dayNumber === dayNum) || [];
            return (
              <div key={dayNum} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black">
                    D{dayNum}
                  </div>
                  <div className="h-px flex-1 bg-border/40" />
                </div>
                <div className="space-y-4 pl-4">
                  {items.map((item: any) => (
                    <div key={item.id} className="relative pl-6 border-l border-border/40 pb-6 last:pb-0">
                      <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-primary" />
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                          {item.category === 'transport' ? <Bus className="w-4 h-4" /> :
                           item.category === 'travel' ? <Plane className="w-4 h-4" /> :
                           <Sparkles className="w-4 h-4" />}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">{item.notes}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-10 flex flex-col gap-4">
          <Link href="/create-trip" className="w-full">
            <Button size="lg" className="w-full h-14 rounded-2xl text-lg font-bold gap-2 shadow-2xl shadow-primary/20">
              Clone this Trip <Sparkles className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-center text-xs text-muted-foreground uppercase tracking-widest">Powered by PackTogether</p>
        </div>
      </main>
    </div>
  );
}