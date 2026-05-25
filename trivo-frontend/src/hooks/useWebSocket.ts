import { useEffect, useRef, useState } from "react";
import { createAgentSocket } from "@/lib/api";

export interface WSEvent {
  event: "thinking" | "deciding" | "execution" | "error" | "connected";
  agentId: string;
  content?: string;
  decision?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
}

export function useWebSocket(agentId: string | null) {
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!agentId) return;

    const ws = createAgentSocket(agentId);
    wsRef.current = ws;

    ws.onmessage = (msg: MessageEvent) => {
      try {
        setLastEvent(JSON.parse(msg.data as string));
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      // ws closed on error — reconnect handled by re-mount
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [agentId]);

  return { lastEvent };
}
