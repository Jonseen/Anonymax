import React, { useState, useRef } from 'react';
import { useAuth } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createPost } from '../../services/postService';
import { useUIStore } from '../../store/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Loader2, X, Eye, Ghost, Skull, Fingerprint, Scan, Radio, Crosshair, Aperture
} from 'lucide-react';
import toast from 'react-hot-toast';

const MASK_ICONS: Record<string, any> = {
  ghost: Ghost,
  eye: Eye,
  skull: Skull,
  fingerprint: Fingerprint,
  scan: Scan,
  radio: Radio,
  crosshair: Crosshair,
  aperture: Aperture,
};

export const PostComposer = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { user, userProfile } = useAuth();
  const { quoteData, closeBroadcastModal } = useUIStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_CHARS = 500;

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Signal too large (Max 5MB)');
    }

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRelease = async () => {
    if ((!content.trim() && !image) || isSubmitting) return;

    if (!user) {
      toast.error('Authentication lost. Re-link required.');
      navigate('/login');
      return;
    }

    setIsSubmitting(true);

    try {
      const authorMask = userProfile?.mask || userProfile?.maskIcon || 'ghost';

      // IMMEDIATELY RESET UI STATE FOR OPTIMISTIC RESPONSIVENESS
      const pendingContent = content.trim();
      const pendingImage = image;
      setContent('');
      clearImage();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      toast.success('Signal transmitting...');
      setIsSubmitting(false);
      if (onSuccess) onSuccess();

      // EXECUTE WRITE IN BACKGROUND (Cloudinary upload + Firestore write)
      await createPost(
        user.uid,
        pendingContent,
        pendingImage,
        'everyone',
        authorMask,
        (progress) => setUploadProgress(progress),
        quoteData?.id || null
      );

      setUploadProgress(null);
      closeBroadcastModal();

      // INVALIDATE ANY MOUNTED CACHES TO REVEAL NEW POST
      queryClient.invalidateQueries({ queryKey: ['posts'] });

    } catch (error) {
      toast.error('Signal lost. Network error detected.');
      console.error('Broadcast failed:', error);
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const Mask = MASK_ICONS[userProfile?.mask || 'ghost'] || Ghost;

  return (
    <motion.div
      className={`w-full bg-surface border transition-colors duration-300 p-5 ${isFocused ? 'border-primary/50 shadow-[0_0_20px_var(--bg-void)]' : 'border-ghost'
        }`}
    >
      <div className="flex gap-4">

        <div className="w-10 h-10 bg-void flex items-center justify-center border border-primary/20 flex-shrink-0 relative mt-1">
          <Mask className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#22c55e] rounded-full border-2 border-surface animate-pulse"></div>
        </div>

        <div className="flex-1 min-w-0">
          {quoteData && (
            <div className="mb-4 bg-void border border-primary/20 p-3 rounded-sm relative group overflow-hidden">
              <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay pointer-events-none"></div>
              <div className="flex justify-between items-start mb-2 relative z-10">
                <span className="text-[9px] font-bold tracking-[0.1em] text-primary uppercase">QUOTING SIGNAL_{quoteData.id.slice(0, 4).toUpperCase()}</span>
                <button onClick={closeBroadcastModal} className="text-muted hover:text-danger"><X className="w-3 h-3" /></button>
              </div>
              {quoteData.imageUrl && (
                <div className="w-16 h-16 float-right ml-3 mb-1 bg-void border border-ghost overflow-hidden relative z-10">
                  <img src={quoteData.imageUrl} className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-xs text-brandText/80 font-sans line-clamp-2 relative z-10">
                {quoteData.content}
              </p>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={quoteData ? "ADD YOUR ENCRYPTION..." : "SPEAK INTO THE VOID..."}
            maxLength={MAX_CHARS}
            className="w-full bg-void border border-ghost p-4 text-sm font-sans text-brandText placeholder:text-muted/60 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all resize-none min-h-[100px]"
            disabled={isSubmitting}
          />

          <AnimatePresence>
            {imagePreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative mt-4 mb-2 overflow-hidden border border-primary/30"
              >
                <img src={imagePreview} alt="Encryption Preview" className="w-full h-auto max-h-[300px] object-cover filter contrast-125 brightness-90 transition-all" />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-void/80 backdrop-blur-sm border border-danger/50 p-1.5 hover:bg-danger text-danger hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-3 mt-4">
            {/* Row 1: Action buttons */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-[0.1em] text-muted hover:text-primary transition-colors py-2 px-2.5 hover:bg-primary/5 border border-transparent hover:border-primary/20"
              >
                <ImageIcon className="w-4 h-4 flex-shrink-0" /> ATTACH
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-[0.1em] text-muted hover:text-brandText transition-colors py-2 px-2.5 hover:bg-ghost border border-transparent hover:border-ghost/80"
              >
                <Radio className="w-4 h-4 flex-shrink-0" /> LIVE
              </button>
            </div>

            {/* Row 2: Char count + Broadcast */}
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono tracking-widest ${content.length > MAX_CHARS - 50 ? 'text-danger' : 'text-muted'
                }`}>
                {content.length}/{MAX_CHARS}
              </span>

              <button
                onClick={handleRelease}
                disabled={isSubmitting || (!content.trim() && !imagePreview)}
                className="bg-void border border-primary text-primary px-6 py-2 font-mono font-bold text-[10px] tracking-[0.15em] hover:bg-primary hover:text-void transition-all disabled:opacity-50 disabled:hover:bg-void disabled:hover:text-primary animate-pulse-glow flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  uploadProgress !== null
                    ? `${uploadProgress}%`
                    : <><Loader2 className="w-4 h-4 animate-spin" /> SENDING</>
                ) : 'BROADCAST'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
