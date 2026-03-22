import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { 
  Loader2, 
  Ghost, 
  Eye, 
  Skull, 
  Fingerprint, 
  VenetianMask, 
  Hexagon, 
  CircleDashed, 
  Triangle 
} from 'lucide-react';
import toast from 'react-hot-toast';

const MASKS = [
  { id: 'ghost', icon: Ghost },
  { id: 'eye', icon: Eye },
  { id: 'skull', icon: Skull },
  { id: 'fingerprint', icon: Fingerprint },
  { id: 'venetian', icon: VenetianMask },
  { id: 'hexagon', icon: Hexagon },
  { id: 'circle', icon: CircleDashed },
  { id: 'triangle', icon: Triangle },
];

export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedMask, setSelectedMask] = useState('ghost');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error('Passphrases do not match');
    if (!email || !password) return toast.error('Complete all fields');
    
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Store user avatar choice in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        mask: selectedMask,
        createdAt: new Date().toISOString(),
        isAnonymous: false,
      });

      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to enter the void');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 relative z-10">
      <div className="w-full max-w-md space-y-10 py-10">
        
        {/* Logo */}
        <div className="flex justify-center">
           <Link to="/login" className="bg-brandText text-background px-3 py-1 inline-block hover:opacity-80 transition-opacity">
            <h1 className="font-mono font-black text-2xl tracking-[0.3em] uppercase">Anonymax</h1>
          </Link>
        </div>

        <form onSubmit={handleRegister} className="space-y-8">
          <div className="space-y-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Identification (Email)"
              className="w-full bg-transparent border-b border-ghost focus:border-primary outline-none text-brandText py-3 transition-colors font-mono text-sm placeholder:text-muted"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passphrase"
              className="w-full bg-transparent border-b border-ghost focus:border-primary outline-none text-brandText py-3 transition-colors font-mono text-sm placeholder:text-muted"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Passphrase"
              className="w-full bg-transparent border-b border-ghost focus:border-primary outline-none text-brandText py-3 transition-colors font-mono text-sm placeholder:text-muted"
              required
            />
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="font-mono text-xs text-muted tracking-widest uppercase text-center">Pick your mask</h3>
            <div className="grid grid-cols-4 gap-4">
              {MASKS.map((mask) => {
                const Icon = mask.icon;
                const isSelected = selectedMask === mask.id;
                return (
                  <button
                    key={mask.id}
                    type="button"
                    onClick={() => setSelectedMask(mask.id)}
                    className={`aspect-square flex items-center justify-center border transition-all ${
                      isSelected 
                        ? 'border-primary text-primary bg-primary/10 shadow-[0_0_10px_var(--accent-primary)]' 
                        : 'border-ghost text-muted hover:text-brandText hover:border-ghost/80'
                    }`}
                  >
                    <Icon className="w-6 h-6" strokeWidth={1.5} />
                  </button>
                );
              })}
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ boxShadow: "0 0 15px var(--danger)" }}
            className="w-full bg-elevated text-danger border border-danger/20 hover:border-danger/50 py-3 mt-6 font-mono text-sm font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Enter the Void'}
          </motion.button>
        </form>

        <div className="text-center">
          <Link to="/login" className="text-muted hover:text-brandText font-mono text-xs transition-colors">
            ← Return
          </Link>
        </div>
      </div>
    </div>
  );
};
