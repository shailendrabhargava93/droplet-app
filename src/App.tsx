import { useState, useEffect } from 'react';
import './App.css';
import { WaterProvider } from './context/WaterContext';
import WaterProgress from './components/WaterProgress';
import AddWaterIntake from './components/AddWaterIntake';
import TodayIntakes from './components/TodayIntakes';
import SettingsScreen from './components/SettingsScreen';
import { BottomNav } from './components/BottomNav';
import { ToastProvider } from './context/ToastContext';
import { UnitProvider } from './context/UnitContext';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';

function App() {
  const [activeTab, setActiveTab] = useState<'stats' | 'add' | 'settings'>(
    'stats'
  );

  useEffect(() => {
    // Register our new simplified service worker directly
    const setupServiceWorker = async () => {
      try {
        if (!('serviceWorker' in navigator)) {
          console.warn('Service Workers not supported in this browser');
          return;
        }

        // Unregister any existing service workers first for a clean start
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let reg of registrations) {
          await reg.unregister();
          console.log('Unregistered existing service worker');
        }

        // Register our simplified service worker
        const registration = await navigator.serviceWorker.register(
          '/simple-service-worker.js'
        );
        console.log(
          'Simple service worker registered with scope:',
          registration.scope
        );

        // Force skip waiting if there's a waiting worker
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Check if we have a controller already
        if (navigator.serviceWorker.controller) {
          console.log('Service worker is already controlling this page');
        } else {
          console.log('Waiting for service worker to control this page...');
        }
      } catch (error) {
        console.error('Failed to set up service worker:', error);
      }
    };

    setupServiceWorker();

    // Handle messages from service worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const data = event.data;
      console.log('Message received from service worker:', data);

      // Handle specific message types
      if (data.type === 'OPEN_ADD_WATER') {
        setActiveTab('add');
      }

      // Could handle other messages here like SERVICE_WORKER_ACTIVATED
    };

    // Add the message event listener
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener(
        'message',
        handleServiceWorkerMessage
      );
    }

    // Clean up event listener
    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener(
          'message',
          handleServiceWorkerMessage
        );
      }
    };
  }, []);

  return (
    <WaterProvider>
      <ToastProvider>
        <UnitProvider>
          <div className="app-container">
            <Header />
            <main className="container">
              {activeTab === 'stats' && (
                <>
                  <WaterProgress />
                  <TodayIntakes />
                </>
              )}

              {activeTab === 'add' && <AddWaterIntake />}

              {activeTab === 'settings' && <SettingsScreen />}
            </main>

            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </UnitProvider>
        <Toaster
          position="bottom-center"
          containerStyle={{
            bottom: 90, // Add space for the bottom navbar
          }}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#333',
              boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              maxWidth: '350px',
            },
            success: {
              iconTheme: {
                primary: '#00BCD4',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ff6b6b',
                secondary: '#fff',
              },
            },
          }}
        />
      </ToastProvider>
    </WaterProvider>
  );
}

export default App;
