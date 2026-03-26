'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ActivityTable, detectWebGL } from '@/components/panels/ActivityTable';

const OfficeCanvas = dynamic(
  () => import('@/components/office/OfficeCanvas'),
  { ssr: false }
);

export default function Home() {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglSupported(detectWebGL());
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Agent Office Dashboard</h1>
      <div className="w-full flex-1">
        {webglSupported === null ? null : webglSupported ? (
          <OfficeCanvas />
        ) : (
          <ActivityTable />
        )}
      </div>
    </main>
  );
}
