import { create } from 'zustand';

/** Estado puramente de interfaz (nunca datos remotos, ver regla de arquitectura). */
interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: true,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
}));
