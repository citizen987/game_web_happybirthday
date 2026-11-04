// Registers the service worker for offline play. Only on HTTPS, so local
// http://localhost runs and file:// are never affected by a stale cache.
export function registerServiceWorker() {
  try {
    if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  } catch (error) {
    console.warn('Service worker registration failed:', error);
  }
}
