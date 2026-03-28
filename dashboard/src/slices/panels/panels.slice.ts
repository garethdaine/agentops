import type { StateCreator } from 'zustand';

/** Panels (UI) slice state and actions. */
export interface PanelsSliceState {
  selectedAgent: string | null;
  selectedSessionId: string;
  panelVisible: boolean;
  detailPanelOpen: boolean;
  setSelectedAgent: (id: string) => void;
  setSelectedSession: (sessionId: string) => void;
  setDetailPanelOpen: (open: boolean) => void;
  clearSelection: () => void;
  togglePanel: () => void;
}

/** Creates the panels slice with selection and visibility state. */
export const createPanelsSlice: StateCreator<PanelsSliceState, [], [], PanelsSliceState> = (set, get) => ({
  selectedAgent: null,
  selectedSessionId: 'all',
  panelVisible: false,
  detailPanelOpen: false,

  setSelectedAgent: (id: string) => {
    set({ selectedAgent: id, detailPanelOpen: true });
  },

  setSelectedSession: (sessionId: string) => {
    set({ selectedSessionId: sessionId });
  },

  setDetailPanelOpen: (open: boolean) => {
    set({ detailPanelOpen: open });
    if (!open) {
      set({ selectedAgent: null });
    }
  },

  clearSelection: () => {
    set({ selectedAgent: null, detailPanelOpen: false });
  },

  togglePanel: () => {
    set({ panelVisible: !get().panelVisible });
  },
});
