import { render, screen } from '@testing-library/react';
import { useAgentStore } from '@/stores/agent-store';
import { ActivityTable, detectWebGL } from './ActivityTable';

describe('ActivityTable', () => {
  beforeEach(() => {
    useAgentStore.setState({
      activeAgents: [],
      recentEvents: new Map(),
    });
  });

  it('should render agent rows from store data', () => {
    useAgentStore.setState({
      activeAgents: [
        {
          session_id: 's1',
          name: 'Agent Alpha',
          type: 'coder',
          status: 'active',
          currentTool: 'Read',
          lastEventAt: '2026-03-26T10:00:00Z',
        },
        {
          session_id: 's2',
          name: 'Agent Beta',
          type: 'reviewer',
          status: 'idle',
          currentTool: null,
          lastEventAt: '2026-03-26T09:30:00Z',
        },
      ],
    });

    render(<ActivityTable />);

    expect(screen.getByText('Agent Alpha')).toBeInTheDocument();
    expect(screen.getByText('Agent Beta')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('idle')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
  });

  it('should show column headers', () => {
    render(<ActivityTable />);

    expect(screen.getByText('Agent Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Current Tool')).toBeInTheDocument();
    expect(screen.getByText('Last Event')).toBeInTheDocument();
  });

  it('should update when store state changes', () => {
    const { rerender } = render(<ActivityTable />);

    expect(screen.queryByText('Agent Gamma')).not.toBeInTheDocument();

    useAgentStore.setState({
      activeAgents: [
        {
          session_id: 's3',
          name: 'Agent Gamma',
          type: 'planner',
          status: 'working',
          currentTool: 'Bash',
          lastEventAt: '2026-03-26T11:00:00Z',
        },
      ],
    });

    // Re-render to verify new state is picked up
    rerender(<ActivityTable />);
    expect(screen.getByText('Agent Gamma')).toBeInTheDocument();
  });

  it('should show dash when currentTool is null', () => {
    useAgentStore.setState({
      activeAgents: [
        {
          session_id: 's1',
          name: 'Agent Delta',
          type: 'coder',
          status: 'idle',
          currentTool: null,
          lastEventAt: '2026-03-26T10:00:00Z',
        },
      ],
    });

    render(<ActivityTable />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should detect WebGL availability correctly', () => {
    // jsdom does not support WebGL, so detectWebGL should return false
    const result = detectWebGL();
    expect(typeof result).toBe('boolean');
    expect(result).toBe(false);
  });
});
