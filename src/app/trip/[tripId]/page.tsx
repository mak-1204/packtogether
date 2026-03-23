'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, orderBy, Firestore } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { 
  updateActualBudget, 
  addItineraryItem, 
  updateItineraryItem,
  addSuggestion, 
  markAiRecommended,
  addPackingItem, 
  togglePackedStatus, 
  deletePackingItem, 
  markTripComplete,
  deleteItineraryItem,
  updateChecklistItemStatus,
  addItemSuggestion,
  markItemSuggestionAiPick,
  updateTripDetails,
  updateMemberRole,
  removeMember,
  deleteSuggestion,
  deleteItemSuggestion
} from '@/lib/firestore-actions';
import { aiTripSuggestionRecommendation } from '@/ai/flows/ai-trip-suggestion-recommendation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  CheckSquare, Lightbulb, Package, PieChart as PieChartIcon, 
  Plus, MapPin, CheckCircle2, Trash2, 
  ExternalLink, Sparkles, Bus, Plane, Train, ArrowRight, Loader2, Share2, Sun, Sunset, Moon, Coffee, MessageCircle, Settings, Edit, Calendar as CalendarIcon, ArrowLeft, UserPlus, UserCog, UserMinus, Wallet, Users, AlertTriangle, Car
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn, toDate } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { format, addDays } from 'date-fns';

const COLORS = ['#0D9488', '#F7A90A', '#3B82F6', '#8B5CF6', '#EC4899'];
const TIME_SLOTS = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;

