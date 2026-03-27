import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PostCard, type PostData } from '../components/feed/PostCard';
import { Search as SearchIcon, Loader2, Terminal } from 'lucide-react';

const SkeletonPostCard = () => (
  <div className="w-full bg-[radial-gradient(circle_at_center,_var(--bg-surface)_0%,_var(--bg-void)_100%)] border border-ghost border-l-[3px] border-l-ghost/50 p-6 relative overflow-hidden animate-pulse">
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-void border border-primary/20"></div>
        <div className="flex flex-col gap-2">
          <div className="w-24 h-3 bg-ghost rounded-sm"></div>
          <div className="w-40 h-2 bg-ghost/50 rounded-sm"></div>
        </div>
      </div>
      <div className="w-5 h-5 bg-ghost/50 rounded-sm"></div>
    </div>
    <div className="w-full h-16 bg-ghost/30 rounded-sm mb-5"></div>
    <div className="flex gap-4 md:gap-8 border-t border-ghost/30 pt-4">
      <div className="w-16 h-3 bg-ghost/50 rounded-sm"></div>
      <div className="w-16 h-3 bg-ghost/50 rounded-sm"></div>
      <div className="w-16 h-3 bg-ghost/50 rounded-sm"></div>
    </div>
  </div>
);

export const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<PostData[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const term = searchTerm.trim().toLowerCase();
      if (term.length > 2) {
        executeSearch(term);
      } else if (term.length === 0) {
        setResults([]);
        setHasSearched(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const executeSearch = async (term: string) => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const q = query(
        collection(db, 'posts'),
        where('tags', 'array-contains', term),
        limit(20)
      );
      const snap = await getDocs(q);
      const postsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostData));
      
      // Sort natively newest first mapping
      setResults(postsData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
    } catch (e) {
      console.error("Signal search failed due to internal network disruption.", e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center pb-20 pt-4 px-4 md:px-4 lg:px-4 font-mono">
      <div className="w-full max-w-[850px] space-y-6">
        
        <div className="relative w-full">
           <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
             <SearchIcon className="w-5 h-5 text-primary" strokeWidth={1.5} />
           </div>
           <input
             type="text"
             autoFocus
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             placeholder="ENTER OVERRIDE FREQUENCY..."
             className="w-full bg-void border border-primary/50 py-4 pl-12 pr-4 text-brandText placeholder:text-muted focus:outline-none focus:border-primary focus:shadow-[0_0_15px_var(--accent-primary)] transition-all font-mono tracking-widest uppercase text-sm"
           />
           {isSearching && (
             <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
               <Loader2 className="w-4 h-4 text-primary animate-spin" />
             </div>
           )}
        </div>

        {isSearching ? (
          <div className="space-y-6 mt-8">
             <div className="flex items-center gap-2 mb-4 border-b border-ghost pb-2">
                <Terminal className="w-3 h-3 text-muted animate-pulse" />
                <span className="text-[10px] text-muted tracking-widest uppercase animate-pulse">SCANNING FREQUENCIES...</span>
             </div>
             <SkeletonPostCard />
             <SkeletonPostCard />
             <SkeletonPostCard />
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-6 mt-8">
             <div className="flex items-center gap-2 mb-4 border-b border-ghost pb-2">
                <Terminal className="w-3 h-3 text-muted" />
                <span className="text-[10px] text-muted tracking-widest uppercase">{results.length} SIGNALS INTERCEPTED</span>
             </div>
             {results.map((post, i) => (
                <PostCard key={post.id} post={post} index={i} />
             ))}
          </div>
        ) : hasSearched && !isSearching && (
          <div className="w-full mt-10 p-8 border border-danger/50 bg-danger/5 relative overflow-hidden group">
             <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none mix-blend-overlay"></div>
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-danger shadow-[0_0_10px_var(--accent-danger)]"></div>
             
             <div className="flex flex-col gap-2 relative z-10">
                <span className="text-danger font-bold tracking-widest uppercase text-lg inline-flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  ERROR: 404
                </span>
                <span className="text-danger/80 tracking-widest uppercase text-[11px] leading-relaxed">
                  No signal found. The requested frequency trace `[{searchTerm}]` returned an empty set on the decentralized ledger.
                </span>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};
