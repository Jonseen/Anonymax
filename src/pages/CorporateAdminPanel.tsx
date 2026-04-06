import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  ShieldCheck, 
  Loader2, 
  Filter, 
  Download, 
  AlertTriangle, 
  Clock, 
  LogOut,
  Siren,
  Activity,
  FileArchive
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import bcrypt from 'bcryptjs';
import CryptoJS from 'crypto-js';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

// --- Types ---
type Status = 'new' | 'reviewing' | 'resolved' | 'escalated';
type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface EncryptedSubmissionDoc {
  orgCode: string;
  category: string;
  severity: Severity;
  encryptedPayload: string;
  submittedAt: any;
  status: Status;
  isRead: boolean;
  token: string;
  adminNotes?: string;
}

interface DecryptedPayload {
  title: string;
  description: string;
  dateOfIncident?: string;
  department?: string;
  involvedParties?: string;
  isWhistleblower: boolean;
  desiredOutcome?: string;
  attachments?: string[];
}

interface DecryptedSubmission extends Omit<EncryptedSubmissionDoc, 'encryptedPayload'> {
  id: string;
  payload: DecryptedPayload | null;
}

// --- Admin Login Component ---
const AdminLogin = ({ onLoginSuccess }: { onLoginSuccess: (orgCode: string) => void }) => {
  const [orgCode, setOrgCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgCode || !password) return;
    setIsLoading(true);
    setError(null);

    try {
      const codeClean = orgCode.trim().toUpperCase();
      const orgRef = doc(db, 'organizations', codeClean);
      const orgSnap = await getDoc(orgRef);

      if (!orgSnap.exists()) {
        setError('ORGANIZATION NOT FOUND.');
        setIsLoading(false);
        return;
      }

      const orgData = orgSnap.data();
      if (!orgData.adminPasswordHash) {
        setError('NO ADMIN CONFIGURED FOR THIS NODE.');
        setIsLoading(false);
        return;
      }

      // Important: Assuming the hash in Firestore was created via bcrypt
      const isValid = bcrypt.compareSync(password, orgData.adminPasswordHash);
      if (isValid) {
        sessionStorage.setItem('corporateAdminSession', codeClean);
        onLoginSuccess(codeClean);
      } else {
        setError('INVALID CREDENTIALS.');
      }
    } catch (err) {
      console.error(err);
      setError('AUTHENTICATION FAILED DUE TO NETWORK ANOMALY.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 flex items-center justify-center font-mono bg-void text-brandText relative">
      <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay pointer-events-none" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-surface border border-primary/20 p-8 shadow-[0_0_30px_rgba(110,231,247,0.05)] relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/40" />
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-void border border-primary/30 flex items-center justify-center text-primary mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold tracking-[0.2em] text-white">ADMIN ACCESS</h2>
          <p className="text-xs text-primary tracking-widest uppercase mt-2">Corpo Void Authorization</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] text-muted font-bold tracking-widest uppercase mb-2">ORGANIZATION CODE</label>
            <input 
              type="text" 
              value={orgCode} 
              onChange={e => setOrgCode(e.target.value)}
              className="w-full bg-void border border-ghost p-3 text-white tracking-[0.2em] uppercase focus:border-primary focus:outline-none transition-all placeholder:text-muted/30"
              placeholder="ORG-CODE"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted font-bold tracking-widest uppercase mb-2">ADMIN PASSWORD</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-void border border-ghost p-3 text-white tracking-[0.2em] focus:border-primary focus:outline-none transition-all placeholder:text-muted/30"
              placeholder="••••••••"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-danger tracking-widest uppercase flex items-center gap-2 border border-danger/30 bg-danger/10 p-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit" 
            disabled={isLoading || !orgCode || !password}
            className="w-full bg-primary/10 hover:bg-primary/20 border border-primary text-primary font-bold tracking-[0.2em] py-4 transition-colors disabled:opacity-50 flex justify-center"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'DECRYPT & ENTER'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main Admin Dashboard ---
export default function CorporateAdminPanel() {
  const [sessionOrg, setSessionOrg] = useState<string | null>(() => sessionStorage.getItem('corporateAdminSession'));
  
  const [submissions, setSubmissions] = useState<DecryptedSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Active State
  const [activeSubId, setActiveSubId] = useState<string | null>(null);

  const activeSub = useMemo(() => submissions.find(s => s.id === activeSubId), [submissions, activeSubId]);

  // Handle live data stream & client-side decryption
  useEffect(() => {
    if (!sessionOrg) return;

    const q = query(
      collection(db, 'corporateSubmissions'), 
      where('orgCode', '==', sessionOrg)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rawDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EncryptedSubmissionDoc & {id: string}));
      
      const decryptedDocs: DecryptedSubmission[] = rawDocs.map(doc => {
        let payload: DecryptedPayload | null = null;
        try {
          const bytes = CryptoJS.AES.decrypt(doc.encryptedPayload, sessionOrg);
          const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
          if (decryptedText) {
            payload = JSON.parse(decryptedText);
          }
        } catch (e) {
          console.error(`Failed to decrypt payload for ${doc.id}`);
        }
        
        // Exclude the raw encrypted string from memory
        const { encryptedPayload, ...rest } = doc;
        return { ...rest, payload };
      });

      // Sort by date manually if orderBy requires a composite index we haven't built yet
      decryptedDocs.sort((a, b) => {
        const timeA = a.submittedAt?.toMillis ? a.submittedAt.toMillis() : 0;
        const timeB = b.submittedAt?.toMillis ? b.submittedAt.toMillis() : 0;
        return timeB - timeA;
      });

      setSubmissions(decryptedDocs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [sessionOrg]);

  const handleLogout = () => {
    sessionStorage.removeItem('corporateAdminSession');
    setSessionOrg(null);
  };

  const handleMarkRead = async (id: string, isCurrentlyRead: boolean) => {
    if (!isCurrentlyRead) {
      await updateDoc(doc(db, 'corporateSubmissions', id), { isRead: true });
    }
  };

  const handleSyncStatus = async (id: string, newStatus: Status) => {
    await updateDoc(doc(db, 'corporateSubmissions', id), { status: newStatus });
    toast.success('STATUS UDPATED SECURELY');
  };

  const handleSaveNotes = async (id: string, notes: string) => {
    await updateDoc(doc(db, 'corporateSubmissions', id), { adminNotes: notes });
    toast.success('INTERNAL NOTES LOGGED');
  };

  const handleFlagCritical = async (id: string) => {
    await updateDoc(doc(db, 'corporateSubmissions', id), { severity: 'CRITICAL' });
    toast.success('ESCALATED TO CRITICAL THREAT LEVEL');
  };

  const generatePDFExport = () => {
    const doc = new jsPDF();
    doc.setFont("courier", "normal");
    
    doc.setFontSize(10);
    doc.text(`ANONYMAX EXPORT TOOL // ORGANIZATION: ${sessionOrg}`, 10, 10);
    doc.text(`DATE GENERATED: ${new Date().toISOString()}`, 10, 15);
    
    doc.line(10, 20, 200, 20);
    
    let yPos = 30;
    
    const exportSubs = submissions.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (severityFilter !== 'all' && s.severity !== severityFilter) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      return true;
    });

    exportSubs.forEach((sub) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont("courier", "bold");
      doc.text(`[${sub.token}] // ${sub.severity} // ${sub.category.toUpperCase()}`, 10, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont("courier", "normal");
      if (sub.payload) {
        doc.text(`TITLE: ${sub.payload.title}`, 10, yPos);
        yPos += 7;
        
        const splitDesc = doc.splitTextToSize(`DESC: ${sub.payload.description}`, 180);
        doc.text(splitDesc, 10, yPos);
        yPos += (splitDesc.length * 6) + 4;
      } else {
        doc.text("[DECRYPTION FAILED]", 10, yPos);
        yPos += 7;
      }
      
      yPos += 5;
      doc.setDrawColor(200);
      doc.line(10, yPos, 200, yPos);
      yPos += 10;
    });

    doc.save(`VOID_REPORT_${sessionOrg}_${Date.now()}.pdf`);
    toast.success('REPORT COMPILED & DOWNLOADED');
  };

  if (!sessionOrg) {
    return <AdminLogin onLoginSuccess={setSessionOrg} />;
  }

  // Derived filtered state
  const filteredSubmissions = submissions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (severityFilter !== 'all' && s.severity !== severityFilter) return false;
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    
    if (searchTerm) {
      const matchToken = s.token.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTitle = (s.payload?.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchToken || matchTitle;
    }
    
    return true;
  });

  const unreadCount = submissions.filter(s => !s.isRead).length;

  return (
    <div className="min-h-screen bg-void text-brandText font-mono selection:bg-primary/30 flex flex-col pt-[60px] md:pt-0">
      
      {/* Top Mobile Bar (matches generic AppShell height logic if needed, but this is standalone) */}
      <div className="absolute top-0 left-0 right-0 h-[60px] bg-surface/50 border-b border-primary/20 flex items-center justify-between px-6 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span className="text-white font-bold tracking-[0.2em] text-sm hidden sm:inline-block">ANONYMAX CORP_ADMIN</span>
          <span className="text-[10px] tracking-widest text-primary border border-primary/30 bg-primary/10 px-2 py-0.5">
            NODE: {sessionOrg}
          </span>
        </div>
        
        <button 
          onClick={handleLogout}
          className="text-xs text-muted hover:text-danger flex items-center gap-2 transition-colors tracking-widest uppercase"
        >
          SEVER <LogOut className="w-4 h-4"/>
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto mt-[60px] h-[calc(100vh-60px)] overflow-hidden">
        
        {/* LEFT COLUMN: FILTERS & STATS */}
        <div className="w-full lg:w-[280px] bg-void border-r border-ghost flex flex-col p-6 overflow-y-auto">
          <div className="mb-8">
            <h3 className="text-[10px] tracking-[0.15em] text-primary uppercase font-bold mb-4">Operations Metrics</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface/50 border border-ghost p-4 flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-colors">
                <span className="text-2xl font-black text-white group-hover:text-primary transition-colors">{submissions.length}</span>
                <span className="text-[9px] tracking-widest text-muted uppercase mt-1">TOTAL</span>
              </div>
              <div className="bg-primary/5 border border-primary/30 p-4 flex flex-col items-center justify-center text-center group relative overflow-hidden">
                {unreadCount > 0 && <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />}
                <span className="text-2xl font-black text-primary drop-shadow-[0_0_8px_rgba(110,231,247,0.5)]">{unreadCount}</span>
                <span className="text-[9px] tracking-widest text-primary uppercase mt-1">UNREAD</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] tracking-[0.15em] text-primary uppercase font-bold flex items-center gap-2">
              <Filter className="w-3 h-3" /> Filters
            </h3>
            
            <div>
              <input 
                type="text"
                placeholder="Search token / title..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-surface border border-ghost p-3 text-xs text-white focus:outline-none focus:border-primary placeholder:text-muted/50 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-[9px] tracking-widest text-muted uppercase mb-2">Payload Category</label>
              <select 
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full bg-surface border border-ghost p-3 text-xs text-white focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer custom-select"
              >
                <option value="all">ALL CATEGORIES</option>
                <option value="misconduct">MISCONDUCT</option>
                <option value="safety">SAFETY</option>
                <option value="management">MANAGEMENT</option>
                <option value="policy">POLICY</option>
                <option value="general">GENERAL</option>
                <option value="whistleblower">WHISTLEBLOWER</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] tracking-widest text-muted uppercase mb-2">Severity Level</label>
              <select 
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="w-full bg-surface border border-ghost p-3 text-xs text-white focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer custom-select"
              >
                <option value="all">ALL SEVERITIES</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] tracking-widest text-muted uppercase mb-2">Status Trigger</label>
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full bg-surface border border-ghost p-3 text-xs text-white focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer custom-select"
              >
                <option value="all">ALL STATUSES</option>
                <option value="new">NEW (UNREVIEWED)</option>
                <option value="reviewing">IN REVIEW</option>
                <option value="resolved">RESOLVED</option>
                <option value="escalated">ESCALATED</option>
              </select>
            </div>
          </div>

          <div className="mt-auto pt-8">
            <button 
              onClick={generatePDFExport}
              className="w-full bg-primary/10 hover:bg-primary/20 border border-primary text-primary text-xs font-bold tracking-[0.1em] py-3 flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(110,231,247,0.2)]"
            >
              <Download className="w-4 h-4" /> EXPORT REPORT
            </button>
            <p className="text-[8px] text-muted text-center mt-3 uppercase tracking-widest">
              Data is decrypted via browser AES before compilation.
            </p>
          </div>
        </div>

        {/* CENTER COLUMN: FEED LIST */}
        <div className="w-full lg:w-[450px] bg-void border-r border-ghost flex flex-col overflow-hidden relative">
          
          <div className="p-4 border-b border-ghost bg-surface/50 flex items-center justify-between shrink-0">
             <span className="text-[10px] tracking-widest text-muted uppercase font-bold">Encrypted Stream</span>
             <Activity className="w-4 h-4 text-primary animate-pulse" />
          </div>

          <div className="flex-1 overflow-y-auto w-full style-scrollbar">
            {isLoading ? (
              <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="p-10 text-center text-muted text-xs tracking-widest uppercase italic">NO DATA PACKETS FOUND.</div>
            ) : (
              <div className="flex flex-col">
                {filteredSubmissions.map(sub => {
                  const isActive = activeSubId === sub.id;
                  
                  // Color codes
                  let sevColor = 'text-primary border-primary/30';
                  if (sub.severity === 'MEDIUM') sevColor = 'text-[#fbbf24] border-[#fbbf24]/30';
                  if (sub.severity === 'HIGH') sevColor = 'text-[#f97316] border-[#f97316]/30';
                  if (sub.severity === 'CRITICAL') sevColor = 'text-[#ff4d6d] border-[#ff4d6d]/30 bg-[#ff4d6d]/5';

                  let statusDot = 'bg-[#ff4d6d]';
                  if (sub.status === 'reviewing') statusDot = 'bg-[#fbbf24]';
                  if (sub.status === 'resolved') statusDot = 'bg-[#22c55e]';
                  if (sub.status === 'escalated') statusDot = 'bg-[#c084fc]';

                  return (
                    <div 
                      key={sub.id}
                      onClick={() => {
                        setActiveSubId(sub.id);
                        handleMarkRead(sub.id, sub.isRead);
                      }}
                      className={`
                        p-4 border-b border-ghost cursor-pointer transition-all relative group
                        ${isActive ? 'bg-surface' : 'hover:bg-surface/50 bg-void'}
                      `}
                    >
                      {/* Unread pulsing line */}
                      {!sub.isRead && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_8px_var(--accent-primary)] animate-pulse" />
                      )}

                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-white tracking-widest bg-ghost/20 px-1.5 py-0.5">
                          #{sub.token}
                        </span>
                        <div className={`text-[9px] px-1.5 py-0.5 border uppercase tracking-widest font-bold ${sevColor}`}>
                          {sub.severity}
                        </div>
                      </div>

                      <h4 className="text-sm text-brandText group-hover:text-white transition-colors line-clamp-1 font-bold mb-1">
                        {sub.payload?.title || <span className="text-danger italic">[ENCRYPTION LOCKED]</span>}
                      </h4>
                      
                      <p className="text-xs text-muted line-clamp-2 font-sans mb-3 min-h-[32px]">
                        {sub.payload?.description || 'Payload unable to be decoded locally.'}
                      </p>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1.5">
                           <div className={`w-2 h-2 rounded-full ${statusDot}`} />
                           <span className="text-[9px] tracking-widest text-muted uppercase">{sub.status}</span>
                        </div>
                        <span className="text-[9px] text-muted tracking-widest uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3"/> 
                          {sub.submittedAt?.toMillis ? new Date(sub.submittedAt.toMillis()).toLocaleDateString() : 'NEW'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAIL VIEW */}
        <div className="flex-1 bg-surface/30 border-r border-ghost flex flex-col overflow-hidden relative">
          {!activeSub ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted p-10 text-center opacity-50">
              <FileArchive className="w-16 h-16 mb-4" />
              <p className="text-sm tracking-[0.2em] font-bold uppercase">NO TRANSMISSION SELECTED</p>
              <p className="text-[10px] tracking-widest mt-2">Select a packet from the feed to decrypt.</p>
            </div>
          ) : (
            <motion.div 
              key={activeSub.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full"
            >
              {/* Detail Header */}
              <div className="p-6 border-b border-ghost bg-surface/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                  <div className="flex gap-2 items-center text-[10px] tracking-widest uppercase font-bold text-muted mb-2">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5">TOKEN: {activeSub.token}</span>
                    {activeSub.payload?.isWhistleblower && (
                      <span className="bg-[#c084fc]/10 text-[#c084fc] border border-[#c084fc]/30 px-2 py-0.5 flex items-center gap-1">
                        <Siren className="w-3 h-3"/> WHISTLEBLOWER
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-white">{activeSub.payload?.title || '[LOCKED]'}</h2>
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={activeSub.status}
                    onChange={(e) => handleSyncStatus(activeSub.id, e.target.value as Status)}
                    className="bg-void border border-ghost p-2 text-xs text-white focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer uppercase tracking-widest text-center"
                  >
                    <option value="new">● STATUS: NEW</option>
                    <option value="reviewing">● STATUS: IN REVIEW</option>
                    <option value="resolved">● STATUS: RESOLVED</option>
                    <option value="escalated">● STATUS: ESCALATED</option>
                  </select>
                </div>
              </div>

              {/* Scrollable Document Body */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 style-scrollbar bg-void/50">
                
                {/* Meta Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-ghost/50">
                   <div>
                     <span className="block text-[9px] text-muted tracking-widest uppercase mb-1">Category</span>
                     <span className="text-xs text-white uppercase font-bold">{activeSub.category}</span>
                   </div>
                   <div>
                     <span className="block text-[9px] text-muted tracking-widest uppercase mb-1">Severity</span>
                     <span className={`text-xs uppercase font-bold ${
                       activeSub.severity === 'CRITICAL' ? 'text-danger' : 
                       activeSub.severity === 'HIGH' ? 'text-[#f97316]' : 'text-primary'
                     }`}>{activeSub.severity}</span>
                   </div>
                   <div>
                     <span className="block text-[9px] text-muted tracking-widest uppercase mb-1">Department</span>
                     <span className="text-xs text-white uppercase font-bold">{activeSub.payload?.department || 'N/A'}</span>
                   </div>
                   <div>
                     <span className="block text-[9px] text-muted tracking-widest uppercase mb-1">Incident Date</span>
                     <span className="text-xs text-white uppercase font-bold">{activeSub.payload?.dateOfIncident || 'UNSPECIFIED'}</span>
                   </div>
                </div>

                {/* Main Content */}
                <div>
                   <span className="block text-[10px] text-primary tracking-widest uppercase mb-3 font-bold">FULL DESCRIPTION //</span>
                   <div className="bg-surface/50 border border-ghost p-6 text-sm text-brandText leading-relaxed font-sans whitespace-pre-wrap">
                     {activeSub.payload?.description || 'Data missing or corruption detected.'}
                   </div>
                </div>

                {/* Additional Context */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <span className="block text-[10px] text-primary tracking-widest uppercase mb-3 font-bold">INVOLVED PARTIES //</span>
                     <div className="bg-void border border-ghost/50 p-4 text-xs text-brandText font-sans h-full">
                       {activeSub.payload?.involvedParties || <span className="text-muted italic">None specified.</span>}
                     </div>
                   </div>
                   <div>
                     <span className="block text-[10px] text-primary tracking-widest uppercase mb-3 font-bold">DESIRED OUTCOME //</span>
                     <div className="bg-void border border-ghost/50 p-4 text-xs text-brandText font-sans h-full">
                       {activeSub.payload?.desiredOutcome || <span className="text-muted italic">None specified.</span>}
                     </div>
                   </div>
                </div>

                {/* Attachments */}
                 {activeSub.payload?.attachments && activeSub.payload.attachments.length > 0 && (
                   <div>
                     <span className="block text-[10px] text-primary tracking-widest uppercase mb-3 font-bold flex items-center gap-2">
                       <Download className="w-3 h-3" /> ATTACHED EVIDENCE ({activeSub.payload.attachments.length})
                     </span>
                     <div className="flex flex-wrap gap-3">
                       {activeSub.payload.attachments.map((url, i) => (
                         <a 
                           key={i} 
                           href={url} 
                           target="_blank" 
                           rel="noreferrer"
                           className="bg-surface border border-primary/30 px-4 py-2 text-xs text-primary hover:bg-primary/10 transition-colors uppercase tracking-widest"
                         >
                           EVIDENCE_FILE_0{i+1}
                         </a>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Admin Notes Section */}
                 <div className="pt-8 border-t border-ghost">
                    <span className="block text-[10px] text-[#fbbf24] tracking-widest uppercase mb-3 font-bold flex items-center gap-2">
                       <Lock className="w-3 h-3" /> INTERNAL MEMO (NOT VISIBLE TO SOURCE)
                     </span>
                     <textarea
                       defaultValue={activeSub.adminNotes || ''}
                       onBlur={(e) => handleSaveNotes(activeSub.id, e.target.value)}
                       placeholder="Private notes for HR/Management protocol..."
                       className="w-full bg-[#fbbf24]/5 border border-[#fbbf24]/30 p-4 text-xs text-[#fbbf24] focus:outline-none focus:border-[#fbbf24] transition-all resize-y min-h-[100px] placeholder:text-[#fbbf24]/40 font-sans"
                     />
                 </div>

                 {/* Danger Actions */}
                 {activeSub.severity !== 'CRITICAL' && (
                   <div className="pt-4 flex justify-end">
                      <button 
                        onClick={() => handleFlagCritical(activeSub.id)}
                        className="text-[10px] tracking-widest uppercase font-bold text-danger hover:text-white border border-danger/30 hover:bg-danger/80 px-4 py-2 transition-all flex items-center gap-2"
                      >
                         <AlertTriangle className="w-3 h-3" /> FLAG AS CRITICAL OFFENSE
                      </button>
                   </div>
                 )}

              </div>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
}
