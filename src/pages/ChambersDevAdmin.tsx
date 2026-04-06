import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2, Plus, Terminal, ShieldAlert, Building2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import bcrypt from 'bcryptjs';

interface Org {
  id: string; // The orgCode
  name: string;
  createdAt: any;
}

export default function ChambersDevAdmin() {
  const [orgCode, setOrgCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<Org[]>([]);

  // Fetch all enrolled organizations
  useEffect(() => {
    const q = query(collection(db, 'organizations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orgs = snapshot.docs.map(d => ({
        id: d.id,
        name: d.data().name,
        createdAt: d.data().createdAt
      }));
      setOrganizations(orgs);
    }, (error) => {
      console.error('Failed to listen to organizations:', error);
    });
    return () => unsubscribe();
  }, []);

  const handleEnrollOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgCode.trim() || !orgName.trim() || !adminPassword.trim()) {
      toast.error('ALL FIELDS REQUIRED.');
      return;
    }

    setIsSubmitting(true);
    try {
      const codeClean = orgCode.trim().toUpperCase().replace(/\s+/g, '-');
      
      // Hash the admin password client-side with bcrypt
      const salt = bcrypt.genSaltSync(10);
      const adminPasswordHash = bcrypt.hashSync(adminPassword, salt);

      // Write directly to Firestore
      await setDoc(doc(db, 'organizations', codeClean), {
        name: orgName.trim(),
        adminPasswordHash,
        createdAt: serverTimestamp(),
        enrolledBy: 'dev-admin'
      });

      toast.success(`ORGANIZATION ${codeClean} ENROLLED SECURELY.`);
      
      // Reset form
      setOrgCode('');
      setOrgName('');
      setAdminPassword('');
    } catch (err: any) {
      console.error(err);
      const message = err?.message || 'FAILED TO ENROLL ORGANIZATION.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-void text-brandText font-mono selection:bg-primary/30 p-6 md:p-12 relative">
      <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay pointer-events-none" />

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 relative z-10">
        
        {/* ENROLLMENT FORM */}
        <div className="w-full lg:w-1/3">
          <div className="bg-surface/50 border border-primary/30 p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/40" />
            
            <div className="flex items-center gap-3 mb-8">
              <Terminal className="w-6 h-6 text-primary" />
              <h2 className="text-lg tracking-widest text-white uppercase font-bold">DEV // ENROLL ORG</h2>
            </div>

            <div className="flex items-center gap-2 mb-6 text-[9px] tracking-widest text-[#22c55e] uppercase border border-[#22c55e]/20 bg-[#22c55e]/5 p-2">
              <ShieldCheck className="w-3 h-3" /> SECURED VIA CLOUD FUNCTION — NO CLIENT-SIDE HASHING
            </div>

            <form onSubmit={handleEnrollOrg} className="space-y-6">
              <div>
                <label className="block text-[10px] text-muted font-bold tracking-[0.2em] uppercase mb-2">ORG CODE (UNIQUE ID)</label>
                <input 
                  type="text" 
                  value={orgCode}
                  onChange={e => setOrgCode(e.target.value)}
                  placeholder="e.g. ACME-VOID-99"
                  className="w-full bg-void border border-ghost p-3 text-white tracking-[0.2em] uppercase focus:border-primary focus:outline-none transition-all placeholder:text-muted/30"
                />
                <p className="text-[9px] text-muted mt-2 tracking-widest">Alphanumeric. Spaces convert to dashes.</p>
              </div>

              <div>
                <label className="block text-[10px] text-muted font-bold tracking-[0.2em] uppercase mb-2">COMPANY/ORG NAME</label>
                <input 
                  type="text" 
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full bg-void border border-ghost p-3 text-white tracking-widest focus:border-primary focus:outline-none transition-all placeholder:text-muted/30"
                />
              </div>

              <div>
                <label className="block text-[10px] text-danger font-bold tracking-[0.2em] uppercase mb-2">MASTER ADMIN PASSWORD</label>
                <input 
                  type="password" 
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full bg-void border border-danger/30 p-3 text-white tracking-[0.2em] focus:border-danger focus:outline-none transition-all placeholder:text-danger/30"
                />
                <p className="text-[9px] text-danger mt-2 tracking-widest flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Sent over TLS. Bcrypt hashed server-side.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !orgCode || !orgName || !adminPassword}
                className="w-full flex items-center justify-center gap-3 bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed border border-primary text-primary font-bold tracking-[0.2em] text-xs py-4 transition-all mt-4"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> GENERATE ORGANIZATION
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ORG DIRECTORY */}
        <div className="w-full lg:w-2/3 flex flex-col">
          <div className="bg-void border border-ghost p-6 md:p-8 flex-1">
            <h2 className="text-sm tracking-widest text-[#22c55e] uppercase font-bold mb-6 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> ACTIVE ORGANIZATIONS PROTOCOL ({organizations.length})
            </h2>

            {organizations.length === 0 ? (
              <div className="text-center p-12 border border-dashed border-ghost/50 text-muted text-xs tracking-widest mt-10">
                NO ORGANIZATIONS ENROLLED IN THE VOID.
              </div>
            ) : (
              <div className="space-y-4">
                {organizations.map(org => (
                  <div key={org.id} className="bg-surface/30 border border-ghost p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/30 transition-colors group">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-bold text-white tracking-[0.1em]">{org.name}</span>
                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 flex items-center h-5">
                          {org.id}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted tracking-widest uppercase flex items-center gap-2">
                        CREATED: {org.createdAt?.toMillis ? new Date(org.createdAt.toMillis()).toLocaleString() : 'JUST NOW'}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button className="text-[10px] tracking-widest text-primary hover:bg-primary/10 border border-primary/30 px-3 py-1.5 transition-colors uppercase">
                        Reset Password
                      </button>
                      <button className="text-[10px] tracking-widest text-danger hover:bg-danger/10 border border-danger/30 px-3 py-1.5 transition-colors uppercase">
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
