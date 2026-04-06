import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  ShieldAlert, 
  AlertTriangle, 
  MessageSquare, 
  ShieldX, 
  FileText, 
  Siren,
  Loader2,
  Lock,
  ArrowRight,
  Activity
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SubmissionForm } from '../components/corporate/SubmissionForm';

type Step = 1 | 2 | 3 | 4;
type Category = 'misconduct' | 'safety' | 'management' | 'policy' | 'general' | 'whistleblower';
type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface CategoryOption {
  id: Category;
  label: string;
  icon: React.ElementType;
  colorClass: string;
  glowClass: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'misconduct', label: 'Misconduct / Harassment', icon: ShieldAlert, colorClass: 'text-[#ff4d6d]', glowClass: 'hover:border-[#ff4d6d] hover:shadow-[0_0_15px_rgba(255,77,109,0.2)]' },
  { id: 'safety', label: 'Workplace Safety Concern', icon: AlertTriangle, colorClass: 'text-[#fbbf24]', glowClass: 'hover:border-[#fbbf24] hover:shadow-[0_0_15px_rgba(251,191,36,0.2)]' },
  { id: 'management', label: 'Management Feedback', icon: MessageSquare, colorClass: 'text-[#3b82f6]', glowClass: 'hover:border-[#3b82f6] hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]' },
  { id: 'policy', label: 'Policy Violation', icon: ShieldX, colorClass: 'text-[#22c55e]', glowClass: 'hover:border-[#22c55e] hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]' },
  { id: 'general', label: 'General Anonymous Feedback', icon: FileText, colorClass: 'text-[#e8e8ec]', glowClass: 'hover:border-[#e8e8ec] hover:shadow-[0_0_15px_rgba(232,232,236,0.2)]' },
  { id: 'whistleblower', label: 'Whistleblower Report', icon: Siren, colorClass: 'text-[#c084fc]', glowClass: 'hover:border-[#c084fc] hover:shadow-[0_0_15px_rgba(192,132,252,0.2)] border-[#c084fc]/30 bg-[#c084fc]/5' },
];

const SEVERITIES: { id: Severity; label: string; color: string }[] = [
  { id: 'LOW', label: 'LOW', color: 'text-[#22c55e]' },
  { id: 'MEDIUM', label: 'MEDIUM', color: 'text-[#fbbf24]' },
  { id: 'HIGH', label: 'HIGH', color: 'text-[#f97316]' },
  { id: 'CRITICAL', label: 'CRITICAL', color: 'text-[#ff4d6d]' },
];

