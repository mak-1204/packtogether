'use client';

import { useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { createTrip } from '@/lib/firestore-actions';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Copy, Share2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const VIBES = [
  { id: 'Budget', icon: '🏕️', label: 'Budget' },
  { id: 'Mid-Range', icon: '🏨', label: 'Mid-Range' },
  { id: 'Luxury', icon: '👑', label: 'Luxury' },
];

export default function CreateTripPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirestore();
  const router = useRouter();

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [budget, setBudget] = useState('');
  const [vibe, setVibe] = useState('Mid-Range');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);

  if (isUserLoading) return null;
  if (!user) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !destination || !startDate || !endDate || !budget) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill in all details.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const tripId = await createTrip(firestore!, {
        name,
        destination,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        budgetPerHead: Number(budget),
        vibe,
        coverImageUrl: `https://picsum.photos/seed/${destination}/1920/1080`
      }, user.uid);
      setCreatedTripId(tripId);
      toast({ title: 'Trip Created!', description: 'Your adventure starts now.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create trip.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${createdTripId}`;

  if (createdTripId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border/40 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Trip Ready! 🚀</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-muted-foreground">
              Invite your gang using this link. They can join without an account.
            </div>
            <div className="bg-secondary p-3 rounded-lg flex items-center gap-2 border border-border/40 overflow-hidden">
              <span className="text-xs truncate flex-1">{shareLink}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                navigator.clipboard.writeText(shareLink);
                toast({ title: 'Link copied!' });
              }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full gap-2" onClick={() => {
                window.open(`https://wa.me/?text=Hey! Join our trip to ${destination} on PackTogether: ${shareLink}`, '_blank');
              }}>
                <Share2 className="w-4 h-4" /> WhatsApp
              </Button>
              <Link href={`/trip/${createdTripId}`} className="w-full">
                <Button className="w-full gap-2">Go to Trip <ArrowRight className="w-4 h-4" /></Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-border/40 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Plan a New Trip ✈️</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Trip Name</Label>
              <Input placeholder="e.g. Ooty Escapade" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Destination</Label>
              <Input placeholder="e.g. Ooty, Tamil Nadu" value={destination} onChange={e => setDestination(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Budget Per Head (₹)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                <Input type="number" className="pl-8" placeholder="5000" value={budget} onChange={e => setBudget(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vibe</Label>
              <div className="grid grid-cols-3 gap-3">
                {VIBES.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVibe(v.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                      vibe === v.id ? "border-primary bg-primary/10 shadow-lg shadow-primary/20" : "border-border/40 bg-card hover:bg-secondary"
                    )}
                  >
                    <span className="text-2xl mb-1">{v.icon}</span>
                    <span className="text-xs font-medium">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Trip & Get Link'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import Link from 'next/link';
