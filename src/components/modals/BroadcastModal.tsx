import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PostComposer } from '../feed/PostComposer';
import { X } from 'lucide-react';

export const BroadcastModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
            className="relative w-full max-w-[600px] z-10 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
          >
            <button 
               onClick={onClose}
               className="absolute -top-12 right-0 text-muted hover:text-primary transition-colors p-2"
            >
               <X className="w-6 h-6" />
            </button>
            <PostComposer onSuccess={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
