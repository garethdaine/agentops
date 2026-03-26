import { useStore } from 'zustand';
import { useAgentStore, type ConnectionStatus as Status } from '@/stores/agent-store';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig: Record<Status, { label: string; colorClass: string }> = {
  connected: { label: 'Connected', colorClass: 'bg-green-500/15 text-green-700 border-green-500/30' },
  disconnected: { label: 'Disconnected', colorClass: 'bg-red-500/15 text-red-700 border-red-500/30' },
  reconnecting: { label: 'Reconnecting', colorClass: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30' },
};

export function ConnectionStatus() {
  const connectionStatus = useStore(useAgentStore, (s) => s.connectionStatus);
  const { label, colorClass } = statusConfig[connectionStatus];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge
        data-testid="connection-status-badge"
        variant="outline"
        className={cn(colorClass)}
      >
        <span
          className={cn(
            'inline-block h-2 w-2 rounded-full',
            connectionStatus === 'connected' && 'bg-green-500',
            connectionStatus === 'disconnected' && 'bg-red-500',
            connectionStatus === 'reconnecting' && 'bg-yellow-500 animate-pulse',
          )}
        />
        {label}
      </Badge>
    </div>
  );
}
