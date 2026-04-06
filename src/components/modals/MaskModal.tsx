import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, Eye, Skull, Fingerprint, Scan, Radio, Crosshair, Aperture, X } from 'lucide-react';
import { useAuth } from '../../store/authStore';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export const MASK_ICONS: Record<string, any> = {
  ghost: Ghost,
  eye: Eye,
  skull: Skull,
  fingerprint: Fingerprint,
  scan: Scan,
  radio: Radio,
  crosshair: Crosshair,
  aperture: Aperture,
};

export const MaskModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { user } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const updateMask = async (maskName: string) => {
    if (!user) return;
    
    toast.success('Equipping mask...');
    onClose();

    try {
      await setDoc(doc(db, 'users', user.uid), { mask: maskName }, { merge: true });
    } catch (e) {
      toast.error('Failed to swap mask state.');
      console.error(e);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-void/80 backdrop-blur-sm cursor-pointer" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[400px] z-10 bg-surface border border-primary/30 p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] font-mono"
          >
            <button 
               onClick={onClose}
               className="absolute top-4 right-4 text-muted hover:text-primary transition-colors"
            >
               <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-black text-brandText tracking-widest uppercase mb-6 text-center">Change Your Mask</h2>
            
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(MASK_ICONS).map(([name, Icon]) => (
                <button
                  key={name}
                  onClick={() => updateMask(name)}
                  className="aspect-square flex flex-col items-center justify-center gap-2 border border-ghost hover:border-primary/80 bg-void text-muted hover:text-primary transition-all group relative"
                >
                  <Icon className="w-6 h-6 group-hover:drop-shadow-[0_0_5px_var(--accent-primary)] transition-all" strokeWidth={1.5} />
                </button>
              ))}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
