import { create } from "zustand";
import type { Kep, KepCapture, KepStats, PendingCaptureWithSuggestion } from "@/types/kep";

interface KepState {
  // Data
  keps: Kep[];
  currentKep: Kep | null;
  captures: KepCapture[];
  pendingCaptures: PendingCaptureWithSuggestion[];
  stats: KepStats | null;

  // UI state
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;

  // Actions
  fetchKeps: () => Promise<void>;
  fetchKep: (id: string) => Promise<void>;
  createKep: (data: Partial<Kep>) => Promise<Kep | null>;
  updateKep: (id: string, data: Partial<Kep>) => Promise<void>;
  deleteKep: (id: string) => Promise<void>;
  fetchCaptures: (kepId: string, status?: string) => Promise<void>;
  fetchPendingCaptures: () => Promise<void>;
  routeCaptures: (captureIds: string[], roomId: string, wingId?: string) => Promise<void>;
  rejectCaptures: (captureIds: string[], reason?: string) => Promise<void>;
  fetchStats: (kepId: string) => Promise<void>;
  clearError: () => void;
}

export const useKepStore = create<KepState>((set, get) => ({
  keps: [],
  currentKep: null,
  captures: [],
  pendingCaptures: [],
  stats: null,
  isLoading: false,
  isCreating: false,
  error: null,

  fetchKeps: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/keps");
      if (!res.ok) throw new Error("Failed to fetch keps");
      const data = await res.json();
      set({ keps: data, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchKep: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/keps/${id}`);
      if (!res.ok) throw new Error("Failed to fetch kep");
      const data = await res.json();
      set({ currentKep: data, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createKep: async (data) => {
    set({ isCreating: true, error: null });
    try {
      const res = await fetch("/api/keps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create kep");
      }
      const kep = await res.json();
      set((state) => ({ keps: [kep, ...state.keps], isCreating: false }));
      return kep;
    } catch (err) {
      set({ error: (err as Error).message, isCreating: false });
      return null;
    }
  },

  updateKep: async (id, data) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/keps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update kep");
      const updated = await res.json();
      set((state) => ({
        keps: state.keps.map((k) => (k.id === id ? updated : k)),
        currentKep: state.currentKep?.id === id ? updated : state.currentKep,
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  deleteKep: async (id) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/keps/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete kep");
      set((state) => ({
        keps: state.keps.filter((k) => k.id !== id),
        currentKep: state.currentKep?.id === id ? null : state.currentKep,
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  fetchCaptures: async (kepId, status) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const res = await fetch(`/api/keps/${kepId}/captures?${params}`);
      if (!res.ok) throw new Error("Failed to fetch captures");
      const { captures } = await res.json();
      set({ captures, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchPendingCaptures: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/keps/pending");
      if (!res.ok) throw new Error("Failed to fetch pending");
      const { captures } = await res.json();
      set({ pendingCaptures: captures, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  routeCaptures: async (captureIds, roomId, wingId) => {
    set({ error: null });
    try {
      const res = await fetch("/api/keps/pending", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "route", capture_ids: captureIds, room_id: roomId, wing_id: wingId }),
      });
      if (!res.ok) throw new Error("Failed to route captures");
      // Remove routed captures from pending list
      set((state) => ({
        pendingCaptures: state.pendingCaptures.filter((c) => !captureIds.includes(c.id)),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  rejectCaptures: async (captureIds, reason) => {
    set({ error: null });
    try {
      const res = await fetch("/api/keps/pending", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", capture_ids: captureIds, reason }),
      });
      if (!res.ok) throw new Error("Failed to reject captures");
      set((state) => ({
        pendingCaptures: state.pendingCaptures.filter((c) => !captureIds.includes(c.id)),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  fetchStats: async (kepId) => {
    try {
      const res = await fetch(`/api/keps/stats?kep_id=${kepId}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      const stats = await res.json();
      set({ stats });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  clearError: () => set({ error: null }),
}));
