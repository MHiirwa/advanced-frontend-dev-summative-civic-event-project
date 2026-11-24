/**
 * config.js
 * ---------------------------------------------------------------
 * Central configuration for the CivicEvents+ frontend.
 * If your backend runs somewhere else, change API_BASE_URL only.
 */
window.CONFIG = {
  // Where the provided Express backend is running (see backend README)
  API_BASE_URL: 'http://localhost:4000',
  API_PREFIX: '/api',

  // Shown on the footer and on the "forbidden" screen
  SUPPORT_EMAIL: 'm.hirwa1@alustudent.com',

  // How often the notification bell checks for new items (ms)
  NOTIFICATION_POLL_MS: 60000,

  // Default TTL for cached GET responses (ms). Used by Api.get(..., { cache: true })
  CACHE_TTL_MS: 60000,

  // Upload limits enforced by the backend (multer). We validate before uploading.
  UPLOADS: {
    image: { maxMB: 2, exts: ['jpg', 'jpeg', 'png', 'gif'] },
    audio: { maxMB: 5, exts: ['mp3', 'wav', 'm4a', 'ogg'] },
    video: { maxMB: 8, exts: ['mp4', 'mov', 'avi', 'mkv'] }
  }
};
