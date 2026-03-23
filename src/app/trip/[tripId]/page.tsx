'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, orderBy, Firestore } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { 
  updateActualBudget, 
  addItineraryItem, 
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
  updateTripDetails
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
  CheckSquare, Lightbulb, Package, PieChart as PieChartIcon, 
  Plus, MapPin, CheckCircle2, Trash2, 
  ExternalLink, Sparkles, Bus, Plane, Train, ArrowRight, Loader2, Share2, Sun, Sunset, Moon, Coffee, MessageCircle, Settings, Edit, Calendar as CalendarIcon, ArrowLeft
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
  const isMember = user && trip?.members && (!!trip.members[user.uid] || user.uid === trip.organizerId);

  useEffect(() => {
    if (!isTripLoading && !isUserLoading && trip && !isOrganizer && !isMember) {
      router.push(`/join/${tripId}`);
    }
  }, [isTripLoading, isUserLoading, trip, isOrganizer, isMember, tripId, router]);

  if (isTripLoading || isUserLoading) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-teal-500"><Loader2 className="animate-spin" /></div>;
  if (!trip || !firestore) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white font-bold">Trip not found.</div>;

  const totalPlanned = itinerary?.reduce((sum, item) => sum + (item.plannedBudget || 0), 0) || 0;
  const totalActual = itinerary?.reduce((sum, item) => sum + (item.actualBudget || 0), 0) || 0;
  const budgetRatio = totalActual / (totalPlanned || 1);
  const budgetHealthColor = budgetRatio > 1.1 ? 'text-red-500' : budgetRatio > 0.9 ? 'text-amber-500' : 'text-teal-500';

  return (
    <div className="min-h-screen bg-[#0F172A] pb-24 text-white selection:bg-teal-500/30">
      <header className="sticky top-0 z-50 bg-[#0F172A]/80 backdrop-blur-xl border-b border-white/5 p-4 shadow-2xl">
        <div className="container max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl shrink-0"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex flex-col min-w-0">
              <h1 className="font-black text-xl leading-tight truncate tracking-tighter text-white">{trip.destination}</h1>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">{trip.name}</span>
            </div>
            {isOrganizer && (
              <EditTripDialog firestore={firestore} trip={trip} />
            )}
          </div>
          <div className={cn("flex flex-col items-end shrink-0", budgetHealthColor)}>
            <span className="text-sm font-black">₹{totalActual.toLocaleString()}</span>
            <div className="w-20 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-700 ease-out", 
                  budgetRatio > 1.1 ? 'bg-red-500' : budgetRatio > 0.9 ? 'bg-amber-500' : 'bg-teal-500'
                )} 
                style={{ width: `${Math.min(budgetRatio * 100, 100)}%` }} 
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="itinerary" className="mt-0 outline-none">
            <ItineraryTab firestore={firestore} trip={trip} itinerary={itinerary} isOrganizer={isOrganizer} />
          </TabsContent>
          <TabsContent value="checklist" className="mt-0 outline-none">
            <ChecklistTab firestore={firestore} trip={trip} itinerary={itinerary} isOrganizer={isOrganizer} />
          </TabsContent>
          <TabsContent value="suggestions" className="mt-0 outline-none">
            <SuggestionsTab firestore={firestore} trip={trip} suggestions={suggestions} isOrganizer={isOrganizer} />
          </TabsContent>
          <TabsContent value="packing" className="mt-0 outline-none">
            <PackingTab firestore={firestore} trip={trip} packing={packing} isOrganizer={isOrganizer} />
          </TabsContent>
          <TabsContent value="summary" className="mt-0 outline-none">
            <SummaryTab firestore={firestore} trip={trip} itinerary={itinerary} members={members} isOrganizer={isOrganizer} />
          </TabsContent>

          <TabsList className="fixed bottom-0 left-0 right-0 h-20 bg-[#0F172A]/90 backdrop-blur-2xl border-t border-white/5 rounded-none grid grid-cols-5 z-50 p-0 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            <TabsTrigger value="itinerary" className="flex flex-col gap-1.5 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-500 rounded-none h-full transition-all duration-300">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Plan</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex flex-col gap-1.5 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-500 rounded-none h-full transition-all duration-300">
              <CheckSquare className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Pre-trip</span>
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

