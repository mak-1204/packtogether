'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { joinTrip, saveMemberSession } from '@/lib/firestore-actions';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Wallet, MapPin, Loader2, Compass } from 'lucide-react';
import Image from 'next/image';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function JoinTripPage() {
  const { tripId } = useParams() as { tripId: string };
  const { firestore } = useFirestore();
  const router = useRouter();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tripRef = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    return doc(firestore, 'trips', tripId);
  }, [firestore, tripId]);

  const { data: trip, isLoading } = useDoc(tripRef);

  if (isLoading) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-teal-500"><Loader2 className="animate-spin" /></div>;
  if (!trip) return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white p-6">
      <Compass className="w-16 h-16 text-teal-500 mb-6" />
      <h1 className="text-3xl font-black mb-2">Trip not found</h1>
      <p className="text-zinc-400 mb-8 text-center">The trip you're looking for doesn't exist or has been deleted.</p>
      <Link href="/">
        <Button className="bg-teal-500 hover:bg-teal-600 rounded-2xl h-14 px-8 font-black">Go Home</Button>
      </Link>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in your details.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const memberId = await joinTrip(firestore!, tripId, { name, mobile });
      saveMemberSession(tripId, { name, mobile, memberId });
      toast({ title: 'Welcome aboard!', description: `You've joined ${trip.destination}` });
      router.push(`/trip/${tripId}`);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not join trip.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-white/5 bg-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden">
        <div className="relative h-64 w-full">
          <Image 
            src={trip.coverImageUrl || `https://picsum.photos/seed/${trip.id}/600/400`} 
            alt={trip.destination} 
            fill 
            className="object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent" />
          <div className="absolute bottom-6 left-8 right-8">
            <Badge className="mb-3 bg-teal-500 text-white font-black px-4 py-1.5 rounded-lg shadow-xl">{trip.vibe}</Badge>
            <h1 className="text-4xl font-black text-white tracking-tight leading-tight">{trip.destination}</h1>
            <p className="text-zinc-300 font-medium opacity-80 mt-1">{trip.name}</p>
          </div>
        </div>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-6 bg-black/20 p-5 rounded-3xl border border-white/5">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                <Calendar className="w-3 h-3 text-teal-500" /> Dates
              </div>
              <span className="text-sm font-bold text-white">
                {new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                <Wallet className="w-3 h-3 text-teal-500" /> Budget
              </div>
              <span className="text-sm font-bold text-white">₹{trip.budgetPerHead?.toLocaleString()} pp</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-500 font-black uppercase tracking-widest text-[10px] ml-1">What's your name?</Label>
              <Input 
                className="bg-black/20 border-white/10 h-14 rounded-2xl focus:border-teal-500 text-white" 
                placeholder="e.g. John Doe" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-500 font-black uppercase tracking-widest text-[10px] ml-1">Your mobile number</Label>
              <Input 
                className="bg-black/20 border-white/10 h-14 rounded-2xl focus:border-teal-500 text-white" 
                placeholder="e.g. 9876543210" 
                value={mobile} 
                onChange={e => setMobile(e.target.value)} 
                required 
              />
            </div>
            <Button type="submit" className="w-full h-16 bg-teal-500 hover:bg-teal-600 text-white text-xl font-black rounded-[1.5rem] shadow-xl shadow-teal-500/20 transition-all active:scale-95" disabled={isSubmitting}>
              {isSubmitting ? 'Joining...' : 'Join Trip →'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
