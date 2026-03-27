import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { acceptFollowRequest, rejectFollowRequest } from '../services/followService';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell, Eye, RefreshCw, MessageSquare, UserPlus, Reply, Check, X, Loader2,
  Ghost, Skull, Fingerprint, Scan, Radio, Crosshair, Aperture
} from 'lucide-react';
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

const NOTIF_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  like:            { icon: Eye,            label: 'seen your signal',           color: 'text-primary' },
  echo:            { icon: RefreshCw,      label: 'echoed your signal',         color: 'text-primary' },
  comment:         { icon: MessageSquare,  label: 'responded to your signal',   color: 'text-brandText' },
  reply:           { icon: Reply,          label: 'replied to your echo',       color: 'text-brandText' },
  follow:          { icon: UserPlus,       label: 'established a link with you', color: 'text-[#22c55e]' },
  follow_request:  { icon: UserPlus,       label: 'wants to establish a link',  color: 'text-[#f59e0b]' },
  follow_accepted: { icon: Check,          label: 'accepted your link request', color: 'text-[#22c55e]' },
};

interface NotifData {
  id: string;
  type: string;
  actorId: string;
  actorName: string;
  actorMask: string;
  postId: string | null;
  commentId: string | null;
  read: boolean;
  createdAt: any;
}

export const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotifData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Realtime notification listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications', user.uid, 'items'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as NotifData[];
      setNotifications(notifs);
      setIsLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Auto-mark non-action notifications as read when page is viewed
  useEffect(() => {
    if (!user || notifications.length === 0) return;

    const unreadNonAction = notifications.filter(
      n => !n.read && n.type !== 'follow_request'
    );
    if (unreadNonAction.length === 0) return;

    // Batch mark as read
    const markBatch = async () => {
      const batch = writeBatch(db);
      unreadNonAction.forEach(n => {
        batch.update(doc(db, 'notifications', user.uid, 'items', n.id), { read: true });
      });
      await batch.commit();
    };

    // Small delay so the user sees them as "new" briefly
    const timer = setTimeout(markBatch, 1500);
    return () => clearTimeout(timer);
  }, [user, notifications]);

  const markAsRead = async (notifId: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'notifications', user.uid, 'items', notifId), {
      read: true,
    });
  };

  const handleAccept = async (notif: NotifData) => {
    setProcessingIds(prev => new Set(prev).add(notif.id));
    try {
      await acceptFollowRequest(notif.actorId, notif.id);
      toast.success(`Link established with ${notif.actorName}`);
    } catch (e) {
      toast.error('Failed to accept link request');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(notif.id);
        return next;
      });
    }
  };

  const handleReject = async (notif: NotifData) => {
    setProcessingIds(prev => new Set(prev).add(notif.id));
    try {
      await rejectFollowRequest(notif.id);
      toast('Link request rejected', { icon: '🚫' });
    } catch (e) {
      toast.error('Failed to reject request');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(notif.id);
        return next;
      });
    }
  };

  const handleNotifClick = (notif: NotifData) => {
    markAsRead(notif.id);
    if (notif.type === 'follow' || notif.type === 'follow_request' || notif.type === 'follow_accepted') {
      navigate(`/profile/${notif.actorId}`);
    } else if (notif.postId) {
      navigate(`/post/${notif.postId}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="w-full flex flex-col items-center pb-20 pt-4 px-4 md:px-4 lg:px-4 font-mono">
      <div className="w-full max-w-[850px] space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-primary/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-void border border-primary/50 flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-black text-brandText tracking-[0.15em] uppercase">Echoes</h1>
              <p className="text-[9px] text-muted tracking-widest uppercase mt-1">Incoming transmissions</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="bg-primary/10 border border-primary/30 text-primary text-[10px] px-3 py-1 tracking-widest uppercase">
              {unreadCount} new
            </span>
          )}
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="w-full h-40 flex flex-col items-center justify-center text-primary gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-[10px] text-muted tracking-widest uppercase">Scanning frequencies...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="w-full text-center py-20 border border-dashed border-ghost/30">
            <Bell className="w-8 h-8 text-muted/30 mx-auto mb-4" />
            <p className="text-muted text-xs tracking-widest uppercase italic">
              No echoes from the void yet.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notif, i) => {
              const config = NOTIF_CONFIG[notif.type] || NOTIF_CONFIG.like;
              const NotifIcon = config.icon;
              const MaskIcon = MASK_ICONS[notif.actorMask] || Ghost;
              const isProcessing = processingIds.has(notif.id);

              const timeString = notif.createdAt?.toDate
                ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })
                : 'just now';

              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className={`border p-4 transition-colors group ${
                    notif.read
                      ? 'bg-surface/30 border-ghost/20'
                      : 'bg-surface border-primary/20 shadow-[0_0_10px_rgba(110,231,247,0.03)]'
                  }`}
                >
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => handleNotifClick(notif)}
                  >
                    {/* Actor mask */}
                    <div className="bg-void p-2 border border-ghost/40 flex-shrink-0">
                      <MaskIcon className="w-4 h-4 text-muted" strokeWidth={1.5} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-brandText tracking-widest uppercase">
                          {notif.actorName}
                        </span>
                        <NotifIcon className={`w-3 h-3 ${config.color}`} strokeWidth={1.5} />
                        <span className={`text-[10px] ${config.color} tracking-wide`}>
                          {config.label}
                        </span>
                      </div>
                      <span className="text-[9px] text-muted tracking-widest uppercase mt-1 block">
                        {timeString}
                      </span>

                      {/* Accept / Reject for follow requests */}
                      {notif.type === 'follow_request' && (
                        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleAccept(notif)}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 bg-primary/10 border border-primary/40 text-primary text-[10px] px-4 py-2 tracking-widest uppercase font-bold hover:bg-primary hover:text-void transition-all disabled:opacity-50"
                          >
                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Accept
                          </button>
                          <button
                            onClick={() => handleReject(notif)}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 border border-ghost text-muted text-[10px] px-4 py-2 tracking-widest uppercase font-bold hover:border-danger hover:text-danger transition-all disabled:opacity-50"
                          >
                            <X className="w-3 h-3" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Unread indicator */}
                    {!notif.read && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2 shadow-[0_0_6px_var(--accent-primary)]" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
