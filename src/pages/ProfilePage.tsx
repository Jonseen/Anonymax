import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { db } from '../lib/firebase';
import { useAuth } from '../store/authStore';
import { PostCard, type PostData } from '../components/feed/PostCard';
import { UserListModal } from '../components/modals/UserListModal';
import { sendFollowRequest, unfollowUser, checkIsFollowing, checkPendingRequest } from '../services/followService';
import { Edit2, LayoutGrid, List, Loader2, Check, Ghost, Eye, Skull, Fingerprint, Scan, Radio, Crosshair, Aperture } from 'lucide-react';
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

export const ProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const actualUserId = userId === 'me' ? currentUser?.uid : userId;
  const isOwnProfile = currentUser?.uid === actualUserId;

  const [profileData, setProfileData] = useState<any>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null);

  // Load Profile Real-time Streams
  useEffect(() => {
    if (!actualUserId) return;
    
    // Subscribe to the centralized user doc
    const unsubUser = onSnapshot(doc(db, 'users', actualUserId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData(data);
        if (!isEditingBio) setBioInput(data.bio || ''); // Avoid overriding live edits
      } else {
        // If the document doesn't exist but it's THEIR profile (e.g. from an Anonymous Ghost login)
        if (isOwnProfile && currentUser) {
          const fallbackData = {
            mask: 'ghost',
            maskIcon: 'ghost',
            displayName: 'Ghost_' + actualUserId.slice(-5).toUpperCase(),
            bio: '',
            createdAt: currentUser.metadata.creationTime || new Date().toISOString(),
            isAnonymous: currentUser.isAnonymous,
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
          };
          setProfileData(fallbackData);
          
          // Auto-create their missing document
          setDoc(doc(db, 'users', actualUserId), fallbackData, { merge: true }).catch(console.error);
        } else {
          // Other user's doc missing — build a minimal profile from their userId
          const fallbackData = {
            mask: 'ghost',
            maskIcon: 'ghost',
            displayName: 'Ghost_' + actualUserId!.slice(-5).toUpperCase(),
            bio: '',
            createdAt: new Date().toISOString(),
            isAnonymous: false,
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
          };
          setProfileData(fallbackData);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error('Snapshot Error:', error);
      toast.error('Connection blocked: Check Firebase Permissions');
      setLoading(false);
    });

    // Check follow status if viewing another user's profile
    if (currentUser && !isOwnProfile) {
      const checkStatus = async () => {
        const following = await checkIsFollowing(actualUserId!);
        setIsFollowing(following);
        if (!following) {
          const pending = await checkPendingRequest(actualUserId!);
          setIsPending(pending);
        }
      };
      checkStatus();
    }

    return () => unsubUser();
  }, [actualUserId, currentUser, isOwnProfile, isEditingBio]);

  // Load User Posts
  useEffect(() => {
    if (!actualUserId) return;
    
    const fetchUserPosts = async () => {
      try {
        const q = query(
          collection(db, 'posts'), 
          where('authorId', '==', actualUserId)
        );
        const snapshot = await getDocs(q);
        const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostData));
        
        fetchedPosts.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Error fetching general transmissions:", error);
      }
    };
    
    fetchUserPosts();
  }, [actualUserId]);

  const toggleFollow = async () => {
    if (!currentUser || !actualUserId) return;
    setIsFollowLoading(true);
    
    try {
      if (isFollowing) {
        // Unfollow directly
        await unfollowUser(actualUserId);
        setIsFollowing(false);
      } else if (isPending) {
        // Already sent request — do nothing
        toast('Link request already transmitted', { icon: '📡' });
      } else {
        // Send follow request notification
        await sendFollowRequest(actualUserId);
        setIsPending(true);
        toast.success('Link request transmitted');
      }
    } catch (error) {
      toast.error('Failed to augment neural link');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const saveBio = async () => {
    if (!currentUser || bioInput.length > 160) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        bio: bioInput.trim()
      });
      setIsEditingBio(false);
      toast.success('Bio encrypted');
    } catch (e) {
      toast.error('Failed to encrypt bio');
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-20 min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="w-full flex flex-col items-center py-20 font-mono space-y-4">
        <h2 className="text-danger tracking-widest uppercase border border-danger p-4 shadow-[0_0_15px_var(--danger)]">Entity Not Found</h2>
        <button onClick={() => navigate('/feed')} className="text-primary hover:text-brandText text-xs tracking-widest uppercase mt-4 transition-colors">
          Return to Hub
        </button>
      </div>
    );
  }

  const MaskIcon = MASK_ICONS[profileData.mask] || Ghost;
  
  // Safely parse ISO strings explicitly passed internally at authentication mapping step
  let joinDate = 'unknown time';
  if (profileData.createdAt) {
      try { joinDate = format(new Date(profileData.createdAt), 'MMMM yyyy'); } 
      catch (e) { /* fallback string preserved */ }
  }

  const shortUid = actualUserId?.slice(-5).toUpperCase();
  
  return (
    <div className="w-full flex flex-col items-center pb-20 pt-4 px-4 md:px-4 lg:px-4 font-mono">
      <div className="w-full max-w-[850px] space-y-8">
        
        {/* Superior Header Base Panel */}
        <div className="w-full bg-surface/80 border border-ghost/40 p-8 flex flex-col items-center relative overflow-hidden group">
          {/* Decorative Void Noise Pulse */}
          <div className="absolute -inset-20 bg-gradient-to-tr from-transparent via-ghost/5 to-transparent blur-2xl rotate-12 pointer-events-none" />

          {/* Mask Frame Area */}
          <div className="relative mb-6">
             <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
             <div className="bg-void border-2 border-primary/50 p-6 rounded-full relative z-10 shadow-[0_0_20px_var(--bg-void)] group-hover:shadow-[0_0_30px_var(--accent-primary)] transition-shadow duration-500">
                <MaskIcon className="w-12 h-12 text-primary" strokeWidth={1} />
             </div>
          </div>

          {/* Identity Info */}
          <h1 className="text-2xl font-black tracking-[0.2em] text-brandText uppercase mb-2">Ghost_{shortUid}</h1>
          <span className="text-xs text-muted tracking-widest uppercase mb-6">In the void since {joinDate}</span>

          {/* Bio Modification Controller */}
          <div className="w-full max-w-sm text-center mb-8 min-h-[60px] flex flex-col items-center justify-center">
            {isEditingBio ? (
              <div className="w-full flex flex-col gap-2">
                <textarea 
                  value={bioInput}
                  onChange={e => setBioInput(e.target.value)}
                  maxLength={160}
                  className="w-full bg-void border border-primary/50 text-brandText text-sm p-3 resize-none outline-none text-center focus:shadow-[0_0_10px_var(--accent-primary)] transition-shadow leading-relaxed"
                  rows={3}
                  placeholder="Enter your cryptographic signature..."
                />
                <div className="flex justify-between items-center text-xs px-1">
                  <span className={`${bioInput.length >= 160 ? 'text-danger' : 'text-muted'}`}>{bioInput.length}/160</span>
                  <div className="flex gap-4">
                    <button onClick={() => setIsEditingBio(false)} className="text-muted hover:text-danger uppercase tracking-widest font-bold">Abort</button>
                    <button onClick={saveBio} className="text-primary hover:text-brandText uppercase tracking-widest font-bold flex items-center gap-1"><Check className="w-3 h-3"/> Save</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative group/bio w-full flex justify-center">
                <div className="px-6 text-sm text-brandText/80 leading-relaxed max-w-[320px] break-words">
                  {profileData.bio ? (
                     <span>"{profileData.bio}"</span>
                  ) : (
                    <span className="text-muted italic">No bio signature verified.</span>
                  )}
                </div>
                {isOwnProfile && (
                  <button 
                    onClick={() => setIsEditingBio(true)}
                    className="absolute -right-2 top-0 text-muted/50 hover:text-primary transition-all p-1 bg-void border border-ghost/40 hover:border-primary/50"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Analytics Block */}
          <div className="flex justify-center gap-8 md:gap-14 w-full border-y border-ghost/40 py-5 mb-6 bg-void/30">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl font-bold text-brandText">{posts.length}</span>
              <span className="text-[9px] text-muted tracking-widest uppercase">Transmissions</span>
            </div>
            <div 
              className="flex flex-col items-center gap-1 cursor-pointer group"
              onClick={() => setShowFollowModal('followers')}
            >
              <span className="text-xl font-bold text-brandText group-hover:text-primary transition-colors">
                {profileData.followerCount || 0}
              </span>
              <span className="text-[9px] text-muted tracking-widest uppercase group-hover:text-primary transition-colors">
                Followers
              </span>
            </div>
            <div 
              className="flex flex-col items-center gap-1 cursor-pointer group"
              onClick={() => setShowFollowModal('following')}
            >
              <span className="text-xl font-bold text-brandText group-hover:text-primary transition-colors">
                {profileData.followingCount || 0}
              </span>
              <span className="text-[9px] text-muted tracking-widest uppercase group-hover:text-primary transition-colors">
                Following
              </span>
            </div>
          </div>

          {/* Linkage Button */}
          {!isOwnProfile && (
            <button
              onClick={toggleFollow}
              disabled={isFollowLoading || isPending}
              className={`px-8 py-3 text-xs font-bold tracking-widest uppercase transition-all duration-300 w-full max-w-[200px] flex justify-center items-center ${
                isFollowing 
                ? 'bg-transparent border border-danger text-danger hover:bg-danger/10' 
                : isPending
                ? 'bg-transparent border border-[#f59e0b]/40 text-[#f59e0b] cursor-default opacity-70'
                : 'bg-primary/10 border border-primary/50 text-primary hover:bg-primary hover:text-void hover:shadow-[0_0_15px_var(--accent-primary)]'
              }`}
            >
              {isFollowLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isFollowing ? 'Sever Link' : isPending ? 'Pending...' : 'Establish Link'}
            </button>
          )}
        </div>

        {/* Dynamic Transmissions Archive Section */}
        <div className="w-full pt-2">
          <div className="flex justify-between items-center border-b border-primary/20 pb-4 mb-6">
             <h3 className="text-primary text-sm tracking-[0.2em] uppercase">Archive Log</h3>
             <div className="flex gap-1.5 bg-surface border border-ghost/40 p-1">
               <button 
                 onClick={() => setViewMode('list')}
                 className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-ghost text-primary' : 'text-muted hover:text-brandText'}`}
               >
                 <List className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setViewMode('grid')}
                 className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-ghost text-primary' : 'text-muted hover:text-brandText'}`}
               >
                 <LayoutGrid className="w-4 h-4" />
               </button>
             </div>
          </div>

          {posts.length === 0 ? (
            <div className="w-full text-center py-16 text-muted text-xs tracking-widest uppercase italic border border-dashed border-ghost/30">
              No logged transmissions.
            </div>
          ) : (
             viewMode === 'list' ? (
                <div className="space-y-6">
                  {posts.map((post, i) => (
                    <PostCard key={post.id} post={post} index={i} />
                  ))}
                </div>
             ) : (
                <div className="grid grid-cols-3 gap-3 md:gap-6">
                   {posts.map((post, i) => (
                      <motion.div 
                        key={post.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: Math.min(i * 0.05, 0.5) }}
                        onClick={() => navigate(`/post/${post.id}`)}
                        className="aspect-square bg-void border border-ghost/40 hover:border-primary/50 transition-colors cursor-pointer overflow-hidden p-3 flex flex-col justify-center items-center group relative shadow-inner"
                      >
                         {post.imageUrl ? (
                           <>
                             <img src={post.imageUrl} className="absolute inset-0 w-full h-full object-cover filter contrast-125 brightness-75 group-hover:brightness-100 transition-all duration-500" />
                             {/* Faint overlay on images for aesthetic tracking */}
                             <div className="absolute inset-0 bg-primary/10 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity"></div>
                           </>
                         ) : (
                           <p className="text-[10px] text-brandText/70 text-center line-clamp-4 group-hover:text-primary transition-colors leading-relaxed font-mono">
                             {post.content}
                           </p>
                         )}
                      </motion.div>
                   ))}
                </div>
             )
          )}
        </div>
      </div>
      
      {actualUserId && showFollowModal && (
        <UserListModal
          isOpen={!!showFollowModal}
          onClose={() => setShowFollowModal(null)}
          userId={actualUserId}
          type={showFollowModal}
        />
      )}
    </div>
  );
};
