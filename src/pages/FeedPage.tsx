import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, orderBy, limit, startAfter, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PostComposer } from '../components/feed/PostComposer';
import { PostCard, type PostData } from '../components/feed/PostCard';
import { Ghost } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MaskModal, MASK_ICONS } from '../components/modals/MaskModal';

const fetchPostsPage = async ({ pageParam }: { pageParam: any }) => {
  let q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(10));
  if (pageParam) {
    q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(pageParam), limit(10));
  }
  const snapshot = await getDocs(q);
  const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostData));
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  return { docs, lastDoc };
};

export const FeedPage = () => {
  const queryClient = useQueryClient();
  const observerTarget = useRef<HTMLDivElement>(null);

  const [isMaskModalOpen, setIsMaskModalOpen] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: fetchPostsPage,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.lastDoc || null,
  });

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.unobserve(target);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostData));

      queryClient.setQueryData(['posts'], (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          docs: [...page.docs]
        }));

        const updatedIds = new Set(newDocs.map(d => d.id));
        newPages.forEach((page: any) => {
          page.docs = page.docs.map((doc: any) => {
            if (updatedIds.has(doc.id)) {
              return newDocs.find(nd => nd.id === doc.id);
            }
            return doc;
          });
        });

        const allCachedIds = new Set(newPages.flatMap((p: any) => p.docs).map((d: any) => d.id));
        const strictlyNewDocs = newDocs.filter(d => !allCachedIds.has(d.id));

        if (newPages[0] && strictlyNewDocs.length > 0) {
          newPages[0].docs = [...strictlyNewDocs, ...newPages[0].docs];
        }

        return {
          ...oldData,
          pages: newPages
        };
      });
    });

    return () => unsubscribe();
  }, [queryClient]);

  const posts: PostData[] = data?.pages.flatMap(page => page.docs) || [];

  return (
    <div className="w-full flex flex-col items-center pb-20 pt-4 px-4 md:px-4 lg:px-4">
      <div className="w-full max-w-[850px] space-y-8">

        <div className="w-full flex gap-3 lg:gap-5 overflow-x-auto pb-6 scrollbar-hide pt-2 font-mono snap-x snap-mandatory">

          <div onClick={() => setIsMaskModalOpen(true)} className="w-24 h-32 md:w-28 md:h-36 overflow-hidden relative flex-shrink-0 cursor-pointer group border border-ghost hover:border-primary/50 transition-colors bg-surface flex flex-col items-center justify-center snap-start">
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-noise mix-blend-overlay"></div>

            <span className="font-bold text-[10px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity absolute text-center text-primary z-10 px-2 bg-void/80 py-1 border border-primary/30">NEW MASK</span>

            <div className="w-full h-full flex items-center justify-center group-hover:opacity-10 transition-opacity">
              <span className="text-3xl font-black text-muted group-hover:text-primary transition-colors leading-none">+</span>
            </div>

            <div className="absolute bottom-3 w-full text-center">
              <span className="text-[10px] font-bold tracking-widest text-[#ffffff] uppercase border-b border-primary/30 pb-0.5">YOU</span>
            </div>
          </div>

          {(() => {
            const visualStories = posts.filter(p => p.imageUrl && !p.isDeleted).slice(0, 10);
            return visualStories.map((story) => {
              const Icon = MASK_ICONS[story.authorMask || 'ghost'] || Ghost;
              return (
                <Link key={`story-${story.id}`} to={`/post/${story.id}`} className="w-24 h-32 md:w-28 md:h-36 overflow-hidden relative flex-shrink-0 cursor-pointer group border border-ghost hover:border-primary/50 transition-colors bg-surface flex flex-col items-center justify-center snap-start">
                  <img src={story.imageUrl} alt="Signal Visual" className="absolute inset-0 w-full h-full object-cover filter contrast-125 transition-all duration-500 z-0" />
                  <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent z-0 opacity-80"></div>
                  <div className="absolute inset-0 pointer-events-none opacity-20 bg-noise mix-blend-overlay z-10"></div>

                  <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-void border border-primary/50 flex items-center justify-center z-20">
                    <Icon className="w-3 h-3 text-primary" strokeWidth={1.5} />
                  </div>

                  <div className="absolute bottom-2 w-full text-center px-1 z-20">
                    <span className="text-[9px] font-bold tracking-widest text-[#ffffff] uppercase border-b border-primary/30 pb-0.5 truncate block w-full drop-shadow-md">
                      {story.authorName || `GH_${story.authorId.slice(-3)}`}
                    </span>
                  </div>
                </Link>
              );
            });
          })()}
        </div>

        <PostComposer />

        <div className="space-y-6 pt-6">
          {status === 'pending' ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-full h-48 bg-surface border border-ghost/40 p-5 animate-pulse relative overflow-hidden">
                  <div className="absolute -inset-10 bg-gradient-to-r from-transparent via-ghost/5 to-transparent blur-md rotate-45 animate-pulse" />
                  <div className="flex gap-3 mb-4">
                    <div className="w-8 h-8 bg-void border border-ghost/30" />
                    <div className="space-y-2">
                      <div className="w-24 h-3 bg-ghost/30" />
                      <div className="w-16 h-2 bg-ghost/20" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="w-full h-3 bg-ghost/30" />
                    <div className="w-5/6 h-3 bg-ghost/30" />
                    <div className="w-4/6 h-3 bg-ghost/30" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            posts.map((post, i) => (
              <PostCard key={post.id} post={post} index={i} />
            ))
          )}
        </div>

        <div ref={observerTarget} className="w-full h-20 flex flex-col items-center justify-center mt-6 text-primary">
          {isFetchingNextPage && (
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_10px_var(--accent-primary)]" />
          )}
          {!hasNextPage && status === 'success' && posts.length > 0 && (
            <span className="text-muted font-mono tracking-widest uppercase text-[10px] mt-8">End of transmission</span>
          )}
        </div>
      </div>

      <MaskModal isOpen={isMaskModalOpen} onClose={() => setIsMaskModalOpen(false)} />
    </div>
  );
};
