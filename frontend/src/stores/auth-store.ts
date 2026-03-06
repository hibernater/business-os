import { create } from "zustand";
import { login as apiLogin, clearToken, getAuthData } from "@/lib/api";

export interface AuthState {
  token: string | null;
  userId: string | null;
  enterpriseId: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  enterpriseId: null,
  role: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiLogin(username, password);
      set({
        token: data.token,
        userId: data.userId,
        enterpriseId: data.enterpriseId,
        role: data.role,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "登录失败",
      });
      throw err;
    }
  },

  logout: () => {
    clearToken();
    set({
      token: null,
      userId: null,
      enterpriseId: null,
      role: null,
      isAuthenticated: false,
    });
  },

  loadFromStorage: () => {
    const auth = getAuthData();
    if (auth) {
      set({
        token: auth.token,
        userId: auth.userId,
        enterpriseId: auth.enterpriseId,
        role: auth.role,
        isAuthenticated: true,
        isInitialized: true,
      });
    } else {
      set({ isInitialized: true });
    }
  },

  clearError: () => set({ error: null }),
}));
