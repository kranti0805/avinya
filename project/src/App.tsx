import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Auth } from './components/Auth';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';
import { LandingPage } from './components/LandingPage';
import { ToastContainer } from './components/ToastContainer';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [view, setView] = useState<'landing' | 'auth_employee' | 'auth_manager'>('landing');

  // Reset view when user logs out
  useEffect(() => {
    if (!user) {
      // Keep current view or reset? Optional. Let's keep it interactive.
      // If user manually signed out, maybe go to landing?
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading AI Workflow...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (view === 'landing') {
      return <LandingPage onNavigate={(page) => {
        if (page === 'home') setView('landing');
        else setView(page);
      }} />;
    }
    return (
      <>
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setView('landing')}
            className="px-4 py-2 bg-white/80 backdrop-blur rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:text-indigo-600 shadow-sm transition"
          >
            ← Back to Home
          </button>
        </div>
        <Auth initialMode={view === 'auth_employee' ? 'signup' : 'signin'} />
      </>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-slate-500">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  if (profile.role === 'manager') {
    return (
      <>
        <ManagerDashboard />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <EmployeeDashboard />
      <ToastContainer />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
