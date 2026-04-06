import { useEffect, useState } from 'react';
import { useAuth } from '../store/authStore';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PostCard, type PostData } from '../components/feed/PostCard';
import { Bookmark, Loader2 } from 'lucide-react';

export const SavedSignalsPage = () => {
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchSaves = async () => {
      try {
        const savesRef = collection(db, 'saves', user.uid, 'items');
        const saveSnap = await getDocs(savesRef);

        const posts: PostData[] = [];
        for (const docSnap of saveSnap.docs) {
          // Assume the document ID naturally matches the postId it links to
          const postId = docSnap.id;
          const postRef = doc(db, 'posts', postId);
          const postDoc = await getDoc(postRef);

          if (postDoc.exists()) {
            posts.push({ id: postDoc.id, ...postDoc.data() } as PostData);
          }
        }

        setSavedPosts(posts.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
      } catch (e) {
        console.error("Error retrieving archived signals:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSaves();
  }, [user]);

  return (
    <div className="w-full flex flex-col items-center pb-20 pt-4 px-4 md:px-4 lg:px-4 font-mono">
      <div className="w-full max-w-[850px] space-y-6">

        <div className="flex items-center gap-3 mb-8 border-b border-primary/20 pb-4">
          <div className="w-8 h-8 bg-void border border-primary/50 flex items-center justify-center">
            <Bookmark className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-black text-brandText tracking-[0.15em] uppercase">Saved Signals</h1>
        </div>

        {isLoading ? (
          <div className="w-full h-40 flex items-center justify-center text-primary">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : savedPosts.length > 0 ? (
          <div className="space-y-6">
            {savedPosts.map((post, i) => (
              <PostCard key={post.id} post={post} index={i} />
            ))}
          </div>
        ) : (
          <div className="w-full h-48 border border-ghost bg-surface/50 flex items-center justify-center mt-6">
            <span className="text-[10px] tracking-widest text-muted uppercase">ARCHIVE EMPTY</span>
          </div>
        )}
      </div>
    </div>
  );
};
