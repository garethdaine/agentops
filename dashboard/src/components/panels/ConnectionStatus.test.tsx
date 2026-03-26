import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentStore } from '@/stores/agent-store';
import { ConnectionStatus } from './ConnectionStatus';

describe('ConnectionStatus', () => {
  beforeEach(() => {
    useAgentStore.getState().setConnectionStatus('disconnected');
  });

  it('should show Connected with green indicator when WS connected', () => {
    useAgentStore.getState().setConnectionStatus('connected');
    render(<ConnectionStatus />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    const badge = screen.getByTestId('connection-status-badge');
    expect(badge.className).toMatch(/green/);
  });

  it('should show Disconnected with red indicator when WS disconnected', () => {
    useAgentStore.getState().setConnectionStatus('disconnected');
    render(<ConnectionStatus />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    const badge = screen.getByTestId('connection-status-badge');
    expect(badge.className).toMatch(/red/);
  });

  it('should show Reconnecting with yellow indicator during reconnection', () => {
    useAgentStore.getState().setConnectionStatus('reconnecting');
    render(<ConnectionStatus />);

    expect(screen.getByText('Reconnecting')).toBeInTheDocument();
    const badge = screen.getByTestId('connection-status-badge');
    expect(badge.className).toMatch(/yellow/);
  });
});
