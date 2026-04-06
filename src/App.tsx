import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/authStore';
import { listenToAuthState } from './services/authService';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { FeedPage } from './pages/FeedPage';
import { ProfilePage } from './pages/ProfilePage';
import { SinglePostPage } from './pages/SinglePostPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SearchPage } from './pages/SearchPage';
import { CellsPage } from './pages/CellsPage';
import { RoomPage } from './pages/RoomPage';
import { SavedSignalsPage } from './pages/SavedSignalsPage';
import { VoidStatsPage } from './pages/VoidStatsPage';
import { EncryptionPage } from './pages/EncryptionPage';
import { SignalsPage } from './pages/SignalsPage';
import { GhostsPage } from './pages/GhostsPage';
import { VoidMarketPage } from './pages/VoidMarketPage';
import { MessagesPage } from './pages/MessagesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { Toaster } from 'react-hot-toast';

// Chambers imports
import ChambersLanding from './pages/ChambersLanding';
import CorporateChamber from './pages/CorporateChamber';
import CorporateAdminPanel from './pages/CorporateAdminPanel';
import CorporateResultsDashboard from './pages/CorporateResultsDashboard';
import ElectionChamber from './pages/ElectionChamber';
import ElectionAdminPanel from './pages/ElectionAdminPanel';
import ElectionResultsDashboard from './pages/ElectionResultsDashboard';
import SubmissionSuccessPage from './pages/SubmissionSuccessPage';
import VerificationPage from './pages/VerificationPage';
import ChambersDevAdmin from './pages/ChambersDevAdmin';

function App() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const cleanup = listenToAuthState();
    return () => cleanup();
  }, []);

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
        <Route path="/" element={ user ? <Navigate to="/feed" replace /> : <Navigate to="/login" replace /> } />
        <Route path="/login" element={ user ? <Navigate to="/feed" replace /> : <LoginPage /> } />
        <Route path="/register" element={ user ? <Navigate to="/feed" replace /> : <RegisterPage /> } />

        {/* Chambers Platform Routes - Excluded from AppShell to maintain full-screen aesthetic */}
        <Route path="/chambers" element={<ChambersLanding />} />
        <Route path="/chambers/dev" element={<ChambersDevAdmin />} />
        <Route path="/chambers/corporate" element={<CorporateChamber />} />
        <Route path="/chambers/corporate/admin" element={<CorporateAdminPanel />} />
        <Route path="/chambers/corporate/results" element={<CorporateResultsDashboard />} />
        <Route path="/chambers/election" element={<ElectionChamber />} />
        <Route path="/chambers/election/admin" element={<ElectionAdminPanel />} />
        <Route path="/chambers/election/results" element={<ElectionResultsDashboard />} />
        <Route path="/chambers/submit/success" element={<SubmissionSuccessPage />} />
        <Route path="/chambers/verify/:token" element={<VerificationPage />} />
        
        {/* Protected Routes wrapped in AppShell architecture */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/post/:postId" element={<SinglePostPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/cells" element={<CellsPage />} />
          <Route path="/cells/:roomId" element={<RoomPage />} />
          <Route path="/saved" element={<SavedSignalsPage />} />
          <Route path="/stats" element={<VoidStatsPage />} />
          <Route path="/encryption" element={<EncryptionPage />} />
          <Route path="/signals" element={<SignalsPage />} />
          <Route path="/ghosts" element={<GhostsPage />} />
          <Route path="/market" element={<VoidMarketPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
