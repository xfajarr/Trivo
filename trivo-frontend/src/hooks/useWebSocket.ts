import { useEffect, useRef, useState } from "react";
import { createAgentSocket } from "@/lib/api";

interface WSEvent {
  event: string;
  agentId: string;
  content?: string;
}

export function useWebSocket(agentId: string | null) {
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!agentId) return;
    const ws = createAgentSocket(agentId);
    wsRef.current = ws;
    ws.onmessage = (msg) => {
      try {
        setLastEvent(JSON.parse(msg.data));
      } catch {
        // ignore parse errors
      }
    };
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [agentId]);

  return { lastEvent };
}
