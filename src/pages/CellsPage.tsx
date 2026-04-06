import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ghost } from 'lucide-react';

const SEED_ROOMS = [
  { id: 'VOID_POLITICS', category: 'POLITICS', desc: 'uncensored political discourse, pure noise.', ghosts: 42, tag: 'HOT', tagColor: '#a855f7' /* purple */ },
  { id: 'SIGNAL_SPORTS', category: 'SPORTS', desc: 'live sports commentary and rapid reactions.', ghosts: 18, tag: 'LIVE', tagColor: '#14b8a6' /* teal */ },
  { id: 'DARKNET_TECH', category: 'TECH', desc: 'systems architecture and 0-day drops.', ghosts: 89, tag: 'ENCRYPTED', tagColor: '#3b82f6' /* blue */ },
  { id: 'RAW_FEED', category: 'NEWS', desc: 'unfiltered breaking global events.', ghosts: 112, tag: 'LIVE', tagColor: '#ff7f50' /* coral */ },
  { id: 'GHOST_GOSSIP', category: 'GOSSIP', desc: 'rumors, whispers, and unverified secrets.', ghosts: 56, tag: 'VOLATILE', tagColor: '#ec4899' /* pink */ },
  { id: 'VOID_CRYPTO', category: 'CRYPTO', desc: 'market signals and degenerate trading.', ghosts: 104, tag: 'HOT', tagColor: '#f59e0b' /* amber */ },
  { id: 'HEART_BEAT', category: 'LOVE', desc: 'relationships, romance, and broken hearts.', ghosts: 34, tag: 'VOLATILE', tagColor: '#ef4444' /* red */ },
  { id: 'CAMPUS_GIST', category: 'CAMPUS GIST', desc: 'academic secrets and local campus rumors.', ghosts: 77, tag: 'HOT', tagColor: '#8b5cf6' /* violet */ },
  { id: 'ECHO_CHAMBER', category: 'ALL', desc: 'the general testing grounds.', ghosts: 23, tag: 'LIVE', tagColor: '#6b7280' /* gray */ },
  { id: 'NULL_ZONE', category: 'ALL', desc: 'random noise, proceed at your own risk.', ghosts: 9, tag: 'VOLATILE', tagColor: '#6b7280' /* gray */ },
];

const CATEGORIES = ['ALL', 'POLITICS', 'SPORTS', 'TECH', 'NEWS', 'CRYPTO', 'GOSSIP', 'LOVE', 'CAMPUS GIST'];

export const CellsPage = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('ALL');
  
  // Dummy states representing soon-to-be Firebase data
  const [stats] = useState({
    cellsLive: 8,
    ghostsActive: 453,
    signalsToday: 2194
  });

  const filteredRooms = filter === 'ALL' 
    ? SEED_ROOMS 
    : SEED_ROOMS.filter(r => r.category === filter);

  return (
    <div className="w-full flex-1 min-h-[calc(100vh-60px)] flex flex-col p-4 md:p-8 bg-[#0d0f0e] relative overflow-hidden font-mono">
      {/* Background layer */}
      <div className="absolute inset-0 bg-noise mix-blend-overlay opacity-20 pointer-events-none"></div>

      {/* Header */}
      <header className="mb-8 relative z-10 flex flex-col items-start gap-2">
        <h1 className="text-[1.5rem] md:text-3xl text-[#3ecfa0] font-bold tracking-widest uppercase">
          // CELLS
        </h1>
        <p className="text-muted text-xs md:text-sm tracking-[0.1em] uppercase">
          anonymous broadcast rooms — join any cell to transmit
        </p>
      </header>

      {/* Stat Counters */}
      <div className="grid grid-cols-3 gap-4 mb-8 relative z-10 max-w-2xl border-y border-[#1a2922] py-4 bg-[#111815]/50">
        <div className="flex flex-col items-center justify-center border-r border-[#1a2922]">
          <span className="text-[#3ecfa0] font-bold text-lg md:text-2xl">{stats.cellsLive}</span>
          <span className="text-muted text-[10px] md:text-xs tracking-widest mt-1">CELLS LIVE</span>
        </div>
        <div className="flex flex-col items-center justify-center border-r border-[#1a2922]">
          <span className="text-primary font-bold text-lg md:text-2xl">{stats.ghostsActive}</span>
          <span className="text-muted text-[10px] md:text-xs tracking-widest mt-1">GHOSTS ACTIVE</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-primary font-bold text-lg md:text-2xl">{stats.signalsToday}</span>
          <span className="text-muted text-[10px] md:text-xs tracking-widest mt-1">SIGNALS TODAY</span>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-8 relative z-10">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 text-xs tracking-widest uppercase border transition-all duration-200 ${
              filter === cat
                ? 'bg-[#3ecfa0]/10 text-[#3ecfa0] border-[#3ecfa0]'
                : 'bg-[#111815] text-muted border-[#1a2922] hover:border-[#3ecfa0]/50 hover:text-primary'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {filteredRooms.map(room => (
          <div 
            key={room.id}
            className="group relative bg-[#111815] border border-[#1a2922] p-5 flex flex-col gap-4 overflow-hidden transition-all duration-300 hover:border-[#3ecfa0]/30"
          >
            {/* Left Accent Bar */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#3ecfa0] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse-glow shadow-[0_0_8px_#22c55e]"></div>
                <h2 className="font-bold text-primary tracking-wider">{room.id}</h2>
              </div>
              
              {/* Category Tag Badge */}
              <span 
                className="text-[9px] px-2 py-0.5 border"
                style={{
                  color: room.tagColor,
                  borderColor: `${room.tagColor}50`,
                  backgroundColor: `${room.tagColor}10`
                }}
              >
                {room.tag}
              </span>
            </div>

            <p className="text-muted text-sm leading-relaxed min-h-[40px]">
              {room.desc}
            </p>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#1a2922]">
              <div className="flex items-center gap-1.5 text-muted text-xs">
                <Ghost size={14} />
                <span>{room.ghosts} ghosts</span>
              </div>
              
              <button
                onClick={() => navigate(`/cells/${room.id}`)}
                className="text-[#3ecfa0] text-xs tracking-widest hover:text-primary transition-colors flex items-center gap-1.5"
              >
                [ ENTER ]
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
