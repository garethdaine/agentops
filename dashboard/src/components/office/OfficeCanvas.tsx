'use client';

import dynamic from 'next/dynamic';

const OfficeScene = dynamic(
  () => import('./OfficeScene'),
  { ssr: false }
);

export default function OfficeCanvas() {
  return (
    <div className="w-full h-full">
      <OfficeScene />
    </div>
  );
}
