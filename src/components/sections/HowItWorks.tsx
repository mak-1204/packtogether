
import { PartyPopper, Link2, ListChecks, Plane } from 'lucide-react';

const steps = [
  {
    icon: PartyPopper,
    title: "Create Your Trip",
    description: "Start a new trip plan with your destination and dates in seconds."
  },
  {
    icon: Link2,
    title: "Invite Your Gang",
    description: "Share a simple link. Friends can join and collaborate without an account."
  },
  {
    icon: ListChecks,
    title: "Plan & Decide",
    description: "Collaborate on the itinerary, suggestions, and shared packing list."
  },
  {
    icon: Plane,
    title: "Travel Together",
    description: "Track expenses, check off lists, and enjoy the journey without the stress."
  }
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-6 md:px-12 bg-secondary/30 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-black text-center mb-16 font-headline tracking-tight">How it works</h2>
        
        <div className="relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 z-0" />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center group">
                <div className="relative mb-8">
                  {/* Step Number Circle */}
                  <div className="w-16 h-16 rounded-full bg-background border-4 border-primary flex items-center justify-center shadow-2xl relative z-10 group-hover:bg-primary transition-colors duration-300">
                    <span className="text-xl font-black text-white group-hover:text-primary-foreground">{index + 1}</span>
                  </div>
                  {/* Step Icon Label */}
                  <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-accent flex items-center justify-center border-4 border-background shadow-lg group-hover:rotate-12 transition-transform">
                    <step.icon className="w-5 h-5 text-accent-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 font-headline text-white">{step.title}</h3>
                <p className="text-muted-foreground text-sm max-w-[200px]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
