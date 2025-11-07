import { useStore } from './store/useStore';
import { ConsentScreen } from './components/ConsentScreen';
import { Dashboard } from './components/Dashboard';

function App() {
  const { hasConsent } = useStore();

  // Show consent screen if user hasn't consented
  if (!hasConsent) {
    return <ConsentScreen />;
  }

  // Show dashboard if user has consented
  return <Dashboard />;
}

export default App;
