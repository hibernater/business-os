import { create } from "zustand";
import { streamChat, getToken, clearToken } from "@/lib/api";

// ========== 交互元素类型 ==========

export interface QuestionElement {
  kind: "question";
  questionId: string;
  text: string;
  options: string[];
  allowFreeInput: boolean;
  allowMultiple: boolean;
  questionIndex: number;
  totalQuestions: number;
  answered?: boolean;
  selectedOptions?: string[];
}

export interface PlanPreviewElement {
  kind: "plan_preview";
  steps: { step_id: string; name: string; description: string }[];
  collectedInfo: string;
  confirmed?: boolean;
}

export interface CheckpointElement {
  kind: "checkpoint";
  stepId: string;
  prompt: string;
  replied?: boolean;
}

export interface CaptureOfferElement {
  kind: "capture_offer";
  prompt: string;
  replied?: boolean;
}

export type InteractiveElement =
  | QuestionElement
  | PlanPreviewElement
  | CheckpointElement
  | CaptureOfferElement;

// ========== 消息与对话 ==========

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  interactiveElements?: InteractiveElement[];
  metadata?: SkillMeta;
}

export interface SkillMeta {
  executionId?: string;
  skillId?: string;
  skillName?: string;
  currentStep?: string;
  currentStepName?: string;
  totalSteps?: number;
  stepIndex?: number;
  intent?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
}

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isStreaming: boolean;
  waitingForInput: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  newConversation: () => void;
  setCurrentConversation: (id: string | null) => void;
  clearError: () => void;
  exportCurrentAsMarkdown: () => string;
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface StreamEvent {
  type: string;
  content?: string;
  text?: string;
  skill_id?: string;
  skill_name?: string;
  name?: string;
  step_id?: string;
  step_name?: string;
  step_index?: number;
  total_steps?: number;
  total_questions?: number;
  has_intake?: boolean;
  intent?: string;
  confidence?: number;
  reasoning?: string;
  error?: string;
  execution_id?: string;
  question_id?: string;
  options?: string[];
  allow_free_input?: boolean;
  allow_multiple?: boolean;
  question_index?: number;
  steps?: { step_id: string; name: string; description: string }[];
  collected_info?: string;
  prompt?: string;
  phase?: string;
  collected_answers?: Record<string, string>;
  preferences?: Record<string, string>;
  message?: string;
}

