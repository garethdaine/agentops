import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const mockAgent = {
  session_id: 'sess-001',
  name: 'code-critic',
  type: 'code-critic',
  status: 'active',
  currentTool: 'Read',
  lastEventAt: '2026-03-26T10:00:00Z',
};

const mockEvents = [
  { event: 'tool_use', tool: 'Read', ts: '2026-03-26T10:00:01Z', session: 'sess-001' },
  { event: 'tool_use', tool: 'Edit', ts: '2026-03-26T10:00:02Z', session: 'sess-001' },
  { event: 'tool_result', tool: 'Edit', ts: '2026-03-26T10:00:03Z', session: 'sess-001' },
];

const mockSetDetailPanelOpen = vi.fn();
const mockSetSelectedAgent = vi.fn();

vi.mock('zustand', () => ({
  useStore: vi.fn((_store: unknown, selector: (s: unknown) => unknown) => {
    const state = {
      selectedAgent: 'sess-001',
      panelVisible: true,
      detailPanelOpen: true,
      setDetailPanelOpen: mockSetDetailPanelOpen,
      setSelectedAgent: mockSetSelectedAgent,
      clearSelection: vi.fn(),
      togglePanel: vi.fn(),
    };
    return selector(state);
  }),
}));

vi.mock('@/stores/agent-store', () => ({
  useAgentStore: {
    getState: () => ({
      activeAgents: [mockAgent],
      recentEvents: new Map([['sess-001', mockEvents]]),
    }),
  },
}));

// Use React context to track active tab value in mock
const TabCtx = React.createContext<{ value: string; setValue: (v: string) => void }>({ value: '', setValue: () => {} });

vi.mock('radix-ui', () => {
  const TabsRoot = ({ children, defaultValue, ...props }: { children: React.ReactNode; defaultValue?: string; [key: string]: unknown }) => {
    const [value, setValue] = React.useState(defaultValue || '');
    return (
      <TabCtx.Provider value={{ value, setValue }}>
        <div data-slot="tabs" {...props}>{children}</div>
      </TabCtx.Provider>
    );
  };

  const TabsList = ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
    <div {...props}>{children}</div>;

  const TabsTrigger = ({ children, value, ...props }: { children: React.ReactNode; value: string; [key: string]: unknown }) => {
    const ctx = React.useContext(TabCtx);
    return <button onClick={() => ctx.setValue(value)} {...props}>{children}</button>;
  };

  const TabsContent = ({ children, value, ...props }: { children: React.ReactNode; value: string; [key: string]: unknown }) => {
    const ctx = React.useContext(TabCtx);
    if (ctx.value !== value) return null;
    return <div {...props}>{children}</div>;
  };

  const Tabs = { Root: TabsRoot, List: TabsList, Trigger: TabsTrigger, Content: TabsContent };

  const Dialog = {
    Root: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
      open !== false ? <div>{children}</div> : null,
    Trigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Overlay: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
    Content: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
      <div role="dialog" {...props}>{children}</div>,
    Close: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Title: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
    Description: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  };

  return { Tabs, Dialog };
});

describe('AgentDetailPanel', () => {
  let AgentDetailPanel: React.ComponentType;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./AgentDetailPanel');
    AgentDetailPanel = mod.default;
  });

  it('should render as a Sheet with dialog role', () => {
    render(<AgentDetailPanel />);
    const sheet = screen.getByRole('dialog');
    expect(sheet).toBeTruthy();
  });

  it('should display agent name and status in Overview tab', () => {
    render(<AgentDetailPanel />);
    // Name appears in sheet header and overview tab
    expect(screen.getAllByText('code-critic').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('active')).toBeTruthy();
  });

  it('should display current tool in Overview tab', () => {
    render(<AgentDetailPanel />);
    expect(screen.getByText('Read')).toBeTruthy();
  });

  it('should display session ID in Overview tab', () => {
    render(<AgentDetailPanel />);
    expect(screen.getByText('sess-001')).toBeTruthy();
  });

  it('should render 3 tabs: Overview, Events, Tools', () => {
    render(<AgentDetailPanel />);
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Events')).toBeTruthy();
    expect(screen.getByText('Tools')).toBeTruthy();
  });

  it('should show event timeline with entries in Events tab', async () => {
    render(<AgentDetailPanel />);
    fireEvent.click(screen.getByText('Events'));
    const items = screen.getAllByTestId('event-entry');
    expect(items).toHaveLength(3);
  });

  it('should show tool history in Tools tab', async () => {
    render(<AgentDetailPanel />);
    fireEvent.click(screen.getByText('Tools'));
    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByText('Edit')).toBeTruthy();
  });
});
