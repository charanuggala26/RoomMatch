import { io } from "socket.io-client";

let socket = null;

// One shared, authenticated connection. The token is read on every (re)connect,
// so logging in as another user and reconnecting always uses the right identity.
export function getSocket() {
  if (!socket) {
    socket = io("/", {
      auth: (cb) => cb({ token: localStorage.getItem("token") }),
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
