'use client';

import { useState, useEffect, Suspense } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { createTrip } from '@/lib/firestore-actions';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Copy, Share2, ArrowRight, Compass, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';

const VIBES = [
  { id: 'Budget', icon: '🏕️', label: 'Budget' },
  { id: 'Mid-Range', icon: '🏨', label: 'Mid-Range' },
  { id: 'Luxury', icon: '👑', label: 'Luxury' },
];

function CreateTripContent() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId');

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [budget, setBudget] = useState('');
  const [vibe, setVibe] = useState('Mid-Range');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);

  // Guard — Redirect only after we are sure the user isn't logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  // Load template data if available
  useEffect(() => {
    if (templateId && firestore) {
      const fetchTemplate = async () => {
        const docRef = doc(firestore, 'trips', templateId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setName(`${data.name} (Copy)`);
          setDestination(data.destination);
          setBudget(data.budgetPerHead?.toString() || '');
          setVibe(data.vibe || 'Mid-Range');
          toast({ title: "Template loaded!", description: `Pre-filled details for ${data.destination}` });
        }
      };
      fetchTemplate();
    }
  }, [templateId, firestore]);

  // Handle loading state
  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-[#0D9488]">
        <Loader2 className="animate-spin w-12 h-12" />
      </div>
    );
  }

  // Prevent rendering if confirmed not logged in
  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Secondary Guard — Auth check during submit
    if (!user?.uid || !firestore) {
      toast({ 
        variant: 'destructive', 
        title: 'Session Error', 
        description: 'Your session has expired. Please sign in again.' 
      });
      router.push('/auth');
      return;
    }

    if (!name || !destination || !startDate || !endDate || !budget) {
      toast({ 
        variant: 'destructive', 
        title: 'Missing fields', 
        description: 'Please fill in all details before creating your trip.' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const tripData = {
        name,
        destination,
        startDate,
        endDate,
        budgetPerHead: Number(budget),
        vibe,
        coverImageUrl: `https://picsum.photos/seed/${destination}/1920/1080`
      };

      const tripId = await createTrip(firestore, tripData, user.uid);
      setCreatedTripId(tripId);
      toast({ title: 'Trip Created!', description: 'Your adventure starts now.' });
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Creation Failed', 
        description: error.message || 'Could not create trip. Please try again.' 
      });
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
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 relative">
      <Link href="/dashboard" className="absolute top-8 left-8 flex items-center gap-2 group text-zinc-400 hover:text-white transition-colors">
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold uppercase tracking-widest">Back</span>
      </Link>

      <Link href="/dashboard" className="mb-8 flex items-center gap-2">
        <Compass className="w-8 h-8 text-[#0D9488]" />
        <span className="text-xl font-black tracking-tighter text-white">PackTogether</span>
      </Link>

      <Card className="max-w-[480px] w-full border-white/5 bg-white/5 shadow-2xl rounded-[2.5rem]">
        <CardHeader className="pt-8 text-center">
          <CardTitle className="text-2xl font-black text-white tracking-tight">Plan a New Trip ✈️</CardTitle>
          <p className="text-zinc-500 text-xs mt-1 uppercase font-black tracking-widest">Your Gang. One Plan.</p>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-zinc-400 font-bold ml-1 uppercase text-[10px] tracking-widest">Trip Name</Label>
              <Input 
                className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-[#0D9488] text-white" 
                placeholder="e.g. Ooty Escapade" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400 font-bold ml-1 uppercase text-[10px] tracking-widest">Destination</Label>
              <Input 
                className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-[#0D9488] text-white" 
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
                  className="pl-8 bg-black/20 border-white/10 h-12 rounded-xl focus:border-[#0D9488] text-white" 
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
                    <span className="text-[10px] font-black uppercase tracking-tight text-white">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-[#0D9488] hover:bg-[#0D9488]/90 text-white text-lg font-black rounded-2xl mt-4 shadow-xl shadow-[#0D9488]/20 transition-all active:scale-95" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Trip & Get Link'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreateTripPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-[#0D9488]"><Loader2 className="animate-spin" /></div>}>
      <CreateTripContent />
    </Suspense>
  );
}
