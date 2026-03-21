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
import { Calendar, Wallet, MapPin } from 'lucide-react';
import Image from 'next/image';
import { toast } from '@/hooks/use-toast';

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

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  if (!trip) return <div className="min-h-screen bg-background flex items-center justify-center">Trip not found.</div>;

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-border/40 shadow-2xl overflow-hidden">
        <div className="relative h-48 w-full">
          <Image src={trip.coverImageUrl || `https://picsum.photos/seed/${trip.id}/600/300`} alt={trip.destination} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute bottom-4 left-6">
            <h1 className="text-3xl font-bold text-white">{trip.destination}</h1>
            <p className="text-zinc-300">{trip.name}</p>
          </div>
        </div>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="w-4 h-4" />
              <span>{new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Wallet className="w-4 h-4" />
              <span>₹{trip.budgetPerHead?.toLocaleString()} pp</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>What&apos;s your name?</Label>
              <Input placeholder="e.g. John Doe" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Your mobile number</Label>
              <Input placeholder="e.g. 9876543210" value={mobile} onChange={e => setMobile(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isSubmitting}>
              {isSubmitting ? 'Joining...' : 'Join Trip →'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}