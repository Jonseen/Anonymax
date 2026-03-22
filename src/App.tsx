import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useAuth } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Toaster } from 'react-hot-toast';

function App() {
  const { setUser, isLoading } = useAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, [setUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Global Noise Overlay */}
      <div className="bg-noise" />
      
      {/* Notifications */}
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          style: { 
            background: 'var(--bg-elevated)', 
            color: 'var(--text-primary)', 
            border: '1px solid var(--accent-ghost)',
            borderRadius: '0px',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.875rem'
          } 
        }} 
      />

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Placeholder for Home */}
        <Route path="/" element={
          <div className="min-h-screen flex flex-col items-center justify-center relative z-10 space-y-8 p-6">
            <div className="bg-brandText text-background px-3 py-1 inline-block">
              <h1 className="font-mono font-black text-2xl tracking-[0.3em] uppercase">Anonymax</h1>
            </div>
            
            <h2 className="text-xl font-mono text-muted tracking-widest uppercase">Welcome to the Void</h2>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm pt-8 border-t border-ghost/50">
              <Link 
                to="/login"
                className="flex-1 bg-elevated text-primary border border-primary/20 hover:border-primary/50 py-3 font-mono text-sm font-bold tracking-widest uppercase transition-all text-center hover:shadow-[0_0_15px_var(--accent-primary)]"
              >
                Sign In
              </Link>
              <Link 
                to="/register"
                className="flex-1 bg-transparent text-muted hover:text-brandText border border-ghost/50 hover:bg-ghost py-3 font-mono text-sm tracking-widest uppercase transition-all text-center"
              >
                Join
              </Link>
            </div>
          </div>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
