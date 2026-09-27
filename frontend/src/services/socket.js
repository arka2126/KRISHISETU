// Shared Socket.IO client instance, authenticated with the same JWT as the REST API.
//
// Reconnection settings are explicit (rather than relying on the library
// defaults) so a mobile connection that drops in and out — going through a
// tunnel, weak signal, switching from wifi to mobile data — keeps retrying
// patiently instead of giving up after a couple of tries.
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    const token = localStorage.getItem('ks_token');
    socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      randomizationFactor: 0.5,
      timeout: 20000, // generous connect timeout for slow mobile networks
      transports: ['websocket', 'polling'], // falls back to polling if a carrier/proxy blocks websocket upgrades
    });
  }
  return socket;
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
