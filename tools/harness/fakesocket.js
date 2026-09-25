// A client the harness can drive, with no network under it.
//
// socketManager.connect (sockets.js:2049) takes a `ws` socket and an http `req`
// and hangs about forty things off the socket. It never asks for anything a real
// websocket has beyond six members, so this supplies those six and records
// everything the server sends.
//
//   send(buffer, opts)   the server talking. Decoded and pushed onto .outbox.
//   readyState / OPEN    talk() and lastWords() both gate on these.
//   on(event, handler)   only "message" and "close" are subscribed to.
//   close()              kick() calls it; it must fire the close handler.
//   terminate()          lastWords() calls it after sending.
//
// The point of it is that the whole player path -- the handshake, the room, the
// spawn, the per-frame uplink -- can then be driven from a script and compared
// against internal/wire doing the same thing. Nothing here fakes game state: the
// socket is the real one connect() built, on top of this shell.

'use strict';

const path = require('path');

// A minimal http.IncomingMessage. connect() reads six proxy headers and falls
// back to req.connection.remoteAddress, then validates the result with net.isIP.
function makeRequest(ip) {
  return {
    headers: {},
    connection: { remoteAddress: ip || '127.0.0.1' },
  };
}

class FakeSocket {
  constructor(opts = {}) {
    this.OPEN = 1;
    this.CLOSED = 3;
    this.readyState = this.OPEN;
    this.binaryType = 'nodebuffer';

    // Every frame the server has sent, decoded. Kept in order.
    this.outbox = [];
    // Frames sent after the socket closed, which a correct server never does.
    this.sentWhileClosed = 0;
    this.closed = false;
    this.kickedFor = null;

    this._handlers = new Map();
    this._protocol = opts.protocol || null;
  }

  // --- the six members connect() needs -------------------------------------

  send(data) {
    if (this.readyState !== this.OPEN) {
      this.sentWhileClosed++;
      return;
    }
    this.outbox.push(this._protocol ? this._protocol.decode(data) : data);
  }

  on(event, handler) {
    this._handlers.set(event, handler);
    return handler;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.readyState = this.CLOSED;
    const h = this._handlers.get('close');
    if (h) h();
  }

  terminate() {
    this.close();
  }

  // --- driving it ----------------------------------------------------------

  // clientSend is the browser's half: hand the server one message, in the same
  // encoded form a real client would.
  //
  // It is NOT called talk. connect() assigns socket.talk itself -- that is the
  // server's send-to-client -- and a method of that name here would be silently
  // replaced by it.
  clientSend(...message) {
    const h = this._handlers.get('message');
    if (!h) throw new Error('fakesocket: nothing is listening for messages');
    if (!this._protocol) throw new Error('fakesocket: no protocol to encode with');
    h(this._protocol.encode(message));
  }

  // takeOutbox drains what has arrived since the last call, which is how a
  // caller reads one tick's worth of frames.
  takeOutbox() {
    const out = this.outbox;
    this.outbox = [];
    return out;
  }

  // opcodesSince is the shape of a burst without its payloads, for asserting an
  // order rather than a value.
  opcodesSince(from = 0) {
    return this.outbox.slice(from).map(m => (Array.isArray(m) && typeof m[0] === 'string' ? m[0] : '?'));
  }
}

// connectClient runs socketManager.connect the way the ws upgrade handler does
// (server.js:328), and returns the socket the server has finished decorating.
//
// The kick seam is replaced afterwards rather than before, because connect()
// assigns it and would overwrite anything set first. Recording the reason is
// what makes a refused client a readable failure instead of a silent one.
function connectClient(manager, opts = {}) {
  const serverRoot = opts.serverRoot;
  if (!serverRoot) throw new Error('fakesocket: serverRoot is required');
  const protocol = require(path.join(serverRoot, 'lib', 'fasttalk.js'));

  const socket = new FakeSocket({ protocol });
  manager.socketManager.connect(socket, makeRequest(opts.ip));

  const realKick = socket.kick;
  socket.kick = reason => {
    socket.kickedFor = reason;
    return realKick(reason);
  };
  return socket;
}

module.exports = { FakeSocket, connectClient, makeRequest };
