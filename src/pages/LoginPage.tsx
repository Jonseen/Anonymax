import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ghostLoading, setGhostLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Enter your credentials');
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGhostLogin = async () => {
    setGhostLoading(true);
    try {
      await signInAnonymously(auth);
      navigate('/');
    } catch (error: any) {
      toast.error('The void rejected you. Try again.');
    } finally {
      setGhostLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 relative z-10">
      <div className="w-full max-w-md space-y-12">
        
        {/* Logo */}
        <div className="flex justify-center">
          <div className="bg-brandText text-background px-3 py-1 inline-block">
            <h1 className="font-mono font-black text-2xl tracking-[0.3em] uppercase">Anonymax</h1>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleEmailLogin} className="space-y-8">
          <div className="space-y-6">
            <div className="relative">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Identification (Email)"
                className="w-full bg-transparent border-b border-ghost focus:border-primary outline-none text-brandText py-3 transition-colors font-mono text-sm placeholder:text-muted"
                required
              />
            </div>
            <div className="relative">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passphrase"
                className="w-full bg-transparent border-b border-ghost focus:border-primary outline-none text-brandText py-3 transition-colors font-mono text-sm placeholder:text-muted"
                required
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading || ghostLoading}
            whileHover={{ boxShadow: "0 0 15px var(--accent-primary)" }}
            className="w-full bg-elevated text-primary border border-primary/20 hover:border-primary/50 py-3 font-mono text-sm font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Sign In'}
          </motion.button>
        </form>

        <div className="space-y-6 pt-4 border-t border-ghost/50">
          <motion.button
            type="button"
            onClick={handleGhostLogin}
            disabled={loading || ghostLoading}
            whileHover={{ backgroundColor: "var(--accent-ghost)" }}
            className="w-full bg-transparent text-muted hover:text-brandText py-3 font-mono text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 border border-ghost/50"
          >
            {ghostLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Continue as Ghost'}
          </motion.button>

          <div className="text-center">
            <Link to="/register" className="text-muted hover:text-primary font-mono text-xs transition-colors">
              Join the void →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
