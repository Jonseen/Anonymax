import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { logoutUser } from '../../services/authService';
import { BroadcastModal } from '../modals/BroadcastModal';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import type { PostData } from '../feed/PostCard';
import type { UserDoc } from '../../lib/firestoreSchema';
import {
  LogOut, Home, Bell, Settings, Search, Mail, Ghost, Eye, Skull, Fingerprint, Users, Bookmark, BarChart2, ShieldAlert, Scan, Radio, Crosshair, Aperture, Shield
} from 'lucide-react';

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

export const AppShell = () => {
  const { user, userProfile } = useAuth();
  const { isBroadcastModalOpen, openBroadcastModal, closeBroadcastModal } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTransmissions, setActiveTransmissions] = useState<PostData[]>([]);
  const [nearbyGhosts, setNearbyGhosts] = useState<UserDoc[]>([]);

  // Realtime unread notification counter
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications', user.uid, 'items'),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    });
    return () => unsub();
  }, [user]);

  // Sidebar live widgets
  useEffect(() => {
    // Fetch recent 100 posts to calculate real-time trending engagement scores
    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      const allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() } as PostData));
      // Exclude wiped posts from trending
      const activePosts = allPosts.filter(p => !p.isDeleted);
      const topEngagements = activePosts.sort((a, b) => {
        const scoreA = (a.likeCount || 0) + (a.echoCount || 0) * 2 + (a.commentCount || 0) * 3;
        const scoreB = (b.likeCount || 0) + (b.echoCount || 0) * 2 + (b.commentCount || 0) * 3;
        return scoreB - scoreA;
      }).slice(0, 6);
      setActiveTransmissions(topEngagements);
    });

    const qUsers = query(collection(db, 'users'), orderBy('lastSeen', 'desc'), limit(5));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setNearbyGhosts(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserDoc)));
    });

    return () => {
      unsubPosts();
      unsubUsers();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await logoutUser();
      navigate('/login');
    } catch (e) {
      console.error("Disconnection sequence failed:", e);
    }
  };

  const navLinks = [
    { icon: Home, label: 'Feed', path: '/feed' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Users, label: 'Cells', path: '/cells' },
    { icon: Bookmark, label: 'Saved Signals', path: '/saved' },
    { icon: BarChart2, label: 'Void Stats', path: '/stats' },
    { icon: Shield, label: 'Chambers', path: '/chambers' },
    { icon: ShieldAlert, label: 'Encryption', path: '/encryption' },
  ];

  const Mask = MASK_ICONS[userProfile?.mask || 'ghost'] || Ghost;
  const shortUid = user?.uid.slice(-5).toUpperCase() || 'XXXXX';

  return (
    <div className="min-h-screen bg-transparent text-brandText flex flex-col font-sans selection:bg-primary/30">

      {/* GLOBAL TOP NAV */}
      <nav className="sticky top-0 z-50 w-full bg-void/95 backdrop-blur-md border-b border-ghost h-[60px] flex items-center justify-between px-4 lg:px-8">

        <div className="flex items-center gap-10">
          <Link to="/feed" className="flex items-center">
            <span className="font-mono font-black text-xl tracking-[0.2em] text-primary">
              ANONYMAX
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-6">
            {[
              { name: 'FEED', path: '/feed' },
              { name: 'SIGNALS', path: '/signals' },
              { name: 'GHOSTS', path: '/ghosts' },
              { name: 'VOID MARKET', path: '/market' }
            ].map(link => (
              <Link key={link.name} to={link.path} className="text-xs font-mono font-bold tracking-[0.15em] text-muted hover:text-brandText hover:drop-shadow-[0_0_5px_var(--text-primary)] transition-all">
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 lg:gap-6">
          <button onClick={() => navigate('/notifications')} className="text-muted hover:text-primary transition-colors hidden sm:block hover:drop-shadow-[0_0_5px_var(--accent-primary)] relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-danger text-void text-[9px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-void shadow-[0_0_8px_var(--danger)]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => navigate('/messages')} className="text-muted hover:text-primary transition-colors relative hidden sm:block hover:drop-shadow-[0_0_5px_var(--accent-primary)]">
            <Mail className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-void"></div>
          </button>
          <button onClick={() => navigate('/settings')} className="text-muted hover:text-primary transition-colors hidden sm:block hover:drop-shadow-[0_0_5px_var(--accent-primary)]"><Settings className="w-5 h-5" /></button>

          <button onClick={() => openBroadcastModal()} className="hidden sm:flex items-center gap-2 bg-void border border-primary text-primary px-6 py-2 rounded-sm font-mono text-xs tracking-widest uppercase hover:bg-primary hover:text-void transition-all animate-pulse-glow mx-2">
            BROADCAST
          </button>

          <div className="w-9 h-9 rounded-full bg-surface border-2 border-primary flex items-center justify-center overflow-hidden cursor-pointer shadow-[0_0_10px_var(--accent-primary)] hover:bg-primary/10 transition-all ml-2" onClick={() => navigate(`/profile/${user?.uid}`)}>
            <Mask className="w-5 h-5 text-primary" />
          </div>

          <button onClick={handleSignOut} title="Sever Connection" className="text-muted hover:text-danger transition-colors relative hover:drop-shadow-[0_0_5px_var(--accent-danger)] ml-2">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* THREE COLUMN GRID */}
      <div className="flex-1 w-full max-w-[1500px] mx-auto flex relative pb-20 md:pb-0">

        {/* LEFT NAV SIDEBAR */}
        <aside className="hidden md:flex flex-col w-[260px] fixed top-[60px] bottom-0 overflow-y-auto bg-transparent border-r border-ghost py-6 z-40">

          <div className="px-6 mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-void rounded-full flex items-center justify-center border border-primary/30 shadow-[0_0_10px_var(--accent-primary)]">
              <Mask className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-brandText uppercase truncate w-24">Ghost_{shortUid}</span>
              <div className="flex items-center gap-1.5 mt-1 text-[9px]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse glow-green"></div>
                <span className="text-[#22c55e] tracking-widest uppercase">NODE ACTIVE</span>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 font-mono">
            {navLinks.map((link) => {
              const isActive = location.pathname.includes(link.path) || (link.path === '/feed' && location.pathname === '/');
              const Icon = link.icon;

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-4 px-6 py-4 text-xs tracking-widest font-bold transition-all relative ${isActive
                      ? 'text-primary bg-surface'
                      : 'text-muted hover:text-brandText hover:bg-surface/50'
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_var(--accent-primary)]"
                    />
                  )}
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary drop-shadow-[0_0_5px_var(--accent-primary)]' : ''}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-6 mt-auto">
            <button className="w-full bg-transparent border border-ghost hover:border-primary/50 hover:bg-primary/5 text-muted hover:text-primary transition-all py-3 text-[10px] font-mono tracking-widest uppercase shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
              GO DARK — Upgrade Anonymity
            </button>
            <div className="flex gap-4 mt-6 text-[9px] text-muted font-mono tracking-widest uppercase justify-center">
              <span className="hover:text-brandText cursor-pointer">PROTOCOL</span>
              <span className="hover:text-brandText cursor-pointer">MANIFESTO</span>
            </div>
          </div>
        </aside>

        {/* MAIN FEED CONTENT PORTAL */}
        <main className="flex-1 w-full md:pl-[260px] lg:pr-[300px]">
          <Outlet />
        </main>

        {/* RIGHT WIDGET SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-[300px] fixed top-[60px] right-0 bottom-0 overflow-y-auto bg-transparent border-l border-ghost py-8 px-6 z-40 font-mono">

          <div className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[11px] font-bold tracking-[0.1em] text-primary uppercase flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping"></div>
                TRENDING SIGNALS
              </h3>
              <Settings className="w-4 h-4 text-muted hover:text-primary cursor-pointer transition-colors" />
            </div>

            <div className="space-y-5">
              {activeTransmissions.map((post) => {
                return (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/post/${post.id}`)}
                    className="flex flex-col gap-1 cursor-pointer group"
                  >
                    <span className="text-[9px] text-muted uppercase tracking-widest group-hover:text-primary transition-colors">
                      {post.visibility === 'ghosts' ? '[ENCRYPTED] // ' : 'BROADCAST // '}SIGNAL_{post.id.slice(0, 4).toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-brandText group-hover:text-white transition-colors line-clamp-2">
                      {post.content}
                    </span>
                  </div>
                );
              })}
            </div>

            <button className="text-[9px] text-primary hover:text-brandText tracking-widest uppercase font-bold mt-6 hover:underline">
              LOAD MORE SIGNALS
            </button>
          </div>

          <div className="mb-10">
            <h3 className="text-[11px] font-bold tracking-[0.1em] text-primary/70 uppercase mb-6">ACTIVE GHOSTS</h3>
            <div className="space-y-4">
              {(() => {
                const now = Date.now();
                const activeGhostsList = nearbyGhosts.filter(g => {
                  if (g.uid === user?.uid) return false;
                  let lsTime = 0;
                  if (g.lastSeen) {
                    if (typeof (g.lastSeen as any).toMillis === 'function') {
                      lsTime = (g.lastSeen as any).toMillis();
                    } else if ((g.lastSeen as any).seconds) {
                      lsTime = (g.lastSeen as any).seconds * 1000;
                    } else {
                      lsTime = new Date(g.lastSeen as unknown as string).getTime();
                    }
                  }
                  // 15 minutes freshness threshold
                  return (now - lsTime) <= 15 * 60 * 1000;
                }).slice(0, 4);

                if (activeGhostsList.length === 0) {
                  return (
                    <div className="text-[10px] text-muted tracking-widest uppercase italic border border-dashed border-ghost/30 p-3 text-center">
                      No active ghosts detected.
                    </div>
                  );
                }

                return activeGhostsList.map((ghost) => {
                  const UIcon = MASK_ICONS[ghost.maskIcon || ghost.mask || 'ghost'] || Ghost;
                  return (
                    <div
                      key={ghost.uid}
                      onClick={() => navigate(`/profile/${ghost.uid}`)}
                      className="flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-void border border-ghost flex items-center justify-center relative hover:border-primary/50 transition-colors">
                          <UIcon className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-brandText group-hover:text-primary transition-colors">
                            {ghost.displayName}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 bg-[#22c55e] rounded-full shadow-[0_0_5px_#22c55e]"></div>
                            <span className="text-[9px] tracking-widest text-[#22c55e] uppercase">ONLINE</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

        </aside>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-void/95 backdrop-blur-md border-t border-ghost flex items-center justify-around px-2 z-50">
        {navLinks.slice(0, 3).map((link) => {
          const isActive = location.pathname.includes(link.path) || (link.path === '/feed' && location.pathname === '/');
          const Icon = link.icon;
          return (
            <Link key={link.path} to={link.path} className="flex flex-col items-center justify-center w-16 h-full relative text-muted hover:text-brandText transition-colors">
              {isActive && (
                <motion.div layoutId="mobileNav" className="absolute top-0 left-2 right-2 h-[2px] bg-primary shadow-[0_0_8px_var(--accent-primary)]" />
              )}
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-primary drop-shadow-[0_0_5px_var(--accent-primary)]' : ''}`} />
            </Link>
          );
        })}
        {/* Notification bell with badge */}
        <Link to="/notifications" className="flex flex-col items-center justify-center w-16 h-full relative text-muted hover:text-brandText transition-colors">
          {location.pathname === '/notifications' && (
            <motion.div layoutId="mobileNav" className="absolute top-0 left-2 right-2 h-[2px] bg-primary shadow-[0_0_8px_var(--accent-primary)]" />
          )}
          <div className="relative">
            <Bell className={`w-5 h-5 mb-1 ${location.pathname === '/notifications' ? 'text-primary drop-shadow-[0_0_5px_var(--accent-primary)]' : ''}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] bg-danger text-void text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 border border-void">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </Link>
      </nav>

      <BroadcastModal isOpen={isBroadcastModalOpen} onClose={closeBroadcastModal} />
    </div>
  );
};
