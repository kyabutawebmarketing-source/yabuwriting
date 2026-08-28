"use client";

import { useEffect, useRef, useState } from "react";
import ChatMessage, { DisplayMessage } from "@/components/ChatMessage";
import StatePanel from "@/components/StatePanel";
import type { ApiMessage, ProjectState, StreamEvent } from "@/types/chat";
import { EMPTY_STATE } from "@/types/chat";

const OPENING_MESSAGE =
  "分析・記事作成したいメインキーワードを教えてください。\n\nまた、ターゲットユーザーがChatGPT、Gemini、PerplexityなどのAIに質問するとしたら、どのような質問をしそうか、具体的な質問文があれば併せて教えてください。AIクエリが分からない場合はこちらで推測します。\n\n例：Webライター 年収アップ / アトピー 亜鉛 / 敬老の日 プレゼント / 赤ちゃん 秋服";

export default function Home() {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    { role: "assistant", text: OPENING_MESSAGE },
  ]);
  const [projectState, setProjectState] = useState<ProjectState>(EMPTY_STATE);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiHistoryRef = useRef<ApiMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;

    setError(null);
    setInput("");
    apiHistoryRef.current = [
      ...apiHistoryRef.current,
      { role: "user", content: text },
    ];
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "assistant", text: "", pending: true },
    ]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiHistoryRef.current }),
      });

      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || `リクエストに失敗しました (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          applyEvent(event);
        }
      }
      if (buffer.trim()) {
        const event = JSON.parse(buffer) as StreamEvent;
        applyEvent(event);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
      setError(message);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && last.pending) {
          next[next.length - 1] = {
            role: "assistant",
            text: last.text || "エラーが発生しました。",
            pending: false,
          };
        }
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function applyEvent(event: StreamEvent) {
    if (event.type === "text") {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = {
            ...last,
            text: last.text + event.text,
          };
        }
        return next;
      });
    } else if (event.type === "done") {
      apiHistoryRef.current = [
        ...apiHistoryRef.current,
        { role: "assistant", content: event.content },
      ];
      if (event.state) {
        setProjectState((prev) => ({ ...prev, ...event.state }));
      }
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = {
            ...last,
            pending: false,
            sources: event.sources,
          };
        }
        return next;
      });
    } else if (event.type === "error") {
      setError(event.message);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = {
            ...last,
            pending: false,
            text: last.text || `エラー: ${event.message}`,
          };
        }
        return next;
      });
    }
  }

  function handleReset() {
    if (!confirm("会話を最初からやり直します。よろしいですか？")) return;
    apiHistoryRef.current = [];
    setMessages([{ role: "assistant", text: OPENING_MESSAGE }]);
    setProjectState(EMPTY_STATE);
    setError(null);
  }

  function handleExport() {
    const md = messages
      .map((m) => (m.role === "user" ? `## ユーザー\n\n${m.text}` : `## アシスタント\n\n${m.text}`))
      .join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectState.mainKeyword || "column"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-screen w-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-base font-semibold text-slate-800">
            SEO・LLMO・AIO コラムライティングツール
          </h1>
          <p className="text-xs text-slate-400">
            実検索・競合分析を踏まえて対話形式で記事を作成します
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            会話をエクスポート
          </button>
          <button
            onClick={handleReset}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            最初からやり直す
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-8">
            {messages.map((m, i) => (
              <ChatMessage key={i} message={m} />
            ))}
            {error && (
              <p className="text-center text-xs text-red-500">{error}</p>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <div className="mx-auto flex max-w-4xl items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="メッセージを入力（Shift+Enterで改行）"
                rows={2}
                disabled={isStreaming}
                className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none disabled:bg-slate-50"
              />
              <button
                onClick={handleSend}
                disabled={isStreaming || !input.trim()}
                className="h-10 shrink-0 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isStreaming ? "生成中…" : "送信"}
              </button>
            </div>
          </div>
        </main>

        <div className="hidden w-80 shrink-0 lg:block">
          <StatePanel state={projectState} />
        </div>
      </div>
    </div>
  );
}
