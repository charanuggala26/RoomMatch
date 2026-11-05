import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Group from "./models/Group.js";

let io = null;

// Authenticated Socket.IO. Each socket joins a private room for its user
// (`user:<id>`) and, on request, rooms for groups it is a member of
// (`group:<id>`). Membership is checked against the database on every join.
export function initRealtime(httpServer, origin) {
  io = new Server(httpServer, { cors: { origin, credentials: true } });

  io.use((socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      socket.userId = String(payload.id);
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on("group:join", async (groupId, ack) => {
      try {
        const isMember = await Group.exists({ _id: groupId, members: socket.userId });
        if (!isMember) return ack?.({ ok: false });
        socket.join(`group:${groupId}`);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false });
      }
    });

    socket.on("group:leave", (groupId) => socket.leave(`group:${groupId}`));
  });

  return io;
}

// Tell everyone viewing a group that something changed
export function emitGroup(groupId, payload) {
  io?.to(`group:${groupId}`).emit("group:event", { groupId: String(groupId), ...payload });
}

// Tell one user their list of homes changed (e.g. they were added to one)
export function emitUser(userId, payload = {}) {
  io?.to(`user:${userId}`).emit("groups:changed", payload);
}
