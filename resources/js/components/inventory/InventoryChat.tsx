import React, { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ChatGPT-like single-file React component
// Default export a React component that can be dropped into an app using Tailwind + the existing UI components

const Avatar = ({ role }: { role: "user" | "assistant" }) => (
  <div
    className={`flex items-center justify-center h-9 w-9 rounded-full text-xs font-semibold shrink-0 ${
      role === "user" ? "bg-sky-500 text-white" : "bg-slate-300 text-slate-900"
    }`}
  >
    {role === "user" ? "Y" : "AI"}
  </div>
);

type Message = {
  role: "user" | "assistant";
  content: string;
  id?: string;
  createdAt?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryData?: any[];
};

export default function InventoryChat({ open, onOpenChange, inventoryData }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // auto-scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // REPLACE your prepareInventoryContext with this:
  const prepareInventoryContext = () => {
    if (!inventoryData || inventoryData.length === 0) return "";

    const toNumber = (v: any) => {
      if (v === null || v === undefined || v === "") return 0;
      const n = Number(v);
      return Number.isNaN(n) ? 0 : n;
    };

    const normalised = inventoryData.map((item: any) => {
      // Try both camelCase and snake_case field names
      const onHand = toNumber(
        item.quantityOnHand ??
          item.quantity_on_hand ??
          item.quantity_onhand ??
          item.in_stock ??
          item.inStock ??
          item.qty ??
          item.stock,
      );
      const available = toNumber(
        item.availableQuantity ??
          item.available_quantity ??
          item.available ??
          item.on_hand ??
          item.quantity_on_hand,
      );
      const reorderPoint = toNumber(
        item.reorderPoint ??
          item.reorder_point ??
          item.reorder ??
          item.reorder_level ??
          item.min_stock,
      );
      return {
        ...item,
        _onHand: onHand,
        _available: available,
        _reorderPoint: reorderPoint,
      };
    });

    const totalItems = normalised.length;
    const lowStockItems = normalised.filter((i) => i._available < i._reorderPoint).length;
    const outOfStockItems = normalised.filter((i) => i._onHand === 0).length;

    const stats = `Inventory Summary:\n- Total items: ${totalItems}\n- Low stock items: ${lowStockItems}\n- Out of stock items: ${outOfStockItems}`;

    const itemDetails = normalised
      .slice(0, 50)
      .map((item: any) => {
        const code = item.item_code ?? item.id ?? "N/A";
        const name = item.item_name ?? item.name ?? "Unnamed";
        return `- ${code} | ${name} | On-hand: ${item._onHand} | Available: ${item._available} | Reorder point: ${item._reorderPoint}`;
      })
      .join("\n");

    return `${stats}\n\n${itemDetails}`;
  };

  // Helper to append a message
  const pushMessage = (m: Message) =>
    setMessages((p) => [...p, { ...m, id: (Math.random() + "").slice(2), createdAt: new Date().toISOString() }]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    pushMessage(userMessage);
    setInput("");
    setIsLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inventory-chat`;

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          inventoryContext: prepareInventoryContext(),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch assistant response");
      }

      if (!response.body) throw new Error("No response body from server");

      // Insert assistant placeholder message to stream into
      pushMessage({ role: "assistant", content: "" });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // process lines - like server-sent events stream that yield lines starting with "data: "
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx + 1).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.replace(/^data:\s*/, "").trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const chunk = parsed.choices?.[0]?.delta?.content || parsed.content || "";
            if (chunk) {
              assistantMessage += chunk;
              // replace last assistant message with updated content
              setMessages((prev) => {
                const copy = [...prev];
                const lastIndex = copy.map((m) => m.role).lastIndexOf("assistant");
                if (lastIndex >= 0) {
                  copy[lastIndex] = { ...copy[lastIndex], content: assistantMessage };
                }
                return copy;
              });
            }
          } catch (e) {
            // fallback: append raw text
            assistantMessage += jsonStr;
            setMessages((prev) => {
              const copy = [...prev];
              const lastIndex = copy.map((m) => m.role).lastIndexOf("assistant");
              if (lastIndex >= 0) {
                copy[lastIndex] = { ...copy[lastIndex], content: assistantMessage };
              }
              return copy;
            });
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      toast({
        title: "Chat Error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      // remove last assistant placeholder
      setMessages((prev) => {
        const copy = [...prev];
        const lastIndex = copy.map((m) => m.role).lastIndexOf("assistant");
        if (lastIndex >= 0) copy.splice(lastIndex, 1);
        return copy;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[720px] flex flex-col p-0 bg-white dark:bg-slate-900">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-lg font-semibold">Inventory AI Assistant</div>
              <div className="text-sm text-slate-500">Ask questions about stock, reorder, and suppliers</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMessages([]);
                  toast({ title: "Cleared", description: "Chat history cleared" });
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Messages area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full" ref={scrollRef as any}>
            <div className="px-6 py-6 space-y-4">
              {messages.length === 0 && (
                <div className="mx-auto max-w-xl text-center text-slate-500">
                  <div className="text-lg font-medium mb-2">Welcome — Ask anything about your inventory</div>
                  <div className="text-sm">Try: "Which items need reorder this month?" or "Show low stock items"</div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={m.id || i}
                  className={`flex items-start gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && <Avatar role="assistant" />}

                  <div className={`max-w-[80%] break-words ${m.role === "user" ? "text-right" : "text-left"}`}>
                    <div
                      className={`inline-block rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-sky-600 text-white rounded-br-none"
                          : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 rounded-bl-none"
                      }`}
                    >
                      {m.content || (m.role === "assistant" && isLoading ? "..." : "")}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                    </div>
                  </div>

                  {m.role === "user" && <Avatar role="user" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Input area */}
        <div className="border-t p-4">
          <div className="max-w-4xl mx-auto flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your inventory... (Shift+Enter for newline)"
              className="flex-1 min-h-[48px] max-h-36 resize-none rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              disabled={isLoading}
            />

            <div className="flex items-center gap-2">
              <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
