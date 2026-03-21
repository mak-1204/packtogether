
import { Map, Banknote, Bot } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Map,
    title: "Plan Together",
    description: "Everyone sees the itinerary. No more 'what's the plan?' messages from your forgetful friends."
  },
  {
    icon: Banknote,
    title: "Track the Budget",
    description: "Planned vs actual. Every rupee. Every day. Split expenses easily and avoid awkward money talks."
  },
  {
    icon: Bot,
    title: "AI Picks the Best Stay",
    description: "Paste your hotel options. Let AI analyze reviews and preferences to settle the group argument."
  }
];

export default function Features() {
  return (
    <section className="py-24 px-6 md:px-12 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-card border-none shadow-xl hover:shadow-primary/5 transition-all duration-300 group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4 font-headline text-white">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