export default function TripDetailsPage() {
  const params = useParams();
  const tripId = params?.tripId as string;
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('itinerary');

  const tripRef = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    return doc(firestore, 'trips', tripId);
  }, [firestore, tripId]);

  const itineraryQuery = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    try {
      return query(collection(firestore, 'trips', tripId, 'itineraryItems'), orderBy('dayNumber'));
    } catch (e) {
      return null;
    }
  }, [firestore, tripId]);

  const suggestionsQuery = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    try {
      return query(collection(firestore, 'trips', tripId, 'suggestions'), orderBy('createdAt', 'desc'));
    } catch (e) {
      return null;
    }
  }, [firestore, tripId]);

  const packingQuery = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    try {
      return query(collection(firestore, 'trips', tripId, 'packingItems'), orderBy('createdAt'));
    } catch (e) {
      return null;
    }
  }, [firestore, tripId]);

  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    try {
      return query(collection(firestore, 'trips', tripId, 'members'), orderBy('joinedAt'));
    } catch (e) {
      return null;
    }
  }, [firestore, tripId]);

  const { data: trip, isLoading: isTripLoading } = useDoc(tripRef);
  const { data: itinerary } = useCollection(itineraryQuery);
  const { data: suggestions } = useCollection(suggestionsQuery);
  const { data: packing } = useCollection(packingQuery);
  const { data: members } = useCollection(membersQuery);

  const isOrganizer = user?.uid === trip?.organizerId;
  const userRole = user?.uid && trip?.members ? trip.members[user.uid] : null;
  const isAdmin = isOrganizer || userRole === 'admin';
  const isMember = user && trip?.members && (!!trip.members[user.uid] || user.uid === trip.organizerId);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
      return;
    }

    if (!isTripLoading && !isUserLoading && trip && !isMember) {
      router.push(`/join/${tripId}`);
    }
  }, [isTripLoading, isUserLoading, user, trip, isMember, tripId, router]);

  useEffect(() => {
    if (tripId) {
      const justJoined = sessionStorage.getItem("justJoined");
      if (justJoined === tripId) {
        sessionStorage.removeItem("justJoined");
        toast({
          title: "Welcome aboard! 🎉",
          description: "You've joined the trip successfully.",
        });
      }
    }
  }, [tripId]);

  if (isTripLoading || isUserLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-slate-700 border-t-teal-500 animate-spin" />
      </div>
    );
  }

  if (!trip || !firestore) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white font-bold">Trip not found.</div>;

  const totalPlanned = itinerary?.reduce((sum, item) => sum + (item.plannedBudget || 0), 0) || 0;
  const totalActual = itinerary?.reduce((sum, item) => sum + (item.actualBudget || 0), 0) || 0;
  const budgetRatio = totalActual / (totalPlanned || 1);
  const budgetHealthColor = budgetRatio > 1.1 ? 'bg-red-500' : budgetRatio > 0.9 ? 'bg-amber-500' : 'bg-teal-500';

  return (
    <div className="min-h-screen bg-[#0F172A] text-white selection:bg-teal-500/30">
      <header className="sticky top-0 z-50 bg-[#0F172A]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 shadow-2xl">
        <div className="container max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl shrink-0"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex flex-col min-w-0">
              <h1 className="font-bold text-sm sm:text-base leading-tight truncate text-white">{trip.destination}</h1>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">{trip.name}</span>
            </div>
            {isMember && (
              <EditTripDialog firestore={firestore} trip={trip} />
            )}
          </div>
          <div className="flex-shrink-0 ml-2">
            <span className={cn("text-[10px] sm:text-xs font-black px-3 py-1 rounded-full text-white", budgetHealthColor)}>
              ₹{totalActual.toLocaleString()} / ₹{totalPlanned.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="itinerary" className="mt-0 outline-none pb-24 px-4 pt-6">
            <ItineraryTab firestore={firestore} trip={trip} itinerary={itinerary} isAdmin={isAdmin} isMember={isMember} />
          </TabsContent>
          <TabsContent value="checklist" className="mt-0 outline-none pb-24 px-4 pt-6">
            <ChecklistTab firestore={firestore} trip={trip} itinerary={itinerary} isMember={isMember} isOrganizer={isOrganizer} />
          </TabsContent>
          <TabsContent value="suggestions" className="mt-0 outline-none pb-24 px-4 pt-6">
            <SuggestionsTab firestore={firestore} trip={trip} suggestions={suggestions} isMember={isMember} isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="packing" className="mt-0 outline-none pb-24 px-4 pt-6">
            <PackingTab firestore={firestore} trip={trip} packing={packing} isMember={isMember} />
          </TabsContent>
          <TabsContent value="summary" className="mt-0 outline-none pb-24 px-4 pt-6">
            <SummaryTab firestore={firestore} trip={trip} itinerary={itinerary} members={members} isAdmin={isAdmin} isMember={isMember} isOrganizer={isOrganizer} />
          </TabsContent>

          <TabsList className="fixed bottom-0 left-0 right-0 h-20 bg-[#0F172A]/90 backdrop-blur-2xl border-t border-white/5 rounded-none grid grid-cols-5 z-40 p-0 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            <TabsTrigger value="itinerary" className="flex flex-col gap-1.5 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-500 rounded-none h-full transition-all duration-300">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Plan</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex flex-col gap-1.5 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-500 rounded-none h-full transition-all duration-300">
              <CheckSquare className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Check</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex flex-col gap-1.5 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-500 rounded-none h-full transition-all duration-300">
              <Lightbulb className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Ideas</span>
            </TabsTrigger>
            <TabsTrigger value="packing" className="flex flex-col gap-1.5 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-500 rounded-none h-full transition-all duration-300">
              <Package className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Pack</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex flex-col gap-1.5 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-500 rounded-none h-full transition-all duration-300">
              <PieChartIcon className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Stats</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </main>
    </div>
  );
}

