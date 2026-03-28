/**
 * Tracks connected WebSocket clients for the relay server.
 * Used to determine whether to auto-open a browser tab on new session starts.
 */

/** Tracks connected client IDs using a Set for O(1) add/remove. */
export class ClientTracker {
  private clients = new Set<string>();

  /** Record a client connection. */
  onConnect(clientId: string): void {
    this.clients.add(clientId);
  }

  /** Record a client disconnection. Ignores unknown client IDs. */
  onDisconnect(clientId: string): void {
    this.clients.delete(clientId);
  }

  /** Return the number of currently connected clients. */
  getConnectedCount(): number {
    return this.clients.size;
  }

  /** Return true if at least one client is connected. */
  hasConnectedClients(): boolean {
    return this.clients.size > 0;
  }
}

/**
 * Determine whether the shell hook should auto-open a browser tab.
 * Only opens when no clients are connected AND this is the first session start.
 */
export function shouldAutoOpenBrowser(
  connectedCount: number,
  isFirstSession: boolean,
): boolean {
  return connectedCount === 0 && isFirstSession;
}
