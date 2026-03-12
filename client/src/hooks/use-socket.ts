import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { queryClient } from "@/lib/queryClient";

let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io({ path: "/ws", transports: ["websocket", "polling"] });
  }
  return globalSocket;
}

export function useSocket() {
  const listenerAdded = useRef(false);

  useEffect(() => {
    if (listenerAdded.current) return;
    listenerAdded.current = true;

    const socket = getSocket();

    socket.on("GIGJACK_START", () => {
      // Instantly invalidate the live-state query so the overlay reacts within milliseconds
      queryClient.invalidateQueries({ queryKey: ["/api/gigjacks/live-state"] });
    });

    socket.on("GIGJACK_END", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gigjacks/live-state"] });
    });

    return () => {
      listenerAdded.current = false;
    };
  }, []);
}
