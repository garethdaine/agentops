import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './ui-store';

describe('UIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      selectedAgent: null,
      panelVisible: false,
    });
  });

  it('should initialize with no agent selected', () => {
    const state = useUIStore.getState();
    expect(state.selectedAgent).toBeNull();
    expect(state.panelVisible).toBe(false);
  });

  it('should update selectedAgent on setSelectedAgent', () => {
    useUIStore.getState().setSelectedAgent('agent-1');
    expect(useUIStore.getState().selectedAgent).toBe('agent-1');
  });

  it('should clear selection on clearSelection', () => {
    useUIStore.getState().setSelectedAgent('agent-1');
    expect(useUIStore.getState().selectedAgent).toBe('agent-1');

    useUIStore.getState().clearSelection();
    expect(useUIStore.getState().selectedAgent).toBeNull();
  });

  it('should toggle panel visibility', () => {
    expect(useUIStore.getState().panelVisible).toBe(false);

    useUIStore.getState().togglePanel();
    expect(useUIStore.getState().panelVisible).toBe(true);

    useUIStore.getState().togglePanel();
    expect(useUIStore.getState().panelVisible).toBe(false);
  });
});
