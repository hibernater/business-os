const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const TOKEN_KEY = "business-os-token";
const AUTH_DATA_KEY = "business-os-auth";

export interface LoginResponse {
  token: string;
  userId: string;
  enterpriseId: string;
  role: string;
}

export interface AuthData {
  token: string;
  userId: string;
  enterpriseId: string;
  role: string;
}

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || `登录失败: ${res.status}`);
  }

  const data = (await res.json()) as LoginResponse;
  setAuthData(data);
  return data;
}

export function setAuthData(data: LoginResponse): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(AUTH_DATA_KEY, JSON.stringify({
      userId: data.userId,
      enterpriseId: data.enterpriseId,
      role: data.role,
    }));
  }
}

export function getAuthData(): AuthData | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(AUTH_DATA_KEY);
  if (!token || !raw) return null;
  try {
    const parsed = JSON.parse(raw) as { userId: string; enterpriseId: string; role: string };
    return { token, ...parsed };
  } catch {
    return { token, userId: "", enterpriseId: "", role: "" };
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_DATA_KEY);
  }
}

function handleUnauthorized(): void {
  clearToken();
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

export function streamChat(
  message: string,
  conversationId: string | null,
  token: string,
  options?: { autoExecute?: boolean; taskId?: string },
): Promise<Response> {
  return fetch(`${BASE_URL}/api/chat/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      ...(conversationId ? { conversationId } : {}),
      ...(options?.autoExecute ? { autoExecute: true } : {}),
      ...(options?.taskId ? { taskId: options.taskId } : {}),
    }),
  });
}

export interface SkillInfo {
  skill_id: string;
  name: string;
  description: string;
  version: number;
  trigger_phrases: string[];
  intake_count: number;
  step_count: number;
  steps: { step_id: string; name: string; description: string }[];
  source: "preset" | "custom";
}

export async function fetchSkills(token: string): Promise<SkillInfo[]> {
  const res = await fetch(`${BASE_URL}/api/skills`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`获取Skill列表失败: ${res.status}`);
  const data = (await res.json()) as { skills: SkillInfo[] };
  return data.skills;
}

// ========== 企业资产 ==========

export interface AssetInfo {
  id: string;
  assetType: string;
  name: string;
  content: string;
  source: string;
  createdAt: string;
}

export async function fetchAssets(token: string, type?: string): Promise<AssetInfo[]> {
  const url = type ? `${BASE_URL}/api/assets?type=${type}` : `${BASE_URL}/api/assets`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`获取资产失败: ${res.status}`);
  const data = (await res.json()) as { assets: AssetInfo[] };
  return data.assets;
}

export async function createAsset(
  token: string,
  asset: { assetType: string; name: string; content: string; source?: string }
): Promise<AssetInfo> {
  const res = await fetch(`${BASE_URL}/api/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(asset),
  });
  if (!res.ok) throw new Error(`创建资产失败: ${res.status}`);
  return (await res.json()) as AssetInfo;
}

export async function deleteAsset(token: string, id: string): Promise<void> {
  await fetch(`${BASE_URL}/api/assets/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export interface UploadResult {
  status: string;
  id?: string;
  name?: string;
  assetType?: string;
  contentPreview?: string;
  fileSize?: number;
  message?: string;
}

export async function uploadFile(
  token: string,
  file: File,
  assetType: string = "document",
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("assetType", assetType);
  const res = await fetch(`${BASE_URL}/api/assets/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`上传失败: ${res.status}`);
  return (await res.json()) as UploadResult;
}

export function getDownloadUrl(token: string, assetId: string): string {
  return `${BASE_URL}/api/assets/download/${assetId}`;
}

// ========== 执行历史 ==========

export interface ExecutionRecord {
  id: string;
  name: string;
  content: string;
  skillId: string;
  createdAt: string;
}

