// SharedWorker backing widget.html.
//
// All state lives only in this worker's memory (no localStorage, IndexedDB,
// cookies, etc). If the worker survives a cross-site navigation of the
// embedding page thanks to `extendedLifetime: true`, the reloaded widget
// iframe reconnects to this same instance and gets everything back, including
// the still-open WebSocket.

const workerId = Math.random().toString(36).slice(2, 8);
const workerStartedAt = Date.now();

const ports = new Set();
let totalConnections = 0;
const messages = [];

// ---------------------------------------------------------------------------
// WebSocket that lives in the worker. GitHub Pages can't host a WebSocket
// server, so this talks to a public echo server instead.
const WS_URL = 'wss://echo.websocket.org';
const ws = {
  socket: null,
  status: 'not connected',
  openedAt: null,
  connectionCount: 0,
  sent: 0,
  received: 0,
  pingCount: 0,
  log: [],
};

function wsLog(dir, text) {
  ws.log.push({ time: Date.now(), dir, text: String(text).slice(0, 200) });
  if (ws.log.length > 30) ws.log.shift();
  broadcast();
}

function wsConnect() {
  ws.status = 'connecting';
  broadcast();
  let socket;
  try {
    socket = new WebSocket(WS_URL);
  } catch (e) {
    ws.status = 'error: ' + e.message;
    broadcast();
    return;
  }
  ws.socket = socket;
  socket.onopen = () => {
    ws.connectionCount++;
    ws.status = 'open';
    ws.openedAt = Date.now();
    wsLog('sys', `connected to ${WS_URL} (connection #${ws.connectionCount})`);
  };
  socket.onmessage = (e) => {
    ws.received++;
    wsLog('in', e.data);
  };
  socket.onerror = () => {
    ws.status = 'error';
    broadcast();
  };
  socket.onclose = (e) => {
    ws.status = 'closed';
    ws.openedAt = null;
    ws.socket = null;
    wsLog('sys', `closed (code ${e.code}); reconnecting in 5s`);
    setTimeout(wsConnect, 5000);
  };
}

function wsSend(text) {
  if (ws.socket && ws.socket.readyState === WebSocket.OPEN) {
    ws.socket.send(text);
    ws.sent++;
    wsLog('out', text);
  }
}

// Periodic heartbeat so you can watch the same connection keep ticking
// across navigations.
setInterval(() => wsSend(`ping #${++ws.pingCount} from worker ${workerId}`), 10000);

wsConnect();

// ---------------------------------------------------------------------------

function snapshot() {
  return {
    type: 'state',
    workerId,
    workerStartedAt,
    totalConnections,
    currentClients: ports.size,
    messages,
    ws: {
      url: WS_URL,
      status: ws.status,
      openedAt: ws.openedAt,
      connectionCount: ws.connectionCount,
      sent: ws.sent,
      received: ws.received,
      log: ws.log,
    },
  };
}

function broadcast() {
  const state = snapshot();
  for (const port of ports) port.postMessage(state);
}

function removePort(port) {
  if (ports.delete(port)) broadcast();
}

self.onconnect = (event) => {
  const port = event.ports[0];
  ports.add(port);
  totalConnections++;

  // MessagePort 'close' event (where supported) tells us when a client goes
  // away; clients also send an explicit 'bye' on pagehide as a fallback.
  port.addEventListener('close', () => removePort(port));

  port.onmessage = (e) => {
    const msg = e.data || {};
    switch (msg.type) {
      case 'add': {
        const text = String(msg.text || '').trim();
        if (!text) return;
        messages.push({ text, time: Date.now(), site: msg.site || '?' });
        wsSend(text);
        broadcast();
        break;
      }
      case 'clear':
        messages.length = 0;
        broadcast();
        break;
      case 'bye':
        removePort(port);
        break;
      case 'hello':
      default:
        broadcast();
    }
  };
  port.start();
  broadcast();
};
