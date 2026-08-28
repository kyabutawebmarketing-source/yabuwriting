import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Source } from "@/types/chat";

export type DisplayMessage = {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  pending?: boolean;
};

export default function ChatMessage({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-indigo-600 text-white"
            : "border border-slate-200 bg-white text-slate-800"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.text}</p>
        ) : (
          <div className="prose prose-sm prose-slate max-w-none prose-headings:font-semibold prose-table:text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.text || (message.pending ? "" : "")}
            </ReactMarkdown>
            {message.pending && (
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-slate-300 align-text-bottom" />
            )}
          </div>
        )}

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-2">
            <p className="text-xs font-medium text-slate-400">
              参照した検索結果
            </p>
            <ul className="mt-1 space-y-0.5">
              {message.sources.map((s, i) => (
                <li key={i} className="truncate text-xs">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    {s.title || s.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
