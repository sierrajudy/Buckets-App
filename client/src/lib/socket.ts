import { io, type Socket } from "socket.io-client";

export const socket: Socket = io({
  autoConnect: false,
  transports: ["websocket", "polling"],
});

export function connectSocket(token: string) {
  socket.auth = { token };
  if (socket.connected) socket.disconnect();
  socket.connect();
}

export function disconnectSocket() {
  socket.disconnect();
}
