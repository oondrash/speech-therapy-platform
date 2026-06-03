/* monitor.js — live screen broadcaster for the therapist view.
 *
 * If the page URL carries ?code=XXXX, this captures the game <canvas> as a
 * video stream and sends it (plus periodic telemetry) to the therapist over a
 * WebRTC peer connection. Signalling goes through the free public PeerJS cloud,
 * so no backend of our own is required.
 *
 * The game cooperates only by (optionally) setting window.__telemetry to a
 * small object each frame; everything else here is self-contained.
 *
 * Requires PeerJS to be loaded first (peerjs.min.js from a CDN).
 */
(function () {
  var params = new URLSearchParams(location.search);
  var code = (params.get('code') || '').trim().toUpperCase();
  if (!code) return;                 // solo play — no monitoring requested

  if (typeof Peer === 'undefined') {
    console.warn('[monitor] PeerJS not loaded — live view disabled');
    return;
  }

  var PREFIX = 'splog-';             // namespace on the shared PeerJS cloud
  var targetId = PREFIX + code;      // therapist peer id derived from session code

  // ICE (STUN/TURN) config is shared via lib/ice-config.js (window.ICE_SERVERS),
  // so TURN credentials live in exactly one place. Falls back to STUN-only.
  var ICE = {
    iceServers: (window.ICE_SERVERS && window.ICE_SERVERS.length)
      ? window.ICE_SERVERS
      : [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  var peer = null;
  var stream = null;
  var mediaCall = null;
  var dataConn = null;
  var telemetryTimer = null;
  var reconnectTimer = null;

  // Small status pill so a parent/therapist can confirm the link is live.
  var pill = document.createElement('div');
  pill.style.cssText = [
    'position:fixed', 'top:8px', 'left:8px', 'z-index:99999',
    'font:600 12px system-ui,sans-serif', 'padding:5px 10px', 'border-radius:20px',
    'color:#fff', 'background:rgba(0,0,0,0.45)', 'pointer-events:none',
    'transition:background .3s'
  ].join(';');
  function setPill(text, color) {
    pill.textContent = text;
    pill.style.background = color || 'rgba(0,0,0,0.45)';
  }
  function showPill() { if (!pill.parentNode) document.body.appendChild(pill); }

  function getCanvasStream() {
    var canvas = document.querySelector('canvas');
    if (!canvas || !canvas.captureStream) return null;
    try { return canvas.captureStream(20); } catch (e) { return null; }
  }

  function init() {
    showPill();
    setPill('🔗 Підключення…', 'rgba(230,150,30,0.85)');

    stream = getCanvasStream();
    if (!stream) { setTimeout(init, 400); return; }   // wait for the game canvas

    peer = new Peer(undefined, { debug: 1, config: ICE });

    peer.on('open', function () { connect(); });

    peer.on('error', function (err) {
      console.warn('[monitor] peer error:', err && err.type);
      // peer-unavailable = therapist not online yet; keep retrying quietly
      setPill('⌛ Очікую логопеда…', 'rgba(120,120,120,0.7)');
      scheduleReconnect();
    });

    peer.on('disconnected', function () { scheduleReconnect(); });
  }

  function connect() {
    if (!peer || peer.destroyed) return;

    // 1) media call — the live screen
    try {
      mediaCall = peer.call(targetId, stream);
      if (mediaCall) {
        mediaCall.on('close', scheduleReconnect);
        mediaCall.on('error', scheduleReconnect);
      }
    } catch (e) { /* therapist offline; retry */ }

    // 2) data connection — telemetry
    dataConn = peer.connect(targetId, { reliable: false });
    dataConn.on('open', function () {
      setPill('🟢 Логопед бачить екран', 'rgba(40,170,90,0.9)');
      clearInterval(telemetryTimer);
      telemetryTimer = setInterval(function () {
        if (dataConn && dataConn.open) {
          try { dataConn.send(window.__telemetry || {}); } catch (e) {}
        }
      }, 250);
    });
    dataConn.on('close', function () {
      clearInterval(telemetryTimer);
      scheduleReconnect();
    });
    dataConn.on('error', function () { scheduleReconnect(); });
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(function () {
      if (peer && !peer.destroyed) {
        if (peer.disconnected) { try { peer.reconnect(); } catch (e) {} }
        connect();
      } else {
        init();
      }
    }, 1200);
  }

  // Tidy up on navigation away.
  window.addEventListener('pagehide', function () {
    try { if (mediaCall) mediaCall.close(); } catch (e) {}
    try { if (dataConn) dataConn.close(); } catch (e) {}
    try { if (peer) peer.destroy(); } catch (e) {}
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
