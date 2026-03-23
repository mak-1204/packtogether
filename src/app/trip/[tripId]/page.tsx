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
import { Avatar, AvatarFallback, AvatarImage } from '@/avatar';
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
  ExternalLink, Sparkles, Bus, Plane, Train, ArrowRight, Loader2, Share2, Sun, Sunset, Moon, Coffee, MessageCircle, Settings, Edit, Calendar as CalendarIcon, ArrowLeft, UserPlus
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
    if (!isUserLoading && !user) {
      router.push('/');
      return;
    }

    if (!isTripLoading && !isUserLoading && trip && !isOrganizer && !isMember) {
      router.push(`/join/${tripId}`);
    }
  }, [isTripLoading, isUserLoading, user, trip, isOrganizer, isMember, tripId, router]);

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

// ... rest of the file remains unchanged
