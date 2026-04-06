import { useEffect, useState } from 'react';
import { useAuth } from '../store/authStore';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { 
  BarChart2, Radio, RefreshCw, Eye, Calendar, Loader2, 
  Users, MessageSquare, TrendingUp, Zap, Activity, Shield
} from 'lucide-react';

interface PostStats {
  totalPosts: number;
  totalLikes: number;
  totalEchoes: number;
  totalComments: number;
  daysInVoid: number;
  avgLikesPerPost: number;
  topPost: { content: string; likeCount: number; echoCount: number } | null;
  recentActivity: number[]; // last 7 days post count
}

export const VoidStatsPage = () => {
  const { user, userProfile } = useAuth();
  const [stats, setStats] = useState<PostStats>({
    totalPosts: 0, totalLikes: 0, totalEchoes: 0, totalComments: 0,
    daysInVoid: 0, avgLikesPerPost: 0, topPost: null, recentActivity: [0,0,0,0,0,0,0],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchStats = async () => {
      try {
        // Get user's join date from store profile
        const joinDate = userProfile?.createdAt?.toDate?.() || new Date();
        const days = Math.max(1, Math.floor((Date.now() - joinDate.getTime()) / (1000 * 3600 * 24)));

        // Fetch all user posts
        const q = query(
          collection(db, 'posts'), 
          where('authorId', '==', user.uid),
          where('isDeleted', '==', false)
        );
        const postSnap = await getDocs(q);
        
        let totalLikes = 0;
        let totalEchoes = 0;
        let totalComments = 0;
        let topPost: PostStats['topPost'] = null;
        let topScore = -1;

        // Build 7-day activity histogram
        const now = Date.now();
        const dayMs = 1000 * 3600 * 24;
        const recentActivity = [0, 0, 0, 0, 0, 0, 0];
        
        postSnap.forEach(d => {
          const data = d.data();
          const likes = data.likeCount || 0;
          const echoes = data.echoCount || 0;
          const comments = data.commentCount || 0;
          
          totalLikes += likes;
          totalEchoes += echoes;
          totalComments += comments;

          // Track top performing post
          const score = likes + (echoes * 2);
          if (score > topScore) {
            topScore = score;
            topPost = {
              content: (data.content || '').slice(0, 80),
              likeCount: likes,
              echoCount: echoes,
            };
          }

          // Build daily histogram
          const postTime = data.createdAt?.toDate?.()?.getTime() || 0;
          const daysAgo = Math.floor((now - postTime) / dayMs);
          if (daysAgo >= 0 && daysAgo < 7) {
            recentActivity[6 - daysAgo]++;
          }
        });

        const totalPosts = postSnap.size;
        const avgLikesPerPost = totalPosts > 0 ? Math.round((totalLikes / totalPosts) * 10) / 10 : 0;

        setStats({
          totalPosts, totalLikes, totalEchoes, totalComments,
          daysInVoid: days, avgLikesPerPost, topPost, recentActivity,
        });
      } catch (e) {
        console.error("Transmission analytics error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, [user, userProfile]);

  const StatBox = ({ label, value, icon: Icon, accent = false }: { label: string; value: number | string; icon: any; accent?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-surface border p-5 flex items-center justify-between group hover:border-primary/50 transition-all relative overflow-hidden ${
        accent ? 'border-primary/30 shadow-[0_0_15px_rgba(110,231,247,0.05)]' : 'border-ghost'
      }`}
    >
       <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
         <Icon className="w-28 h-28 text-primary" strokeWidth={1} />
       </div>
       <div className="flex flex-col relative z-10">
         <span className="text-muted text-[9px] uppercase tracking-[0.2em] mb-2">{label}</span>
         <span className={`text-3xl font-black tracking-widest leading-none ${
           accent ? 'text-primary drop-shadow-[0_0_10px_var(--accent-primary)]' : 'text-brandText'
         }`}>{value}</span>
       </div>
    </motion.div>
  );

  const maxActivity = Math.max(...stats.recentActivity, 1);
  const dayLabels = ['6d', '5d', '4d', '3d', '2d', '1d', 'Today'];

  return (
    <div className="w-full flex flex-col items-center pb-20 pt-4 px-4 md:px-4 lg:px-4 font-mono">
      <div className="w-full max-w-[850px] space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 border-b border-primary/20 pb-4">
           <div className="w-8 h-8 bg-void border border-primary/50 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-primary" strokeWidth={1.5} />
           </div>
           <div>
             <h1 className="text-xl font-black text-brandText tracking-[0.15em] uppercase">Void Stats</h1>
             <p className="text-[9px] text-muted tracking-widest uppercase mt-1">Transmission analytics dashboard</p>
           </div>
        </div>

        {isLoading ? (
          <div className="w-full h-60 flex flex-col items-center justify-center text-primary gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-[10px] text-muted tracking-widest uppercase">Decrypting analytics...</span>
          </div>
        ) : (
          <>
            {/* Primary Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Transmissions" value={stats.totalPosts} icon={Radio} accent />
              <StatBox label="Total Seen" value={stats.totalLikes} icon={Eye} accent />
              <StatBox label="Echoes" value={stats.totalEchoes} icon={RefreshCw} />
              <StatBox label="Responses" value={stats.totalComments} icon={MessageSquare} />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Days in Void" value={stats.daysInVoid} icon={Calendar} />
              <StatBox label="Followers" value={userProfile?.followerCount || 0} icon={Users} />
              <StatBox label="Avg. Seen/Post" value={stats.avgLikesPerPost} icon={TrendingUp} />
            </div>

            {/* Activity Heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-surface border border-ghost p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <span className="text-[10px] text-muted uppercase tracking-[0.15em]">7-Day Transmission Frequency</span>
              </div>
              
              <div className="flex items-end gap-2 h-24">
                {stats.recentActivity.map((count, i) => {
                  const height = maxActivity > 0 ? (count / maxActivity) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[8px] text-muted">{count > 0 ? count : ''}</span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(height, 4)}%` }}
                        transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
                        className={`w-full transition-colors ${
                          count > 0 
                            ? 'bg-primary/60 hover:bg-primary/80 shadow-[0_0_8px_rgba(110,231,247,0.2)]' 
                            : 'bg-ghost/30'
                        }`}
                      />
                      <span className="text-[7px] text-muted/60 uppercase">{dayLabels[i]}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Top Performing Signal */}
            {stats.topPost && stats.topPost.likeCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-surface border border-primary/20 p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  <span className="text-[10px] text-muted uppercase tracking-[0.15em]">Top Performing Signal</span>
                </div>
                <p className="text-sm text-brandText/80 leading-relaxed mb-3 italic">
                  "{stats.topPost.content}{stats.topPost.content.length >= 80 ? '...' : ''}"
                </p>
                <div className="flex gap-4 text-[9px] text-muted tracking-widest uppercase">
                  <span><Eye className="w-3 h-3 inline mr-1" />{stats.topPost.likeCount} seen</span>
                  <span><RefreshCw className="w-3 h-3 inline mr-1" />{stats.topPost.echoCount} echoes</span>
                </div>
              </motion.div>
            )}

            {/* Engagement Rate */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-surface border border-ghost p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <span className="text-[10px] text-muted uppercase tracking-[0.15em]">Engagement Rate</span>
              </div>
              <div className="w-full bg-void h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${Math.min(
                      stats.totalPosts > 0 
                        ? ((stats.totalLikes + stats.totalEchoes + stats.totalComments) / stats.totalPosts) * 10 
                        : 0
                    , 100)}%` 
                  }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-primary/50 to-primary shadow-[0_0_10px_var(--accent-primary)]"
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[8px] text-muted tracking-widest">LOW</span>
                <span className="text-[10px] text-primary font-bold tracking-widest">
                  {stats.totalPosts > 0 
                    ? Math.round(((stats.totalLikes + stats.totalEchoes + stats.totalComments) / stats.totalPosts) * 100) / 100
                    : 0
                  } interactions/signal
                </span>
                <span className="text-[8px] text-muted tracking-widest">HIGH</span>
              </div>
            </motion.div>
          </>
        )}
        
        {/* Footer */}
        <div className="mt-12 p-6 border border-ghost bg-surface/30">
           <p className="text-[10px] text-muted tracking-widest uppercase leading-loose text-center">
             Analytics run on local decentralized nodes. <br/>
             All footprint metrics auto-purge per encryption layer zero.
           </p>
        </div>
      </div>
    </div>
  );
};
