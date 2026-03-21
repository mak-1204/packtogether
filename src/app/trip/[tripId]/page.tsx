'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, orderBy, where } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { getMemberSession, updateActualBudget, addItineraryItem, addSuggestion, addPackingItem, togglePackedStatus, deletePackingItem, markTripComplete } from '@/lib/firestore-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, CheckSquare, Lightbulb, Package, PieChart, 
  Plus, MapPin, ChevronRight, CheckCircle2, Circle, Trash2, 
  ExternalLink, Sparkles, AlertTriangle, Bus, Plane, Train, Car, Share2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';

export default function TripDetailsPage() {
  const { tripId } = useParams() as { tripId: string };
  const { firestore } = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('itinerary');
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const s = getMemberSession(tripId);
    setSession(s);
  }, [tripId]);

  const tripRef = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    return doc(firestore, 'trips', tripId);
  }, [firestore, tripId]);

  const itineraryQuery = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    return query(collection(firestore, 'trips', tripId, 'itineraryItems'), orderBy('dayNumber'), orderBy('createdAt'));
  }, [firestore, tripId]);

  const suggestionsQuery = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    return query(collection(firestore, 'trips', tripId, 'suggestions'), orderBy('createdAt', 'desc'));
  }, [firestore, tripId]);

  const packingQuery = useMemoFirebase(() => {
    if (!firestore || !tripId) return null;
    return query(collection(firestore, 'trips', tripId, 'packingItems'), orderBy('createdAt'));
  }, [firestore, tripId]);

  const { data: trip, isLoading: isTripLoading } = useDoc(tripRef);
  const { data: itinerary } = useCollection(itineraryQuery);
  const { data: suggestions } = useCollection(suggestionsQuery);
  const { data: packing } = useCollection(packingQuery);

  if (isTripLoading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  if (!trip) return <div className="min-h-screen bg-background flex items-center justify-center">Trip not found.</div>;

  // Check access
  const isOrganizer = user?.uid === trip.organizerId;
  const isMember = !!session;

  if (!isOrganizer && !isMember) {
    router.push(`/join/${tripId}`);
    return null;
  }

  const totalPlanned = trip.totalPlannedBudget || itinerary?.reduce((sum, item) => sum + (item.plannedBudget || 0), 0) || 0;
  const totalActual = trip.totalActualBudget || itinerary?.reduce((sum, item) => sum + (item.actualBudget || 0), 0) || 0;
  const budgetRatio = totalActual / (totalPlanned || 1);
  const budgetColor = budgetRatio > 0.9 ? 'text-destructive' : budgetRatio > 0.7 ? 'text-amber-500' : 'text-primary';

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40 p-4">
        <div className="container max-w-lg mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="font-bold text-lg leading-tight truncate">{trip.destination}</h1>
            <span className="text-xs text-muted-foreground truncate">{trip.name}</span>
          </div>
          <div className={`flex flex-col items-end ${budgetColor}`}>
            <span className="text-sm font-bold">₹{totalActual.toLocaleString()} / ₹{totalPlanned.toLocaleString()}</span>
            <div className="w-24 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
              <div 
                className={`h-full transition-all ${budgetRatio > 0.9 ? 'bg-destructive' : 'bg-primary'}`} 
                style={{ width: `${Math.min(budgetRatio * 100, 100)}%` }} 
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="itinerary" className="mt-0">
            <ItineraryTab trip={trip} itinerary={itinerary} isOrganizer={isOrganizer} />
          </TabsContent>
          <TabsContent value="checklist" className="mt-0">
            <ChecklistTab trip={trip} itinerary={itinerary} isOrganizer={isOrganizer} />
          </TabsContent>
          <TabsContent value="suggestions" className="mt-0">
            <SuggestionsTab trip={trip} suggestions={suggestions} session={session} />
          </TabsContent>
          <TabsContent value="packing" className="mt-0">
            <PackingTab trip={trip} packing={packing} isOrganizer={isOrganizer} />
          </TabsContent>
          <TabsContent value="summary" className="mt-0">
            <SummaryTab trip={trip} itinerary={itinerary} isOrganizer={isOrganizer} />
          </TabsContent>

          <TabsList className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border/40 rounded-none grid grid-cols-5 z-50">
            <TabsTrigger value="itinerary" className="flex flex-col gap-1 data-[state=active]:text-primary">
              <Calendar className="w-5 h-5" />
              <span className="text-[10px]">Itinerary</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex flex-col gap-1 data-[state=active]:text-primary">
              <CheckSquare className="w-5 h-5" />
              <span className="text-[10px]">Checklist</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex flex-col gap-1 data-[state=active]:text-primary">
              <Lightbulb className="w-5 h-5" />
              <span className="text-[10px]">Ideas</span>
            </TabsTrigger>
            <TabsTrigger value="packing" className="flex flex-col gap-1 data-[state=active]:text-primary">
              <Package className="w-5 h-5" />
              <span className="text-[10px]">Packing</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex flex-col gap-1 data-[state=active]:text-primary">
              <PieChart className="w-5 h-5" />
              <span className="text-[10px]">Summary</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </main>
    </div>
  );
}

