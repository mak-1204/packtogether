
'use client';

import { useState } from 'react';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, User, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function EmailJoinPage() {
  const { tripId } = useParams() as { tripId: string };
  const [isSignUp, setIsSignUp] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
        toast({ title: 'Account created!' });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Welcome back!' });
      }
      router.push(`/join/${tripId}`);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Auth Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4">
      <Link href={`/join/${tripId}`} className="mb-8 flex items-center gap-2 group text-zinc-400 hover:text-white transition-colors">
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold uppercase tracking-widest">Back</span>
      </Link>

      <Card className="max-w-[400px] w-full border-white/5 bg-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="pt-10 text-center">
          <CardTitle className="text-2xl font-black text-white tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome back'}
          </CardTitle>
          <p className="text-zinc-500 text-[10px] mt-2 uppercase font-black tracking-widest leading-relaxed">
            Join the gang on PackTogether
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-10 pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label className="text-zinc-500 font-black uppercase text-[10px] tracking-widest ml-1">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0D9488]" />
                  <Input 
                    className="pl-12 bg-black/20 border-white/10 h-14 rounded-2xl focus:border-[#0D9488] text-white" 
                    placeholder="e.g. John Doe" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-zinc-500 font-black uppercase text-[10px] tracking-widest ml-1">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0D9488]" />
                <Input 
                  type="email"
                  className="pl-12 bg-black/20 border-white/10 h-14 rounded-2xl focus:border-[#0D9488] text-white" 
                  placeholder="name@email.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-500 font-black uppercase text-[10px] tracking-widest ml-1">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0D9488]" />
                <Input 
                  type="password"
                  className="pl-12 bg-black/20 border-white/10 h-14 rounded-2xl focus:border-[#0D9488] text-white" 
                  placeholder="••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-16 bg-[#0D9488] hover:bg-[#0D9488]/90 text-white text-xl font-black rounded-2xl shadow-xl shadow-[#0D9488]/20 transition-all active:scale-95" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : isSignUp ? 'Join Trip' : 'Sign In'}
            </Button>
            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-center text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
