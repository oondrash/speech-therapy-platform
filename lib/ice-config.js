/* ice-config.js — shared STUN/TURN servers for the live monitoring link.
 *
 * STUN alone is enough when the child and therapist are on "friendly" networks
 * (most home Wi-Fi). For RELIABLE, FAST connections across different networks
 * you need a TURN relay server.
 *
 * ── Free TURN in ~2 minutes ──────────────────────────────────────────────────
 *   1. Sign up free at https://www.metered.ca/  (50 GB/month free)
 *   2. Dashboard → "TURN Server" → copy the ready-made `iceServers` array
 *   3. Paste those entries into the list below (keep the two STUN lines too)
 *
 * Until you add TURN, cross-network connections may be slow or occasionally
 * fail; same-network and most home setups still work on STUN alone.
 */
window.ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }

  // ── Paste your free Metered TURN credentials below (uncomment & fill in): ──
  // ,{ urls: 'turn:YOUR-SUBDOMAIN.relay.metered.ca:80',                username: 'XXXX', credential: 'YYYY' }
  // ,{ urls: 'turn:YOUR-SUBDOMAIN.relay.metered.ca:80?transport=tcp',  username: 'XXXX', credential: 'YYYY' }
  // ,{ urls: 'turn:YOUR-SUBDOMAIN.relay.metered.ca:443',               username: 'XXXX', credential: 'YYYY' }
  // ,{ urls: 'turns:YOUR-SUBDOMAIN.relay.metered.ca:443?transport=tcp', username: 'XXXX', credential: 'YYYY' }
];
