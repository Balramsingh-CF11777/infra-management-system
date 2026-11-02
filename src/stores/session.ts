import { create } from "zustand";
import type { UserContext } from "@/types/api";

interface SessionState {
  user: UserContext | null;
  activeRole: string;
  setUser: (user: UserContext | null) => void;
  setActiveRole: (role: string) => void;
  clear: () => void;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  activeRole: "",
  setUser: (user) => {
    const normalized = user;
    const active = normalized?.default_role_label && normalized.role_labels.includes(normalized.default_role_label)
      ? normalized.default_role_label
      : normalized?.role_labels[0] ?? "";
    set({ user: normalized, activeRole: active });
  },
  setActiveRole: (activeRole) => set({ activeRole }),
  clear: () => set({ user: null, activeRole: "" }),
}));

interface Toast {
  id: number;
  tone: "success" | "error" | "info";
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: Toast["tone"]) => void;
  dismiss: (id: number) => void;
}

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = "info") => {
    const id = Date.now() + Math.random();
    set((state) => ({ toasts: [...state.toasts, { id, tone, message }] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, 4500);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