function parseStreamEvent(line: string): StreamEvent | null {
  const trimmed = line.startsWith("data:") ? line.slice(line.indexOf(":") + 1).trim() : line.trim();
  if (!trimmed || trimmed === "[DONE]") return null;
  try {
    return JSON.parse(trimmed) as StreamEvent;
  } catch {
    return null;
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  isStreaming: false,
  waitingForInput: false,
  error: null,

  sendMessage: async (content: string) => {
    const token = getToken();
    if (!token) {
      set({ error: "请先登录" });
      return;
    }

    const { conversations, currentConversationId } = get();
    let conv = conversations.find((c) => c.id === currentConversationId);

    if (!conv) {
      conv = {
        id: generateId(),
        title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
        messages: [],
      };
      set({
        conversations: [conv, ...conversations],
        currentConversationId: conv.id,
      });
    }

    // 标记上一条消息的交互元素为已回答
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conv!.id
          ? {
              ...c,
              messages: c.messages.map((m) => {
                if (m.role !== "assistant" || !m.interactiveElements?.length) return m;
                return {
                  ...m,
                  interactiveElements: m.interactiveElements.map((el) => {
                    if (el.kind === "question" && !el.answered) return { ...el, answered: true, selectedOptions: [content] };
                    if (el.kind === "checkpoint" && !el.replied) return { ...el, replied: true };
                    if (el.kind === "capture_offer" && !el.replied) return { ...el, replied: true };
                    if (el.kind === "plan_preview" && !el.confirmed) return { ...el, confirmed: true };
                    return el;
                  }),
                };
              }),
            }
          : c
      ),
    }));

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content,
      createdAt: new Date(),
    };

    const assistantMessage: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content: "",
      createdAt: new Date(),
      interactiveElements: [],
    };

    const convId = conv.id;
    const assistantId = assistantMessage.id;

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, userMessage, assistantMessage] }
          : c
      ),
      isStreaming: true,
      waitingForInput: false,
      error: null,
    }));

    const updateAssistant = (updater: (msg: ChatMessage) => ChatMessage) => {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === convId
            ? { ...c, messages: c.messages.map((m) => (m.id === assistantId ? updater(m) : m)) }
            : c
        ),
      }));
    };

    const appendContent = (text: string) => {
      updateAssistant((m) => ({ ...m, content: m.content + text }));
    };

    const addInteractiveElement = (el: InteractiveElement) => {
      updateAssistant((m) => ({
        ...m,
        interactiveElements: [...(m.interactiveElements ?? []), el],
      }));
    };

    const setMeta = (meta: Partial<SkillMeta>) => {
      updateAssistant((m) => ({ ...m, metadata: { ...m.metadata, ...meta } }));
    };

    try {
      const res = await streamChat(content, convId, token);

      if (!res.ok) {
        if (res.status === 401) {
          clearToken();
          window.location.reload();
          return;
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { message?: string }).message ?? `请求失败: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) throw new Error("无法读取响应流");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const event = parseStreamEvent(line);
          if (!event) continue;

          switch (event.type) {
            case "intent":
              if (event.intent === "execute_skill" && event.skill_name) {
                appendContent(`**${event.skill_name}**\n\n`);
                setMeta({
                  intent: event.intent,
                  skillId: event.skill_id ?? undefined,
                  skillName: event.skill_name ?? undefined,
                });
              } else if (event.intent === "create_skill") {
                appendContent("**创建新 Skill**\n\n");
                setMeta({ intent: event.intent });
              }
              break;

            case "skill_start":
              if (event.has_intake) {
                appendContent("好的，让我先了解一些信息，然后帮你高效完成。\n\n");
              }
              setMeta({
                executionId: event.execution_id,
                skillId: event.skill_id ?? undefined,
                skillName: event.name ?? undefined,
                totalSteps: event.total_steps,
              });
              break;

            case "question":
              addInteractiveElement({
                kind: "question",
                questionId: event.question_id ?? "",
                text: event.text ?? "",
                options: event.options ?? [],
                allowFreeInput: event.allow_free_input ?? true,
                allowMultiple: event.allow_multiple ?? false,
                questionIndex: event.question_index ?? 0,
                totalQuestions: event.total_questions ?? 0,
              });
              break;

            case "plan_preview":
              appendContent("信息收集完毕，这是我的执行计划：\n\n");
              addInteractiveElement({
                kind: "plan_preview",
                steps: event.steps ?? [],
                collectedInfo: event.collected_info ?? "",
              });
              break;

            case "checkpoint":
              addInteractiveElement({
                kind: "checkpoint",
                stepId: event.step_id ?? "",
                prompt: event.prompt ?? "继续还是调整？",
              });
              break;

            case "capture_offer":
              addInteractiveElement({
                kind: "capture_offer",
                prompt: event.prompt ?? "",
              });
              break;

            case "waiting_input":
              set({ waitingForInput: true });
              break;

            case "step_start": {
              const stepNum = (event.step_index ?? 0) + 1;
              const total = event.total_steps ?? "?";
              appendContent(`\n---\n\n**Step ${stepNum}/${total}: ${event.step_name ?? ""}**\n\n`);
              setMeta({
                currentStep: event.step_id ?? undefined,
                currentStepName: event.step_name ?? undefined,
                stepIndex: event.step_index,
              });
              break;
            }

            case "text_delta":
              appendContent(event.content ?? event.text ?? "");
              break;

            case "step_done":
              appendContent("\n");
              break;

            case "step_error":
              appendContent(`\n\n**出错了**: ${event.error ?? "未知错误"}\n`);
              break;

            case "skill_done":
              appendContent("\n---\n\nSkill 执行完成。执行记录已自动保存。\n\n");
              break;

            case "memory_save":
              appendContent("**偏好已保存！** 下次执行同一 Skill 时会自动应用。\n");
              break;

            case "skill_creation_start":
              setMeta({ executionId: event.execution_id ?? (event as StreamEvent & {creation_id?: string}).creation_id });
              break;

            case "skill_creation_confirm":
              addInteractiveElement({
                kind: "checkpoint",
                stepId: "skill_creation_confirm",
                prompt: event.prompt ?? "确认后帮你生成 Skill",
              });
              break;

            case "skill_created":
              appendContent("\n");
              break;

            case "error":
              appendContent(event.message ?? "发生错误");
              break;

            case "done":
              break;
          }
        }
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "发送失败" });
      updateAssistant((m) => ({
        ...m,
        content: m.content || (err instanceof Error ? err.message : "发送失败"),
      }));
    } finally {
      set({ isStreaming: false });
    }
  },

  newConversation: () => set({ currentConversationId: null, waitingForInput: false }),
  setCurrentConversation: (id: string | null) => set({ currentConversationId: id, waitingForInput: false }),
  clearError: () => set({ error: null }),

  exportCurrentAsMarkdown: () => {
    const state = get();
    const conv = state.conversations.find((c) => c.id === state.currentConversationId);
    if (!conv) return "";
    const lines: string[] = [`# ${conv.title}`, "", `导出时间: ${new Date().toLocaleString("zh-CN")}`, "", "---", ""];
    for (const msg of conv.messages) {
      if (msg.role === "user") {
        lines.push(`**用户:** ${msg.content}`, "");
      } else {
        lines.push(msg.content, "");
      }
    }
    return lines.join("\n");
  },
}));
