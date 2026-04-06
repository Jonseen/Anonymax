import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Ghost, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { CellMessage } from '../services/cellService';
import { compressImage } from '../lib/imageCompression';
import { 
  sendCellMessage, 
  subscribeToCellMessages, 
  updateCellPresence, 
  removeCellPresence, 
  subscribeToCellPresence
} from '../services/cellService';
import toast from 'react-hot-toast';

// Generate a random ghost ID if one doesn't exist for this session
const getGhostAlias = (roomId: string) => {
  const sessionKey = `anonymax_ghost_${roomId}`;
  let alias = sessionStorage.getItem(sessionKey);
  if (!alias) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomHex = Array.from({ length: 4 })
      .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
      .join('');
    alias = `Ghost_[${randomHex}]`;
    sessionStorage.setItem(sessionKey, alias);
  }
  return alias;
};

export const RoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<CellMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [ghostAlias, setGhostAlias] = useState('');
  const [ghostCount, setGhostCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    
    const alias = getGhostAlias(roomId);
    setGhostAlias(alias);
    
    updateCellPresence(roomId, alias);

    const unsubMessages = subscribeToCellMessages(roomId, (msgs) => {
      setMessages(msgs);
    });

    const unsubPresence = subscribeToCellPresence(roomId, (count) => {
      setGhostCount(count);
    });

    const presenceInterval = setInterval(() => {
      updateCellPresence(roomId, alias);
    }, 60000); // Heartbeat every 1m

    return () => {
      unsubMessages();
      unsubPresence();
      clearInterval(presenceInterval);
      removeCellPresence(roomId, alias);
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress the image before setting it
      const compressedFile = await compressImage(file, 1200, 0.85);
      setImage(compressedFile);
      setImagePreview(URL.createObjectURL(compressedFile));
    } catch (err) {
      toast.error('Failed to parse and compress image');
    }
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBroadcast = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputValue.trim() && !image) || isSubmitting || !roomId) return;

    setIsSubmitting(true);
    const pendingText = inputValue.trim();
    const pendingImage = image;
    
    setInputValue('');
    clearImage();
    
    try {
      await sendCellMessage(
        roomId, 
        ghostAlias, 
        pendingText, 
        pendingImage,
        (progress) => setUploadProgress(progress)
      );
    } catch (err) {
      console.error(err);
      toast.error('Transmission failed.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="w-full flex-1 h-[calc(100vh-60px)] flex flex-col bg-[#0d0f0e] relative overflow-hidden font-mono">
      {/* Background layer */}
      <div className="absolute inset-0 bg-noise mix-blend-overlay opacity-20 pointer-events-none"></div>

      {/* Top Bar */}
      <header className="flex-none p-4 border-b border-[#1a2922] bg-[#111815] relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/cells')}
            className="text-muted hover:text-[#3ecfa0] transition-colors flex items-center justify-center p-2 border border-transparent hover:border-[#3ecfa0]/30 rounded bg-[#111815]"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex flex-col">
            <h1 className="text-primary font-bold tracking-widest uppercase">
              {roomId?.replace('_', ' ')}
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse-glow shadow-[0_0_5px_#22c55e]"></span>
              <span className="text-muted text-[10px] tracking-widest uppercase">
                transmitting
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border border-[#1a2922] px-3 py-1.5 bg-[#0d0f0e]">
          <Ghost size={14} className="text-[#3ecfa0]" />
          <span className="text-[#3ecfa0] font-bold text-xs">{ghostCount}</span>
        </div>
      </header>

      {/* Expanded Image Modal */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d0f0e]/90 backdrop-blur-sm cursor-zoom-out"
          >
            <img 
              src={expandedImage} 
              className="max-w-full max-h-[90vh] object-contain border border-[#3ecfa0]/50 shadow-[0_0_30px_rgba(62,207,160,0.2)]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message List Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 relative z-10 flex flex-col">
        {/* Spacer to push messages to bottom if container isn't full */}
        <div className="flex-1 min-h-0"></div>
        
        {messages.map((msg) => {
          const isMe = msg.ghostId === ghostAlias;
          const msgTime = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date();
          
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-xs font-bold tracking-wider ${isMe ? 'text-[#3ecfa0]' : 'text-primary'}`}>
                  {msg.ghostId}
                </span>
                <span className="text-[10px] text-muted">
                  {format(msgTime, 'HH:mm')}
                </span>
              </div>
              <div className={`
                max-w-[85%] md:max-w-[70%] text-sm leading-relaxed
                ${isMe 
                  ? 'bg-[#3ecfa0]/10 border border-[#3ecfa0]/30 text-primary rounded-l rounded-br' 
                  : 'bg-[#111815] border border-[#1a2922] text-primary rounded-r rounded-bl'}
              `}>
                {msg.imageUrl && (
                  <div 
                    className="w-full max-h-[200px] bg-black overflow-hidden cursor-zoom-in relative"
                    onClick={() => setExpandedImage(msg.imageUrl!)}
                  >
                    <img 
                      src={msg.imageUrl} 
                      className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                    />
                  </div>
                )}
                {msg.text && (
                  <div className="p-3 whitespace-pre-wrap">{msg.text}</div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="flex-none p-4 border-t border-[#1a2922] bg-[#111815] relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-muted mb-2 tracking-widest">
          <span>YOUR ALIAS: <span className="text-[#3ecfa0]">{ghostAlias}</span></span>
          <span>SECURE CHANNEL</span>
        </div>
        
        <AnimatePresence>
          {imagePreview && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-4xl mx-auto mb-2"
            >
              <div className="relative inline-block border border-[#3ecfa0]/30">
                <img src={imagePreview} className="h-24 w-auto object-cover opacity-80" />
                <button
                  onClick={clearImage}
                  className="absolute top-1 right-1 bg-void/80 backdrop-blur-sm border border-danger/50 p-1 hover:bg-danger text-danger hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleBroadcast} className="max-w-4xl mx-auto flex gap-3">
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
            className="flex items-center justify-center p-3 border border-[#1a2922] bg-[#0d0f0e] text-[#4a5e55] hover:text-[#3ecfa0] hover:border-[#3ecfa0]/50 transition-colors cursor-pointer"
          >
            <ImageIcon size={18} />
          </button>
          
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 bg-[#0d0f0e] border border-[#1a2922] p-3 text-[#c8d4ce] placeholder-[#4a5e55] focus:outline-none focus:border-[#3ecfa0]/50 transition-colors"
            placeholder="transmit into the void..."
            autoFocus
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={(!inputValue.trim() && !imagePreview) || isSubmitting}
            className="bg-transparent border border-[#3ecfa0] text-[#3ecfa0] hover:bg-[#3ecfa0]/10 px-6 py-3 font-bold tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadProgress !== null && <span>{Math.round(uploadProgress)}%</span>}
              </div>
            ) : (
              <Send size={16} />
            )}
            <span className="hidden sm:inline">Broadcast</span>
          </button>
        </form>
      </div>
    </div>
  );
};
