'use client';

import { useState, useEffect } from 'react';
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
import { CalendarIcon, Copy, Share2, ArrowRight, Compass, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

const VIBES = [
  { id: 'Budget', icon: '🏕️', label: 'Budget' },
  { id: 'Mid-Range', icon: '🏨', label: 'Mid-Range' },
  { id: 'Luxury', icon: '👑', label: 'Luxury' },
];

export default function CreateTripPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [budget, setBudget] = useState('');
  const [vibe, setVibe] = useState('Mid-Range');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);

  if (isUserLoading || !user) return null;

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
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-white/5 bg-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="text-center pt-10">
            <div className="mx-auto w-20 h-20 bg-[#0D9488]/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-[#0D9488]" />
            </div>
            <CardTitle className="text-3xl font-black text-white">Trip Ready! 🚀</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 px-8 pb-10">
            <div className="text-center text-zinc-400 text-sm leading-relaxed">
              Invite your gang using this link. They can join instantly even without an account.
            </div>
            
            <div className="bg-black/40 p-4 rounded-2xl flex items-center gap-3 border border-white/5 group transition-colors hover:border-[#0D9488]/30">
              <span className="text-xs truncate flex-1 font-mono text-zinc-400">{shareLink}</span>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-10 w-10 shrink-0 text-[#0D9488] hover:bg-[#0D9488]/10" 
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  toast({ title: 'Link copied!' });
                }}
              >
                <Copy className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Button 
                className="w-full h-14 rounded-2xl bg-[#25D366] hover:bg-[#25D366]/90 text-white font-bold gap-3 text-lg" 
                onClick={() => {
                  window.open(`https://wa.me/?text=Hey! Join our trip to ${destination} on PackTogether: ${shareLink}`, '_blank');
                }}
              >
                <Share2 className="w-5 h-5" /> Share on WhatsApp
              </Button>
              <Link href={`/trip/${createdTripId}`} className="w-full">
                <Button className="w-full h-14 rounded-2xl bg-[#0D9488] hover:bg-[#0D9488]/90 text-white font-bold gap-3 text-lg">
                  Go to Trip <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2">
        <Compass className="w-8 h-8 text-[#0D9488]" />
        <span className="text-xl font-black tracking-tighter text-white">PackTogether</span>
      </Link>

      <Card className="max-w-[480px] w-full border-white/5 bg-white/5 shadow-2xl rounded-[2.5rem]">
        <CardHeader className="pt-8">
          <CardTitle className="text-2xl font-black text-center text-white tracking-tight">Plan a New Trip ✈️</CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-400 font-bold ml-1 uppercase text-[10px] tracking-widest">Trip Name</Label>
              <Input 
                className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-[#0D9488]" 
                placeholder="e.g. Ooty Escapade" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400 font-bold ml-1 uppercase text-[10px] tracking-widest">Destination</Label>
              <Input 
                className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-[#0D9488]" 
                placeholder="e.g. Ooty, Tamil Nadu" 
                value={destination} 
                onChange={e => setDestination(e.target.value)} 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 font-bold ml-1 uppercase text-[10px] tracking-widest">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full h-12 justify-start text-left font-normal bg-black/20 border-white/10 rounded-xl", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4 text-[#0D9488]" />
                      {startDate ? format(startDate, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#0F172A] border-white/10">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 font-bold ml-1 uppercase text-[10px] tracking-widest">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full h-12 justify-start text-left font-normal bg-black/20 border-white/10 rounded-xl", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4 text-[#0D9488]" />
                      {endDate ? format(endDate, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#0F172A] border-white/10">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400 font-bold ml-1 uppercase text-[10px] tracking-widest">Budget Per Head</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0D9488] font-bold">₹</span>
                <Input 
                  type="number" 
                  className="pl-8 bg-black/20 border-white/10 h-12 rounded-xl focus:border-[#0D9488]" 
                  placeholder="5000" 
                  value={budget} 
                  onChange={e => setBudget(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400 font-bold ml-1 uppercase text-[10px] tracking-widest">Vibe</Label>
              <div className="grid grid-cols-3 gap-3">
                {VIBES.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVibe(v.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300",
                      vibe === v.id 
                        ? "border-[#0D9488] bg-[#0D9488]/10 shadow-[0_0_20px_rgba(13,148,136,0.15)] scale-105" 
                        : "border-white/5 bg-black/20 hover:bg-white/5"
                    )}
                  >
                    <span className="text-2xl mb-1">{v.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-tight">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full h-14 bg-[#0D9488] hover:bg-[#0D9488]/90 text-white text-lg font-black rounded-2xl mt-4 shadow-xl shadow-[#0D9488]/20 transition-all active:scale-95" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Trip & Get Link'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