export async function fetchExecutions(token: string): Promise<ExecutionRecord[]> {
  const res = await fetch(`${BASE_URL}/api/executions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`获取执行历史失败: ${res.status}`);
  const data = (await res.json()) as { executions: ExecutionRecord[] };
  return data.executions;
}

// ========== 调度管理 ==========

export interface ScheduleInfo {
  scheduleId: string;
  skillId: string;
  enterpriseId: string;
  cronExpr: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRunAt: string;
  lastStatus: string;
  createdAt: string;
}

export async function fetchSchedules(token: string): Promise<ScheduleInfo[]> {
  const res = await fetch(`${BASE_URL}/api/schedules`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`获取调度列表失败: ${res.status}`);
  const data = (await res.json()) as { schedules: ScheduleInfo[] };
  return data.schedules;
}

export async function createSchedule(
  token: string,
  skillId: string,
  cronExpr: string,
  intervalMinutes: number,
): Promise<ScheduleInfo> {
  const res = await fetch(`${BASE_URL}/api/schedules`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ skill_id: skillId, cron_expr: cronExpr, interval_minutes: intervalMinutes }),
  });
  if (!res.ok) throw new Error(`创建调度失败: ${res.status}`);
  const data = (await res.json()) as { schedule: ScheduleInfo };
  return data.schedule;
}

export async function deleteSchedule(token: string, scheduleId: string): Promise<void> {
  await fetch(`${BASE_URL}/api/schedules/${scheduleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function toggleSchedule(token: string, scheduleId: string, enabled: boolean): Promise<void> {
  await fetch(`${BASE_URL}/api/schedules/${scheduleId}/toggle?enabled=${enabled}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ========== 通知 ==========

export interface NotificationInfo {
  id: string;
  type: string;
  title: string;
  content: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export async function fetchNotifications(token: string): Promise<{ notifications: NotificationInfo[]; unread: number }> {
  const res = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`获取通知失败: ${res.status}`);
  return (await res.json()) as { notifications: NotificationInfo[]; unread: number };
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
  await fetch(`${BASE_URL}/api/notifications/${id}/read`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getNotificationStreamUrl(token: string): string {
  return `${BASE_URL}/api/notifications/stream`;
}

// ========== Dashboard ==========

export interface DashboardData {
  assetCounts: Record<string, number>;
  totalAssets: number;
  totalExecutions: number;
  skillExecCounts: Record<string, number>;
  recentExecutions: { id: string; name: string; createdAt: string }[];
  preferenceCount: number;
  conversationCount: number;
}

export async function fetchDashboard(token: string): Promise<DashboardData> {
  const res = await fetch(`${BASE_URL}/api/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`获取看板数据失败: ${res.status}`);
  return (await res.json()) as DashboardData;
}

// ========== 团队管理 ==========

export interface TeamMember {
  id: string;
  username: string;
  displayName: string;
  role: string;
  status: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  detail: string;
  createdAt: string;
}

export async function fetchTeamMembers(token: string): Promise<TeamMember[]> {
  const res = await fetch(`${BASE_URL}/api/team/members`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`获取团队成员失败: ${res.status}`);
  const data = (await res.json()) as { members: TeamMember[] };
  return data.members;
}

export async function inviteMember(
  token: string,
  username: string,
  displayName: string,
  role: string,
  password: string,
): Promise<{ status: string; userId?: string; message?: string }> {
  const res = await fetch(`${BASE_URL}/api/team/invite`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ username, displayName, role, password }),
  });
  return (await res.json()) as { status: string; userId?: string; message?: string };
}

// ========== Skill 市场 ==========

export interface MarketplaceSkill {
  id: string;
  skillId: string;
  name: string;
  description: string;
  authorName: string;
  category: string;
  version: number;
  installCount: number;
  rating: number | null;
  createdAt: string;
  yamlContent?: string;
}

