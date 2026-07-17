'use client';

import { io, type Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

/** Cliente Socket.IO único por sesión de navegador. Reutiliza la cookie httpOnly (ver ADR-0003). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      path: '/socket.io',
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });
  }
  return socket;
}
