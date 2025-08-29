// Enhanced service worker for mobile and desktop notifications
const CACHE_NAME = 'droplet-cache-v3';
const NOTIFICATION_TITLE = 'Time to Drink Water! 💧';
const NOTIFICATION_OPTIONS = {
  body: "Don't forget to stay hydrated!",
  icon: '/icon.svg',
  badge: '/icon.svg',
  tag: 'water-reminder',
  renotify: true,
  vibrate: [200, 100, 200],
  requireInteraction: false,
  actions: [
    {
      action: 'open',
      title: 'Open App',
    },
    {
      action: 'dismiss',
      title: 'Dismiss',
    },
  ],
};

// Store for active reminders
const activeReminders = new Map();
let wakeLock = null;

// Request wake lock
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock is active');
    } catch (err) {
      console.log(`Wake Lock error: ${err.name}, ${err.message}`);
    }
  }
}

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing new service worker...');
  // Force waiting service worker to become active
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating service worker...');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      requestWakeLock(),
      // Notify all clients that the service worker is active
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED' });
        });
      }),
    ])
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  notification.close();

  if (event.action === 'open') {
    // Open/focus the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].focus();
        } else {
          self.clients.openWindow('/');
        }
      })
    );
  }
});

// Handle messages from client
self.addEventListener('message', (event) => {
  const message = event.data;
  console.log('[ServiceWorker] Received message:', message.type);

  switch (message.type) {
    case 'PING':
      // Respond to ping to confirm service worker is running
      if (event.source) {
        event.source.postMessage({
          type: 'PONG',
          timestamp: Date.now(),
        });
      }
      break;

    case 'START_REMINDER':
      startReminder(message.id, message.minutes, event.source);
      break;

    case 'STOP_REMINDER':
      stopReminder(message.id, event.source);
      break;

    case 'STOP_ALL_REMINDERS':
      stopAllReminders(event.source);
      break;
  }
});

// Start a new reminder with the given interval
async function showNotification(id, minutes) {
  try {
    // Try to use standard Notification API first
    await self.registration.showNotification(NOTIFICATION_TITLE, {
      ...NOTIFICATION_OPTIONS,
      timestamp: Date.now(),
      data: { id, minutes },
    });
  } catch (error) {
    console.error('Error showing notification:', error);
    // Fallback for mobile browsers that don't support rich notifications
    await self.registration.showNotification(NOTIFICATION_TITLE, {
      body: NOTIFICATION_OPTIONS.body,
      icon: NOTIFICATION_OPTIONS.icon,
    });
  }
}

function startReminder(id, minutes, client) {
  // Stop any existing reminders
  stopAllReminders();

  console.log(`[ServiceWorker] Starting reminder ${id} every ${minutes} minutes`);

  // Minimum interval of 1 minute
  const interval = Math.max(minutes * 60 * 1000, 60 * 1000);

  // Create periodic notifications using setInterval
  const timerId = setInterval(async () => {
    await showNotification(id, minutes);
    // Request wake lock again if needed
    if (!wakeLock) await requestWakeLock();
  }, interval);

  // Store the timer
  activeReminders.set(id, timerId);

  // Send confirmation to client
  client?.postMessage({
    type: 'REMINDER_STARTED',
    id: id,
    minutes: minutes,
  });

  // Show test notification after 1 second
  setTimeout(() => {
    showNotification(id, minutes);
  }, 1000);
}

// Stop a specific reminder
function stopReminder(id, client) {
  if (activeReminders.has(id)) {
    clearInterval(activeReminders.get(id));
    activeReminders.delete(id);
    console.log(`[ServiceWorker] Stopped reminder ${id}`);

    if (client) {
      client.postMessage({
        type: 'REMINDER_STOPPED',
        id: id,
      });
    }
  }
}

// Stop all reminders
function stopAllReminders(client) {
  console.log(`[ServiceWorker] Stopping all ${activeReminders.size} reminders`);

  activeReminders.forEach((timerId, id) => {
    clearInterval(timerId);
  });

  activeReminders.clear();

  // Only send message if client is provided (when called directly, not from startReminder)
  if (client) {
    client.postMessage({
      type: 'ALL_REMINDERS_STOPPED',
    });
  }
}

// Show a hydration reminder notification
async function showNotification(id, minutes) {
  const messages = [
    `It's been ${minutes} minutes - time to drink some water!`,
    `Water break! ${minutes} minutes have passed.`,
    `Stay hydrated! Time for water.`,
    `Quick break - drink some water now!`,
    `Don't forget to hydrate!`,
  ];

  const title = '💧 Hydration Time!';
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  try {
    // Use a consistent tag for regular reminders to prevent multiple notifications
    // when the frequency is changed
    await self.registration.showNotification(title, {
      body: randomMessage,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'hydration-reminder', // Fixed tag to prevent duplicates
      renotify: true, // This will make the notification reappear even with the same tag
      requireInteraction: true,
      vibrate: [100, 50, 100], // Vibration pattern
      data: {
        timestamp: Date.now(),
        id: id,
        minutes: minutes,
        url: self.location.origin,
      },
    });
    console.log('[ServiceWorker] Notification sent');
  } catch (error) {
    console.error('[ServiceWorker] Error showing notification:', error);
  }
}

// Show a test notification immediately
async function showTestNotification(minutes) {
  const title = '💧 Reminder Test';
  const body = `Hydration reminders will appear every ${minutes} minute(s)`;

  try {
    await self.registration.showNotification(title, {
      body: body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'hydration-test-notification', // Consistent tag for test notifications
      requireInteraction: false,
      vibrate: [100, 50, 100],
    });
    console.log('[ServiceWorker] Test notification sent');
  } catch (error) {
    console.error('[ServiceWorker] Error showing test notification:', error);
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  notification.close();

  // Try to focus an existing window or open a new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

console.log('[ServiceWorker] Simple service worker loaded and ready');
