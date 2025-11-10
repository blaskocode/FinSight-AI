import { useEffect, useState, lazy, Suspense } from 'react';
import { useStore } from './store/useStore';
import { Login } from './components/Login';
import { ConsentScreen } from './components/ConsentScreen';
import { OnboardingWizard } from './components/OnboardingWizard';
import { Dashboard } from './components/Dashboard';
import { SkeletonLoader } from './components/SkeletonLoader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer, toastStore } from './components/Toast';

// Lazy load admin components for code splitting
const AdminLogin = lazy(() => import('./components/AdminLogin').then(module => ({ default: module.AdminLogin })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));

function App() {
  const { userId, hasConsent, currentView, isAdmin, setConsent, setUserId, setUserName, loadProfile } = useStore();
  // Initialize from localStorage synchronously to avoid showing wrong screen on first render
  // Restore userId and userName from localStorage on app mount (PR-54)
  const [isInitializing, setIsInitializing] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    const currentUserId = useStore.getState().userId || localStorage.getItem('userId');
    if (!currentUserId) return false;
    return localStorage.getItem(`onboarding_complete_${currentUserId}`) === 'true';
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const currentUserId = useStore.getState().userId || localStorage.getItem('userId');
    if (!currentUserId) return false;
    const userOnboardingComplete = localStorage.getItem(`onboarding_complete_${currentUserId}`) === 'true';
    return !userOnboardingComplete && !hasConsent;
  });
  const [toasts, setToasts] = useState(toastStore.getToasts());

  // Subscribe to toast updates
  useEffect(() => {
    const unsubscribe = toastStore.subscribe(() => {
      setToasts(toastStore.getToasts());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Restore login state from localStorage on app mount (PR-54)
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userName');
    
    if (storedUserId && !userId) {
      // Restore user state from localStorage
      setUserId(storedUserId);
      if (storedUserName) {
        setUserName(storedUserName);
      }
      
      // Check consent status from backend (PR-55)
      loadProfile(storedUserId)
        .then(() => {
          // Profile loaded successfully - consent is checked via profile endpoint
          // The profile endpoint requires consent, so if it succeeds, user has consent
          setConsent(true);
          setIsInitializing(false);
        })
        .catch((error: any) => {
          // Profile load failed - user may not have consent or other error
          // Check if it's a consent error (403) or other error
          const status = error?.response?.status || error?.status;
          const message = error?.response?.data?.message || error?.message || '';
          if (status === 403 || message.toLowerCase().includes('consent')) {
            setConsent(false);
          } else {
            // Other error - still set consent to false to show consent screen
            // User can retry after consenting
            setConsent(false);
          }
          setIsInitializing(false);
        });
    } else {
      setIsInitializing(false);
    }
  }, []); // Only run on mount

  // Check for admin route on mount
  useEffect(() => {
    if (window.location.pathname.startsWith('/admin')) {
      useStore.getState().setView('admin');
    }
  }, []);

  // Update onboarding state when userId or consent changes
  useEffect(() => {
    if (!userId) {
      setOnboardingComplete(false);
      setShowOnboarding(false);
      return;
    }
    
    const userOnboardingComplete = localStorage.getItem(`onboarding_complete_${userId}`) === 'true';
    setOnboardingComplete(userOnboardingComplete);
    
    if (!hasConsent && !userOnboardingComplete) {
      setShowOnboarding(true);
    } else if (hasConsent) {
      setShowOnboarding(false);
    }
  }, [userId, hasConsent]);

  // Admin views (lazy loaded with Suspense)
  if (currentView === 'admin') {
    if (!isAdmin) {
      return (
        <Suspense fallback={<SkeletonLoader type="card" />}>
          <AdminLogin />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<SkeletonLoader type="card" />}>
        <AdminDashboard />
      </Suspense>
    );
  }

  // User views
  // Show loading state while initializing (checking localStorage and consent)
  if (isInitializing) {
    return <SkeletonLoader type="card" />;
  }
  
  // Show login screen if user is not logged in
  if (!userId) {
    return <Login />;
  }

  // Show onboarding wizard for new users who haven't consented
  if (!hasConsent && showOnboarding && !onboardingComplete) {
    return (
      <OnboardingWizard
        onComplete={() => {
          if (userId) {
            localStorage.setItem(`onboarding_complete_${userId}`, 'true');
          }
          setOnboardingComplete(true);
          setShowOnboarding(false);
        }}
        onSkip={() => {
          // Skip to consent screen
          setShowOnboarding(false);
        }}
      />
    );
  }

  // Show consent screen if user hasn't consented (fallback or skip from onboarding)
  if (!hasConsent) {
    return <ConsentScreen />;
  }

  // Show dashboard if user has consented
  return (
    <>
      <Dashboard />
      <ToastContainer 
        toasts={toasts} 
        onDismiss={(id) => toastStore.dismiss(id)} 
      />
    </>
  );
}

// Wrap App with ErrorBoundary
function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;
