"use client";

import { useEffect, useState } from "react";
import { Clock, Package, ChevronDown, ChevronRight, Loader2, CheckCircle, XCircle, Download } from "lucide-react";
import { fetchExecutions, getToken, type ExecutionRecord } from "@/lib/api";

export function ExecutionHistory() {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchExecutions(token)
      .then(setExecutions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <Clock className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">暂无执行记录</p>
        <p className="mt-1 text-xs text-gray-400">执行 Skill 后，记录会自动保存在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map((exec) => {
        const expanded = expandedId === exec.id;
        interface ParsedRecord {
          user_input?: string;
          collected_answers?: Record<string, string>;
          step_results?: Record<string, { status: string; output_preview?: string; error?: string }>;
          completed_steps?: number;
          step_count?: number;
          skill_name?: string;
        }
        let parsed: ParsedRecord = {};
        try { parsed = JSON.parse(exec.content) as ParsedRecord; } catch {}
        const completedSteps = parsed.completed_steps ?? 0;
        const totalSteps = parsed.step_count ?? 0;
        const skillName = parsed.skill_name ?? exec.skillId;
        const allDone = completedSteps === totalSteps && totalSteps > 0;

        return (
          <div key={exec.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={() => setExpandedId(expanded ? null : exec.id)}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${allDone ? "bg-green-100" : "bg-amber-100"}`}>
                {allDone ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-amber-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="font-medium text-gray-900">{skillName}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {completedSteps}/{totalSteps} 步
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {exec.createdAt ? new Date(exec.createdAt).toLocaleString("zh-CN") : ""}
                </p>
              </div>
              {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            </button>

            {expanded && (
              <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                {parsed.user_input ? (
                  <div>
                    <span className="text-xs font-medium text-gray-500">用户输入</span>
                    <p className="mt-0.5 text-sm text-gray-700">{parsed.user_input}</p>
                  </div>
                ) : null}
                {parsed.collected_answers && Object.keys(parsed.collected_answers).length > 0 ? (
                  <div>
                    <span className="text-xs font-medium text-gray-500">采集的信息</span>
                    <div className="mt-1 space-y-1">
                      {Object.entries(parsed.collected_answers).map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-sm">
                          <span className="text-gray-500">{k}:</span>
                          <span className="text-gray-700">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {parsed.step_results ? (
                  <div>
                    <span className="text-xs font-medium text-gray-500">执行步骤</span>
                    <div className="mt-1 space-y-1">
                      {Object.entries(parsed.step_results).map(([stepId, result]) => (
                        <div key={stepId} className="rounded-lg border border-gray-200 bg-white p-2">
                          <div className="flex items-center gap-2">
                            {result.status === "completed" ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-red-500" />
                            )}
                            <span className="text-sm font-medium text-gray-700">{stepId}</span>
                          </div>
                          {result.output_preview && (
                            <p className="mt-1 text-xs text-gray-500 line-clamp-3">{result.output_preview}</p>
                          )}
                          {result.error && (
                            <p className="mt-1 text-xs text-red-500">{result.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      const lines = [`# ${skillName} - 执行记录`, "", `执行时间: ${exec.createdAt ? new Date(exec.createdAt).toLocaleString("zh-CN") : ""}`, ""];
                      if (parsed.user_input) lines.push(`## 用户输入`, "", String(parsed.user_input), "");
                      if (parsed.collected_answers) {
                        lines.push("## 采集信息", "");
                        for (const [k, v] of Object.entries(parsed.collected_answers)) lines.push(`- **${k}**: ${v}`);
                        lines.push("");
                      }
                      if (parsed.step_results) {
                        lines.push("## 执行步骤", "");
                        for (const [sid, r] of Object.entries(parsed.step_results)) {
                          lines.push(`### ${sid} (${r.status})`, "");
                          if (r.output_preview) lines.push(r.output_preview, "");
                          if (r.error) lines.push(`> Error: ${r.error}`, "");
                        }
                      }
                      const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${skillName}_${new Date(exec.createdAt).toISOString().slice(0, 10)}.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    导出
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
