import { PartyPopper, Link2, ListChecks, Plane } from 'lucide-react';

const steps = [
  {
    icon: PartyPopper,
    title: "Create Your Trip",
    description: "Start a new trip plan with your destination and dates."
  },
  {
    icon: Link2,
    title: "Invite Your Gang",
    description: "Share a simple link. Friends can join without an account."
  },
  {
    icon: ListChecks,
    title: "Plan & Decide",
    description: "Collaborate on the itinerary, suggestions, and packing list."
  },
  {
    icon: Plane,
    title: "Travel Together",
    description: "Track expenses, check off lists, and enjoy the journey."
  }
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-6 md:px-12 bg-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black mb-4 font-headline tracking-tight text-white">How It Works</h2>
          <p className="text-muted-foreground text-lg">Four easy steps to a perfectly planned group trip.</p>
        </div>
        
        <div className="relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-[108px] left-[12.5%] w-[75%] h-0.5 bg-border z-0" />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center group">
                {/* Icon Above Line */}
                <div className="mb-6">
                  <step.icon className="w-10 h-10 text-primary" />
                </div>

                {/* Step Number Circle on Line */}
                <div className="w-12 h-12 rounded-full bg-background border-2 border-primary flex items-center justify-center mb-8 shadow-2xl relative z-10 group-hover:bg-primary transition-colors duration-300">
                  <span className="text-lg font-black text-primary group-hover:text-primary-foreground">{index + 1}</span>
                </div>

                <h3 className="text-xl font-bold mb-3 font-headline text-white">{step.title}</h3>
                <p className="text-muted-foreground text-sm max-w-[200px] leading-relaxed">
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