function ItineraryTab({ firestore, trip, itinerary, isAdmin, isMember }: any) {
  const start = toDate(trip.startDate);
  const end = toDate(trip.endDate);
  
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  
  const diffTime = Math.abs(e.getTime() - s.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const days = Array.from({ length: diffDays }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Itinerary</h2>
        {isMember && <AddItineraryDialog firestore={firestore} tripId={trip.id} days={days} />}
      </div>
      
      <Accordion type="multiple" className="space-y-4" defaultValue={['day-1']}>
        {days.map(dayNum => {
          const dayItems = itinerary?.filter((i: any) => i.dayNumber === dayNum) || [];
          const dayDate = addDays(s, dayNum - 1);
          const dayPlanned = dayItems.reduce((sum: number, i: any) => sum + (i.plannedBudget || 0), 0);
          const dayActual = dayItems.reduce((sum: number, i: any) => sum + (i.actualBudget || 0), 0);

          return (
            <AccordionItem key={dayNum} value={`day-${dayNum}`} className="border border-white/5 rounded-[1.5rem] sm:rounded-[2.5rem] px-4 overflow-hidden bg-white/5 backdrop-blur-sm">
              <AccordionTrigger className="hover:no-underline py-4 sm:py-6">
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xl sm:text-2xl font-black">Day {dayNum}</span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">— {format(dayDate, 'EEE dd MMM')}</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-teal-500">₹{dayActual.toLocaleString()} / ₹{dayPlanned.toLocaleString()}</span>
                    <Badge variant="outline" className="text-[9px] font-black border-white/10 text-zinc-400 h-5 px-1.5 rounded-md">
                      {dayItems.length} {dayItems.length === 1 ? 'ITEM' : 'ITEMS'}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6 sm:pb-8 space-y-6 sm:space-y-8">
                {dayItems.length === 0 ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-white/10">
                      <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 font-bold italic text-xs sm:text-sm px-4">Your itinerary is a blank canvas. Start planning!</p>
                    {isMember && (
                      <AddItineraryDialog 
                        firestore={firestore} 
                        tripId={trip.id} 
                        days={days} 
                        defaultDay={dayNum}
                        trigger={
                          <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hover:border-teal-500/50 hover:bg-teal-500/10 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 h-9">
                            <Plus className="w-3 h-3 mr-1.5" /> Add Activity
                          </Button>
                        }
                      />
                    )}
                  </div>
                ) : (
                  TIME_SLOTS.map(slot => {
                    const slotItems = dayItems.filter((i: any) => i.timeSlot === slot);
                    if (slotItems.length === 0) return null;

                    return (
                      <div key={slot} className="space-y-3 sm:space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="text-teal-500">
                            {slot === 'Morning' && <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                            {slot === 'Afternoon' && <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                            {slot === 'Evening' && <Sunset className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                            {slot === 'Night' && <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                          </div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{slot}</h4>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                          {slotItems.map((item: any) => (
                            <ItineraryItemCard key={item.id} firestore={firestore} tripId={trip.id} item={item} isMember={isMember} isAdmin={isAdmin} days={days} />
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function ItineraryItemCard({ firestore, tripId, item, isMember, isAdmin, days }: any) {
  const [actual, setActual] = useState(item.actualBudget?.toString() || '');
  const { user } = useUser();

  const handleUpdateBudget = () => {
    const amount = Number(actual);
    if (!isNaN(amount)) {
      updateActualBudget(firestore, tripId, item.id, amount);
      toast({ title: 'Budget Updated' });
    }
  };

  return (
    <div className="flex items-center gap-2 py-3 border-b border-slate-800 last:border-none">
      <div className="shrink-0 w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
        {item.category === 'transit' ? <Bus className="w-5 h-5" /> :
         item.category === 'journey' ? <Plane className="w-5 h-5" /> :
         item.category === 'food' ? <Sparkles className="w-5 h-5" /> :
         item.category === 'stay' ? <MapPin className="w-5 h-5" /> :
         <Sparkles className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-bold truncate">{item.name}</p>
        <p className="text-slate-400 text-[10px] font-medium">₹{item.plannedBudget?.toLocaleString()} planned</p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <div className="relative w-20">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-teal-500 font-bold text-[10px]">₹</span>
          <Input 
            className="pl-5 bg-[#0F172A] border-slate-700 h-8 rounded-lg text-xs font-bold focus:border-teal-500 text-right pr-2" 
            placeholder="Actual" 
            type="number"
            value={actual}
            onChange={e => setActual(e.target.value)}
            onBlur={handleUpdateBudget}
          />
        </div>
        <div className="flex">
          <EditItineraryDialog firestore={firestore} tripId={tripId} item={item} days={days} />
          {isMember && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg shrink-0"
              onClick={() => deleteItineraryItem(firestore, tripId, item.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function EditItineraryDialog({ firestore, tripId, item, days }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item.name || '');
  const [category, setCategory] = useState(item.category || 'other');
  const [mode, setMode] = useState<string | undefined>(item.mode);
  const [day, setDay] = useState(item.dayNumber?.toString() || '1');
  const [slot, setSlot] = useState(item.timeSlot || 'Morning');
  const [budget, setBudget] = useState(item.plannedBudget?.toString() || '');
  const [notes, setNotes] = useState(item.notes || '');

  const handleSave = () => {
    updateItineraryItem(firestore, tripId, item.id, {
      name,
      category,
      mode: (category === 'journey' || category === 'transit') ? mode : undefined,
      dayNumber: Number(day),
      timeSlot: slot,
      plannedBudget: Number(budget),
      notes
    });
    setOpen(false);
    toast({ title: 'Activity Updated!' });
  };

  const showMode = category === 'journey' || category === 'transit';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:text-teal-500 hover:bg-teal-500/10 rounded-lg shrink-0">
          <Edit className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[95vw] rounded-[1.5rem] sm:rounded-[2.5rem] bg-[#0F172A] border-white/5 shadow-2xl p-6 sm:p-8 backdrop-blur-3xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-black text-white">Edit Activity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 sm:space-y-6 mt-4">
          <div className="space-y-2">
            <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Activity Name</Label>
            <Input className="bg-black/40 border-white/5 h-11 sm:h-12 rounded-xl text-white font-bold text-sm" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Category</Label>
              <Select value={category} onValueChange={(val) => {
                setCategory(val);
                if (val !== 'journey' && val !== 'transit') setMode(undefined);
              }}>
                <SelectTrigger className="bg-black/40 border-white/5 h-11 sm:h-12 rounded-xl text-white font-bold text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                  <SelectItem value="stay">🏨 Stay</SelectItem>
                  <SelectItem value="journey">✈️ Journey</SelectItem>
                  <SelectItem value="transit">🚗 Local Transit</SelectItem>
                  <SelectItem value="food">🍱 Food</SelectItem>
                  <SelectItem value="activity">🎭 Activity</SelectItem>
                  <SelectItem value="other">✨ Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {showMode && (
              <div className="space-y-2">
                <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="bg-black/40 border-white/5 h-11 sm:h-12 rounded-xl text-white font-bold text-sm">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                    <SelectItem value="train">🚆 Train</SelectItem>
                    <SelectItem value="flight">✈️ Flight</SelectItem>
                    <SelectItem value="bus">🚌 Bus</SelectItem>
                    <SelectItem value="roadtrip">🚗 Road Trip</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Planned Budget</Label>
              <Input type="number" className="bg-black/40 border-white/5 h-11 sm:h-12 rounded-xl text-white font-bold text-sm" value={budget} onChange={e => setBudget(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="bg-black/40 border-white/5 h-11 sm:h-12 rounded-xl text-white font-bold text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                  {days.map((d: number) => <SelectItem key={d} value={d.toString()}>Day {d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Time Slot</Label>
              <Select value={slot} onValueChange={setSlot}>
                <SelectTrigger className="bg-black/40 border-white/5 h-11 sm:h-12 rounded-xl text-white font-bold text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                  {TIME_SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Notes</Label>
            <Textarea className="bg-black/40 border-white/5 rounded-xl text-white min-h-[80px] text-sm" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <Button className="w-full h-12 sm:h-14 bg-teal-500 hover:bg-teal-600 rounded-2xl font-black text-lg shadow-xl shadow-teal-500/20" onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistTab({ firestore, trip, itinerary, isMember, isOrganizer }: any) {
  const checklistItems = itinerary?.filter((item: any) => item.checklist && item.checklist.length > 0) || [];
  
  const tripStartsSoon = trip?.startDate && 
    toDate(trip.startDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  const hasRedItems = checklistItems.some((item: any) => 
    item.checklist.some((c: any) => c.status === "red")
  );

  const handleCycleStatus = (itemId: string, index: number, currentStatus: string) => {
    if (!isOrganizer) return;
    updateChecklistItemStatus(firestore, trip.id, itemId, index, currentStatus);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Pre-trip Checklist</h2>
      
      {tripStartsSoon && hasRedItems && (
        <div className="bg-red-500/20 border border-red-500 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 animate-in fade-in duration-500">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-red-400 text-sm font-medium">
            Trip starts soon! Some checklist items still need attention.
          </p>
        </div>
      )}

      {checklistItems.length === 0 ? (
        <Card className="bg-white/5 border-white/5 p-12 text-center rounded-[2rem] sm:rounded-[2.5rem]">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckSquare className="w-8 h-8 sm:w-10 sm:h-10 text-teal-500" />
          </div>
          <p className="text-zinc-400 font-bold text-sm sm:text-base">No checklist items yet.</p>
          <p className="text-zinc-500 text-xs mt-2">Add travel legs or stays in the Plan tab to see their checklist here.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {checklistItems.map((item: any) => (
            <div key={item.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-teal-500 shrink-0">
                  {item.mode === "train" ? <Train className="w-4 h-4" /> :
                   item.mode === "flight" ? <Plane className="w-4 h-4" /> :
                   item.mode === "bus" ? <Bus className="w-4 h-4" /> :
                   item.mode === "roadtrip" ? <Car className="w-4 h-4" /> :
                   item.category === "stay" ? <MapPin className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-white truncate">{item.name}</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Day {item.dayNumber}</p>
                </div>
                <div className="shrink-0">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    {item.checklist.filter((c: any) => c.status === "green").length}/{item.checklist.length} done
                  </span>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-[1.5rem] overflow-hidden">
                {item.checklist.map((check: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-none group">
                    <button 
                      onClick={() => handleCycleStatus(item.id, index, check.status)}
                      className={cn(
                        "w-5 h-5 rounded-full flex-shrink-0 transition-all",
                        check.status === "green" ? "bg-teal-500" :
                        check.status === "yellow" ? "bg-amber-500" : "bg-red-500",
                        isOrganizer ? "cursor-pointer active:scale-90" : "cursor-default"
                      )}
                    />
                    <span className={cn(
                      "flex-1 text-xs font-bold transition-all truncate",
                      check.status === "green" ? "text-zinc-600 line-through" : "text-zinc-300"
                    )}>
                      {check.item}
                    </span>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest shrink-0",
                      check.status === "green" ? "text-teal-500" :
                      check.status === "yellow" ? "text-amber-500" : "text-red-500"
                    )}>
                      {check.status === "green" ? "DONE" : check.status === "yellow" ? "PENDING" : "TODO"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionsTab({ firestore, trip, suggestions, isMember, isAdmin }: any) {
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  const { user } = useUser();

  const handleAdd = () => {
    if (!link) return;
    addSuggestion(firestore, trip.id, {
      link,
      notes,
      addedBy: user?.displayName || 'Member'
    });
    setLink('');
    setNotes('');
    toast({ title: 'Suggestion Added!' });
  };

  const handleDelete = (suggestionId: string) => {
    deleteSuggestion(firestore, trip.id, suggestionId);
    toast({ title: 'Idea removed' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Idea Pool</h2>
      
      {isMember && (
        <div className="space-y-2 mb-6">
          <input
            type="url"
            placeholder="Paste a link (hotel, place, etc.)"
            className="w-full bg-[#0F172A] text-white border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-teal-500 outline-none"
            value={link}
            onChange={e => setLink(e.target.value)}
          />
          <input
            type="text"
            placeholder="Add a note (optional)"
            className="w-full bg-[#0F172A] text-white border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-teal-500 outline-none"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <button 
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black py-3 rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-teal-500/20"
            onClick={handleAdd}
          >
            Add Suggestion
          </button>
        </div>
      )}

      <div className="space-y-4">
        {suggestions?.map((s: any) => (
          <Card key={s.id} className="bg-black/20 border-white/5 rounded-[1.5rem] overflow-hidden group">
            <CardContent className="p-4 sm:p-6 space-y-3 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 bg-teal-500/20 rounded-full flex items-center justify-center text-[10px] font-black text-teal-500 shrink-0">
                    {s.addedBy?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest truncate">{s.addedBy}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.isAiRecommended && <Badge className="bg-amber-500 text-black font-black px-2 py-0.5 border-none text-[8px] sm:text-[10px]">AI PICK</Badge>}
                  {isMember && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <a href={s.link} target="_blank" className="text-teal-400 font-bold text-xs sm:text-sm underline break-all flex items-center gap-1.5 hover:text-teal-300 pr-4">
                  {s.link} <ExternalLink className="w-3 h-3" />
                </a>
                {s.notes && <p className="text-zinc-400 text-[10px] sm:text-xs mt-1 leading-relaxed">"{s.notes}"</p>}
              </div>
              {s.isAiRecommended && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-500 font-medium leading-relaxed">{s.aiReason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PackingTab({ firestore, trip, packing, isMember }: any) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (!newItem) return;
    addPackingItem(firestore, trip.id, { name: newItem });
    setNewItem('');
    toast({ title: 'Item Added' });
  };

  const packedCount = packing?.filter((i: any) => i.isPacked).length || 0;
  const totalCount = packing?.length || 0;
  const progress = totalCount ? (packedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Packing List</h2>
        <Badge className="bg-teal-500/20 text-teal-500 font-black px-3 py-1 border-none">{packedCount}/{totalCount}</Badge>
      </div>

      <div className="space-y-2">
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div
            className="bg-teal-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <span>Get Ready</span>
          <span>{Math.round(progress)}% Ready</span>
        </div>
      </div>

      {isMember && (
        <div className="flex gap-2">
          <Input 
            className="bg-white/5 border-white/5 h-12 rounded-xl sm:rounded-2xl text-white font-bold text-sm" 
            placeholder="Add something to pack..." 
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button className="h-12 w-12 bg-teal-500 hover:bg-teal-600 rounded-xl sm:rounded-2xl shrink-0" onClick={handleAdd}>
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      <div className="space-y-2 sm:space-y-3">
        {packing?.map((item: any) => (
          <div key={item.id} className="flex items-center gap-3 py-3 border-b border-slate-800 last:border-none group">
            <button 
              onClick={() => togglePackedStatus(firestore, trip.id, item.id, item.isPacked)}
              className={cn(
                "w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                item.isPacked ? "bg-teal-500 border-teal-500" : "bg-black/20 border-white/10 hover:border-teal-500"
              )}
              disabled={!isMember}
            >
              {item.isPacked && <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" />}
            </button>
            <span className={cn(
              "flex-1 text-sm font-bold transition-all truncate",
              item.isPacked ? "text-zinc-600 line-through" : "text-white"
            )}>
              {item.name}
            </span>
            {isMember && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-zinc-600 hover:text-red-500 opacity-0 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-all shrink-0"
                onClick={() => deletePackingItem(firestore, trip.id, item.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryTab({ firestore, trip, itinerary, members, isAdmin, isMember, isOrganizer }: any) {
  const totalPlanned = itinerary?.reduce((sum: number, i: any) => sum + (i.plannedBudget || 0), 0) || 0;
  const totalActual = itinerary?.reduce((sum: number, i: any) => sum + (i.actualBudget || 0), 0) || 0;

  const categoryTotals = itinerary?.reduce((acc: any, item: any) => {
    const cat = item.category || 'other';
    acc[cat] = (acc[cat] || 0) + (item.actualBudget || 0);
    return acc;
  }, {});

  const pieData = categoryTotals ? Object.entries(categoryTotals).map(([name, value]) => ({ name: name.toUpperCase(), value })) : [];

  const handleShare = () => {
    const link = `${window.location.origin}/join/${trip.id}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link Copied!', description: 'Share this with your gang.' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-teal-500 border-none rounded-xl sm:rounded-[2rem] shadow-xl shadow-teal-500/20">
          <CardContent className="p-4 sm:p-6 text-black text-center sm:text-left">
            <PieChartIcon className="w-5 h-5 sm:w-6 sm:h-6 mb-3 sm:mb-4 mx-auto sm:mx-0" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Spent</p>
            <h3 className="text-xl sm:text-3xl font-black truncate">₹{totalActual.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/5 rounded-xl sm:rounded-[2rem]">
          <CardContent className="p-4 sm:p-6 text-center sm:text-left">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 mb-3 sm:mb-4 text-teal-500 mx-auto sm:mx-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Planned</p>
            <h3 className="text-xl sm:text-3xl font-black text-white truncate">₹{totalPlanned.toLocaleString()}</h3>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-500" /> Expense Breakdown
        </h3>
        <Card className="bg-black/20 border-white/5 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden p-4 sm:p-6">
          <div className="h-[200px] sm:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-y-3 mt-4">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500 truncate">{d.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-500" /> The Gang
          </h3>
          <Button variant="ghost" size="sm" onClick={handleShare} className="text-teal-500 font-black uppercase tracking-widest text-[10px] gap-2 h-8 px-2">
            <UserPlus className="w-3.5 h-3.5" /> Invite
          </Button>
        </div>
        <Card className="bg-white/5 border-white/5 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden">
          <CardContent className="p-4 space-y-4">
            {members?.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border border-white/10 shadow-lg shrink-0">
                    <AvatarImage src={member.photoURL || ''} />
                    <AvatarFallback className="bg-teal-500 text-black font-black text-xs sm:text-sm">
                      {member.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-black text-white leading-tight truncate">{member.name}</p>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{member.role}</p>
                  </div>
                </div>
                {isAdmin && member.uid !== trip.organizerId && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Select 
                      defaultValue={member.role} 
                      onValueChange={(val) => updateMemberRole(firestore, trip.id, member.uid, val)}
                    >
                      <SelectTrigger className="h-7 sm:h-8 bg-black/40 border-none text-[8px] sm:text-[10px] font-black uppercase tracking-widest w-20 sm:w-24 rounded-lg px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                      onClick={() => removeMember(firestore, trip.id, member.uid)}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {isMember && (
        <Button 
          className="w-full h-14 sm:h-16 bg-white/5 hover:bg-white/10 text-zinc-400 font-black rounded-2xl sm:rounded-3xl gap-3 text-xs sm:text-sm uppercase tracking-widest border border-white/5 active:scale-95 transition-all"
          onClick={handleShare}
        >
          <Share2 className="w-5 h-5" /> Share Invite Link
        </Button>
      )}

      {isMember && trip.status !== 'Completed' && (
        <Button 
          className="w-full h-14 sm:h-16 bg-teal-500 hover:bg-teal-600 text-black font-black rounded-2xl sm:rounded-3xl gap-3 text-base sm:text-lg shadow-xl shadow-teal-500/20 active:scale-95 transition-all"
          onClick={() => markTripComplete(firestore, trip.id)}
        >
          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> Complete Trip
        </Button>
      )}
    </div>
  );
}

function AddItineraryDialog({ firestore, tripId, days, defaultDay, trigger }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('other');
  const [mode, setMode] = useState<string | undefined>(undefined);
  const [day, setDay] = useState(defaultDay?.toString() || '1');
  const [slot, setSlot] = useState('Morning');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    addItineraryItem(firestore, tripId, {
      name,
      category,
      mode: (category === 'journey' || category === 'transit') ? mode : undefined,
      dayNumber: Number(day),
      timeSlot: slot,
      plannedBudget: Number(budget),
      notes
    });
    setOpen(false);
    toast({ title: 'Activity Added!' });
    setName('');
    setBudget('');
    setNotes('');
    setMode(undefined);
  };

  const showMode = category === 'journey' || category === 'transit';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button className="bg-teal-500 hover:bg-teal-600 rounded-xl sm:rounded-2xl font-black gap-2 shadow-xl shadow-teal-500/20 h-10 px-4">
            <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Add Activity</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] sm:h-auto sm:max-w-md mx-auto rounded-t-[1.5rem] sm:rounded-t-[2.5rem] bg-[#0F172A] border-white/5 shadow-2xl p-6 sm:p-8 backdrop-blur-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl sm:text-2xl font-black text-white">New Activity ✈️</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 sm:space-y-6 mt-6">
          <div className="space-y-2">
            <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Activity Name</Label>
            <Input className="bg-black/40 border-white/5 h-11 sm:h-12 rounded-xl text-white font-bold text-sm" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Category</Label>
              <Select value={category} onValueChange={(val) => {
                setCategory(val);
                if (val !== 'journey' && val !== 'transit') setMode(undefined);
              }}>
                <SelectTrigger className="bg-black/40 border-white/5 h-11 sm:h-12 rounded-xl text-white font-bold text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                  <SelectItem value="stay">🏨 Stay</SelectItem>
                  <SelectItem value="journey">✈️ Journey</SelectItem>
                  <SelectItem value="transit">🚗 Local Transit</SelectItem>
                  <SelectItem value="food">🍱 Food</SelectItem>
                  <SelectItem value="activity">🎭 Activity</SelectItem>
                  <SelectItem value="other">✨ Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {showMode && (
              <div className="space-y-2">
                <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="bg-black/40 border-white/5 h-11 sm:h-12 rounded-xl text-white font-bold text-sm">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                    <SelectItem value="train">🚆 Train</SelectItem>
                    <SelectItem value="flight">✈️ Flight</SelectItem>
                    <SelectItem value="bus">🚌 Bus</SelectItem>
                    <SelectItem value="roadtrip">🚗 Road Trip</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Planned Budget</Label>
              <Input type="number" className="bg-black/40 border-white/5 h-11 sm:h-12 rounded-xl text-white font-bold text-sm" value={budget} onChange={e => setBudget(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="bg-black/40 border-white/5 h-11 sm:h-12 rounded-xl text-white font-bold text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                  {days.map((d: number) => <SelectItem key={d} value={d.toString()}>Day {d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Time Slot</Label>
              <Select value={slot} onValueChange={setSlot}>
                <SelectTrigger className="bg-black/40 border-white/5 h-11 sm:h-12 rounded-xl text-white font-bold text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                  {TIME_SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Notes</Label>
            <Textarea className="bg-black/40 border-white/5 rounded-xl text-white min-h-[80px] text-sm" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <Button className="w-full h-12 sm:h-14 bg-teal-500 hover:bg-teal-600 rounded-2xl font-black text-lg shadow-xl shadow-teal-500/20" onClick={handleAdd}>Add to Plan</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EditTripDialog({ firestore, trip }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(trip.name || "");
  const [destination, setDestination] = useState(trip.destination || "");
  const [startDate, setStartDate] = useState<Date | undefined>(toDate(trip.startDate));
  const [endDate, setEndDate] = useState<Date | undefined>(toDate(trip.endDate));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !destination || !startDate || !endDate) return;

    setIsSubmitting(true);
    updateTripDetails(firestore, trip.id, {
      name,
      destination,
      startDate,
      endDate
    });
    setIsSubmitting(false);
    setOpen(false);
    toast({ title: "Trip Updated!" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl shrink-0">
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[95vw] rounded-[1.5rem] sm:rounded-[2.5rem] bg-[#0F172A] border-white/5 shadow-2xl p-6 sm:p-8 backdrop-blur-3xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-black text-white">Edit Trip Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 sm:space-y-6 mt-4">
          <div className="space-y-2">
            <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Trip Name</Label>
            <Input className="bg-black/40 border-white/5 h-11 sm:h-12 rounded-xl text-white font-bold text-sm" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Destination</Label>
            <Input className="bg-black/40 border-white/5 h-11 sm:h-12 rounded-xl text-white font-bold text-sm" value={destination} onChange={e => setDestination(e.target.value)} required />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Start Date</Label>
              <input
                type="date"
                value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) setStartDate(new Date(val));
                }}
                className="w-full bg-black/40 border border-white/5 h-11 sm:h-12 rounded-xl px-4 text-white focus:border-teal-500 outline-none appearance-none cursor-pointer text-sm"
                style={{ colorScheme: "dark" }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">End Date</Label>
              <input
                type="date"
                value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
                min={startDate ? format(startDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) setEndDate(new Date(val));
                }}
                className="w-full bg-black/40 border border-white/5 h-11 sm:h-12 rounded-xl px-4 text-white focus:border-teal-500 outline-none appearance-none cursor-pointer text-sm"
                style={{ colorScheme: "dark" }}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-12 sm:h-14 bg-teal-500 hover:bg-teal-600 rounded-2xl font-black text-lg shadow-xl shadow-teal-500/20" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
