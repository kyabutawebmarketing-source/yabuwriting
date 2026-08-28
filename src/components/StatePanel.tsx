import type { ProjectState } from "@/types/chat";

const STEPS = [
  "キーワード・AIクエリ",
  "検索結果・関連語分析",
  "三層ターゲット分析",
  "競合記事・AI回答分析",
  "記事モデル選定",
  "構成案作成",
  "整合性チェック",
  "最終記事作成",
];

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-700 break-words">
        {value ? value : <span className="text-slate-300">未確定</span>}
      </dd>
    </div>
  );
}

function TagField({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 flex flex-wrap gap-1">
        {values && values.length > 0 ? (
          values.map((v, i) => (
            <span
              key={i}
              className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
            >
              {v}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-300">未確定</span>
        )}
      </dd>
    </div>
  );
}

export default function StatePanel({ state }: { state: ProjectState }) {
  const step = Math.min(Math.max(state.currentStep || 1, 1), 8);

  return (
    <aside className="flex h-full w-full flex-col gap-5 overflow-y-auto border-l border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-500">進行状況</h2>
        <ol className="mt-2 space-y-1">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const current = n === step;
            return (
              <li key={n} className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    current
                      ? "bg-indigo-600 text-white"
                      : done
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {n}
                </span>
                <span
                  className={
                    current
                      ? "font-semibold text-indigo-700"
                      : done
                        ? "text-slate-500 line-through decoration-slate-300"
                        : "text-slate-400"
                  }
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="h-px bg-slate-100" />

      <dl className="flex flex-col gap-4">
        <Field label="メインキーワード" value={state.mainKeyword} />
        <TagField label="サブキーワード" values={state.subKeywords} />
        <TagField label="AIクエリ" values={state.aiQueries} />
        <Field label="検索意図" value={state.searchIntent} />
        <Field label="ターゲット" value={state.target} />
        <Field label="採用記事モデル" value={state.articleModel} />
      </dl>

      <div className="h-px bg-slate-100" />

      <div>
        <h3 className="text-xs font-medium text-slate-400">
          確定H2・H3構成
        </h3>
        {state.headings && state.headings.length > 0 ? (
          <ol className="mt-2 space-y-2">
            {state.headings.map((h, i) => (
              <li key={i} className="text-sm">
                <p className="font-medium text-slate-700">
                  H2. {h.h2}
                </p>
                {h.h3 && h.h3.length > 0 && (
                  <ul className="mt-1 ml-4 list-disc space-y-0.5 text-slate-500">
                    {h.h3.map((h3, j) => (
                      <li key={j}>{h3}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-slate-300">未確定</p>
        )}
      </div>
    </aside>
  );
}