export async function fetchMarketplace(token: string, keyword?: string, category?: string): Promise<MarketplaceSkill[]> {
  const params = new URLSearchParams();
  if (keyword) params.set("keyword", keyword);
  if (category) params.set("category", category);
  const res = await fetch(`${BASE_URL}/api/marketplace?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`获取市场失败: ${res.status}`);
  const data = (await res.json()) as { skills: MarketplaceSkill[] };
  return data.skills;
}

export async function installMarketplaceSkill(token: string, id: string): Promise<{ status: string; name?: string }> {
  const res = await fetch(`${BASE_URL}/api/marketplace/${id}/install`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()) as { status: string; name?: string };
}

export async function publishToMarketplace(token: string, body: Record<string, string>): Promise<{ status: string; id?: string }> {
  const res = await fetch(`${BASE_URL}/api/marketplace/publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { status: string; id?: string };
}

export async function fetchAuditLog(token: string, limit: number = 50): Promise<AuditLogEntry[]> {
  const res = await fetch(`${BASE_URL}/api/team/audit-log?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`获取操作日志失败: ${res.status}`);
  const data = (await res.json()) as { logs: AuditLogEntry[] };
  return data.logs;
}

// ========== 任务管理 ==========

export interface TaskInfo {
  id: string;
  enterpriseId: string;
  skillId: string;
  skillName: string;
  triggerType: "manual" | "scheduled" | "event";
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  currentStep: number;
  totalSteps: number;
  errorMessage: string | null;
  outputSummary: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  updatedAt: string | null;
}

export interface TaskListResponse {
  tasks: TaskInfo[];
  total: number;
  running: number;
  failed: number;
  pending: number;
  todayCompleted: number;
}

export async function fetchTasks(
  token: string,
  filters?: { status?: string; triggerType?: string },
): Promise<TaskListResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.triggerType) params.set("triggerType", filters.triggerType);
  const res = await fetch(`${BASE_URL}/api/tasks?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) { handleUnauthorized(); }
    throw new Error(`获取任务列表失败: ${res.status}`);
  }
  return (await res.json()) as TaskListResponse;
}

export async function fetchTaskDetail(
  token: string,
  taskId: string,
): Promise<TaskInfo & { outputData?: string; stepResults?: string; inputData?: string }> {
  const res = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`获取任务详情失败: ${res.status}`);
  return (await res.json()) as TaskInfo & { outputData?: string; stepResults?: string; inputData?: string };
}

export async function createTask(
  token: string,
  body: {
    skillId: string;
    skillName: string;
    triggerType?: string;
    totalSteps?: number;
  },
): Promise<{ status: string; task: TaskInfo }> {
  const res = await fetch(`${BASE_URL}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      skillId: body.skillId,
      skillName: body.skillName,
      triggerType: body.triggerType || "manual",
      totalSteps: String(body.totalSteps || 0),
    }),
  });
  if (!res.ok) throw new Error(`创建任务失败: ${res.status}`);
  return (await res.json()) as { status: string; task: TaskInfo };
}

export async function cancelTask(token: string, taskId: string): Promise<{ status: string; message?: string }> {
  const res = await fetch(`${BASE_URL}/api/tasks/${taskId}/cancel`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()) as { status: string; message?: string };
}

export async function deleteTask(token: string, taskId: string): Promise<{ status: string; message?: string }> {
  const res = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()) as { status: string; message?: string };
}

// ========== 数字孪生 ==========

export interface DigitalTwinDimension {
  name: string;
  state: Record<string, unknown>;
  relatedAssets: number;
  completeness: number;
}

export interface DigitalTwinData {
  health: number;
  totalAssets: number;
  totalExecutions: number;
  recentActivityCount: number;
  dimensions: Record<string, DigitalTwinDimension>;
  updatedAt: string;
}

export async function fetchDigitalTwin(token: string): Promise<DigitalTwinData> {
  const res = await fetch(`${BASE_URL}/api/digital-twin`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`获取数字孪生失败: ${res.status}`);
  return (await res.json()) as DigitalTwinData;
}
