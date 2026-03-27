import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PostCard, type PostData } from '../components/feed/PostCard';
import { CommentSection } from '../components/feed/CommentSection';
import { ArrowLeft, Loader2 } from 'lucide-react';

export const SinglePostPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    setIsLoading(true);
    
    // Listen strictly to this exact document using onSnapshot for real-time like/comment counts
    const unsubscribe = onSnapshot(doc(db, 'posts', postId), (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() } as PostData);
      } else {
        setPost(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  if (isLoading) {
    return (
      <div className="w-full flex justify-center items-center py-20 min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="w-full flex flex-col items-center py-20 font-mono space-y-4">
        <h2 className="text-danger tracking-widest uppercase border border-danger p-4 shadow-[0_0_15px_var(--danger)]">Signal Lost</h2>
        <p className="text-muted text-sm">The transmission could not be found or was purged.</p>
        <button onClick={() => navigate(-1)} className="text-primary hover:text-brandText text-xs tracking-widest uppercase mt-4 transition-colors">
          Return to void
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col pb-20 pt-4 px-4 md:px-4 lg:px-4 relative font-mono">
      <div className="w-full max-w-[850px] mx-auto">
        
        {/* Header / Back Navigation */}
        <div className="mb-6 flex items-center">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 group text-muted hover:text-primary transition-colors font-mono text-xs tracking-widest uppercase bg-surface border border-ghost/40 py-2 px-4 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </button>
        </div>

        {/* The Post itself */}
        <div className="mb-8 relative z-10">
            {/* Index is 0 because there's only one post, animates instantly */}
            <PostCard post={post} index={0} />
        </div>

        {/* Echoes / Comments Section */}
        <div className="relative z-10">
            <CommentSection postId={post.id} />
        </div>
        
      </div>
    </div>
  );
};
