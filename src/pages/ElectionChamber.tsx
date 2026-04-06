import React from 'react';
import { Vote } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ElectionChamber() {
  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center">
      <Vote className="w-16 h-16 text-primary mb-6" />
      <h1 className="text-3xl font-bold mb-4 font-sans tracking-wide">Election Polling Chamber</h1>
      <p className="text-muted text-center max-w-lg mb-8">Cast your cryptographically verifiable ballot. Designed for transparency and anonymity.</p>
      
      <div className="w-full max-w-md bg-elevated border border-ghost p-6 rounded-sm">
        <p className="text-center text-sm text-brandText/70">[Ballot implementation pending]</p>
      </div>
      
      <div className="mt-8 flex gap-4 text-xs font-mono uppercase tracking-widest text-muted">
        <Link to="/chambers/election/admin" className="hover:text-primary transition-colors">Admin Portal</Link>
        <Link to="/chambers/election/results" className="hover:text-primary transition-colors">Live Results</Link>
      </div>
    </div>
  );
}
