"use client";

import { create } from "zustand";

export type UserRole = "ADMIN" | "DIRECTOR" | "MANAGER" | "STOREKEEPER" | "PACKER" | "CLIENT";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  clientId: string | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  setSession: (accessToken: string, user: AuthUser) => void;
  clear: () => void;
  setStatus: (status: AuthState["status"]) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: "loading",
  setSession: (accessToken, user) => set({ accessToken, user, status: "authenticated" }),
  clear: () => set({ accessToken: null, user: null, status: "unauthenticated" }),
  setStatus: (status) => set({ status }),
}));
