import { LogBox, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoadingScreen from './src/screens/LoadingScreen';
import HomeScreen from './src/screens/HomeScreen';
import useStartupDelay from './src/hooks/useStartupDelay';
import AuthScreen from './src/screens/AuthScreen';
import { SessionProvider, useSession } from './src/context/SessionContext';

if (__DEV__) {
  // Filtering also removes matching warnings already queued before Fast Refresh.
  LogBox.ignoreLogs(['is not a valid number or percentage']);
  LogBox.ignoreAllLogs(true);
}

function AppContent() {
  const ready = useStartupDelay();
  const session = useSession();

  return <>{ready && session.ready ? (session.authenticated ? <HomeScreen /> : <AuthScreen />) : <LoadingScreen />}</>;
}

export default function App() {

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <SessionProvider><AppContent /></SessionProvider>
    </SafeAreaProvider>
  );
}
