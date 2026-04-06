
import { CheckCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function SubmissionSuccessPage() {
  const location = useLocation();
  const trackingId = location.state?.trackingId || 'UNKNOWN_OR_ENCRYPTED';

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center font-mono">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-primary" />
      </div>
      
      <h1 className="text-2xl font-bold mb-2">Protocol Complete</h1>
      <p className="text-muted text-sm text-center max-w-md mb-8">
        Your data packet has been encrypted and secured in the Anonymax Chamber ledger.
      </p>

      <div className="w-full max-w-sm border border-ghost p-4 bg-elevated text-center mb-8">
        <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Session Token Hash</p>
        <p className="text-sm font-bold text-brandText break-all">{trackingId}</p>
      </div>

      <Link to="/chambers" className="px-6 py-2 border border-primary text-primary hover:bg-primary hover:text-void transition-colors uppercase tracking-widest text-xs font-bold">
        Return to Nexus
      </Link>
    </div>
  );
}
