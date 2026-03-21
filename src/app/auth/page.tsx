
'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Compass, Loader2, ArrowRight, User, ArrowLeft, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({ title: 'Welcome!' });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
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
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Auth Failed', description: error.message });
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
            {isSignUp ? 'Create Account' : 'Welcome back!'}
          </CardTitle>
          <p className="text-zinc-500 text-[10px] mt-2 uppercase font-black tracking-widest leading-relaxed">
            Your Gang. One Plan.
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-10 pt-6 space-y-6">
          <Button 
            onClick={handleGoogleSignIn}
            className="w-full h-14 bg-white hover:bg-zinc-100 text-zinc-900 font-bold rounded-2xl gap-3 text-lg"
            disabled={isLoading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81.42z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black text-zinc-500 bg-[#0F172A] px-2">or</div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
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
              <Input 
                type="password"
                className="bg-black/20 border-white/10 h-14 rounded-2xl focus:border-[#0D9488] text-white" 
                placeholder="••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
            <Button type="submit" className="w-full h-16 bg-[#0D9488] hover:bg-[#0D9488]/90 text-white text-xl font-black rounded-2xl shadow-xl shadow-[#0D9488]/20 transition-all" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : isSignUp ? 'Create Account' : 'Log In'}
            </Button>
            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-center text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
            >
              {isSignUp ? 'Already have an account? Log in' : 'New here? Create an account'}
            </button>
          </form>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">
        Secured by PackTogether Identity System
      </p>
    </div>
  );
}
