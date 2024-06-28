// This is the "Offline page" service worker

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "pwabuilder-page";

// Replace the following with the correct offline fallback page
const offlineFallbackPage = "https://account.japaprize.com/";

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => {
        return cache.add(offlineFallbackPage);
      })
  );
});

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Use any preloaded response, if available
        const preloadResp = await event.preloadResponse;
        if (preloadResp) {
          return preloadResp;
        }

        // Fetch from network
        const networkResp = await fetch(event.request);
        return networkResp;
      } catch (error) {
        // If both preload and network fail, retrieve from cache
        const cache = await caches.open(CACHE);
        const cachedResp = await cache.match(offlineFallbackPage);
        return cachedResp;
      }
    })());
  }
});

// Background Sync Implementation

// Check to make sure Sync is supported
if ('serviceWorker' in navigator && 'SyncManager' in window) {
  navigator.serviceWorker.ready.then((registration) => {
    try {
      // Register a background sync with the tag 'database-sync'
      registration.sync.register('database-sync');
    } catch (error) {
      console.log("Background Sync failed:", error);
    }
  });
}

// Add an event listener for the `sync` event in the service worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'database-sync') {
    event.waitUntil(
      // Hypothetical function to push local data to the server-side database
      pushLocalDataToDatabase()
    );
  }
});

// Hypothetical function to push local data to the server-side database
async function pushLocalDataToDatabase() {
  try {
    // Implement the logic to push local data to the server-side database
    const response = await fetch('https://account.japaprize.com/', {
      method: 'POST',
      body: JSON.stringify({ /* local data */ }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
  } catch (error) {
    console.error('Failed to push local data to the database:', error);
  }
}

// Periodic Background Sync Implementation

// Query the user for permission to use periodic background sync
navigator.permissions.query({ name: 'periodic-background-sync' }).then((periodicSyncPermission) => {
  if (periodicSyncPermission.state === 'granted') {
    // Register a new periodic sync if permission is granted
    registration.periodicSync.register('fetch-new-content', {
      // Set the sync to happen no more than once a day
      minInterval: 24 * 60 * 60 * 1000
    });
  }
});

// Listen for the `periodicsync` event
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'fetch-new-content') {
    event.waitUntil(
      // Hypothetical function to fetch new content and cache it
      fetchNewContent()
    );
  }
});

// Hypothetical function to fetch new content
async function fetchNewContent() {
  try {
    // Implement the logic to fetch new content from the server and cache it
    const response = await fetch('https://account.japaprize.com/');
    const cache = await caches.open(CACHE);
    await cache.put('https://account.japaprize.com/', response);
  } catch (error) {
    console.error('Failed to fetch new content:', error);
  }
}

// Push Notifications Implementation

// Add a push event listener to handle incoming push messages
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Notification Title';
  const options = {
    body: data.body || 'Notification Body Text',
    icon: data.icon || 'custom-notification-icon.png',
    data: { url: data.url || '/' } // URL to open when notification is clicked
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Add a notificationclick event listener to handle clicks on notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data.url;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (let client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
