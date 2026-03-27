import { ShieldAlert, Key, Trash2, EyeOff, RadioTower } from 'lucide-react';
import { useAuth } from '../store/authStore';

export const EncryptionPage = () => {
  const { user } = useAuth();
  
  const shortUid = user?.uid.slice(-5).toUpperCase() || 'XXXXX';

  const SecuritySetting = ({ label, desc, icon: Icon, action }: { label: string, desc: string, icon: any, action: string }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border border-ghost bg-surface/50 hover:bg-surface transition-colors cursor-pointer group">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-none bg-void border border-primary/30 flex items-center justify-center mt-1 flex-shrink-0 group-hover:border-primary transition-colors">
          <Icon className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-brandText tracking-wider">{label}</span>
          <span className="text-[10px] text-muted uppercase tracking-widest mt-1 leading-relaxed">{desc}</span>
        </div>
      </div>
      <button className="mt-4 sm:mt-0 px-4 py-2 border border-ghost text-[10px] tracking-widest text-brandText uppercase hover:border-primary hover:text-primary transition-colors bg-void align-self-end">
        {action}
      </button>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center pb-20 pt-4 px-4 md:px-4 lg:px-4 font-mono">
      <div className="w-full max-w-[850px] space-y-6">
        
        <div className="flex items-center justify-between mb-8 border-b border-primary/20 pb-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-void border border-primary/50 flex items-center justify-center shadow-[0_0_10px_var(--accent-primary)]">
                <ShieldAlert className="w-4 h-4 text-primary" strokeWidth={1.5} />
             </div>
             <h1 className="text-xl font-black text-brandText tracking-[0.15em] uppercase">Encryption</h1>
          </div>
          <span className="text-[9px] text-[#22c55e] border border-[#22c55e]/30 px-2 py-1 uppercase tracking-widest bg-[#22c55e]/5">
            NODE SECURE
          </span>
        </div>

        <div className="space-y-4">
          <SecuritySetting 
             label="Rotate Cipher Key"
             desc="Change your master authentication password"
             icon={Key}
             action="Update"
          />
          <SecuritySetting 
             label="Transmission Visibility"
             desc="Default to pure anonymity pool instead of public scope"
             icon={EyeOff}
             action="Toggle"
          />
          <SecuritySetting 
             label="Active Nodes"
             desc={`Current Session: SECTOR_7_IP_TRUNCATED [Ghost_${shortUid}]`}
             icon={RadioTower}
             action="Revoke All"
          />
          
          <div className="mt-12 pt-6 border-t border-danger/20">
            <SecuritySetting 
               label="Scrub Ghost Footprint"
               desc="Permanently delete identity, signals, and trace data"
               icon={Trash2}
               action="Delete Record"
            />
          </div>
        </div>

      </div>
    </div>
  );
};
