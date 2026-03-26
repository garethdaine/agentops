/**
 * UI store shim — delegates to the panels slice of the unified office store.
 * Preserves the original API for backward compatibility with existing consumers.
 */
import { useOfficeStore } from './office-store';

export interface UIStoreState {
  selectedAgent: string | null;
  panelVisible: boolean;

  setSelectedAgent: (id: string) => void;
  clearSelection: () => void;
  togglePanel: () => void;
}

export const useUIStore = useOfficeStore as unknown as typeof useOfficeStore & {
  getState: () => UIStoreState;
  setState: (partial: Partial<UIStoreState> | ((state: UIStoreState) => Partial<UIStoreState>)) => void;
};
