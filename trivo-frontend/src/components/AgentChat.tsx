import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AgentChat({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi! I'm ${agentName}. You can chat with me to refine my trading strategy or ask about my performance.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      // Use per-agent chat endpoint for context-aware responses
      const res = await api.post(`/api/chat/agent/${agentId}`, {
        message: userMsg,
        history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      });
      const reply = res.data?.reply || "No response";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      // Fallback to general chat
      try {
        const res = await api.post("/api/chat", {
          message: `[Agent: ${agentName}] ${userMsg}`,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.data?.reply || "No response" },
        ]);
      } catch {
        toast.error("Chat failed. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card flex flex-col h-[420px]">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <Bot className="h-4 w-4 text-neon" />
        <span className="font-display text-sm font-semibold">Train {agentName}</span>
        <span className="ticker text-[10px] text-muted-foreground ml-auto">
          Chat to refine strategy
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-neon/10 text-neon">
                <Bot className="h-3.5 w-3.5" />
              </div>
            )}
            <div
              className={`rounded-lg px-3 py-2 text-xs max-w-[80%] ${m.role === "user" ? "bg-neon/10 text-neon" : "bg-surface-2 text-foreground"}`}
            >
              {m.content}
            </div>
            {m.role === "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-surface-2">
                <User className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-xs text-muted-foreground italic animate-pulse">Thinking...</div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`Train ${agentName}...`}
          className="flex-1 bg-surface-2 border border-border rounded px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:border-neon/40"
          disabled={loading}
        />
        <Button
          size="sm"
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-neon text-primary-foreground hover:bg-neon/90"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
