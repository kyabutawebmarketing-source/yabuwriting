// Plain JSON-safe types shared between client and server.
// Content blocks mirror the shape of Anthropic Messages API content blocks,
// but are kept untyped-JSON here since they cross the client/server boundary
// as plain JSON over HTTP.
export type ContentBlock = Record<string, unknown>;

export type ApiMessage = {
  role: "user" | "assistant";
  content: string | ContentBlock[];
};

export type ProjectState = {
  mainKeyword: string;
  subKeywords: string[];
  aiQueries: string[];
  searchIntent: string;
  target: string;
  articleModel: string;
  headings: { h2: string; h3: string[] }[];
  currentStep: number;
  stepLabel: string;
};

export type Source = { title: string; url: string };

export type StreamEvent =
  | { type: "text"; text: string }
  | {
      type: "done";
      content: ContentBlock[];
      state: ProjectState | null;
      sources: Source[];
    }
  | { type: "error"; message: string };

export const EMPTY_STATE: ProjectState = {
  mainKeyword: "",
  subKeywords: [],
  aiQueries: [],
  searchIntent: "",
  target: "",
  articleModel: "",
  headings: [],
  currentStep: 1,
  stepLabel: "ステップ1：キーワードとAIクエリ意図の入力",
};
