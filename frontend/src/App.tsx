import { useEffect, useState, lazy, Suspense } from 'react';
import { useStore } from './store/useStore';
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
  const { hasConsent, currentView, isAdmin, setConsent, setUserId } = useStore();
  // Initialize from localStorage synchronously to avoid showing wrong screen on first render
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    return localStorage.getItem('onboarding_complete') === 'true';
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Show onboarding if user hasn't completed it and doesn't have consent
    return localStorage.getItem('onboarding_complete') !== 'true' && !hasConsent;
  });
  const [toasts, setToasts] = useState(toastStore.getToasts());

  // Subscribe to toast updates
  useEffect(() => {
    const unsubscribe = toastStore.subscribe(() => {
      setToasts(toastStore.getToasts());
    });
    return unsubscribe;
  }, []);

  // Check for admin route on mount
  useEffect(() => {
    if (window.location.pathname.startsWith('/admin')) {
      useStore.getState().setView('admin');
    }
  }, []);

  // Update onboarding state when consent changes
  useEffect(() => {
    if (!hasConsent && !onboardingComplete) {
      setShowOnboarding(true);
    } else if (hasConsent) {
      setShowOnboarding(false);
    }
  }, [hasConsent, onboardingComplete]);

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
  // Show onboarding wizard for new users who haven't consented
  if (!hasConsent && showOnboarding && !onboardingComplete) {
    return (
      <OnboardingWizard
        onComplete={() => {
          setOnboardingComplete(true);
          localStorage.setItem('onboarding_complete', 'true');
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
