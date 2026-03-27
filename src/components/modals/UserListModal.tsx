import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Loader2, Ghost, Eye, Skull, Fingerprint, Scan, Radio, Crosshair, Aperture 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { UserDoc } from '../../lib/firestoreSchema';

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

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
}

export const UserListModal = ({ isOpen, onClose, userId, type }: UserListModalProps) => {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchUsers = async () => {
      setIsLoading(true);
      setUsers([]);
      try {
        const followsRef = collection(db, 'follows');
        const q = type === 'followers' 
          ? query(followsRef, where('followingId', '==', userId))
          : query(followsRef, where('followerId', '==', userId));
          
        const snap = await getDocs(q);
        
        const targetIds = snap.docs.map(docSnap => {
          const data = docSnap.data();
          return type === 'followers' ? data.followerId : data.followingId;
        });

        // Fetch user docs for these IDs
        const userDocs: UserDoc[] = [];
        for (const id of targetIds) {
          const userSnap = await getDoc(doc(db, 'users', id));
          if (userSnap.exists()) {
            userDocs.push(userSnap.data() as UserDoc);
          } else {
            // Push fallback for ghosts without docs
            userDocs.push({
              uid: id,
              displayName: 'Ghost_' + id.slice(-5).toUpperCase(),
              maskIcon: 'ghost',
              bio: '',
              createdAt: new Date().toISOString() as any,
              lastSeen: new Date().toISOString() as any,
              followerCount: 0,
              followingCount: 0,
              postCount: 0,
              isAnonymous: false,
              settings: { defaultVisibility: 'everyone', allowReplies: true }
            });
          }
        }
        
        setUsers(userDocs);
      } catch (error) {
        console.error("Failed to fetch user list:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, userId, type]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-mono">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-void/90 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-[400px] bg-surface border border-ghost/40 shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-ghost/40 bg-void/50">
            <h2 className="text-primary font-bold tracking-[0.2em] uppercase">
              {type === 'followers' ? 'Network Links' : 'Tracking Signals'}
            </h2>
            <button
              onClick={onClose}
              className="text-muted hover:text-danger transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-10 text-muted text-xs tracking-widest uppercase italic">
                No active connections found.
              </div>
            ) : (
              users.map(u => {
                const Icon = MASK_ICONS[u.maskIcon || u.mask || 'ghost'] || Ghost;
                return (
                  <div
                    key={u.uid}
                    onClick={() => {
                      onClose();
                      navigate(`/profile/${u.uid}`);
                    }}
                    className="flex items-center gap-4 p-3 border border-ghost/30 hover:border-primary/50 bg-void/30 hover:bg-primary/5 cursor-pointer transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-void border border-ghost flex items-center justify-center group-hover:border-primary/50 transition-colors">
                      <Icon className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-brandText group-hover:text-primary transition-colors">
                        {u.displayName}
                      </span>
                      <span className="text-[10px] text-muted tracking-widest uppercase">
                        {u.followerCount || 0} Followers
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
