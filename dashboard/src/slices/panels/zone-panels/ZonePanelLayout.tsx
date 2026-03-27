'use client';

import React from 'react';

interface MetricProps {
  label: string;
  value: string | number;
}

export function Metric({ label, value }: MetricProps) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-gray-800/60 px-4 py-3 border border-gray-700/50">
      <span className="text-2xl font-bold text-gray-100 tabular-nums">{value}</span>
      <span className="text-[11px] text-gray-400 mt-1">{label}</span>
    </div>
  );
}

interface MetricGridProps {
  children: React.ReactNode;
}

export function MetricGrid({ children }: MetricGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {children}
    </div>
  );
}

interface ZonePanelHeaderProps {
  icon: string;
  name: string;
  description: string;
}

export function ZonePanelHeader({ icon, name, description }: ZonePanelHeaderProps) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-gray-700/50">
      <span className="text-2xl">{icon}</span>
      <div>
        <h3 className="text-base font-semibold text-gray-100">{name}</h3>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </div>
  );
}

interface ListSectionProps {
  title: string;
  children: React.ReactNode;
}

export function ListSection({ title, children }: ListSectionProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h4>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

interface ListItemProps {
  label: string;
  value?: string;
  dotColor?: string;
}

export function ListItem({ label, value, dotColor }: ListItemProps) {
  return (
    <div className="flex items-center justify-between rounded-md bg-gray-800/40 px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        {dotColor && (
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: dotColor }} />
        )}
        <span className="text-gray-200">{label}</span>
      </div>
      {value && <span className="text-gray-400 text-xs">{value}</span>}
    </div>
  );
}

export function OpenFullViewButton() {
  return (
    <button className="w-full mt-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors">
      Open Full View
    </button>
  );
}
