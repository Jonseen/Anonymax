import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PostCard, type PostData } from '../components/feed/PostCard';
import { Activity, Loader2 } from 'lucide-react';

export const SignalsPage = () => {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        // Querying purely by echoCount for trending signals
        const q = query(
          collection(db, 'posts'),
          orderBy('echoCount', 'desc'),
          limit(30)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostData));
        setPosts(data);
      } catch (e) {
        console.error("Failed to intercept signals:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  return (
    <div className="w-full flex flex-col items-center pb-20 pt-4 px-4 md:px-4 lg:px-4 font-mono">
      <div className="w-full max-w-[850px] space-y-8">
        <div className="flex items-center gap-3 mb-6 border-b border-primary/20 pb-4">
          <div className="w-8 h-8 bg-void border border-primary/50 flex items-center justify-center shadow-[0_0_10px_var(--accent-primary)]">
            <Activity className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-black text-brandText tracking-[0.15em] uppercase">Active Signals</h1>
        </div>

        {loading ? (
          <div className="w-full h-40 flex items-center justify-center text-primary">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post, i) => (
              <PostCard key={post.id} post={post} index={i} />
            ))}
            {posts.length === 0 && (
              <div className="w-full p-8 border border-ghost bg-surface text-center">
                <span className="text-[10px] text-muted tracking-widest uppercase">No frequencies detected</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