export default function CorporateChamber() {
  const [step, setStep] = useState<Step>(1);
  const [orgCode, setOrgCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgCode.trim()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const orgRef = doc(db, 'organizations', orgCode.trim().toUpperCase());
      const orgSnap = await getDoc(orgRef);
      
      if (orgSnap.exists()) {
        const data = orgSnap.data();
        setOrgName(data.name || 'UNKNOWN_ORG_NAME');
        setStep(2);
      } else {
        setError('SIGNAL NOT RECOGNIZED. CHECK YOUR CODE.');
      }
    } catch (err) {
      console.error(err);
      setError('CONNECTION SECURE BUT VALIDATION FAILED. TRY AGAIN.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center font-mono bg-void text-brandText relative selection:bg-primary/30">
      {/* Background Accent */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        
        {/* Header Persistent State */}
        <div className="mb-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-void border border-primary/30 flex items-center justify-center text-primary shadow-[inset_0_0_15px_rgba(110,231,247,0.1)] mb-6">
            <Building2 className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] text-white">CORPORATE VOID</h1>
          
          <AnimatePresence mode="wait">
            {step > 1 && orgName ? (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 flex items-center gap-3 text-xs tracking-widest uppercase bg-primary/10 border border-primary/20 px-4 py-2 text-primary"
              >
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--accent-primary)]" />
                <span>{orgName} // VOID ACTIVE</span>
              </motion.div>
            ) : (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-primary/70 text-xs tracking-[0.2em] uppercase mt-2"
              >
                Anonymous workplace feedback & incident reporting
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Step Manager */}
        <div className="relative">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: ORGANIZATION CODE */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <form onSubmit={handleValidateOrg} className="bg-surface/50 border border-ghost p-8 md:p-12 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary/30" />
                  
                  <div className="flex items-center gap-3 mb-8">
                    <Lock className="w-5 h-5 text-primary" />
                    <h2 className="text-sm tracking-widest text-primary uppercase font-bold">Authentication Required</h2>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs text-muted font-bold tracking-[0.2em] uppercase mb-4">
                        ENTER YOUR ORGANIZATION CODE
                      </label>
                      <input
                        type="text"
                        value={orgCode}
                        onChange={(e) => setOrgCode(e.target.value)}
                        placeholder="e.g. ACME-VOID-99"
                        className="w-full bg-void border border-primary/30 text-white text-lg tracking-[0.2em] uppercase p-4 focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(110,231,247,0.2)] transition-all placeholder:text-muted/50"
                        autoFocus
                      />
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-danger/10 border border-danger/30 text-danger text-xs tracking-widest uppercase p-3 flex items-center gap-3"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={!orgCode.trim() || isLoading}
                      className="w-full flex items-center justify-center gap-3 bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed border border-primary text-primary font-bold tracking-[0.2em] text-sm py-4 transition-all"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          ACCESS VOID
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
                
                <div className="mt-8 text-center text-[10px] tracking-widest text-muted uppercase">
                  <Link to="/chambers/corporate/admin" className="hover:text-primary transition-colors flex items-center justify-center gap-2">
                    I'm an admin <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* STEP 2: CATEGORY SELECTION */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="w-full space-y-8"
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-primary" />
                  <h2 className="text-sm tracking-widest text-white uppercase font-bold">Select Designation Payload</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setCategory(cat.id);
                          // Auto move to step 3 after short delay for UX
                          setTimeout(() => setStep(3), 400);
                        }}
                        className={`flex flex-col items-center justify-center gap-4 p-8 border transition-all duration-300 relative text-center
                          ${isSelected 
                            ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(110,231,247,0.15)] scale-[1.02] z-10' 
                            : `bg-surface border-ghost ${cat.glowClass}`
                          }`}
                      >
                        <Icon className={`w-8 h-8 ${cat.colorClass}`} strokeWidth={1.5} />
                        <span className={`text-xs font-bold tracking-widest uppercase ${isSelected ? 'text-white' : 'text-brandText/80'}`}>
                          {cat.label}
                        </span>
                        
                        {cat.id === 'whistleblower' && !isSelected && (
                          <span className="absolute top-2 right-2 text-[8px] bg-[#c084fc]/20 text-[#c084fc] px-1.5 py-0.5 tracking-widest font-bold">
                            HIGH PRIORITY
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 3: SEVERITY LEVEL */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="w-full space-y-8"
              >
                <button 
                  onClick={() => setStep(2)}
                  className="text-xs text-muted hover:text-primary tracking-widest uppercase mb-4 flex items-center gap-2"
                >
                  ← BACK TO CATEGORIES
                </button>

                <div className="bg-surface/50 border border-ghost p-8 md:p-12 relative">
                   <div className="absolute top-0 left-0 w-full h-1 bg-primary/30" />
                   
                   <div className="flex items-center gap-3 mb-8">
                    <Activity className="w-5 h-5 text-primary" />
                    <h2 className="text-sm tracking-widest text-white uppercase font-bold">Assess Threat Severity</h2>
                  </div>

                  <p className="text-xs text-muted tracking-widest uppercase mb-6">
                    Select the severity of the incident. CRITICAL flags auto-route for immediate admin review.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {SEVERITIES.map((sev) => {
                      const isSelected = severity === sev.id;
                      return (
                        <button
                          key={sev.id}
                          onClick={() => setSeverity(sev.id)}
                          className={`flex items-center justify-center py-4 border transition-all text-xs font-bold tracking-widest uppercase
                            ${isSelected 
                              ? `bg-surface border-ghost shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] ${sev.color}` 
                              : 'bg-void border-ghost/30 text-muted hover:bg-surface/50 hover:border-ghost'
                            }`}
                        >
                          {sev.label}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => setStep(4)}
                    disabled={!severity}
                    className="w-full flex items-center justify-center gap-3 bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed border border-primary text-primary font-bold tracking-[0.2em] text-sm py-4 transition-all"
                  >
                    CONTINUE TO PROTOCOL <ArrowRight className="w-4 h-4" />
                  </button>

                </div>
              </motion.div>
            )}

            {/* STEP 4: SUBMISSION FORM */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <button 
                  onClick={() => setStep(3)}
                  className="text-xs text-muted hover:text-primary tracking-widest uppercase mb-4 flex items-center gap-2"
                >
                  ← BACK TO SEVERITY
                </button>

                <div className="bg-surface/50 border border-ghost p-6 md:p-10 relative">
                   <div className="absolute top-0 left-0 w-full h-1 bg-primary/30" />
                   
                   <div className="flex items-center gap-3 mb-8">
                    <FileText className="w-5 h-5 text-primary" />
                    <h2 className="text-sm tracking-widest text-white uppercase font-bold">Encrypted Incident Payload</h2>
                  </div>

                  <SubmissionForm 
                    orgCode={orgCode.trim().toUpperCase()} 
                    category={category!} 
                    severity={severity!} 
                  />
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
