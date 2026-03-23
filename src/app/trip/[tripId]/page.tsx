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
  updateTripDetails,
  updateMemberRole,
  removeMember
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
  ExternalLink, Sparkles, Bus, Plane, Train, ArrowRight, Loader2, Share2, Sun, Sunset, Moon, Coffee, MessageCircle, Settings, Edit, Calendar as CalendarIcon, ArrowLeft, UserPlus, UserCog, UserMinus, Wallet, Users
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

  if (isTripLoading || isUserLoading) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-teal-500"><Loader2 className="animate-spin w-12 h-12" /></div>;
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
            {isMember && (
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
            <ItineraryTab firestore={firestore} trip={trip} itinerary={itinerary} isAdmin={isAdmin} isMember={isMember} />
          </TabsContent>
          <TabsContent value="checklist" className="mt-0 outline-none">
            <ChecklistTab firestore={firestore} trip={trip} itinerary={itinerary} isMember={isMember} />
          </TabsContent>
          <TabsContent value="suggestions" className="mt-0 outline-none">
            <SuggestionsTab firestore={firestore} trip={trip} suggestions={suggestions} isMember={isMember} isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="packing" className="mt-0 outline-none">
            <PackingTab firestore={firestore} trip={trip} packing={packing} isMember={isMember} />
          </TabsContent>
          <TabsContent value="summary" className="mt-0 outline-none">
            <SummaryTab firestore={firestore} trip={trip} itinerary={itinerary} members={members} isAdmin={isAdmin} isMember={isMember} isOrganizer={isOrganizer} />
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

function ItineraryTab({ firestore, trip, itinerary, isAdmin, isMember }: any) {
  const start = toDate(trip.startDate);
  const end = toDate(trip.endDate);
  
  // Normalize dates to midnight to ensure accurate day difference regardless of time-of-day
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  
  const diffTime = Math.abs(e.getTime() - s.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const days = Array.from({ length: diffDays }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-3xl font-black tracking-tight">Itinerary</h2>
        {isMember && <AddItineraryDialog firestore={firestore} tripId={trip.id} days={days} />}
      </div>
      
      <Accordion type="multiple" className="space-y-4" defaultValue={['day-1']}>
        {days.map(dayNum => {
          const dayItems = itinerary?.filter((i: any) => i.dayNumber === dayNum) || [];
          const dayDate = addDays(s, dayNum - 1);
          const dayPlanned = dayItems.reduce((sum: number, i: any) => sum + (i.plannedBudget || 0), 0);
          const dayActual = dayItems.reduce((sum: number, i: any) => sum + (i.actualBudget || 0), 0);

          return (
            <AccordionItem key={dayNum} value={`day-${dayNum}`} className="border border-white/5 rounded-[2.5rem] px-4 overflow-hidden bg-white/5 backdrop-blur-sm">
              <AccordionTrigger className="hover:no-underline py-6">
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black">Day {dayNum}</span>
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">— {format(dayDate, 'EEE dd MMM')}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-teal-500">₹{dayActual.toLocaleString()} / ₹{dayPlanned.toLocaleString()}</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-8 space-y-8">
                {dayItems.length === 0 ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-white/10">
                      <CalendarIcon className="w-8 h-8 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 font-bold italic text-sm">No activities planned for this day yet.</p>
                    {isMember && (
                      <AddItineraryDialog 
                        firestore={firestore} 
                        tripId={trip.id} 
                        days={days} 
                        defaultDay={dayNum}
                        trigger={
                          <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hover:border-teal-500/50 hover:bg-teal-500/10 text-[10px] font-black uppercase tracking-widest rounded-xl">
                            <Plus className="w-3 h-3 mr-1.5" /> Add to Plan
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
                      <div key={slot} className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="text-teal-500">
                            {slot === 'Morning' && <Coffee className="w-4 h-4" />}
                            {slot === 'Afternoon' && <Sun className="w-4 h-4" />}
                            {slot === 'Evening' && <Sunset className="w-4 h-4" />}
                            {slot === 'Night' && <Moon className="w-4 h-4" />}
                          </div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{slot}</h4>
                        </div>
                        <div className="space-y-4">
                          {slotItems.map((item: any) => (
                            <ItineraryItemCard key={item.id} firestore={firestore} tripId={trip.id} item={item} isMember={isMember} isAdmin={isAdmin} />
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

function ItineraryItemCard({ firestore, tripId, item, isMember, isAdmin }: any) {
  const [actual, setActual] = useState(item.actualBudget?.toString() || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [newNote, setNewNote] = useState('');
  const { user } = useUser();

  const suggestionsRef = useMemoFirebase(() => {
    return query(collection(firestore, 'trips', tripId, 'itineraryItems', item.id, 'suggestions'), orderBy('addedAt', 'desc'));
  }, [firestore, tripId, item.id]);

  const { data: suggestions } = useCollection(suggestionsRef);

  const handleUpdateBudget = () => {
    const amount = Number(actual);
    if (!isNaN(amount)) {
      updateActualBudget(firestore, tripId, item.id, amount);
      toast({ title: 'Budget Updated' });
    }
  };

  const handleAddSuggestion = async () => {
    if (!newLink) return;
    addItemSuggestion(firestore, tripId, item.id, {
      link: newLink,
      notes: newNote,
      addedBy: user?.displayName || 'Member'
    });
    setNewLink('');
    setNewNote('');
    toast({ title: 'Suggestion Added!' });
  };

  const handleAiRecommend = async () => {
    if (!suggestions || suggestions.length < 2) return;
    toast({ title: 'AI is thinking...' });
    const input = {
      groupPreferences: `Trip to ${item.name}. Vibe is fun and collaborative.`,
      suggestions: suggestions.map((s: any) => ({
        link: s.link,
        notes: s.notes,
        addedBy: s.addedBy
      }))
    };
    const result = await aiTripSuggestionRecommendation(input);
    const recommended = suggestions[result.recommendedSuggestionIndex];
    markItemSuggestionAiPick(firestore, tripId, item.id, recommended.id, result.aiReason);
    toast({ title: 'AI Picked!', description: recommended.link });
  };

  return (
    <Card className="bg-black/20 border-white/5 rounded-3xl overflow-hidden group/item">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-500 shrink-0">
              {item.category === 'transport' ? <Bus className="w-6 h-6" /> :
               item.category === 'travel' ? <Plane className="w-6 h-6" /> :
               item.category === 'food' ? <Sparkles className="w-6 h-6" /> :
               item.category === 'stay' ? <MapPin className="w-6 h-6" /> :
               <Sparkles className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <h4 className="font-black text-lg text-white leading-tight truncate">{item.name}</h4>
              <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">{item.notes}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-black text-white">₹{item.plannedBudget?.toLocaleString()}</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Planned</span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500 font-bold text-xs">₹</span>
            <Input 
              className="pl-7 bg-black/40 border-white/5 h-10 rounded-xl text-sm font-bold focus:border-teal-500 transition-all" 
              placeholder="Actual Spend" 
              type="number"
              value={actual}
              onChange={e => setActual(e.target.value)}
              onBlur={handleUpdateBudget}
            />
          </div>
          {isMember && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              onClick={() => deleteItineraryItem(firestore, tripId, item.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="mt-4">
          <button 
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-teal-500 hover:text-teal-400 transition-colors"
          >
            <Lightbulb className="w-3 h-3" />
            {suggestions?.length || 0} Suggestions
          </button>

          {showSuggestions && (
            <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              {suggestions?.map((s: any) => (
                <div key={s.id} className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-2 group/suggestion">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center text-[10px] font-black text-teal-500">
                        {s.addedBy?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{s.addedBy}</span>
                    </div>
                    {s.aiRecommended && (
                      <Badge className="bg-amber-500 text-black font-black text-[9px] px-2 py-0 border-none">AI PICK</Badge>
                    )}
                  </div>
                  <a href={s.link} target="_blank" className="text-teal-400 text-xs font-bold underline break-all flex items-center gap-1.5 hover:text-teal-300 transition-colors">
                    {s.link} <ExternalLink className="w-3 h-3" />
                  </a>
                  {s.notes && <p className="text-[10px] text-zinc-400 italic">"{s.notes}"</p>}
                  {s.aiRecommended && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-500/80 font-medium leading-relaxed">{s.aiReason}</p>
                    </div>
                  )}
                </div>
              ))}

              <div className="space-y-2 bg-white/5 p-4 rounded-2xl">
                <Input 
                  placeholder="Paste link (stay, activity, etc.)" 
                  className="bg-black/40 border-white/5 h-10 rounded-xl text-xs" 
                  value={newLink}
                  onChange={e => setNewLink(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input 
                    placeholder="Notes (optional)" 
                    className="bg-black/40 border-white/5 h-10 rounded-xl text-xs flex-1" 
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                  />
                  <Button 
                    className="h-10 w-10 bg-teal-500 hover:bg-teal-600 rounded-xl shrink-0" 
                    onClick={handleAddSuggestion}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {isAdmin && suggestions && suggestions.length > 1 && (
                <Button 
                  className="w-full bg-white/5 hover:bg-amber-500/10 hover:text-amber-500 border border-white/5 hover:border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
                  onClick={handleAiRecommend}
                >
                  <Sparkles className="w-3 h-3" /> Ask AI to Pick
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistTab({ firestore, trip, itinerary, isMember }: any) {
  const travelItems = itinerary?.filter((i: any) => i.category === 'transport' || i.category === 'travel') || [];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black tracking-tight">Pre-trip Checklist</h2>
      {travelItems.length === 0 ? (
        <Card className="bg-white/5 border-white/5 p-12 text-center rounded-[2.5rem]">
          <div className="w-20 h-20 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckSquare className="w-10 h-10 text-teal-500" />
          </div>
          <p className="text-zinc-400 font-bold">No travel legs yet. Add flights or trains in the itinerary.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {travelItems.map((item: any) => (
            <div key={item.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
                  {item.category === 'travel' ? <Plane className="w-4 h-4" /> : <Bus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{item.name}</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Day {item.dayNumber}</p>
                </div>
              </div>
              <ChecklistItemsList firestore={firestore} tripId={trip.id} itemId={item.id} isMember={isMember} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistItemsList({ firestore, tripId, itemId, isMember }: any) {
  const checklistRef = useMemoFirebase(() => {
    return query(collection(firestore, 'trips', tripId, 'itineraryItems', itemId, 'checklistItems'), orderBy('order'));
  }, [firestore, tripId, itemId]);

  const { data: checklist } = useCollection(checklistRef);

  const cycleStatus = (id: string, current: string) => {
    if (!isMember) return;
    const next = current === 'red' ? 'yellow' : current === 'yellow' ? 'green' : 'red';
    updateChecklistItemStatus(firestore, tripId, itemId, id, next);
  };

  return (
    <div className="space-y-3 pl-4 border-l border-white/5 ml-4">
      {checklist?.map((item: any) => (
        <div key={item.id} className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => cycleStatus(item.id, item.status)}
              className={cn(
                "w-5 h-5 rounded-full border-2 transition-all",
                item.status === 'green' ? "bg-teal-500 border-teal-500" :
                item.status === 'yellow' ? "bg-amber-500 border-amber-500" :
                "bg-red-500 border-red-500",
                isMember ? "cursor-pointer hover:scale-110" : "cursor-default"
              )}
            >
              {item.status === 'green' && <CheckCircle2 className="w-3 h-3 text-black mx-auto" />}
            </button>
            <span className={cn(
              "text-xs font-bold transition-all",
              item.status === 'green' ? "text-zinc-600 line-through" : "text-zinc-300"
            )}>
              {item.description}
            </span>
          </div>
          <Badge className={cn(
            "text-[9px] font-black px-2 py-0 border-none",
            item.status === 'green' ? "bg-teal-500/10 text-teal-500" :
            item.status === 'yellow' ? "bg-amber-500/10 text-amber-500" :
            "bg-red-500/10 text-red-500"
          )}>
            {item.status === 'green' ? 'DONE' : item.status === 'yellow' ? 'PENDING' : 'TODO'}
          </Badge>
        </div>
      ))}
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

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black tracking-tight">Idea Pool</h2>
      
      {isMember && (
        <Card className="bg-white/5 border-white/5 p-6 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest ml-1">Paste Link</Label>
              <Input 
                className="bg-black/20 border-white/10 h-12 rounded-2xl text-white" 
                placeholder="e.g. Airbnb or TripAdvisor link" 
                value={link}
                onChange={e => setLink(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest ml-1">Notes</Label>
              <Textarea 
                className="bg-black/20 border-white/10 rounded-2xl text-white min-h-[80px]" 
                placeholder="Why this?" 
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
            <Button 
              className="w-full h-14 bg-teal-500 hover:bg-teal-600 rounded-2xl font-black text-lg gap-2 shadow-xl shadow-teal-500/20"
              onClick={handleAdd}
            >
              <Plus className="w-5 h-5" /> Add Idea
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-6">
        {suggestions?.map((s: any) => (
          <Card className="bg-black/20 border-white/5 rounded-[2rem] overflow-hidden group">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-teal-500/20 rounded-full flex items-center justify-center text-[10px] font-black text-teal-500">
                    {s.addedBy?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{s.addedBy}</span>
                </div>
                {s.isAiRecommended && <Badge className="bg-amber-500 text-black font-black px-3 py-0.5 border-none">AI PICK</Badge>}
              </div>
              <div className="space-y-1">
                <a href={s.link} target="_blank" className="text-teal-400 font-bold text-sm underline break-all flex items-center gap-1.5 hover:text-teal-300">
                  {s.link} <ExternalLink className="w-3 h-3" />
                </a>
                {s.notes && <p className="text-zinc-400 text-xs mt-1 leading-relaxed">"{s.notes}"</p>}
              </div>
              {s.isAiRecommended && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-500 font-medium leading-relaxed">{s.aiReason}</p>
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
  const progress = packing?.length ? (packedCount / packing.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tight">Packing List</h2>
        <Badge className="bg-teal-500/20 text-teal-500 font-black px-3 py-1 border-none">{packedCount}/{packing?.length || 0}</Badge>
      </div>

      <div className="space-y-2">
        <Progress value={progress} className="h-2 bg-white/5" />
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <span>Get Ready</span>
          <span>{Math.round(progress)}% Ready</span>
        </div>
      </div>

      {isMember && (
        <div className="flex gap-3">
          <Input 
            className="bg-white/5 border-white/5 h-12 rounded-2xl text-white font-bold" 
            placeholder="Add something to pack..." 
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button className="h-12 w-12 bg-teal-500 hover:bg-teal-600 rounded-2xl shrink-0" onClick={handleAdd}>
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {packing?.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl group border border-white/5 hover:border-teal-500/30 transition-all">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => togglePackedStatus(firestore, trip.id, item.id, item.isPacked)}
                className={cn(
                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                  item.isPacked ? "bg-teal-500 border-teal-500" : "bg-black/20 border-white/10 hover:border-teal-500"
                )}
                disabled={!isMember}
              >
                {item.isPacked && <CheckCircle2 className="w-4 h-4 text-black" />}
              </button>
              <span className={cn(
                "font-bold text-sm transition-all",
                item.isPacked ? "text-zinc-600 line-through" : "text-white"
              )}>
                {item.name}
              </span>
            </div>
            {isMember && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
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
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-teal-500 border-none rounded-[2rem] shadow-xl shadow-teal-500/20">
          <CardContent className="p-6 text-black">
            <PieChartIcon className="w-6 h-6 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Spent</p>
            <h3 className="text-3xl font-black">₹{totalActual.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/5 rounded-[2rem]">
          <CardContent className="p-6">
            <Wallet className="w-6 h-6 mb-4 text-teal-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Planned</p>
            <h3 className="text-3xl font-black text-white">₹{totalPlanned.toLocaleString()}</h3>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-500" /> Expense Breakdown
        </h3>
        <Card className="bg-black/20 border-white/5 rounded-[2.5rem] overflow-hidden p-6">
          <div className="h-[250px] w-full">
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
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{d.name}</span>
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
          <Button variant="ghost" size="sm" onClick={handleShare} className="text-teal-500 font-black uppercase tracking-widest text-[10px] gap-2">
            <UserPlus className="w-4 h-4" /> Invite
          </Button>
        </div>
        <Card className="bg-white/5 border-white/5 rounded-[2rem] overflow-hidden">
          <CardContent className="p-4 space-y-4">
            {members?.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-white/10 shadow-lg">
                    <AvatarImage src={member.photoURL || ''} />
                    <AvatarFallback className="bg-teal-500 text-black font-black">
                      {member.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-black text-white leading-tight">{member.name}</p>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{member.role}</p>
                  </div>
                </div>
                {isAdmin && member.uid !== trip.organizerId && (
                  <div className="flex items-center gap-1">
                    <Select 
                      defaultValue={member.role} 
                      onValueChange={(val) => updateMemberRole(firestore, trip.id, member.uid, val)}
                    >
                      <SelectTrigger className="h-8 bg-black/40 border-none text-[10px] font-black uppercase tracking-widest w-24 rounded-lg">
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
                      className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                      onClick={() => removeMember(firestore, trip.id, member.uid)}
                    >
                      <UserMinus className="w-4 h-4" />
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
          className="w-full h-16 bg-white/5 hover:bg-white/10 text-zinc-400 font-black rounded-3xl gap-3 text-sm uppercase tracking-widest border border-white/5"
          onClick={handleShare}
        >
          <Share2 className="w-5 h-5" /> Share Invite Link
        </Button>
      )}

      {isMember && trip.status !== 'Completed' && (
        <Button 
          className="w-full h-16 bg-teal-500 hover:bg-teal-600 text-black font-black rounded-3xl gap-3 text-lg shadow-xl shadow-teal-500/20"
          onClick={() => markTripComplete(firestore, trip.id)}
        >
          <CheckCircle2 className="w-6 h-6" /> Complete Trip
        </Button>
      )}
    </div>
  );
}

function AddItineraryDialog({ firestore, tripId, days, defaultDay, trigger }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('other');
  const [day, setDay] = useState(defaultDay?.toString() || '1');
  const [slot, setSlot] = useState('Morning');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    addItineraryItem(firestore, tripId, {
      name,
      category,
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
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-teal-500 hover:bg-teal-600 rounded-2xl font-black gap-2 shadow-xl shadow-teal-500/20">
            <Plus className="w-5 h-5" /> Add Activity
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md w-[95%] rounded-[2.5rem] bg-[#0F172A] border-white/5 shadow-2xl p-8 backdrop-blur-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white">New Activity ✈️</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Activity Name</Label>
            <Input className="bg-black/40 border-white/5 h-12 rounded-xl text-white font-bold" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-black/40 border-white/5 h-12 rounded-xl text-white font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                  <SelectItem value="stay">🏨 Stay</SelectItem>
                  <SelectItem value="travel">✈️ Travel</SelectItem>
                  <SelectItem value="transport">🚗 Transport</SelectItem>
                  <SelectItem value="food">🍱 Food</SelectItem>
                  <SelectItem value="activity">🎭 Activity</SelectItem>
                  <SelectItem value="other">✨ Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Planned Budget</Label>
              <Input type="number" className="bg-black/40 border-white/5 h-12 rounded-xl text-white font-bold" value={budget} onChange={e => setBudget(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="bg-black/40 border-white/5 h-12 rounded-xl text-white font-bold">
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
                <SelectTrigger className="bg-black/40 border-white/5 h-12 rounded-xl text-white font-bold">
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
            <Textarea className="bg-black/40 border-white/5 rounded-xl text-white min-h-[100px]" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <Button className="w-full h-14 bg-teal-500 hover:bg-teal-600 rounded-2xl font-black text-lg shadow-xl shadow-teal-500/20" onClick={handleAdd}>Add to Plan</Button>
        </div>
      </DialogContent>
    </Dialog>
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
        <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl shrink-0">
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[95%] rounded-[2.5rem] bg-[#0F172A] border-white/5 shadow-2xl p-8 backdrop-blur-3xl overflow-visible">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white">Edit Trip Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Trip Name</Label>
            <Input className="bg-black/40 border-white/5 h-12 rounded-xl text-white font-bold" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Destination</Label>
            <Input className="bg-black/40 border-white/5 h-12 rounded-xl text-white font-bold" value={destination} onChange={e => setDestination(e.target.value)} required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Start Date</Label>
              <input
                type="date"
                value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) setStartDate(new Date(val));
                }}
                className="w-full bg-black/40 border border-white/5 h-12 rounded-xl px-4 text-white focus:border-teal-500 outline-none appearance-none cursor-pointer"
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
                className="w-full bg-black/40 border border-white/5 h-12 rounded-xl px-4 text-white focus:border-teal-500 outline-none appearance-none cursor-pointer"
                style={{ colorScheme: "dark" }}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-14 bg-teal-500 hover:bg-teal-600 rounded-2xl font-black text-lg shadow-xl shadow-teal-500/20" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