function EditTripDialog({ firestore, trip }: { firestore: Firestore, trip: any }) {
  const [name, setName] = useState(trip.name);
  const [destination, setDestination] = useState(trip.destination);
  const [startDate, setStartDate] = useState<Date | undefined>(toDate(trip.startDate));
  const [endDate, setEndDate] = useState<Date | undefined>(toDate(trip.endDate));
  const [budgetPerHead, setBudgetPerHead] = useState(trip.budgetPerHead?.toString() || "");
  const [vibe, setVibe] = useState(trip.vibe || "Mid-Range");
  
  const [open, setOpen] = useState(false);

  const handleUpdate = () => {
    if (!name || !destination || !startDate || !endDate) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please ensure all trip details are filled.' });
      return;
    }
    updateTripDetails(firestore, trip.id, {
      name: name.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      budgetPerHead: Number(budgetPerHead),
      vibe
    });
    setOpen(false);
    toast({ title: 'Trip updated!' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg shrink-0">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-md w-[95%] rounded-[2.5rem] bg-[#0F172A] border-white/5 shadow-2xl p-8 backdrop-blur-3xl overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader><DialogTitle className="text-white font-black text-2xl tracking-tighter">Edit Trip Details</DialogTitle></DialogHeader>
        <div className="space-y-5 py-4" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Trip Name</Label>
            <Input className="bg-white/[0.03] border-white/5 h-14 rounded-2xl focus:border-teal-500/50" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Destination</Label>
            <Input className="bg-white/[0.03] border-white/5 h-14 rounded-2xl focus:border-teal-500/50" value={destination} onChange={e => setDestination(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Start Date</Label>
              <input
                type="date"
                value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) setStartDate(new Date(val));
                }}
                className="w-full bg-white/[0.03] text-white border border-white/5 rounded-2xl px-4 h-14 focus:border-teal-500/50 outline-none appearance-none cursor-pointer"
                style={{ colorScheme: "dark" }}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">End Date</Label>
              <input
                type="date"
                value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
                min={startDate ? format(startDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) setEndDate(new Date(val));
                }}
                className="w-full bg-white/[0.03] text-white border border-white/5 rounded-2xl px-4 h-14 focus:border-teal-500/50 outline-none appearance-none cursor-pointer"
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Budget Per Head (₹)</Label>
            <Input type="number" className="bg-white/[0.03] border-white/5 h-14 rounded-2xl focus:border-teal-500/50" value={budgetPerHead} onChange={e => setBudgetPerHead(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Vibe</Label>
            <Select value={vibe} onValueChange={setVibe}>
              <SelectTrigger className="bg-white/[0.03] border-white/5 h-14 rounded-2xl focus:border-teal-500/50"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0F172A] border-white/10 text-white rounded-2xl">
                <SelectItem value="Budget">Budget 🏕️</SelectItem>
                <SelectItem value="Mid-Range">Mid-Range 🏨</SelectItem>
                <SelectItem value="Luxury">Luxury 👑</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button className="w-full h-16 bg-teal-500 hover:bg-teal-600 font-black rounded-2xl text-lg shadow-2xl shadow-teal-500/30 transition-all active:scale-95" onClick={handleUpdate}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ItineraryTab({ firestore, trip, itinerary, isOrganizer }: { firestore: Firestore, trip: any, itinerary: any, isOrganizer: boolean }) {
  const [maxDay, setMaxDay] = useState(1);

  useEffect(() => {
    const highest = itinerary?.reduce((max: number, i: any) => Math.max(max, i.dayNumber), 1) || 1;
    setMaxDay(highest);
  }, [itinerary]);

  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  const getSlotIcon = (slot: string) => {
    switch (slot) {
      case 'Morning': return <Coffee className="w-3.5 h-3.5" />;
      case 'Afternoon': return <Sun className="w-3.5 h-3.5" />;
      case 'Evening': return <Sunset className="w-3.5 h-3.5" />;
      case 'Night': return <Moon className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 pb-32">
      <Accordion type="multiple" defaultValue={['day-1']} className="w-full space-y-4">
        {days.map(dayNum => {
          const dayItems = itinerary?.filter((i: any) => i.dayNumber === dayNum) || [];
          const dayPlanned = dayItems.reduce((sum: number, i: any) => sum + (i.plannedBudget || 0), 0);
          const dayActual = dayItems.reduce((sum: number, i: any) => sum + (i.actualBudget || 0), 0);
          const dayDate = addDays(toDate(trip.startDate), dayNum - 1);
          
          return (
            <AccordionItem key={dayNum} value={`day-${dayNum}`} className="border border-white/5 rounded-[2rem] px-5 overflow-hidden bg-white/[0.03] backdrop-blur-xl shadow-2xl">
              <AccordionTrigger className="hover:no-underline py-6 group">
                <div className="flex flex-col items-start gap-1">
                  <h2 className="text-xl font-black text-white tracking-tight group-hover:text-teal-500 transition-colors">
                    Day {dayNum} — {format(dayDate, 'EEE dd MMM')}
                  </h2>
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">
                    ₹{dayActual.toLocaleString()} / ₹{dayPlanned.toLocaleString()}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-8 pb-6">
                {TIME_SLOTS.map(slot => {
                  const slotItems = dayItems.filter((i: any) => i.timeSlot === slot);
                  if (slotItems.length === 0 && !isOrganizer) return null;

                  return (
                    <div key={slot} className="space-y-4">
                      <div className="flex items-center gap-3 px-1">
                        <div className="text-teal-500 flex items-center justify-center">
                          {getSlotIcon(slot)}
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">{slot}</h3>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>
                      
                      <div className="space-y-4">
                        {slotItems.map((item: any) => (
                          <ItineraryItemCard key={item.id} firestore={firestore} trip={trip} item={item} isOrganizer={isOrganizer} />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {isOrganizer && (
                  <AddItemDialog firestore={firestore} tripId={trip.id} dayNumber={dayNum} />
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      
      {isOrganizer && (
        <Button 
          variant="outline" 
          className="w-full gap-3 py-10 rounded-[2rem] border-dashed border-white/10 hover:border-teal-500/50 hover:bg-teal-500/5 text-zinc-500 hover:text-teal-500 transition-all group"
          onClick={() => setMaxDay(prev => prev + 1)}
        >
          <div className="w-10 h-10 rounded-full border border-current flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <span className="font-black uppercase tracking-widest text-xs">Add Journey Day</span>
        </Button>
      )}

      <div className="fixed bottom-24 left-4 right-4 bg-teal-500 text-white p-6 rounded-[2.5rem] shadow-[0_30px_60px_rgba(13,148,136,0.3)] flex items-center justify-between z-40 max-w-lg mx-auto backdrop-blur-md">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-black opacity-70 tracking-widest">Total Planned</span>
          <span className="text-2xl font-black">₹{itinerary?.reduce((sum: number, i: any) => sum + (i.plannedBudget || 0), 0).toLocaleString()}</span>
        </div>
        <div className="h-10 w-px bg-white/20" />
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase font-black opacity-70 tracking-widest">Total Actual</span>
          <span className="text-2xl font-black">₹{itinerary?.reduce((sum: number, i: any) => sum + (i.actualBudget || 0), 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function ItineraryItemCard({ firestore, trip, item, isOrganizer }: { firestore: Firestore, trip: any, item: any, isOrganizer: boolean }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { user } = useUser();

  const suggestionsQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'trips', trip.id, 'itineraryItems', item.id, 'suggestions'), orderBy('addedAt', 'desc'));
  }, [firestore, trip.id, item.id]);

  const { data: suggestions } = useCollection(suggestionsQuery);

  const handleAddSuggestion = () => {
    if (!newLink.trim()) return;
    addItemSuggestion(firestore, trip.id, item.id, {
      link: newLink.trim(),
      notes: newNote.trim(),
      addedBy: user?.displayName || user?.email?.split('@')[0] || 'Member'
    });
    setNewLink('');
    setNewNote('');
    toast({ title: 'Idea added to activity!' });
  };

  const handleAiRecommend = async () => {
    if (!suggestions || suggestions.length < 2) {
      toast({ variant: 'destructive', title: 'Need more ideas', description: 'Add at least 2 suggestions first.' });
      return;
    }
    setIsAiLoading(true);
    try {
      const result = await aiTripSuggestionRecommendation({
        groupPreferences: `Specific activity: ${item.name} for our trip to ${trip.destination}. Vibe: ${trip.vibe}. Budget: ₹${item.plannedBudget}.`,
        suggestions: suggestions.map(s => ({
          link: s.link,
          notes: s.notes,
          addedBy: s.addedBy
        }))
      });
      const winner = suggestions[result.recommendedSuggestionIndex];
      markItemSuggestionAiPick(firestore, trip.id, item.id, winner.id, result.aiReason);
      toast({ title: 'AI Picked!', description: 'Check the winning suggestion below.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'AI Error', description: 'Could not generate recommendation.' });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <Card className="bg-black/30 border-white/5 rounded-[1.5rem] shadow-xl overflow-hidden group">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform active:scale-95",
            item.category === 'travel' ? "bg-teal-500 text-white" : "bg-white/5 text-teal-500"
          )}>
            {item.category === 'transport' ? <Bus className="w-6 h-6" /> :
             item.category === 'food' ? <Sparkles className="w-6 h-6" /> :
             item.category === 'travel' ? <Train className="w-6 h-6" /> :
             item.category === 'stay' ? <MapPin className="w-6 h-6" /> :
             <MapPin className="w-6 h-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-black truncate text-base text-white tracking-tight">{item.name}</h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">₹{item.plannedBudget}</span>
                {isOrganizer && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg" onClick={() => deleteItineraryItem(firestore, trip.id, item.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-3">
              <div className="relative flex-1 max-w-[120px]">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-teal-500 font-black">₹</span>
                <Input 
                  type="number" 
                  className="h-9 pl-6 text-xs bg-black/40 border-white/5 rounded-xl focus:border-teal-500/50 transition-all font-bold" 
                  placeholder="Actual Cost"
                  defaultValue={item.actualBudget || ''}
                  onBlur={(e) => updateActualBudget(firestore, trip.id, item.id, Number(e.target.value))}
                />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-9 gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  suggestions?.length ? "text-teal-500 bg-teal-500/5" : "text-zinc-500 hover:text-teal-500"
                )}
                onClick={() => setShowSuggestions(!showSuggestions)}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {suggestions?.length || 0} IDEAS
              </Button>
            </div>

            {showSuggestions && (
              <div className="mt-5 space-y-4 pt-5 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                {suggestions?.map((s: any) => (
                  <div key={s.id} className={cn(
                    "bg-black/40 rounded-[1.25rem] p-4 flex items-start gap-3 border transition-all",
                    s.aiRecommended ? "border-amber-500/30 bg-amber-500/5" : "border-white/5"
                  )}>
                    <Avatar className="h-8 w-8 border border-white/10 shrink-0">
                      <AvatarFallback className="bg-teal-500/20 text-teal-500 text-[10px] font-black">{s.addedBy?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{s.addedBy}</p>
                      <a href={s.link} target="_blank" className="text-teal-500 text-xs font-bold underline truncate block hover:text-teal-400">{s.link}</a>
                      {s.notes && <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">{s.notes}</p>}
                      {s.aiRecommended && (
                        <div className="mt-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                          <span className="text-amber-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-1">
                            <Sparkles className="w-3 h-3" /> AI Recommended
                          </span>
                          <p className="text-[10px] text-amber-500/80 leading-relaxed font-medium">{s.aiReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                  <Input 
                    type="url" 
                    placeholder="Paste Idea Link..." 
                    value={newLink} 
                    onChange={e => setNewLink(e.target.value)}
                    className="h-10 text-xs bg-black/40 border-white/5 rounded-xl"
                  />
                  <Textarea 
                    placeholder="Why this?" 
                    value={newNote} 
                    onChange={e => setNewNote(e.target.value)}
                    className="min-h-[60px] text-xs bg-black/40 border-white/5 rounded-xl"
                  />
                  <Button className="w-full h-10 bg-teal-500 hover:bg-teal-600 font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-teal-500/20" onClick={handleAddSuggestion}>
                    Add Idea
                  </Button>
                </div>

                {isOrganizer && suggestions && suggestions.length > 1 && (
                  <Button 
                    variant="outline" 
                    className="w-full h-12 border-amber-500/30 text-amber-500 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-amber-500/5 gap-2"
                    disabled={isAiLoading}
                    onClick={handleAiRecommend}
                  >
                    {isAiLoading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Get AI Pick
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddItemDialog({ firestore, tripId, dayNumber }: { firestore: Firestore, tripId: string, dayNumber: number }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('activity');
  const [timeSlot, setTimeSlot] = useState<string>('Morning');
  const [planned, setPlanned] = useState('');
  const [notes, setNotes] = useState('');
  const [open, setOpen] = useState(false);

  const [mode, setMode] = useState('train');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [time, setTime] = useState('');

  const handleAdd = () => {
    if (!name || !planned) return;
    const data: any = {
      name,
      category,
      timeSlot,
      plannedBudget: Number(planned),
      notes,
      dayNumber
    };
    if (category === 'travel') {
      data.mode = mode;
      data.fromLocation = from;
      data.toLocation = to;
      data.departureTime = time;
    }
    addItineraryItem(firestore, tripId, data);
    setOpen(false);
    reset();
  };

  const reset = () => {
    setName('');
    setCategory('activity');
    setTimeSlot('Morning');
    setPlanned('');
    setNotes('');
    setMode('train');
    setFrom('');
    setTo('');
    setTime('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed border-white/10 gap-2 h-14 text-zinc-500 hover:text-teal-500 rounded-2xl bg-white/[0.02] hover:bg-teal-500/5 transition-all">
          <Plus className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">New Entry</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[95%] rounded-[2.5rem] bg-[#0F172A] border-white/5 shadow-2xl p-8 backdrop-blur-3xl">
        <DialogHeader><DialogTitle className="text-white font-black text-2xl tracking-tighter">New Activity</DialogTitle></DialogHeader>
        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Title</Label>
            <Input className="bg-white/[0.03] border-white/5 h-14 rounded-2xl focus:border-teal-500/50" placeholder="e.g. Dinner at Beach House" value={name} onChange={e => setName(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">When</Label>
              <Select value={timeSlot} onValueChange={setTimeSlot}>
                <SelectTrigger className="bg-white/[0.03] border-white/5 h-14 rounded-2xl focus:border-teal-500/50"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0F172A] border-white/10 text-white rounded-2xl">
                  {TIME_SLOTS.map(slot => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Type</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white/[0.03] border-white/5 h-14 rounded-2xl focus:border-teal-500/50"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0F172A] border-white/10 text-white rounded-2xl">
                  <SelectItem value="food">Food 🍔</SelectItem>
                  <SelectItem value="stay">Stay 🏨</SelectItem>
                  <SelectItem value="transport">Local Transport 🚕</SelectItem>
                  <SelectItem value="activity">Fun Activity 🎡</SelectItem>
                  <SelectItem value="travel">Inter-city Travel 🚆</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Planned Budget (₹)</Label>
            <Input type="number" className="bg-white/[0.03] border-white/5 h-14 rounded-2xl focus:border-teal-500/50" placeholder="1500" value={planned} onChange={e => setPlanned(e.target.value)} />
          </div>

          {category === 'travel' && (
            <div className="space-y-4 border-t border-white/5 pt-5 animate-in fade-in zoom-in-95">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Mode</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger className="bg-white/[0.03] border-white/5 h-14 rounded-2xl focus:border-teal-500/50"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0F172A] border-white/10 text-white rounded-2xl">
                      <SelectItem value="train">Train</SelectItem>
                      <SelectItem value="flight">Flight</SelectItem>
                      <SelectItem value="bus">Bus</SelectItem>
                      <SelectItem value="roadtrip">Roadtrip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Departure</Label>
                  <Input type="time" className="bg-white/[0.03] border-white/5 h-14 rounded-2xl focus:border-teal-500/50" value={time} onChange={e => setTime(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">From</Label>
                  <Input className="bg-white/[0.03] border-white/5 h-14 rounded-2xl focus:border-teal-500/50" placeholder="Origin" value={from} onChange={e => setFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">To</Label>
                  <Input className="bg-white/[0.03] border-white/5 h-14 rounded-2xl focus:border-teal-500/50" placeholder="Destination" value={to} onChange={e => setTo(e.target.value)} />
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Extra Details</Label>
            <Textarea className="bg-white/[0.03] border-white/5 rounded-2xl min-h-[100px] focus:border-teal-500/50" placeholder="Booking references, addresses, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button className="w-full h-16 bg-teal-500 hover:bg-teal-600 font-black rounded-2xl text-lg shadow-2xl shadow-teal-500/30 transition-all active:scale-95" onClick={handleAdd}>Add to Plan</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistTab({ firestore, trip, itinerary, isOrganizer }: { firestore: Firestore, trip: any, itinerary: any, isOrganizer: boolean }) {
  const travelLegs = (itinerary || []).filter((i: any) => i.category === 'travel');
  
  const [hasUrgentItems, setHasUrgentItems] = useState(false);
  const tripStartsSoon = toDate(trip.startDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-8 pb-32">
      {hasUrgentItems && tripStartsSoon && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-5 rounded-[2rem] flex items-center gap-4 animate-pulse">
          <Package className="w-8 h-8 shrink-0" />
          <p className="text-sm font-black uppercase tracking-tight">Trip starts soon! Some prep items need attention.</p>
        </div>
      )}

      <div className="flex items-center justify-between px-2">
        <h2 className="text-3xl font-black text-white tracking-tighter">Pre-trip Checklist</h2>
      </div>

      <div className="space-y-8">
        {travelLegs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white/[0.03] rounded-[2.5rem] border border-white/5 px-8">
            <div className="w-20 h-20 bg-teal-500/10 rounded-full flex items-center justify-center mb-6">
              <Train className="w-10 h-10 text-teal-500 opacity-50" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">No Travel Legs Found</h3>
            <p className="text-zinc-500 text-sm max-w-[240px] leading-relaxed">Add a "Travel" entry in your itinerary to track flight/train bookings and prep.</p>
          </div>
        ) : (
          travelLegs.map((leg: any) => (
            <LegChecklistCard 
              key={leg.id} 
              firestore={firestore}
              leg={leg} 
              tripId={trip.id} 
              isOrganizer={isOrganizer} 
              onUrgentChange={setHasUrgentItems}
            />
          ))
        )}
      </div>
    </div>
  );
}

function LegChecklistCard({ firestore, leg, tripId, isOrganizer, onUrgentChange }: { firestore: Firestore, leg: any, tripId: string, isOrganizer: boolean, onUrgentChange: (urgent: boolean) => void }) {
  const checklistQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'trips', tripId, 'itineraryItems', leg.id, 'checklistItems'), orderBy('order'));
  }, [firestore, tripId, leg.id]);

  const { data: checks } = useCollection(checklistQuery);

  useEffect(() => {
    if (checks?.some((c: any) => c.status === 'red')) {
      onUrgentChange(true);
    }
  }, [checks, onUrgentChange]);

  const cycleStatus = (check: any) => {
    if (!isOrganizer) return;
    const order = ['red', 'yellow', 'green'];
    const currentIndex = order.indexOf(check.status);
    const nextStatus = order[(currentIndex + 1) % order.length];
    updateChecklistItemStatus(firestore, tripId, leg.id, check.id, nextStatus);
  };

  return (
    <Card className="bg-white/[0.03] border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl shadow-2xl">
      <div className="bg-teal-500/10 p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-teal-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-teal-500/30">
            {leg.mode === 'flight' ? <Plane className="w-7 h-7 text-white" /> : 
             leg.mode === 'bus' ? <Bus className="w-7 h-7 text-white" /> :
             <Train className="w-7 h-7 text-white" />}
          </div>
          <div>
            <h4 className="font-black text-white text-lg leading-tight tracking-tight">{leg.fromLocation} → {leg.toLocation}</h4>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1.5">{leg.mode} • DAY {leg.dayNumber}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-teal-500 tracking-tighter">{leg.departureTime || '--:--'}</p>
          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">Departure</p>
        </div>
      </div>
      <CardContent className="p-0">
        <div className="divide-y divide-white/5">
          {checks?.map((check: any) => (
            <div key={check.id} className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-all group">
              <div className="flex flex-col">
                <span className={cn(
                  "text-sm font-bold tracking-tight transition-all",
                  check.status === 'green' ? "text-zinc-500 line-through opacity-60" : "text-zinc-200"
                )}>
                  {check.description}
                </span>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest mt-1",
                  check.status === 'green' ? "text-teal-500" : check.status === 'yellow' ? "text-amber-500" : "text-red-500"
                )}>
                  {check.status === 'green' ? 'Done' : check.status === 'yellow' ? 'Pending' : 'Not Started'}
                </span>
              </div>
              <button 
                onClick={() => cycleStatus(check)}
                disabled={!isOrganizer}
                className={cn(
                  "w-10 h-10 rounded-2xl border-4 transition-all flex items-center justify-center shadow-lg active:scale-90",
                  check.status === 'green' ? "bg-teal-500 border-teal-500/20" : 
                  check.status === 'yellow' ? "bg-amber-500 border-amber-500/20" : "bg-red-500 border-red-500/20"
                )}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SuggestionsTab({ firestore, trip, suggestions, isOrganizer }: { firestore: Firestore, trip: any, suggestions: any, isOrganizer: boolean }) {
  const { user } = useUser();
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAdd = () => {
    if (!link.trim()) return;
    addSuggestion(firestore, trip.id, {
      link: link.trim(),
      notes: notes.trim(),
      addedBy: user?.displayName || user?.email?.split('@')[0] || 'Member'
    });
    setLink('');
    setNotes('');
    toast({ title: 'Global idea added!' });
  };

  const handleAiPick = async () => {
    if (!suggestions || suggestions.length < 2) {
      toast({ variant: 'destructive', title: 'Need more ideas', description: 'Add at least 2 suggestions first.' });
      return;
    }
    setIsAiLoading(true);
    try {
      const result = await aiTripSuggestionRecommendation({
        groupPreferences: `Overall trip idea for ${trip.destination}. Vibe: ${trip.vibe}. Total budget per head: ₹${trip.budgetPerHead}.`,
        suggestions: suggestions.map((s: any) => ({
          link: s.link,
          notes: s.notes,
          addedBy: s.addedBy
        }))
      });
      
      const winningSuggestion = suggestions[result.recommendedSuggestionIndex];
      markAiRecommended(firestore, trip.id, winningSuggestion.id, result.aiReason);
      toast({ title: 'AI Recommendation Ready!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'AI Error', description: 'Recommendation failed.' });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-32">
      <div className="px-2">
        <h2 className="text-3xl font-black text-white tracking-tighter">Idea Board 💡</h2>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Collab with the gang</p>
      </div>

      <Card className="bg-white/[0.03] border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-3xl">
        <CardContent className="p-8 space-y-5">
          <div className="space-y-2">
            <Label className="font-black text-teal-500 uppercase tracking-widest text-[10px] ml-1">Paste a Link</Label>
            <Input className="bg-white/[0.03] border-white/5 h-14 rounded-2xl focus:border-teal-500/50" placeholder="e.g. Booking.com, TripAdvisor" value={link} onChange={e => setLink(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-black text-teal-500 uppercase tracking-widest text-[10px] ml-1">Notes</Label>
            <Textarea className="bg-white/[0.03] border-white/5 rounded-2xl h-24 focus:border-teal-500/50" placeholder="Why is this awesome?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button className="w-full h-16 bg-teal-500 hover:bg-teal-600 font-black rounded-2xl text-lg shadow-2xl shadow-teal-500/30 transition-all active:scale-95" onClick={handleAdd}>Share with Gang</Button>
        </CardContent>
      </Card>

      {isOrganizer && suggestions && suggestions.length > 1 && (
        <Button 
          className="w-full h-16 bg-gradient-to-r from-amber-500 to-orange-500 hover:scale-[1.02] active:scale-95 transition-all font-black rounded-[2.5rem] text-lg gap-3 shadow-2xl shadow-amber-500/20" 
          onClick={handleAiPick}
          disabled={isAiLoading}
        >
          {isAiLoading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-6 h-6" />}
          Get AI Final Verdict
        </Button>
      )}

      <div className="space-y-6">
        {suggestions?.map((s: any) => (
          <Card key={s.id} className={cn(
            "bg-white/[0.03] border-white/5 rounded-[2.5rem] transition-all duration-700 backdrop-blur-3xl shadow-2xl", 
            s.isAiRecommended && "border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.15)] scale-[1.02] ring-1 ring-amber-500/20"
          )}>
            <CardContent className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10 border-2 border-white/10 shadow-xl">
                    <AvatarFallback className="bg-teal-500 text-white text-sm font-black uppercase">
                      {s.addedBy ? s.addedBy[0] : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-black text-white tracking-tight leading-tight">{s.addedBy}</p>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Contributor</p>
                  </div>
                </div>
                {s.isAiRecommended && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-none gap-2 text-[10px] font-black py-2 px-4 rounded-full shadow-lg">
                    <Sparkles className="w-3.5 h-3.5" /> AI PICK
                  </Badge>
                )}
              </div>
              
              <div className="space-y-5">
                <p className="text-base text-zinc-300 leading-relaxed font-medium">{s.notes}</p>
                {s.aiReason && (
                  <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-[1.5rem] backdrop-blur-md">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> AI Rationale
                    </p>
                    <p className="text-xs text-amber-500/80 leading-relaxed font-medium">{s.aiReason}</p>
                  </div>
                )}
                <Button variant="outline" size="lg" className="w-full h-14 gap-3 bg-white/[0.02] border-white/10 hover:border-teal-500 hover:bg-teal-500/5 text-sm font-black rounded-2xl transition-all" asChild>
                  <a href={s.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-5 h-5" /> Visit Website
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PackingTab({ firestore, trip, packing, isOrganizer }: { firestore: Firestore, trip: any, packing: any, isOrganizer: boolean }) {
  const [item, setItem] = useState('');
  
  const packedCount = packing?.filter((i: any) => i.isPacked).length || 0;
  const totalItems = packing?.length || 0;
  const progress = totalItems > 0 ? (packedCount / totalItems) * 100 : 0;

  const handleAdd = () => {
    if (!item.trim()) return;
    addPackingItem(firestore, trip.id, { name: item.trim() });
    setItem('');
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="px-2">
        <h2 className="text-3xl font-black text-white tracking-tighter">Packing List 🎒</h2>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Don't leave anything behind</p>
      </div>

      <Card className="bg-white/[0.03] border-white/5 rounded-[2.5rem] backdrop-blur-3xl overflow-hidden shadow-2xl">
        <CardContent className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h3 className="font-black text-white text-2xl tracking-tight">{packedCount} / {totalItems}</h3>
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Items Checked</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-3xl font-black text-teal-500 tracking-tighter">{Math.round(progress)}%</span>
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Ready</span>
            </div>
          </div>
          <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-teal-500 transition-all duration-1000 ease-in-out shadow-[0_0_20px_rgba(13,148,136,0.5)]" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Input className="bg-black/40 border-white/5 h-14 rounded-2xl focus:border-teal-500/50" placeholder="I need to pack..." value={item} onChange={e => setItem(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
            <Button size="icon" className="w-14 h-14 rounded-2xl bg-teal-500 hover:bg-teal-600 shrink-0 shadow-xl shadow-teal-500/20 active:scale-90 transition-all" onClick={handleAdd}><Plus className="w-7 h-7" /></Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {packing?.map((i: any) => (
          <div 
            key={i.id} 
            className={cn(
              "flex items-center justify-between p-6 rounded-[1.75rem] border border-white/5 transition-all cursor-pointer group backdrop-blur-md shadow-xl",
              i.isPacked ? "bg-teal-500/5 border-teal-500/20 opacity-60" : "bg-white/[0.02] hover:bg-white/[0.05]"
            )}
            onClick={() => togglePackedStatus(firestore, trip.id, i.id, i.isPacked)}
          >
            <div className="flex items-center gap-5">
              <div className={cn(
                "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all",
                i.isPacked ? "bg-teal-500 border-teal-500" : "border-white/10"
              )}>
                {i.isPacked && <CheckCircle2 className="w-5 h-5 text-white" />}
              </div>
              <span className={cn(
                "text-base font-bold tracking-tight transition-all",
                i.isPacked ? "line-through text-zinc-500" : "text-zinc-100"
              )}>
                {i.name}
              </span>
            </div>
            {isOrganizer && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-12 w-12 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all"
                onClick={(e) => { e.stopPropagation(); deletePackingItem(firestore, trip.id, i.id); }}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryTab({ firestore, trip, itinerary, members, isOrganizer }: { firestore: Firestore, trip: any, itinerary: any, members: any, isOrganizer: boolean }) {
  const router = useRouter();

  const totalActual = (itinerary || []).reduce((sum: number, i: any) => sum + (i.actualBudget || 0), 0);
  const totalPlanned = (itinerary || []).reduce((sum: number, i: any) => sum + (i.plannedBudget || 0), 0);
  const diff = totalPlanned - totalActual;

  const categories = ['food', 'stay', 'transport', 'activity', 'travel'];
  const chartData = categories.map(cat => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    actual: (itinerary || []).filter((i: any) => i.category === cat).reduce((sum: number, i: any) => sum + (i.actualBudget || 0), 0),
    planned: (itinerary || []).filter((i: any) => i.category === cat).reduce((sum: number, i: any) => sum + (i.plannedBudget || 0), 0),
  })).filter(d => d.actual > 0 || d.planned > 0);

  const pieData = chartData.map((d, i) => ({ name: d.name, value: d.actual }));

  return (
    <div className="space-y-12 pb-32">
      <div className="text-center space-y-4 pt-10">
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] ml-1">Total Group Expenditure</p>
        <h2 className="text-6xl font-black text-white tracking-tighter">₹{totalActual.toLocaleString()}</h2>
        <Badge className={cn(
          "mt-6 py-3 px-8 rounded-full text-xs font-black tracking-[0.1em] shadow-2xl", 
          diff >= 0 ? 'bg-teal-500' : 'bg-red-500'
        )}>
          {diff >= 0 ? `₹${diff.toLocaleString()} SAVED` : `₹${Math.abs(diff).toLocaleString()} OVER BUDGET`}
        </Badge>
      </div>

      <div className="space-y-8">
        <Card className="bg-white/[0.03] border-white/5 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl overflow-hidden">
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-8 ml-2">Spending Breakdown</h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '24px', color: '#fff', padding: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} 
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-white/[0.03] border-white/5 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl overflow-hidden">
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-8 ml-2">Budget Discipline</h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -20 }}>
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontWeight: 'bold' }} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontWeight: 'bold' }} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.03)'}} 
                  contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '24px', padding: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} 
                />
                <Legend iconType="circle" />
                <Bar dataKey="planned" name="Budgeted" fill="#1E293B" radius={[8, 8, 0, 0]} barSize={24} />
                <Bar dataKey="actual" name="Spent" fill="#0D9488" radius={[8, 8, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <h3 className="font-black text-white text-2xl tracking-tighter px-2">The Travel Crew</h3>
        <div className="grid grid-cols-2 gap-4">
          {members?.map((m: any) => (
            <div key={m.id} className="flex items-center gap-4 p-4 rounded-[2rem] bg-white/[0.03] border border-white/5 shadow-xl backdrop-blur-md transition-all hover:bg-white/[0.06]">
              <Avatar className="h-12 w-12 border-2 border-white/10 shadow-xl">
                <AvatarImage src={m.photoURL || ''} />
                <AvatarFallback className="bg-teal-500 text-white text-base font-black">
                  {m.name ? m.name[0].toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-black text-white truncate leading-tight tracking-tight">{m.name}</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">{m.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-10 px-2">
        <Button variant="outline" className="w-full gap-4 py-10 rounded-[2.5rem] bg-white/[0.03] border-white/10 text-white font-black text-lg hover:bg-white/10 transition-all shadow-2xl active:scale-95" onClick={() => {
          navigator.clipboard.writeText(`${window.location.origin}/view/${trip.id}`);
          toast({ title: 'Public Link Copied!' });
        }}>
          <Share2 className="w-7 h-7" /> Share Itinerary
        </Button>
        {isOrganizer && trip.status !== 'Completed' && (
          <Button 
            className="w-full h-20 rounded-[2.5rem] bg-teal-500 hover:bg-teal-600 font-black text-xl shadow-[0_20px_50px_rgba(13,148,136,0.3)] transition-all active:scale-95"
            onClick={() => {
              markTripComplete(firestore, trip.id);
              toast({ title: 'Trip Archived! 🏁', description: 'Memories saved to your profile.' });
              router.push('/dashboard');
            }}
          >
            Mark Journey Complete
          </Button>
        )}
      </div>
    </div>
  );
}
