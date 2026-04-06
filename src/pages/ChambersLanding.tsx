import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Vote, Shield, FileText, Activity, AlertTriangle, Fingerprint, Lock, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ChambersLanding() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden font-mono bg-void text-brandText selection:bg-primary/30 selection:text-white">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_bottom_right,_var(--danger)_0%,_transparent_60%)] opacity-5 pointer-events-none" />
      <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay pointer-events-none" />

      {/* Header section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-5xl text-center mb-16 mt-8"
      >
        <div className="flex justify-center items-center gap-4 mb-4">
          <Shield className="w-8 h-8 text-primary opacity-80" />
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.2em] text-white">
            ANONYMAX <span className="opacity-60 text-primary">CHAMBERS</span>
          </h1>
          <Shield className="w-8 h-8 text-primary opacity-80" />
        </div>
        <p className="text-muted text-sm md:text-base tracking-[0.3em] uppercase border-b border-ghost/50 inline-block pb-3 px-8">
          Speak without consequence. Report without fear.
        </p>
      </motion.div>

      {/* Main Cards */}
      <div className="relative z-10 w-full max-w-5xl grid md:grid-cols-2 gap-8 lg:gap-12 mb-16">
        
        {/* LEFT CARD - CORPORATE VOID */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="group relative flex flex-col bg-elevated/40 border border-primary/20 backdrop-blur-sm overflow-hidden"
        >
          {/* Top Line Accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/40 group-hover:bg-primary group-hover:shadow-[0_0_15px_var(--accent-primary)] transition-all duration-500" />
          
          <div className="p-8 md:p-10 flex flex-col h-full relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-void border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 shadow-[inset_0_0_15px_rgba(110,231,247,0.1)]">
                <Building2 className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <span className="text-[10px] tracking-widest text-primary/60 border border-primary/20 px-2 py-1 bg-primary/5">CLASS: INTERNAL</span>
            </div>
            
            <h2 className="text-2xl font-bold tracking-widest text-white mb-2">CORPORATE VOID</h2>
            <p className="text-primary/70 text-xs tracking-widest uppercase mb-8 leading-relaxed h-10">
              Anonymous workplace feedback & incident reporting
            </p>
            
            <div className="space-y-4 mb-10 flex-grow">
              <div className="flex items-center gap-3 text-sm text-brandText/80">
                <Fingerprint className="w-4 h-4 text-primary/50 flex-shrink-0" />
                <span>Zero identity tracing</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-brandText/80">
                <Lock className="w-4 h-4 text-primary/50 flex-shrink-0" />
                <span>End-to-end encrypted submissions</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-brandText/80">
                <Activity className="w-4 h-4 text-primary/50 flex-shrink-0" />
                <span>Admin dashboard with analytics</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-brandText/80">
                <FileText className="w-4 h-4 text-primary/50 flex-shrink-0" />
                <span>Exportable anonymized reports</span>
              </div>
            </div>
            
            <Link 
              to="/chambers/corporate" 
              className="mt-auto block w-full text-center py-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-bold tracking-[0.2em] text-sm transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(110,231,247,0.15)] relative overflow-hidden"
            >
              <span className="relative z-10">ENTER CORPORATE VOID</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </Link>
          </div>
        </motion.div>

        {/* RIGHT CARD - ELECTION VAULT */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="group relative flex flex-col bg-elevated/40 border border-danger/20 backdrop-blur-sm overflow-hidden"
        >
          {/* Top Line Accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-danger/40 group-hover:bg-danger group-hover:shadow-[0_0_15px_var(--danger)] transition-all duration-500" />
          
          <div className="p-8 md:p-10 flex flex-col h-full relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-void border border-danger/30 flex items-center justify-center text-danger group-hover:scale-110 transition-transform duration-500 shadow-[inset_0_0_15px_rgba(255,77,109,0.1)]">
                <Vote className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <span className="text-[10px] tracking-widest text-danger/60 border border-danger/20 px-2 py-1 bg-danger/5">CLASS: PUBLIC_AUDIT</span>
            </div>
            
            <h2 className="text-2xl font-bold tracking-widest text-white mb-2">ELECTION VAULT</h2>
            <p className="text-danger/70 text-xs tracking-widest uppercase mb-8 leading-relaxed h-10">
              Anonymous election day incident & irregularity reporting
            </p>
            
            <div className="space-y-4 mb-10 flex-grow">
              <div className="flex items-center gap-3 text-sm text-brandText/80">
                <Lock className="w-4 h-4 text-danger/50 flex-shrink-0" />
                <span>Cryptographic submission tokens</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-brandText/80">
                <MapPin className="w-4 h-4 text-danger/50 flex-shrink-0" />
                <span>Geo-tagged incident mapping (optional)</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-brandText/80">
                <Activity className="w-4 h-4 text-danger/50 flex-shrink-0" />
                <span>Real-time aggregated public dashboard</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-brandText/80">
                <AlertTriangle className="w-4 h-4 text-danger/50 flex-shrink-0" />
                <span>Tamper-evident audit log</span>
              </div>
            </div>
            
            <Link 
              to="/chambers/election" 
              className="mt-auto block w-full text-center py-4 bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger font-bold tracking-[0.2em] text-sm transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(255,77,109,0.15)] relative overflow-hidden"
            >
              <span className="relative z-10">ENTER ELECTION VAULT</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-danger/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </Link>
          </div>
        </motion.div>

      </div>

      {/* Footer Text */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="relative z-10 w-full text-center mt-auto pb-4"
      >
        <p className="text-[10px] md:text-xs text-muted/60 tracking-widest uppercase flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4">
          <span>All transmissions are encrypted.</span>
          <span className="hidden md:inline">•</span>
          <span>No IP addresses are logged.</span>
          <span className="hidden md:inline">•</span>
          <span>No accounts required.</span>
        </p>
      </motion.div>
    </div>
  );
}
