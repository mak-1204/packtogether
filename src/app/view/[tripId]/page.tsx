
'use client';

import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Wallet, Plane, Bus, Sparkles, Train, Info, Coffee, Sun, Sunset, Moon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { toDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const TIME_SLOTS = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;

export default function PublicTripViewPage() {
  const { tripId } = useParams() as { tripId: string };
  const firestore = useFirestore();

  const tripRef = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    return doc(firestore, 'trips', tripId);
  }, [firestore, tripId]);

  const itineraryQuery = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    return query(collection(firestore, 'trips', tripId, 'itineraryItems'), orderBy('dayNumber'));
  }, [firestore, tripId]);

  const { data: trip, isLoading: isTripLoading } = useDoc(tripRef);
  const { data: itinerary } = useCollection(itineraryQuery);

  if (isTripLoading) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-[#0D9488]">Loading...</div>;
  if (!trip) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white font-bold text-center p-6">Trip not found.</div>;

  const totalPlanned = itinerary?.reduce((sum, item) => sum + (item.plannedBudget || 0), 0) || 0;
  const totalActual = itinerary?.reduce((sum, item) => sum + (item.actualBudget || 0), 0) || 0;
  
  const days = Array.from(new Set(itinerary?.map((i: any) => i.dayNumber) || [1])).sort((a, b) => (a as number) - (b as number));

  const getSlotIcon = (slot: string) => {
    switch (slot) {
      case 'Morning': return <Coffee className="w-3 h-3" />;
      case 'Afternoon': return <Sun className="w-3 h-3" />;
      case 'Evening': return <Sunset className="w-3 h-3" />;
      case 'Night': return <Moon className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] pb-20 text-white selection:bg-[#0D9488] selection:text-white">
      <div className="relative h-[40vh] w-full">
        <Image 
          src={trip.coverImageUrl || `https://picsum.photos/seed/${trip.id}/1200/600`} 
          alt={trip.destination} 
          fill 
          className="object-cover"
          data-ai-hint="travel landscape"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-transparent" />
        <div className="absolute bottom-10 left-0 right-0 text-center px-6">
          <Badge className="mb-4 bg-[#0D9488] text-white px-4 py-1.5 rounded-full font-black uppercase tracking-widest border-none shadow-xl">
            {trip.vibe}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-2 tracking-tighter">{trip.destination}</h1>
          <p className="text-zinc-300 text-lg font-medium opacity-90">{trip.name}</p>
        </div>
      </div>

      <main className="container max-w-lg mx-auto p-6 space-y-12 -mt-8 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white/5 border-white/5 backdrop-blur-xl rounded-[1.5rem] shadow-2xl">
            <CardContent className="p-5 text-center space-y-2">
              <Calendar className="w-5 h-5 mx-auto text-[#0D9488]" />
              <div>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Dates</p>
                <p className="text-sm font-bold">
                  {format(toDate(trip.startDate), 'MMM dd')} - {format(toDate(trip.endDate), 'MMM dd')}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/5 backdrop-blur-xl rounded-[1.5rem] shadow-2xl">
            <CardContent className="p-5 text-center space-y-2">
              <Wallet className="w-5 h-5 mx-auto text-[#0D9488]" />
              <div>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Budget pp</p>
                <p className="text-sm font-bold">₹{trip.budgetPerHead?.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <h3 className="text-2xl font-black text-white tracking-tight">The Itinerary</h3>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          
          <div className="space-y-12">
            {days.map(dayNum => {
              const dayItems = itinerary?.filter((i: any) => i.dayNumber === dayNum) || [];
              const dayDate = addDays(toDate(trip.startDate), (dayNum as number) - 1);

              return (
                <div key={dayNum as number} className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-[#0D9488] font-black shadow-lg">
                      D{dayNum as number}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-white">{format(dayDate, 'EEEE, MMM dd')}</p>
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Day {dayNum as number}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-10 pl-6 border-l border-white/5 ml-6">
                    {TIME_SLOTS.map(slot => {
                      const slotItems = dayItems.filter((i: any) => i.timeSlot === slot || (!i.timeSlot && slot === 'Morning' && dayItems.indexOf(i) === 0));
                      if (slotItems.length === 0) return null;

                      return (
                        <div key={slot} className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="text-[#0D9488] opacity-60">
                              {getSlotIcon(slot)}
                            </div>
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{slot}</span>
                          </div>
                          <div className="space-y-4">
                            {slotItems.map((item: any) => (
                              <Card key={item.id} className="bg-white/5 border-white/5 rounded-2xl overflow-hidden shadow-md">
                                <CardContent className="p-4 flex items-start gap-4">
                                  <div className="shrink-0 w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center text-[#0D9488]">
                                    {item.category === 'transport' ? <Bus className="w-5 h-5" /> :
                                     item.category === 'travel' ? <Train className="w-5 h-5" /> :
                                     item.category === 'food' ? <Sparkles className="w-5 h-5" /> :
                                     item.category === 'stay' ? <MapPin className="w-5 h-5" /> :
                                     <Sparkles className="w-5 h-5" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
                                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{item.notes}</p>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Card className="bg-[#0D9488]/5 border-[#0D9488]/20 rounded-[2rem] overflow-hidden p-8 text-center space-y-6">
          <div className="space-y-2">
            <p className="text-[10px] text-[#0D9488] font-black uppercase tracking-widest">Financial Summary</p>
            <div className="flex justify-center items-baseline gap-2">
              <span className="text-4xl font-black text-white">₹{totalActual.toLocaleString()}</span>
              <span className="text-sm text-zinc-500 font-bold">/ ₹{totalPlanned.toLocaleString()}</span>
            </div>
          </div>
          <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#0D9488] transition-all duration-1000" 
              style={{ width: `${Math.min((totalActual / (totalPlanned || 1)) * 100, 100)}%` }} 
            />
          </div>
          <p className="text-xs text-zinc-400 font-medium">This trip is currently {totalActual > totalPlanned ? 'over' : 'under'} budget by ₹{Math.abs(totalPlanned - totalActual).toLocaleString()}.</p>
        </Card>

        <div className="pt-8 space-y-4">
          <Link href={`/create-trip?templateId=${tripId}`} className="w-full block">
            <Button size="lg" className="w-full h-16 rounded-2xl bg-[#0D9488] hover:bg-[#0D9488]/90 text-lg font-black gap-3 shadow-2xl shadow-[#0D9488]/30 transition-all active:scale-95">
              Clone this Trip <Sparkles className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-center text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">Plan your next adventure with PackTogether</p>
        </div>
      </main>
    </div>
  );
}
