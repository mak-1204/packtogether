'use client';

import { useState } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Compass, Loader2, Smartphone, ArrowRight, User, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AuthPage() {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'mobile' | 'login' | 'signup'>('mobile');
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  // Helper to treat mobile as pseudo-email for Firebase Password Auth
  const getPseudoEmail = (m: string) => `${m.replace(/\D/g, '')}@packtogether.app`;

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length < 10) {
      toast({ variant: 'destructive', title: 'Invalid Mobile', description: 'Please enter a valid 10-digit number.' });
      return;
    }

    setIsLoading(true);
    try {
      const email = getPseudoEmail(mobile);
      // Check if user exists
      const userDoc = await getDoc(doc(firestore, 'users_by_mobile', mobile));
      
      if (userDoc.exists()) {
        setStep('login');
      } else {
        setStep('signup');
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong. Try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, getPseudoEmail(mobile), password);
      toast({ title: 'Welcome back!' });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Failed', description: 'Incorrect password or network error.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || password.length < 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'Name required and password must be 6+ characters.' });
      return;
    }

    setIsLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, getPseudoEmail(mobile), password);
      // Create profile
      await setDoc(doc(firestore, 'users', credential.user.uid), {
        id: credential.user.uid,
        firstName: name,
        mobile: mobile,
        createdAt: new Date().toISOString()
      });
      // Also store by mobile for the "check if exists" step
      await setDoc(doc(firestore, 'users_by_mobile', mobile), {
        uid: credential.user.uid
      });

      toast({ title: 'Account created!', description: 'Adventure awaits.' });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Signup Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 relative">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 group text-zinc-400 hover:text-white transition-colors">
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold uppercase tracking-widest">Back to Home</span>
      </Link>

      <Link href="/" className="mb-12 flex items-center gap-2">
        <Compass className="w-12 h-12 text-[#0D9488]" />
        <span className="text-3xl font-black tracking-tighter text-white">PackTogether</span>
      </Link>

      <Card className="max-w-[400px] w-full border-white/5 bg-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="pt-10 text-center">
          <CardTitle className="text-3xl font-black text-white tracking-tight">
            {step === 'mobile' ? 'Welcome 👋' : step === 'login' ? 'Welcome back!' : 'Create Account'}
          </CardTitle>
          <p className="text-zinc-500 text-xs mt-2 uppercase font-black tracking-widest">
            {step === 'mobile' ? 'Enter your mobile to start' : mobile}
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-10 pt-6">
          {step === 'mobile' && (
            <form onSubmit={handleNext} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-zinc-400 font-bold ml-1 uppercase text-[10px] tracking-widest">Mobile Number</Label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0D9488]" />
                  <Input 
                    type="tel"
                    className="pl-12 bg-black/20 border-white/10 h-14 rounded-2xl focus:border-[#0D9488] text-white text-lg" 
                    placeholder="9876543210" 
                    value={mobile} 
                    onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                    required 
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-16 bg-[#0D9488] hover:bg-[#0D9488]/90 text-white text-xl font-black rounded-2xl shadow-xl shadow-[#0D9488]/20 transition-all active:scale-95" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <>Continue <ArrowRight className="ml-2 w-5 h-5" /></>}
              </Button>
            </form>
          )}

          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-zinc-400 font-bold ml-1 uppercase text-[10px] tracking-widest">Enter Password</Label>
                <Input 
                  type="password"
                  className="bg-black/20 border-white/10 h-14 rounded-2xl focus:border-[#0D9488] text-white text-lg" 
                  placeholder="••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full h-16 bg-[#0D9488] hover:bg-[#0D9488]/90 text-white text-xl font-black rounded-2xl shadow-xl shadow-[#0D9488]/20 transition-all active:scale-95" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Log In'}
              </Button>
              <button type="button" onClick={() => setStep('mobile')} className="w-full text-center text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
                Use different number
              </button>
            </form>
          )}

          {step === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400 font-bold ml-1 uppercase text-[10px] tracking-widest">Your Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0D9488]" />
                    <Input 
                      className="pl-12 bg-black/20 border-white/10 h-14 rounded-2xl focus:border-[#0D9488] text-white text-lg" 
                      placeholder="e.g. John Doe" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 font-bold ml-1 uppercase text-[10px] tracking-widest">Create Password</Label>
                  <Input 
                    type="password"
                    className="bg-black/20 border-white/10 h-14 rounded-2xl focus:border-[#0D9488] text-white text-lg" 
                    placeholder="Min 6 characters" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-16 bg-[#0D9488] hover:bg-[#0D9488]/90 text-white text-xl font-black rounded-2xl shadow-xl shadow-[#0D9488]/20 transition-all active:scale-95" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Start Your Journey'}
              </Button>
              <button type="button" onClick={() => setStep('mobile')} className="w-full text-center text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
                Back
              </button>
            </form>
          )}
        </CardContent>
      </Card>
      
      <p className="mt-8 text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">
        Secured by PackTogether Auth System
      </p>
    </div>
  );
}
