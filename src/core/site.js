import { SHARE } from '../config.js';

/**
 * Public URL of the game where it is being played, so shared links point to the
 * same host (Netlify, GitHub Pages under /<repo>/, a custom domain...).
 * Over plain HTTP (local dev, e2e tests) it falls back to the canonical SHARE.URL.
 */
export function siteUrl() {
  if (location.protocol !== 'https:') return SHARE.URL;
  return location.origin + location.pathname.replace(/[^/]*$/, '');
}

// Same URL without scheme or trailing slash, for printing on the share card.
export const siteLabel = () => siteUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');
