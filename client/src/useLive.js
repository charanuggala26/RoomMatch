import { useEffect, useRef, useState } from "react";
import { getSocket } from "./socket.js";

// Subscribe to live events for one group. `onEvent` is called for every change
// made by anyone in the group (including you). Returns whether we're connected.
export function useGroupLive(groupId, onEvent) {
  const [live, setLive] = useState(false);
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit("group:join", groupId, (res) => setLive(Boolean(res?.ok)));
    const onEventFromServer = (e) => {
      if (e.groupId === String(groupId)) handler.current?.(e);
    };
    const onDisconnect = () => setLive(false);

    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("disconnect", onDisconnect);
    socket.on("group:event", onEventFromServer);

    return () => {
      socket.emit("group:leave", groupId);
      socket.off("connect", join);
      socket.off("disconnect", onDisconnect);
      socket.off("group:event", onEventFromServer);
    };
  }, [groupId]);

  return live;
}

// Refresh the "My homes" list when you're added to a home
export function useHomesLive(onChange) {
  const handler = useRef(onChange);
  handler.current = onChange;
  useEffect(() => {
    const socket = getSocket();
    const fn = () => handler.current?.();
    socket.on("groups:changed", fn);
    return () => socket.off("groups:changed", fn);
  }, []);
}
