// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { startRelay, isLocalhostOrigin } from './relay';
import type { Server } from 'http';
import type { WebSocketServer } from 'ws';

const RELAY_PORT = 3099;
const RELAY_URL = `ws://localhost:${RELAY_PORT}`;

interface RelayHandle {
  wss: WebSocketServer;
  httpServer: Server;
  broadcast: (data: string) => void;
  close: () => Promise<void>;
}

function connectClient(origin?: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(RELAY_URL, {
      headers: origin ? { origin } : {},
    });
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function waitForMessage(ws: WebSocket): Promise<string> {
  return new Promise((resolve) => {
    ws.once('message', (data) => resolve(data.toString()));
  });
}

describe('WebSocket Relay', () => {
  let relay: RelayHandle | null = null;
  const clients: WebSocket[] = [];

  afterEach(async () => {
    for (const c of clients) {
      if (c.readyState === WebSocket.OPEN) {
        c.close();
      }
    }
    clients.length = 0;
    if (relay) {
      await relay.close();
      relay = null;
    }
  });

  it('should start on port 3099', async () => {
    relay = await startRelay({ port: RELAY_PORT });
    const client = await connectClient('http://localhost:3100');
    clients.push(client);
    expect(client.readyState).toBe(WebSocket.OPEN);
  });

  it('should reject non-localhost origins', async () => {
    relay = await startRelay({ port: RELAY_PORT });

    await expect(
      connectClient('http://evil.example.com'),
    ).rejects.toThrow();
  });

  it('should accept connections with various localhost origins', async () => {
    relay = await startRelay({ port: RELAY_PORT });

    const c1 = await connectClient('http://localhost:3100');
    clients.push(c1);
    expect(c1.readyState).toBe(WebSocket.OPEN);

    const c2 = await connectClient('http://127.0.0.1:3100');
    clients.push(c2);
    expect(c2.readyState).toBe(WebSocket.OPEN);

    const c3 = await connectClient('http://[::1]:3100');
    clients.push(c3);
    expect(c3.readyState).toBe(WebSocket.OPEN);
  });

  it('should broadcast events to connected clients', async () => {
    relay = await startRelay({ port: RELAY_PORT });

    const c1 = await connectClient('http://localhost:3100');
    const c2 = await connectClient('http://localhost:3100');
    clients.push(c1, c2);

    const msg1 = waitForMessage(c1);
    const msg2 = waitForMessage(c2);

    const event = JSON.stringify({ event: 'PostToolUse', tool: 'Bash', ts: Date.now() });
    relay.broadcast(event);

    const [r1, r2] = await Promise.all([msg1, msg2]);
    expect(r1).toBe(event);
    expect(r2).toBe(event);
  });

  it('should handle client disconnect without crash', async () => {
    relay = await startRelay({ port: RELAY_PORT });

    const c1 = await connectClient('http://localhost:3100');
    const c2 = await connectClient('http://localhost:3100');
    clients.push(c2);

    // Close first client
    c1.close();
    // Wait for close to propagate
    await new Promise((r) => setTimeout(r, 50));

    // Broadcast should still work for remaining client
    const msg = waitForMessage(c2);
    const event = JSON.stringify({ event: 'PostToolUse', tool: 'Read' });
    relay.broadcast(event);

    const result = await msg;
    expect(result).toBe(event);
  });

  it('should handle broadcast with no connected clients', async () => {
    relay = await startRelay({ port: RELAY_PORT });

    // Broadcasting with no clients should not throw
    expect(() => {
      relay!.broadcast(JSON.stringify({ event: 'test' }));
    }).not.toThrow();
  });
});

describe('isLocalhostOrigin', () => {
  it('should accept localhost origins', () => {
    expect(isLocalhostOrigin('http://localhost')).toBe(true);
    expect(isLocalhostOrigin('http://localhost:3100')).toBe(true);
    expect(isLocalhostOrigin('http://127.0.0.1')).toBe(true);
    expect(isLocalhostOrigin('http://127.0.0.1:3100')).toBe(true);
    expect(isLocalhostOrigin('http://[::1]')).toBe(true);
    expect(isLocalhostOrigin('http://[::1]:3100')).toBe(true);
  });

  it('should reject non-localhost origins', () => {
    expect(isLocalhostOrigin('http://evil.example.com')).toBe(false);
    expect(isLocalhostOrigin('http://192.168.1.1')).toBe(false);
    expect(isLocalhostOrigin('https://attacker.com')).toBe(false);
  });

  it('should reject undefined/empty origins', () => {
    expect(isLocalhostOrigin(undefined)).toBe(false);
    expect(isLocalhostOrigin('')).toBe(false);
  });
});
