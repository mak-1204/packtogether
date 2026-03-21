
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
  updateChecklistItemStatus
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
  Calendar as CalendarIcon, CheckSquare, Lightbulb, Package, PieChart, 
  Plus, MapPin, CheckCircle2, Circle, Trash2, 
  ExternalLink, Sparkles, AlertTriangle, Bus, Plane, Train, Share2, Info, ArrowRight, Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell
} from 'recharts';
import { format, addDays } from 'date-fns';

const COLORS = ['#0D9488', '#F7A90A', '#3B82F6', '#8B5CF6', '#EC4899'];

export default function TripDetailsPage() {
  const { tripId } = useParams() as { tripId: string };
  const { firestore } = useFirestore();
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
      return query(collection(firestore, 'trips', tripId, 'itineraryItems'), orderBy('dayNumber'), orderBy('createdAt'));
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
  const isMember = user && trip?.members && !!trip.members[user.uid];

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
  const budgetHealthColor = budgetRatio > 0.9 ? 'text-red-500' : budgetRatio > 0.7 ? 'text-yellow-500' : 'text-teal-500';

  return (
    <div className="min-h-screen bg-[#0F172A] pb-24 text-white">
      <header className="sticky top-0 z-50 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/5 p-4 shadow-lg">
        <div className="container max-w-lg mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="font-black text-lg leading-tight truncate tracking-tight">{trip.destination}</h1>
            <span className="text-xs text-zinc-400 truncate">{trip.name}</span>
          </div>
          <div className={cn("flex flex-col items-end", budgetHealthColor)}>
            <span className="text-sm font-black">₹{totalActual.toLocaleString()} / ₹{totalPlanned.toLocaleString()}</span>
            <div className="w-24 h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-500", budgetRatio > 0.9 ? 'bg-red-500' : 'bg-teal-500')} 
                style={{ width: `${Math.min(budgetRatio * 100, 100)}%` }} 
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="itinerary" className="mt-0">
            <ItineraryTab firestore={firestore} trip={trip} itinerary={itinerary} isOrganizer={isOrganizer} onGoToChecklist={() => setActiveTab('checklist')} />
          </TabsContent>
          <TabsContent value="checklist" className="mt-0">
            <ChecklistTab firestore={firestore} trip={trip} itinerary={itinerary} isOrganizer={isOrganizer} />
          </TabsContent>
          <TabsContent value="suggestions" className="mt-0">
            <SuggestionsTab firestore={firestore} trip={trip} suggestions={suggestions} isOrganizer={isOrganizer} />
          </TabsContent>
          <TabsContent value="packing" className="mt-0">
            <PackingTab firestore={firestore} trip={trip} packing={packing} isOrganizer={isOrganizer} />
          </TabsContent>
          <TabsContent value="summary" className="mt-0">
            <SummaryTab firestore={firestore} trip={trip} itinerary={itinerary} members={members} isOrganizer={isOrganizer} />
          </TabsContent>

          <TabsList className="fixed bottom-0 left-0 right-0 h-16 bg-[#0F172A] border-t border-white/5 rounded-none grid grid-cols-5 z-50 p-0">
            <TabsTrigger value="itinerary" className="flex flex-col gap-1 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-500 rounded-none h-full">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold">Itinerary</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex flex-col gap-1 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-500 rounded-none h-full">
              <CheckSquare className="w-5 h-5" />
              <span className="text-[10px] font-bold">Checklist</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex flex-col gap-1 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-500 rounded-none h-full">
              <Lightbulb className="w-5 h-5" />
              <span className="text-[10px] font-bold">Ideas</span>
            </TabsTrigger>
            <TabsTrigger value="packing" className="flex flex-col gap-1 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-500 rounded-none h-full">
              <Package className="w-5 h-5" />
              <span className="text-[10px] font-bold">Packing</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex flex-col gap-1 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-500 rounded-none h-full">
              <PieChart className="w-5 h-5" />
              <span className="text-[10px] font-bold">Summary</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </main>
    </div>
  );
}

