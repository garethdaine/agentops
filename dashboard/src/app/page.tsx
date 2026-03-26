'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ActivityTable, detectWebGL } from '@/components/panels/ActivityTable';
import { ConnectionStatus } from '@/components/panels/ConnectionStatus';
import { connectWebSocket, disconnectWebSocket } from '@/hooks/useWebSocket';

const OfficeCanvas = dynamic(
  () => import('@/components/office/OfficeCanvas'),
  { ssr: false }
);

export default function Home() {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglSupported(detectWebGL());
    connectWebSocket();
    return () => disconnectWebSocket();
  }, []);

  return (
    <main className="flex h-screen flex-col relative overflow-hidden">
      <header className="flex items-center justify-center py-2 bg-gray-900 text-white z-10 shrink-0">
        <h1 className="text-lg font-bold">Agent Office Dashboard</h1>
      </header>
      <div className="flex-1 w-full relative" style={{ minHeight: 0 }}>
        {webglSupported === null ? null : webglSupported ? (
          <OfficeCanvas />
        ) : (
          <ActivityTable />
        )}
      </div>
      <ConnectionStatus />
    </main>
  );
}
