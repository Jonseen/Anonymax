import { useState, useEffect } from 'react';
import { useAuth } from '../store/authStore';
import { collection, query, limit, getDocs, doc, runTransaction, startAfter } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ghost, Skull, Fingerprint, VenetianMask, Hexagon, CircleDashed, Triangle, Eye, Loader2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const MASK_ICONS: Record<string, any> = { ghost: Ghost, eye: Eye, skull: Skull, fingerprint: Fingerprint, venetian: VenetianMask, hexagon: Hexagon, circle: CircleDashed, triangle: Triangle };

interface GhostUser {
  uid: string;
  mask: string;
}

export const GhostsPage = () => {
  const { user: currentUser } = useAuth();
  const [ghosts, setGhosts] = useState<GhostUser[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const fetchGhosts = async (isNext = false) => {
    try {
      if (isNext) setLoadingMore(true);
      else setLoading(true);

      let q = query(collection(db, 'users'), limit(20));
      if (isNext && lastVisible) {
        q = query(collection(db, 'users'), startAfter(lastVisible), limit(20));
      }

      const snap = await getDocs(q);
      const docs = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as GhostUser));
      
      if (snap.docs.length > 0) {
        setLastVisible(snap.docs[snap.docs.length - 1]);
      }
      
      if (snap.docs.length < 20) {
        setHasMore(false);
      }

      if (isNext) setGhosts(prev => [...prev, ...docs]);
      else setGhosts(docs);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchGhosts();
  }, []);

  const toggleFollow = async (targetId: string) => {
    if (!currentUser) return;
    const followId = `${currentUser.uid}_${targetId}`;
    const followRef = doc(db, 'follows', followId);
    
    const isCurrentlyFollowing = followedIds.has(targetId);
    
    // Optimistic cache upgrade
    const newFollows = new Set(followedIds);
    if (isCurrentlyFollowing) newFollows.delete(targetId);
    else newFollows.add(targetId);
    setFollowedIds(newFollows);

    try {
      await runTransaction(db, async (t) => {
        if (isCurrentlyFollowing) {
          t.delete(followRef);
        } else {
          t.set(followRef, { followerId: currentUser.uid, followingId: targetId });
        }
      });
    } catch (error) {
      toast.error('Desync caught handling footprint matrix.');
      // Revert cache on fail
      const revert = new Set(followedIds);
      if (isCurrentlyFollowing) revert.add(targetId);
      else revert.delete(targetId);
      setFollowedIds(revert);
    }
  };

  return (
    <div className="w-full flex flex-col items-center pb-20 pt-4 px-4 md:px-4 lg:px-4 font-mono">
      <div className="w-full max-w-[850px] space-y-6">
        
        <div className="flex items-center gap-3 mb-6 border-b border-primary/20 pb-4">
           <div className="w-8 h-8 bg-void border border-primary/50 flex items-center justify-center shadow-[0_0_10px_var(--accent-primary)]">
              <Users className="w-4 h-4 text-primary" strokeWidth={1.5} />
           </div>
           <h1 className="text-xl font-black text-brandText tracking-[0.15em] uppercase">Ghost Nodes</h1>
        </div>

        {loading ? (
           <div className="w-full h-40 flex items-center justify-center text-primary">
             <Loader2 className="w-6 h-6 animate-spin" />
           </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ghosts.map(ghost => {
                if (ghost.uid === currentUser?.uid) return null;
                const Icon = MASK_ICONS[ghost.mask || 'ghost'] || Ghost;
                const isFollowing = followedIds.has(ghost.uid);
                
                return (
                  <div key={ghost.uid} className="flex flex-col p-5 border border-ghost bg-surface hover:border-primary/50 transition-colors group">
                     <div className="flex items-center gap-4">
                       <Link to={`/profile/${ghost.uid}`} className="w-12 h-12 bg-void border border-primary/30 flex items-center justify-center group-hover:shadow-[0_0_10px_var(--accent-primary)] transition-all">
                          <Icon className="w-6 h-6 text-primary" strokeWidth={1} />
                       </Link>
                       <div className="flex flex-col">
                         <Link to={`/profile/${ghost.uid}`}>
                            <span className="text-sm font-bold text-brandText uppercase hover:underline">Ghost_{ghost.uid.slice(-5)}</span>
                         </Link>
                         <span className="text-[9px] text-muted tracking-widest">[ID_VERIFIED]</span>
                       </div>
                     </div>
                     <button
                       onClick={() => toggleFollow(ghost.uid)}
                       className={`mt-4 w-full py-2 border text-[10px] tracking-widest font-bold font-mono transition-all ${
                         isFollowing 
                           ? 'bg-void border-ghost text-muted hover:border-danger hover:text-danger'
                           : 'bg-void border-primary text-primary hover:bg-primary hover:text-void shadow-[0_0_5px_var(--accent-primary)]'
                       }`}
                     >
                       {isFollowing ? 'BREAK LINK' : 'INITIATE SYNC'}
                     </button>
                  </div>
                );
              })}
            </div>

            {hasMore && ghosts.length > 0 && (
              <div className="w-full flex justify-center mt-8">
                <button 
                  onClick={() => fetchGhosts(true)} 
                  disabled={loadingMore}
                  className="px-6 py-2 border border-ghost text-primary text-[10px] tracking-widest uppercase hover:border-primary transition-all flex items-center gap-2"
                >
                  {loadingMore ? <Loader2 className="w-3 h-3 animate-spin"/> : 'SCAN DEEPER'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