function ItineraryTab({ trip, itinerary, isOrganizer }: any) {
  const { firestore } = useFirestore();
  const days = Array.from(new Set(itinerary?.map((i: any) => i.dayNumber) || [1])).sort((a, b) => (a as number) - (b as number));

  return (
    <div className="space-y-6 pb-24">
      {days.map(dayNum => {
        const items = itinerary?.filter((i: any) => i.dayNumber === dayNum) || [];
        const dayPlanned = items.reduce((sum: number, i: any) => sum + (i.plannedBudget || 0), 0);
        const dayActual = items.reduce((sum: number, i: any) => sum + (i.actualBudget || 0), 0);
        
        return (
          <div key={dayNum as number} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Day {dayNum as number}</h2>
              <span className="text-xs text-muted-foreground">₹{dayActual} / ₹{dayPlanned}</span>
            </div>
            <div className="space-y-3">
              {items.map((item: any) => (
                <Card key={item.id} className="bg-card/50 border-border/40">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        {item.category === 'transport' ? <Bus className="w-5 h-5" /> :
                         item.category === 'food' ? <Sparkles className="w-5 h-5" /> :
                         item.category === 'travel' ? <Plane className="w-5 h-5" /> :
                         <MapPin className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold truncate">{item.name}</h4>
                          <span className="text-xs font-medium shrink-0">₹{item.plannedBudget}</span>
                        </div>
                        {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                        <div className="mt-3 flex items-center gap-2">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Actual Spent:</Label>
                          <Input 
                            type="number" 
                            className="h-8 w-24 text-xs bg-secondary/50 border-none" 
                            defaultValue={item.actualBudget}
                            onBlur={(e) => updateActualBudget(firestore!, trip.id, item.id, Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {isOrganizer && (
                <Button variant="outline" className="w-full border-dashed gap-2 h-10 text-muted-foreground hover:text-primary">
                  <Plus className="w-4 h-4" /> Add Item
                </Button>
              )}
            </div>
          </div>
        );
      })}
      <Button className="w-full gap-2 py-6 rounded-2xl text-lg font-bold">
        <Plus className="w-5 h-5" /> Add Day
      </Button>
    </div>
  );
}

function ChecklistTab({ trip, itinerary, isOrganizer }: any) {
  const travelLegs = itinerary?.filter((i: any) => i.category === 'travel') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Preparation</h2>
        {travelLegs.length === 0 && <span className="text-sm text-muted-foreground">No travel legs found.</span>}
      </div>

      {travelLegs.map((leg: any) => (
        <Card key={leg.id} className="bg-card/50 border-border/40 overflow-hidden">
          <div className="bg-secondary/30 p-4 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Train className="w-5 h-5 text-primary" />
              <div>
                <h4 className="font-bold text-sm">{leg.fromLocation || 'Home'} → {leg.toLocation || leg.name}</h4>
                <p className="text-[10px] text-muted-foreground">Day {leg.dayNumber} • {leg.mode || 'Travel'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold">14:30</p>
              <p className="text-[10px] text-muted-foreground uppercase">Departure</p>
            </div>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-border/20">
              {['Tickets Downloaded', 'Hotel Confirmation', 'Local Cash Ready', 'Bags Packed'].map((task, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors">
                  <span className="text-sm">{task}</span>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(status => (
                      <button 
                        key={status}
                        className={cn(
                          "w-5 h-5 rounded-full border-2 transition-all",
                          status === 3 ? "bg-primary border-primary" : 
                          status === 2 ? "bg-amber-500 border-amber-500" : "bg-destructive border-destructive",
                          idx === 0 && status === 3 ? "opacity-100" : "opacity-20 hover:opacity-100"
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SuggestionsTab({ trip, suggestions, session }: any) {
  const { firestore } = useFirestore();
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = async () => {
    if (!link) return;
    await addSuggestion(firestore!, trip.id, {
      link,
      notes,
      addedBy: session?.name || 'Anonymous'
    });
    setLink('');
    setNotes('');
    toast({ title: 'Suggestion added!' });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 space-y-3">
          <Label className="font-bold">Have an idea? 💡</Label>
          <Input placeholder="Paste link (hotel, blog, site)" value={link} onChange={e => setLink(e.target.value)} />
          <Textarea placeholder="Any notes?" value={notes} onChange={e => setNotes(e.target.value)} className="h-20" />
          <Button className="w-full" onClick={handleAdd}>Add Suggestion</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {suggestions?.map((s: any) => (
          <Card key={s.id} className={cn("bg-card/50 border-border/40", s.isAiRecommended && "border-amber-500/50 shadow-lg shadow-amber-500/5")}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold uppercase">
                    {s.addedBy[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{s.addedBy}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(s.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                  </div>
                </div>
                {s.isAiRecommended && <Badge className="bg-amber-500 hover:bg-amber-600 gap-1"><Sparkles className="w-3 h-3" /> AI Pick</Badge>}
              </div>
              <p className="text-sm mb-3">{s.notes}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-2 bg-secondary/30" asChild>
                  <a href={s.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3" /> View Source
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

function PackingTab({ trip, packing, isOrganizer }: any) {
  const { firestore } = useFirestore();
  const [item, setItem] = useState('');
  
  const packedCount = packing?.filter((i: any) => i.isPacked).length || 0;
  const totalItems = packing?.length || 0;
  const progress = totalItems > 0 ? (packedCount / totalItems) * 100 : 0;

  const handleAdd = async () => {
    if (!item) return;
    await addPackingItem(firestore!, trip.id, { name: item });
    setItem('');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 border-border/40">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">{packedCount} of {totalItems} items packed</h3>
            <span className="text-xs font-bold text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex gap-2">
            <Input placeholder="Pack what?" value={item} onChange={e => setItem(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAdd()} />
            <Button size="icon" onClick={handleAdd}><Plus className="w-5 h-5" /></Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {packing?.map((i: any) => (
          <div 
            key={i.id} 
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border border-border/40 transition-all cursor-pointer",
              i.isPacked ? "bg-primary/5 opacity-60" : "bg-card/50"
            )}
            onClick={() => togglePackedStatus(firestore!, trip.id, i.id, i.isPacked)}
          >
            <div className="flex items-center gap-3">
              {i.isPacked ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
              <span className={cn("text-sm", i.isPacked && "line-through")}>{i.name}</span>
            </div>
            {isOrganizer && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); deletePackingItem(firestore!, trip.id, i.id); }}
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

function SummaryTab({ trip, itinerary, isOrganizer }: any) {
  const { firestore } = useFirestore();
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

  return (
    <div className="space-y-8 pb-24">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Total Spent</p>
        <h2 className="text-4xl font-black">₹{totalActual.toLocaleString()}</h2>
        <Badge variant={diff >= 0 ? 'default' : 'destructive'} className="mt-2">
          {diff >= 0 ? `₹${diff.toLocaleString()} under budget` : `₹${Math.abs(diff).toLocaleString()} over budget`}
        </Badge>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px' }} />
            <Legend />
            <Bar dataKey="planned" fill="#334155" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" fill="#0D9488" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold flex items-center gap-2"><Users className="w-5 h-5" /> The Gang</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(trip.members || {}).map(([id, role]: any) => (
            <div key={id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                {id[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold truncate">Member</p>
                <p className="text-[10px] text-muted-foreground uppercase">{role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-4">
        <Button variant="outline" className="w-full gap-2 py-6 rounded-2xl">
          <Share2 className="w-5 h-5" /> Share Itinerary
        </Button>
        {isOrganizer && trip.status !== 'Completed' && (
          <Button 
            className="w-full gap-2 py-6 rounded-2xl bg-primary hover:bg-primary/90"
            onClick={async () => {
              await markTripComplete(firestore!, trip.id);
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

import { Users } from 'lucide-react';
