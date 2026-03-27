import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../store/authStore';
import { db } from '../../lib/firebase';
import { doc, runTransaction, getDoc, addDoc, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { 
  MessageSquare, RefreshCw, Link as LinkIcon, MoreHorizontal, Bookmark, Ghost, Eye, Skull, Fingerprint, Scan, Radio, Crosshair, Aperture, Heart
} from 'lucide-react';
import { savePost, unsavePost, isPostSaved } from '../../services/postService';
import { useUIStore } from '../../store/uiStore';
import toast from 'react-hot-toast';

const MASK_ICONS: Record<string, any> = {
  ghost: Ghost,
  eye: Eye,
  skull: Skull,
  fingerprint: Fingerprint,
  scan: Scan,
  radio: Radio,
  crosshair: Crosshair,
  aperture: Aperture
};

export interface PostData {
  id: string;
  authorId: string;
  authorMask: string;
  authorName?: string;
  content: string;
  imageUrl?: string;
  visibility: 'everyone' | 'ghosts';
  createdAt: any;
  likeCount: number;
  commentCount: number;
  echoCount?: number;
  isEcho?: boolean;
  originalPostId?: string | null;
  isDeleted?: boolean;
}

export const PostCard = ({ post, index }: { post: PostData; index: number }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openBroadcastModal } = useUIStore();
  const [isLiked, setIsLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.likeCount || 0);
  const [localEchoCount, setLocalEchoCount] = useState(post.echoCount || 0);
  const [showEchoMenu, setShowEchoMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isWiped, setIsWiped] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [quotedPost, setQuotedPost] = useState<PostData | null>(null);

  // Fetch quoted post if applicable
  useEffect(() => {
    if (post.originalPostId && !post.isEcho) {
      const fetchQuoted = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'posts', post.originalPostId!));
          if (docSnap.exists()) {
            setQuotedPost({ id: docSnap.id, ...docSnap.data() } as PostData);
          }
        } catch (e) {
          console.error("Failed to fetch quoted post", e);
        }
      };
      fetchQuoted();
    }
  }, [post.originalPostId, post.isEcho]);

  const isOwnPost = user?.uid === post.authorId;

  useEffect(() => {
    if (!user || !post.id) return;
    const fetchLikeStatus = async () => {
      try {
        const likeDoc = await getDoc(doc(db, 'posts', post.id, 'likes', user.uid));
        setIsLiked(likeDoc.exists());
      } catch (e) {
        console.error("Like fetch failed", e);
      }
    };
    fetchLikeStatus();
  }, [user, post.id]);

  // Sync external real-time feed updates down into the local state
  useEffect(() => {
    setLocalLikeCount(post.likeCount || 0);
  }, [post.likeCount]);

  useEffect(() => {
    setLocalEchoCount(post.echoCount || 0);
  }, [post.echoCount]);

  // Check saved status
  useEffect(() => {
    if (!user || !post.id) return;
    isPostSaved(post.id, user.uid).then(setIsSaved).catch(() => {});
  }, [user, post.id]);

  const handleLike = async () => {
    if (!user) return;
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLocalLikeCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);

    const postRef = doc(db, 'posts', post.id);
    const likeRef = doc(db, 'posts', post.id, 'likes', user.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) throw new Error("Document does not exist!");
        const currentCount = postDoc.data().likeCount || 0;
        
        if (wasLiked) {
          transaction.delete(likeRef);
          transaction.update(postRef, { likeCount: Math.max(0, currentCount - 1) });
        } else {
          transaction.set(likeRef, { createdAt: new Date().toISOString() });
          transaction.update(postRef, { likeCount: currentCount + 1 });
        }
      });
    } catch (e) {
      setIsLiked(wasLiked);
      setLocalLikeCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1));
      toast.error('Network desync');
    }
  };

  const handleEcho = async () => {
    if (!user) return;
    setShowEchoMenu(false);
    
    setLocalEchoCount(prev => prev + 1);
    toast.success('Signal Echoed.');
    
    try {
      await runTransaction(db, async (t) => {
        const postRef = doc(db, 'posts', post.id);
        const postDoc = await t.get(postRef);
        if (!postDoc.exists()) throw new Error("Document does not exist");
        const currentEchoes = postDoc.data()?.echoCount || 0;
        t.update(postRef, { echoCount: currentEchoes + 1 });
      });

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const mask = userDoc.data()?.mask || 'ghost';

      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorMask: mask,
        content: `[ECHOED SIGNAL_ID: ${post.id}]\n\n` + post.content,
        imageUrl: post.imageUrl || null,
        visibility: 'everyone',
        createdAt: serverTimestamp(),
        likeCount: 0,
        commentCount: 0,
        echoCount: 0,
        tags: [],
        isEcho: true,
        originalPostId: post.id
      });
    } catch (e) {
      setLocalEchoCount(prev => Math.max(0, prev - 1));
      toast.error('Echo sequence failed.');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      setIsWiped(true);
      toast.success('Signal permanently wiped.');
    } catch (e) {
      toast.error('Wipe failed. Clearance rejected.');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast.success('Signal embedded in clipboard');
  };

  const handleSave = async () => {
    if (!user) return;
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);
    try {
      if (wasSaved) {
        await unsavePost(post.id, user.uid);
      } else {
        await savePost(post.id, user.uid);
        toast.success('Signal archived');
      }
    } catch {
      setIsSaved(wasSaved);
      toast.error('Archive failed');
    }
  };

  const MaskIcon = MASK_ICONS[post.authorMask] || Ghost;
  const shortUid = post.authorId.slice(-5).toUpperCase();
  const username = `Ghost_[${shortUid}]`;
  
  const timeString = post.createdAt?.toDate 
    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }).replace('about', '').trim()
    : 'Unknown Time';

  // Deterministically generate a hex tag based on post ID
  const hexTag = post.id ? `#${post.id.slice(0,4).toUpperCase()}` : '#A3F9';

  const renderContent = (text: string) => {
    return text.split(/(#[a-zA-Z0-9_]+)/g).map((part, i) => {
      if (part.startsWith('#')) return <span key={i} className="text-primary font-bold">{part}</span>;
      return part;
    });
  };

  if (isWiped) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
      className="w-full bg-[radial-gradient(circle_at_center,_var(--bg-surface)_0%,_var(--bg-void)_100%)] border border-ghost border-l-[3px] border-l-ghost p-6 relative group overflow-hidden hover:border-ghost/80 transition-all font-sans"
    >
      <div className="flex items-center justify-between mb-5 font-mono">
        <Link to={`/profile/${post.authorId}`} className="flex items-center gap-4 cursor-pointer">
          <div className="w-10 h-10 bg-void border border-primary/20 flex items-center justify-center relative group-hover:shadow-[0_0_10px_var(--accent-primary)] transition-all">
             <MaskIcon className="w-5 h-5 text-primary" strokeWidth={1} />
          </div>
          <div className="flex flex-col">
            <span className="text-brandText text-sm font-bold tracking-wide hover:underline">{username}</span>
            <span className="text-muted text-[10px] tracking-widest uppercase flex items-center gap-1.5 mt-0.5">
               {timeString} <span className="text-ghost">•</span> <span className="text-primary/70">{hexTag}</span> <span className="text-ghost">•</span> UNTRACED · ENCRYPTED
            </span>
          </div>
        </Link>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="text-muted hover:text-brandText transition-colors p-2 rounded-sm hover:bg-void">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-10 w-48 bg-surface border border-ghost shadow-[0_0_15px_rgba(0,0,0,0.8)] z-50 py-2 font-mono text-xs">
              {showDeleteConfirm ? (
                <div className="flex flex-col p-2 space-y-2">
                  <span className="text-danger tracking-widest uppercase text-[10px] text-center mb-2 border-b border-danger/30 pb-2">Confirm Wipe?</span>
                  <div className="flex gap-2">
                    <button onClick={handleDelete} className="flex-1 bg-danger text-void font-bold py-1 hover:bg-danger/80 transition-colors">PURGE</button>
                    <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-ghost text-muted py-1 hover:text-primary hover:border-primary/50 transition-colors">CANCEL</button>
                  </div>
                </div>
              ) : isOwnPost ? (
                <>
                  <button onClick={() => {toast('Feature pending.'); setShowMenu(false);}} className="w-full text-left px-4 py-2 text-muted hover:bg-void hover:text-primary transition-colors tracking-widest uppercase mb-1">Edit Signal</button>
                  <button onClick={() => {toast('Visibility toggled.'); setShowMenu(false);}} className="w-full text-left px-4 py-2 text-muted hover:bg-void hover:text-primary transition-colors tracking-widest uppercase mb-1">Visibility Matrix</button>
                  <button onClick={() => setShowDeleteConfirm(true)} className="w-full text-left px-4 py-2 text-danger hover:bg-danger/10 transition-colors tracking-widest uppercase mt-2 border-t border-ghost pt-3">Wipe Protocol</button>
                </>
              ) : (
                <>
                  <button onClick={() => {toast('Ghost muted.'); setShowMenu(false);}} className="w-full text-left px-4 py-2 text-muted hover:bg-void hover:text-primary transition-colors tracking-widest uppercase mb-1">Mute Signal</button>
                  <button onClick={() => {toast('Access blocked.'); setShowMenu(false);}} className="w-full text-left px-4 py-2 text-muted hover:bg-void hover:text-primary transition-colors tracking-widest uppercase mb-1">Block Ghost</button>
                  <button onClick={() => {toast('Anomaly reported.'); setShowMenu(false);}} className="w-full text-left px-4 py-2 text-danger hover:bg-danger/10 transition-colors tracking-widest uppercase mt-2 border-t border-ghost pt-3">Report Breach</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pl-1 mb-5">
        <p className="text-brandText/90 text-[13px] md:text-sm leading-relaxed font-sans whitespace-pre-wrap">
          {renderContent(post.content)}
        </p>
      </div>

      {post.imageUrl && (
        <div className="w-full mb-6 overflow-hidden border border-ghost/50 relative bg-void max-h-[400px]">
           <img src={post.imageUrl} alt="Signal attachment" className="w-full h-full object-cover filter contrast-125 brightness-75 grayscale hover:grayscale-0 transition-all duration-500" loading="lazy" />
           <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none mix-blend-overlay"></div>
        </div>
      )}

      {/* Embedded Quote rendering */}
      {quotedPost && (
        <div 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/post/${quotedPost.id}`); }}
          className="w-full mb-5 border border-ghost/50 p-4 rounded-sm bg-surface/50 cursor-pointer hover:border-primary/50 transition-colors group/quote relative overflow-hidden"
        >
           <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none mix-blend-overlay"></div>
           <div className="flex items-center gap-2 mb-2 relative z-10">
             <div className="w-5 h-5 bg-void border border-primary/20 flex items-center justify-center">
                 {(() => {
                   const QIcon = MASK_ICONS[quotedPost.authorMask || 'ghost'] || Ghost;
                   return <QIcon className="w-3 h-3 text-primary" />;
                 })()}
             </div>
             <span className="text-xs font-bold text-brandText tracking-wide group-hover/quote:underline">{quotedPost.authorName || `Ghost_[${quotedPost.authorId.slice(-5).toUpperCase()}]`}</span>
             <span className="text-[9px] text-muted tracking-widest uppercase">• SIGNAL_{quotedPost.id.slice(0,4).toUpperCase()}</span>
           </div>
           
           <div className="flex gap-4 relative z-10">
             <div className="flex-1 min-w-0">
               <p className="text-[12px] text-brandText/80 font-sans line-clamp-3 whitespace-pre-wrap">{quotedPost.content}</p>
             </div>
             {quotedPost.imageUrl && (
               <div className="w-20 h-20 flex-shrink-0 border border-ghost/50 bg-void overflow-hidden">
                 <img src={quotedPost.imageUrl} className="w-full h-full object-cover filter contrast-125 grayscale group-hover/quote:grayscale-0 transition-all" />
               </div>
             )}
           </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="flex flex-wrap items-center gap-4 md:gap-8 mt-4 pt-4 border-t border-ghost/30 px-1 select-none font-mono">
        <motion.button 
           whileTap={{ scale: 0.8 }}
           onClick={handleLike} 
           className={`flex items-center gap-1.5 text-[10px] tracking-widest uppercase transition-all duration-200 group/btn ${isLiked ? 'text-danger drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-muted hover:text-danger'}`}
        >
          <Heart className="w-4 h-4" strokeWidth={1.5} fill={isLiked ? 'currentColor' : 'none'} />
          <span className="min-w-[12px]">{localLikeCount > 0 ? localLikeCount : ''} LIKES</span>
        </motion.button>

        <div className="relative">
          <button onClick={() => setShowEchoMenu(!showEchoMenu)} className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-muted hover:text-brandText transition-all duration-200">
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
            <span>{localEchoCount > 0 ? localEchoCount : ''} ECHOES</span>
          </button>
          
          {showEchoMenu && (
            <div className="absolute left-0 bottom-8 w-40 bg-surface border border-ghost shadow-[0_0_15px_rgba(0,0,0,0.8)] z-50 py-2 font-mono text-xs">
               <button onClick={handleEcho} className="w-full text-left px-4 py-2 text-muted hover:bg-void hover:text-primary transition-colors tracking-widest uppercase mb-1">Echo Now</button>
               <button onClick={() => { setShowEchoMenu(false); openBroadcastModal(post); }} className="w-full text-left px-4 py-2 text-muted hover:bg-void hover:text-primary transition-colors tracking-widest uppercase">Quote Signal</button>
            </div>
          )}
        </div>

        <Link to={`/post/${post.id}`} state={{ focusComment: true }} className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-muted hover:text-brandText transition-all duration-200">
          <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
          <span>{post.commentCount > 0 ? post.commentCount : ''} REPLIES</span>
        </Link>

        <button onClick={copyLink} className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-muted hover:text-brandText transition-all duration-200">
          <LinkIcon className="w-4 h-4" strokeWidth={1.5} />
        </button>

        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={handleSave}
          className={`flex items-center gap-1.5 text-[10px] tracking-widest uppercase transition-all duration-200 ml-auto ${isSaved ? 'text-primary' : 'text-muted hover:text-primary'}`}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'drop-shadow-[0_0_5px_var(--accent-primary)]' : ''}`} strokeWidth={1.5} fill={isSaved ? 'currentColor' : 'none'} />
        </motion.button>
      </div>
    </motion.div>
  );
};