function ItineraryTab({ firestore, trip, itinerary, isOrganizer, onGoToChecklist }: { firestore: Firestore, trip: any, itinerary: any, isOrganizer: boolean, onGoToChecklist: () => void }) {
  const [maxDay, setMaxDay] = useState(1);

  useEffect(() => {
    const highest = itinerary?.reduce((max: number, i: any) => Math.max(max, i.dayNumber), 1) || 1;
    setMaxDay(highest);
  }, [itinerary]);

  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  return (
    <div className="space-y-6 pb-24">
      <Accordion type="multiple" defaultValue={['day-1']} className="w-full space-y-4">
        {days.map(dayNum => {
          const items = itinerary?.filter((i: any) => i.dayNumber === dayNum) || [];
          const dayPlanned = items.reduce((sum: number, i: any) => sum + (i.plannedBudget || 0), 0);
          const dayActual = items.reduce((sum: number, i: any) => sum + (i.actualBudget || 0), 0);
          const dayDate = addDays(new Date(trip.startDate), dayNum - 1);
          
          return (
            <AccordionItem key={dayNum} value={`day-${dayNum}`} className="border border-white/5 rounded-[1.5rem] px-4 overflow-hidden bg-white/5 backdrop-blur-sm">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex flex-col items-start gap-1">
                  <h2 className="text-lg font-black text-white">Day {dayNum} — {format(dayDate, 'EEE dd MMM')}</h2>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                    ₹{dayActual.toLocaleString()} / ₹{dayPlanned.toLocaleString()}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                {items.length === 0 ? (
                  <p className="text-center py-4 text-zinc-500 text-xs italic">No activities planned for this day.</p>
                ) : items.map((item: any) => (
                  <Card key={item.id} className="bg-black/20 border-white/5 rounded-2xl">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div 
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-95 shadow-lg",
                            item.category === 'travel' ? "bg-teal-500 text-white" : "bg-white/10 text-zinc-400"
                          )}
                          onClick={() => item.category === 'travel' && onGoToChecklist()}
                        >
                          {item.category === 'transport' ? <Bus className="w-5 h-5" /> :
                           item.category === 'food' ? <Sparkles className="w-5 h-5" /> :
                           item.category === 'travel' ? <Train className="w-5 h-5" /> :
                           item.category === 'stay' ? <MapPin className="w-5 h-5" /> :
                           <MapPin className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold truncate text-sm text-white">{item.name}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-zinc-500">₹{item.plannedBudget}</span>
                              {isOrganizer && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-zinc-500 hover:text-red-500"
                                  onClick={() => deleteItineraryItem(firestore, trip.id, item.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="relative flex-1 max-w-[100px]">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-teal-500 font-bold">₹</span>
                              <Input 
                                type="number" 
                                className="h-8 pl-5 text-[10px] bg-black/40 border-white/5 rounded-lg focus:border-teal-500 transition-colors" 
                                placeholder="Actual"
                                defaultValue={item.actualBudget || ''}
                                onBlur={(e) => updateActualBudget(firestore, trip.id, item.id, Number(e.target.value))}
                              />
                            </div>
                            {item.notes && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400"><Info className="w-4 h-4" /></Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-xs bg-[#0F172A] border-white/5 rounded-2xl">
                                  <DialogHeader><DialogTitle className="text-white font-black">{item.name} Notes</DialogTitle></DialogHeader>
                                  <p className="text-sm text-zinc-400 leading-relaxed">{item.notes}</p>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
          className="w-full gap-2 py-8 rounded-[1.5rem] border-dashed border-white/10 hover:border-teal-500 hover:bg-teal-500/5 text-zinc-400 hover:text-teal-500 transition-all"
          onClick={() => setMaxDay(prev => prev + 1)}
        >
          <Plus className="w-6 h-6" /> <span className="font-bold">Add Day</span>
        </Button>
      )}

      <div className="fixed bottom-20 left-4 right-4 bg-teal-500 text-white p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(13,148,136,0.3)] flex items-center justify-between z-40 max-w-lg mx-auto">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-black opacity-80 tracking-widest">Planned</span>
          <span className="text-xl font-black">₹{itinerary?.reduce((sum: number, i: any) => sum + (i.plannedBudget || 0), 0).toLocaleString()}</span>
        </div>
        <div className="h-10 w-px bg-white/20" />
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase font-black opacity-80 tracking-widest">Actual</span>
          <span className="text-xl font-black">₹{itinerary?.reduce((sum: number, i: any) => sum + (i.actualBudget || 0), 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function AddItemDialog({ firestore, tripId, dayNumber }: { firestore: Firestore, tripId: string, dayNumber: number }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('activity');
  const [planned, setPlanned] = useState('');
  const [notes, setNotes] = useState('');
  const [open, setOpen] = useState(false);

  const [mode, setMode] = useState('train');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [time, setTime] = useState('');

  const handleAdd = async () => {
    if (!name || !planned) return;
    const data: any = {
      name,
      category,
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
    await addItineraryItem(firestore, tripId, data);
    setOpen(false);
    reset();
  };

  const reset = () => {
    setName('');
    setCategory('activity');
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
        <Button variant="outline" className="w-full border-dashed border-white/5 gap-2 h-12 text-zinc-500 hover:text-teal-500 rounded-xl bg-black/20">
          <Plus className="w-4 h-4" /> <span className="text-xs font-bold">Add Item</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[95%] rounded-[2rem] bg-[#0F172A] border-white/5">
        <DialogHeader><DialogTitle className="text-white font-black text-xl">New activity</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Activity Name</Label>
            <Input className="bg-white/5 border-white/5 h-12 rounded-xl" placeholder="e.g. Dinner at Local Cafe" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white/5 border-white/5 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                  <SelectItem value="food">Food 🍔</SelectItem>
                  <SelectItem value="stay">Stay 🏨</SelectItem>
                  <SelectItem value="transport">Transport 🚕</SelectItem>
                  <SelectItem value="activity">Activity 🎡</SelectItem>
                  <SelectItem value="travel">Travel 🚆</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Planned (₹)</Label>
              <Input type="number" className="bg-white/5 border-white/5 h-12 rounded-xl" placeholder="500" value={planned} onChange={e => setPlanned(e.target.value)} />
            </div>
          </div>
          {category === 'travel' && (
            <div className="space-y-4 border-t border-white/5 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Mode</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger className="bg-white/5 border-white/5 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                      <SelectItem value="train">Train</SelectItem>
                      <SelectItem value="flight">Flight</SelectItem>
                      <SelectItem value="bus">Bus</SelectItem>
                      <SelectItem value="roadtrip">Roadtrip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Departure Time</Label>
                  <Input type="time" className="bg-white/5 border-white/5 h-12 rounded-xl" value={time} onChange={e => setTime(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">From</Label>
                  <Input className="bg-white/5 border-white/5 h-12 rounded-xl" placeholder="Origin" value={from} onChange={e => setFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">To</Label>
                  <Input className="bg-white/5 border-white/5 h-12 rounded-xl" placeholder="Destination" value={to} onChange={e => setTo(e.target.value)} />
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Notes</Label>
            <Textarea className="bg-white/5 border-white/5 rounded-xl min-h-[100px]" placeholder="Booking ID, Address, etc." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <Button className="w-full h-14 bg-teal-500 hover:bg-teal-600 font-black rounded-2xl text-lg shadow-xl shadow-teal-500/20" onClick={handleAdd}>Save Activity</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistTab({ firestore, trip, itinerary, isOrganizer }: { firestore: Firestore, trip: any, itinerary: any, isOrganizer: boolean }) {
  const travelLegs = itinerary?.filter((i: any) => i.category === 'travel') || [];
  
  const [hasUrgentItems, setHasUrgentItems] = useState(false);
  const tripStartsSoon = new Date(trip.startDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      {hasUrgentItems && tripStartsSoon && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <p className="text-sm font-black">⚠️ Some travel items need attention</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white tracking-tight">Preparation</h2>
        {travelLegs.length === 0 && <span className="text-sm text-zinc-500 font-medium">No travel legs found.</span>}
      </div>

      <div className="space-y-6">
        {travelLegs.map((leg: any) => (
          <LegChecklistCard 
            key={leg.id} 
            firestore={firestore}
            leg={leg} 
            tripId={trip.id} 
            isOrganizer={isOrganizer} 
            onUrgentChange={setHasUrgentItems}
          />
        ))}
      </div>
    </div>
  );
}

function LegChecklistCard({ firestore, leg, tripId, isOrganizer, onUrgentChange }: { firestore: Firestore, leg: any, tripId: string, isOrganizer: boolean, onUrgentChange: (urgent: boolean) => void }) {
  const checklistQuery = useMemoFirebase(() => {
    if (!firestore || !tripId || !leg.id) return null;
    try {
      return query(collection(firestore, 'trips', tripId, 'itineraryItems', leg.id, 'checklistItems'), orderBy('order'));
    } catch (e) {
      return null;
    }
  }, [firestore, tripId, leg.id]);

  const { data: checks } = useCollection(checklistQuery);

  useEffect(() => {
    if (checks?.some((c: any) => c.status === 'red')) {
      onUrgentChange(true);
    }
  }, [checks, onUrgentChange]);

  const cycleStatus = async (check: any) => {
    if (!isOrganizer) return;
    const order = ['red', 'yellow', 'green'];
    const currentIndex = order.indexOf(check.status);
    const nextStatus = order[(currentIndex + 1) % order.length];
    await updateChecklistItemStatus(firestore, tripId, leg.id, check.id, nextStatus);
  };

  return (
    <Card className="bg-white/5 border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-sm">
      <div className="bg-teal-500/10 p-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            {leg.mode === 'flight' ? <Plane className="w-6 h-6 text-white" /> : 
             leg.mode === 'bus' ? <Bus className="w-6 h-6 text-white" /> :
             <Train className="w-6 h-6 text-white" />}
          </div>
          <div>
            <h4 className="font-black text-white text-base leading-tight">{leg.fromLocation} → {leg.toLocation}</h4>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">Day {leg.dayNumber} • {leg.mode}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-teal-500">{leg.departureTime || '--:--'}</p>
          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Departure</p>
        </div>
      </div>
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="checklist" className="border-none">
            <AccordionTrigger className="px-5 py-4 hover:no-underline text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              View Checklist Items
            </AccordionTrigger>
            <AccordionContent>
              <div className="divide-y divide-white/5">
                {checks?.map((check: any) => (
                  <div key={check.id} className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                    <span className="text-sm font-medium text-zinc-300">{check.description}</span>
                    <button 
                      onClick={() => cycleStatus(check)}
                      disabled={!isOrganizer}
                      className={cn(
                        "w-8 h-8 rounded-full border-4 transition-all flex items-center justify-center shadow-md active:scale-90",
                        check.status === 'green' ? "bg-teal-500 border-teal-500/20" : 
                        check.status === 'yellow' ? "bg-yellow-500 border-yellow-500/20" : "bg-red-500 border-red-500/20"
                      )}
                    />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function SuggestionsTab({ firestore, trip, suggestions, isOrganizer }: { firestore: Firestore, trip: any, suggestions: any, isOrganizer: boolean }) {
  const { user } = useUser();
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAdd = async () => {
    if (!link) return;
    await addSuggestion(firestore, trip.id, {
      link,
      notes,
      addedBy: user?.displayName || user?.email?.split('@')[0] || 'Member'
    });
    setLink('');
    setNotes('');
    toast({ title: 'Suggestion added!' });
  };

  const handleAiPick = async () => {
    if (!suggestions || suggestions.length === 0) {
      toast({ variant: 'destructive', title: 'No suggestions', description: 'Add some ideas first!' });
      return;
    }
    setIsAiLoading(true);
    try {
      const result = await aiTripSuggestionRecommendation({
        groupPreferences: `Trip to ${trip.destination} with a ${trip.vibe} vibe. Budget: ₹${trip.budgetPerHead} per head.`,
        suggestions: suggestions.map((s: any) => ({
          link: s.link,
          notes: s.notes,
          addedBy: s.addedBy
        }))
      });
      
      const winningSuggestion = suggestions[result.recommendedSuggestionIndex];
      await markAiRecommended(firestore, trip.id, winningSuggestion.id, result.aiReason);
      toast({ title: 'AI Picked!', description: `The AI recommends: ${winningSuggestion.notes || winningSuggestion.link}` });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'AI Error', description: 'Could not get recommendation.' });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {isOrganizer && (
        <Button 
          className="w-full h-14 bg-amber-500 hover:bg-amber-600 font-black rounded-2xl text-lg gap-3 shadow-xl shadow-amber-500/20" 
          onClick={handleAiPick}
          disabled={isAiLoading || !suggestions?.length}
        >
          {isAiLoading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-6 h-6" />}
          Get AI Recommendation
        </Button>
      )}

      <Card className="bg-teal-500/5 border-teal-500/20 rounded-[2rem] overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <Label className="font-black text-teal-500 uppercase tracking-widest text-[10px]">Have an idea? 💡</Label>
          <Input className="bg-white/5 border-white/10 h-12 rounded-xl" placeholder="Paste link (hotel, booking site)" value={link} onChange={e => setLink(e.target.value)} />
          <Textarea className="bg-white/5 border-white/10 rounded-xl h-24" placeholder="Why this?" value={notes} onChange={e => setNotes(e.target.value)} />
          <Button className="w-full h-12 bg-teal-500 hover:bg-teal-600 font-black rounded-xl" onClick={handleAdd}>Add Suggestion</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {suggestions?.map((s: any) => (
          <Card key={s.id} className={cn(
            "bg-white/5 border-white/5 rounded-[1.5rem] transition-all duration-500", 
            s.isAiRecommended && "border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.1)] scale-[1.02]"
          )}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xs font-black uppercase text-zinc-300">
                    {s.addedBy ? s.addedBy[0] : '?'}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">{s.addedBy}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Member Suggestion</p>
                  </div>
                </div>
                {s.isAiRecommended && <Badge className="bg-amber-500 hover:bg-amber-600 gap-1 text-[10px] font-black py-1 px-3 rounded-lg"><Sparkles className="w-3 h-3" /> AI PICK</Badge>}
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-zinc-300 leading-relaxed font-medium">{s.notes}</p>
                {s.aiReason && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Rationale</p>
                    <p className="text-xs text-amber-500/80 leading-relaxed">{s.aiReason}</p>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full h-10 gap-2 bg-white/5 border-white/5 text-xs font-bold rounded-xl" asChild>
                  <a href={s.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" /> Open Source
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

  const handleAdd = async () => {
    if (!item) return;
    await addPackingItem(firestore, trip.id, { name: item });
    setItem('');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/5 rounded-[2rem] backdrop-blur-sm overflow-hidden">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-white text-lg tracking-tight">{packedCount} / {totalItems} items packed</h3>
            <span className="text-xl font-black text-teal-500">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3 bg-white/5" />
          <div className="flex gap-2">
            <Input className="bg-black/20 border-white/10 h-12 rounded-xl" placeholder="Need to pack..." value={item} onChange={e => setItem(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
            <Button size="icon" className="w-12 h-12 rounded-xl bg-teal-500 hover:bg-teal-600 shrink-0" onClick={handleAdd}><Plus className="w-6 h-6" /></Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {packing?.map((i: any) => (
          <div 
            key={i.id} 
            className={cn(
              "flex items-center justify-between p-5 rounded-[1.25rem] border border-white/5 transition-all cursor-pointer",
              i.isPacked ? "bg-teal-500/5 opacity-40" : "bg-white/5"
            )}
            onClick={() => togglePackedStatus(firestore, trip.id, i.id, i.isPacked)}
          >
            <div className="flex items-center gap-4">
              {i.isPacked ? <CheckCircle2 className="w-6 h-6 text-teal-500" /> : <Circle className="w-6 h-6 text-zinc-500" />}
              <span className={cn("text-sm font-bold", i.isPacked ? "line-through text-zinc-500" : "text-white")}>{i.name}</span>
            </div>
            {isOrganizer && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 text-zinc-500 hover:text-red-500"
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

  const totalActual = itinerary?.reduce((sum: number, i: any) => sum + (i.actualBudget || 0), 0) || 0;
  const totalPlanned = itinerary?.reduce((sum: number, i: any) => sum + (i.plannedBudget || 0), 0) || 0;
  const diff = totalPlanned - totalActual;

  const categories = ['food', 'stay', 'transport', 'activity', 'travel'];
  const chartData = categories.map(cat => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    actual: itinerary?.filter((i: any) => i.category === cat).reduce((sum: number, i: any) => sum + (i.actualBudget || 0), 0) || 0,
    planned: itinerary?.filter((i: any) => i.category === cat).reduce((sum: number, i: any) => sum + (i.plannedBudget || 0), 0) || 0,
  })).filter(d => d.actual > 0 || d.planned > 0);

  const pieData = chartData.map((d, i) => ({ name: d.name, value: d.actual }));

  return (
    <div className="space-y-10 pb-24">
      <div className="text-center space-y-4">
        <p className="text-xs text-zinc-500 font-black uppercase tracking-[0.3em]">Total Expenditure</p>
        <h2 className="text-5xl font-black text-white tracking-tighter">₹{totalActual.toLocaleString()}</h2>
        <Badge className={cn("mt-4 py-2 px-6 rounded-full text-sm font-black tracking-wide", diff >= 0 ? 'bg-teal-500' : 'bg-red-500')}>
          {diff >= 0 ? `₹${diff.toLocaleString()} UNDER BUDGET` : `₹${Math.abs(diff).toLocaleString()} OVER BUDGET`}
        </Badge>
      </div>

      <div className="space-y-6">
        <div className="h-72 w-full bg-white/5 rounded-[2rem] p-4">
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 ml-2">Spending by Category</h4>
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
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
              <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '16px', color: '#fff' }} />
              <Legend />
            </RePieChart>
          </ResponsiveContainer>
        </div>

        <div className="h-72 w-full bg-white/5 rounded-[2rem] p-4">
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 ml-2">Planned vs Actual</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#71717a' }} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#71717a' }} />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '16px' }} />
              <Legend />
              <Bar dataKey="planned" fill="#334155" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="actual" fill="#0D9488" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-black text-white text-lg tracking-tight px-2">The Crew</h3>
        <div className="grid grid-cols-2 gap-3">
          {members?.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
              <Avatar className="h-9 w-9 border border-white/10">
                <AvatarImage src={m.photoURL || ''} />
                <AvatarFallback className="bg-teal-500/20 text-teal-500 text-sm font-black">
                  {m.name ? m.name[0].toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">{m.name}</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{m.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-6">
        <Button variant="outline" className="w-full gap-3 py-8 rounded-[1.5rem] bg-white/5 border-white/10 text-white font-black text-lg hover:bg-white/10" onClick={() => {
          navigator.clipboard.writeText(`${window.location.origin}/view/${trip.id}`);
          toast({ title: 'Link copied!' });
        }}>
          <Share2 className="w-6 h-6" /> Share Itinerary
        </Button>
        {isOrganizer && trip.status !== 'Completed' && (
          <Button 
            className="w-full h-16 rounded-[1.5rem] bg-teal-500 hover:bg-teal-600 font-black text-lg shadow-xl shadow-teal-500/20"
            onClick={async () => {
              await markTripComplete(firestore, trip.id);
              toast({ title: 'Trip Completed! 🏁', description: 'Hope you had a blast.' });
              router.push('/dashboard');
            }}
          >
            Mark Trip Complete
          </Button>
        )}
      </div>
    </div>
  );
}
