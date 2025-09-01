/**
 * Mobile-specific notification utilities to handle browser differences
 */

// Check if the device is iOS
export const isIOS = (): boolean => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  };
  
  // Check if the device is Android
  export const isAndroid = (): boolean => {
    return /Android/.test(navigator.userAgent);
  };
  
  // Check if we're running in standalone PWA mode
  export const isPWA = (): boolean => {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true;
  };
  
  // Check if we're running in a mobile browser
  export const isMobile = (): boolean => {
    return isIOS() || isAndroid();
  };
  
  // Check if notifications are supported on this device/browser
  export const areNotificationsSupported = (): boolean => {
    // Standard notification support
    const standardSupport = 'Notification' in window;
    
    // iOS doesn't support notifications in browser mode, only in PWA mode
    if (isIOS() && !isPWA()) {
      return false;
    }
    
    return standardSupport;
  };
  
  // Get appropriate fallback strategy for unsupported browsers
  export const getFallbackStrategy = (): 'vibration' | 'alert' | 'none' => {
    // If vibration API is available (Android)
    if ('vibrate' in navigator) {
      return 'vibration';
    }
    
    // For iOS browsers where notifications aren't available
    if (isIOS() && !isPWA()) {
      return 'alert';
    }
    
    return 'none';
  };
  
  // Execute fallback notification for unsupported browsers
  export const executeFallbackNotification = (title: string, body?: string): void => {
    const strategy = getFallbackStrategy();
    
    switch (strategy) {
      case 'vibration':
        // Vibrate for 200ms, pause for 100ms, then vibrate for 200ms
        navigator.vibrate([200, 100, 200]);
        console.log(`Fallback notification (vibration): ${title}`);
        break;
      
      case 'alert':
        // Show a gentle alert for iOS
        if (document.visibilityState === 'visible') {
          // Only show visual indicator if app is visible
          const event = new CustomEvent('showInAppNotification', { 
            detail: { title, body }
          });
          window.dispatchEvent(event);
          console.log(`Fallback notification (in-app): ${title}`);
        } else {
          // App is in background - can't really do anything on iOS browser
          console.log(`Fallback notification (missed - app in background): ${title}`);
        }
        break;
        
      default:
        console.log(`Notification not supported and no fallback available: ${title}`);
    }
  };
  
  // Get a description of notification capabilities for the current device
  export const getNotificationCapabilities = (): string => {
    if (!areNotificationsSupported()) {
      if (isIOS() && !isPWA()) {
        return "Your device doesn't support browser notifications. For the best experience, install this app to your home screen.";
      }
      return "Your browser doesn't support notifications.";
    }
    
    if (Notification.permission === 'denied') {
      return "Notifications are blocked. Please enable them in your browser settings.";
    }
    
    return "Notifications are fully supported on your device.";
  };
  