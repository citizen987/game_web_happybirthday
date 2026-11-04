// Mobile/browser integration helpers.

export const isTouchDevice = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;

export const prefersTouchControls = () => isTouchDevice && window.matchMedia('(pointer: coarse)').matches;

// Matches the CSS rule that shows the "rotate your phone" notice; the game pauses meanwhile.
export const portraitQuery = window.matchMedia('(orientation: portrait) and (pointer: coarse)');

// Stop pinch-zoom, double-tap zoom, pull-to-refresh and long-press menus.
export function blockBrowserGestures() {
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Best effort: Android Chrome supports both; iPhone Safari supports neither.
export function requestLandscapeFullscreen() {
  const el = document.documentElement;
  const request = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!request) return;
  try {
    const result = request.call(el, { navigationUI: 'hide' });
    if (result && result.then) {
      result
        .then(() => {
          if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape');
          return undefined;
        })
        .catch(() => { /* not allowed on this device: keep playing windowed */ });
    }
  } catch {
    /* fullscreen not allowed: keep playing windowed */
  }
}
