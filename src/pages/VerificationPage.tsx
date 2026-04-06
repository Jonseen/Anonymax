import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function VerificationPage() {
  const { token } = useParams();

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center font-mono">
      <Shield className="w-16 h-16 text-primary mb-6 animate-pulse" />
      <h1 className="text-2xl font-bold mb-4">Cryptographic Verification</h1>
      
      <div className="w-full max-w-lg border border-primary/50 p-6 bg-surface mb-8">
        <p className="text-[10px] text-muted uppercase tracking-widest mb-2">Analyzing Token Signature</p>
        <p className="text-sm text-primary break-all">{token}</p>
        
        <div className="mt-6 pt-6 border-t border-ghost">
          <p className="text-xs text-brandText">[Ledger Sync in Progress...]</p>
        </div>
      </div>
      
      <Link to="/chambers" className="text-xs text-muted hover:text-primary transition-colors tracking-widest uppercase">
        Abort Sequence
      </Link>
    </div>
  );
}
