import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import type { ApiMessage, ProjectState, Source } from "@/types/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";
const MAX_TOKENS = 24000;

function extractSources(content: Anthropic.Messages.ContentBlock[]): Source[] {
  const sources: Source[] = [];
  const seen = new Set<string>();
  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;
    const inner = (block as unknown as { content: unknown }).content;
    if (!Array.isArray(inner)) continue;
    for (const item of inner as Record<string, unknown>[]) {
      if (item?.type === "web_search_result" && typeof item.url === "string") {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        sources.push({
          title: typeof item.title === "string" ? item.title : item.url,
          url: item.url,
        });
      }
    }
  }
  return sources;
}

function extractState(fullText: string): ProjectState | null {
  const match = fullText.match(/<state>([\s\S]*?)<\/state>/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    return parsed as ProjectState;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "ANTHROPIC_API_KEY が設定されていません。サーバーの環境変数を設定してください。",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: { messages?: ApiMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
    });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages is required" }), {
      status: 400,
    });
  }

  const client = new Anthropic(
    process.env.ANTHROPIC_WORKSPACE_ID
      ? {
          defaultHeaders: {
            "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID,
          },
        }
      : undefined,
  );
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };

      try {
        const anthropicStream = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          tools: [
            { type: "web_search_20260209", name: "web_search", max_uses: 8 },
          ],
          output_config: { effort: "high" },
          messages: messages as Anthropic.Messages.MessageParam[],
        });

        let raw = "";
        let cutIndex = -1;

        anthropicStream.on("text", (delta: string) => {
          const startOfDelta = raw.length;
          raw += delta;
          if (cutIndex !== -1) return;
          const idx = raw.indexOf("<state");
          if (idx === -1) {
            send({ type: "text", text: delta });
          } else {
            cutIndex = idx;
            if (idx > startOfDelta) {
              const visiblePortion = delta.slice(0, idx - startOfDelta);
              if (visiblePortion) send({ type: "text", text: visiblePortion });
            }
          }
        });

        const finalMessage = await anthropicStream.finalMessage();

        const fullText = finalMessage.content
          .filter(
            (b): b is Anthropic.Messages.TextBlock => b.type === "text",
          )
          .map((b) => b.text)
          .join("");

        const state = extractState(fullText);
        const sources = extractSources(finalMessage.content);

        send({
          type: "done",
          content: finalMessage.content,
          state,
          sources,
        });
      } catch (err) {
        const message =
          err instanceof Anthropic.APIError
            ? `${err.status ?? ""} ${err.message}`.trim()
            : err instanceof Error
              ? err.message
              : "unknown error";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
