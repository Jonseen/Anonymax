import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useAuth } from '../../store/authStore';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { 
  Ghost, Skull, Fingerprint, Scan, Radio, Crosshair, Aperture, Eye as EyeIcon, MessageSquare, Send
} from 'lucide-react';
import toast from 'react-hot-toast';

const MASK_ICONS: Record<string, any> = {
  ghost: Ghost,
  eye: EyeIcon,
  skull: Skull,
  fingerprint: Fingerprint,
  scan: Scan,
  radio: Radio,
  crosshair: Crosshair,
  aperture: Aperture,
};

export interface CommentData {
  id: string;
  authorId: string;
  authorMask: string;
  content: string;
  createdAt: any;
  likeCount: number;
  replyToId: string | null;
}

export const CommentSection = ({ postId }: { postId: string }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [content, setContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time comments listener
  useEffect(() => {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc') // Oldest first matches general threaded forum/feed style
    );
    
    // Start listening
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // For optimistic update during creation where latency might miss serverTimestamp
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommentData));
      setComments(fetched);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;
    setIsSubmitting(true);

    // Fallback mask if not populated dynamically earlier
    const userMask = 'ghost'; // Hardcoded fallback; usually fetch from authStore/doc if possible

    try {
      // 1. Commit exactly 1 layer deep for replies
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        authorId: user.uid,
        authorMask: userMask,
        content: content.trim(),
        createdAt: serverTimestamp(),
        likeCount: 0,
        replyToId: replyingTo ? replyingTo.id : null
      });

      // 2. Increment comment count explicitly on the parent Post document
      await updateDoc(doc(db, 'posts', postId), {
        commentCount: increment(1)
      });

      setContent('');
      setReplyingTo(null);
    } catch (error) {
      toast.error('Failed to echo into the void');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const CommentItem = ({ comment, isReply = false }: { comment: CommentData, isReply?: boolean }) => {
    const MaskIcon = MASK_ICONS[comment.authorMask] || Ghost;
    const shortUid = comment.authorId.slice(-5).toUpperCase();
    const username = `Ghost_${shortUid}`;
    
    // Protect against optimistic latency (null timestamp directly after submit)
    const timeString = comment.createdAt?.toDate 
        ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) 
        : 'just now';

    const handleReplyClick = () => {
      // If we are already replying to a reply, clamp it to 1 level depth
      setReplyingTo({ id: isReply ? (comment.replyToId as string) : comment.id, name: username });
      inputRef.current?.focus();
    };

    return (
      <div className={`flex gap-3 relative ${isReply ? 'ml-8 mt-3 pl-3' : 'mt-5'}`}>
        
        {/* Subtle reply thread styling */}
        {isReply && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-ghost/30"></div>}

        <div className="bg-void p-1.5 h-fit border border-ghost/40 flex-shrink-0">
          <MaskIcon className="w-3 h-3 text-muted" />
        </div>
        
        <div className="flex-1 flex flex-col font-mono w-full overflow-hidden">
          <div className="flex items-baseline justify-between w-full">
            <span className="text-brandText text-xs font-bold tracking-widest uppercase">{username}</span>
            <span className="text-muted text-[9px] uppercase tracking-widest text-right flex-shrink-0 ml-2">{timeString}</span>
          </div>
          
          <p className="text-brandText/80 text-xs mt-1.5 leading-relaxed break-words whitespace-pre-wrap">{comment.content}</p>
          
          <div className="flex items-center gap-4 mt-2">
            <button className="flex items-center gap-1.5 text-[10px] text-muted hover:text-primary transition-colors uppercase tracking-widest font-bold">
               <EyeIcon className="w-3 h-3" />
               <span>{comment.likeCount || 0}</span>
            </button>
            <button 
              onClick={handleReplyClick}
              className="flex items-center gap-1.5 text-[10px] text-muted hover:text-brandText transition-colors uppercase tracking-widest font-bold"
            >
               <MessageSquare className="w-3 h-3" />
               <span>Reply</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Pre-process grouping mappings
  const mainComments = comments.filter(c => !c.replyToId);
  const replies = comments.filter(c => c.replyToId);

  return (
    <div className="w-full pb-32 md:pb-24 relative flex flex-col">
      <div className="p-5 bg-surface/40 border border-ghost/20 min-h-[200px]">
        <h3 className="font-mono text-xs text-primary uppercase tracking-widest border-b border-primary/20 pb-3 mb-4">
            Echoes ({comments.length})
        </h3>
        
        {mainComments.length === 0 && (
          <p className="font-mono text-xs text-muted text-center py-10 italic uppercase tracking-widest opacity-50">
            The void is silent...
          </p>
        )}

        {/* Mapped Threads */}
        <div className="space-y-4">
            {mainComments.map((comment, index) => (
            <motion.div 
                key={comment.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
            >
                <CommentItem comment={comment} />
                
                {/* Recursively match 1 layer deep */}
                {replies.filter(r => r.replyToId === comment.id).map(reply => (
                <CommentItem key={reply.id} comment={reply} isReply />
                ))}
            </motion.div>
            ))}
        </div>
      </div>

      {/* Sticky Bottom Input Layer */}
      <div className="fixed md:absolute bottom-[64px] md:bottom-0 left-0 right-0 md:left-auto md:right-auto bg-surface/95 md:bg-void glass-blur md:border-t md:border-ghost/50 border-t border-primary/20 p-3 z-40 max-w-[680px] w-full mx-auto font-mono">
        {replyingTo && (
          <div className="flex items-center justify-between mb-2 px-2 border-b border-ghost/40 pb-2">
            <span className="text-[10px] text-primary uppercase tracking-widest">
                <span className="text-muted">Replying to:</span> {replyingTo.name}
            </span>
            <button onClick={() => setReplyingTo(null)} className="text-[10px] text-muted hover:text-danger uppercase tracking-widest transition-colors font-bold">
                Abort
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            placeholder={replyingTo ? "Transmit reply..." : "Echo into the void..."}
            className="flex-1 bg-void md:bg-surface border border-ghost/50 text-xs px-3 py-3 text-brandText placeholder:text-muted/50 focus:outline-none focus:border-primary/50 transition-colors shadow-inner"
          />
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="bg-primary/10 border border-primary/30 text-primary px-5 hover:bg-primary hover:text-void hover:shadow-[0_0_15px_var(--accent-primary)] transition-all disabled:opacity-50 flex items-center justify-center p-2 group"
          >
            <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
};
