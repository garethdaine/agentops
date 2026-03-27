'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ActivityTable, detectWebGL } from '@/components/panels/ActivityTable';
import { connectWebSocket, disconnectWebSocket } from '@/hooks/useWebSocket';
import { startWeatherPolling, classifyWeather } from '@/lib/weather-service';
import { useOfficeStore } from '@/stores/office-store';
import { useAgentStore } from '@/stores/agent-store';
import { useStore } from 'zustand';
import SessionSelector from '@/slices/panels/SessionSelector';
import ActivityFeed from '@/slices/panels/ActivityFeed';
import WeatherIndicator from '@/slices/panels/WeatherIndicator';
import StatusBar from '@/slices/panels/StatusBar';

const OfficeCanvas = dynamic(
  () => import('@/components/office/OfficeCanvas'),
  { ssr: false }
);

export default function Home() {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const agentCount = useStore(useAgentStore, (s) => s.activeAgents.length);
  const connectionStatus = useStore(useAgentStore, (s) => s.connectionStatus);

  useEffect(() => {
    setWebglSupported(detectWebGL());
    connectWebSocket();

    const stopWeather = startWeatherPolling((data) => {
      const store = useOfficeStore.getState();
      store.setWeatherData(data);
      if (!store.demoWeatherOverride) {
        store.setWeather(classifyWeather(data.weatherCode));
      }
    });

    return () => {
      disconnectWebSocket();
      stopWeather();
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    // Fullscreen the main content area (not just canvas) so overlays remain visible
    const main = document.getElementById('office-main');
    if (!main) return;
    if (!document.fullscreenElement) {
      main.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Left sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-56' : 'w-0'} bg-gray-900 border-r border-gray-800 flex flex-col shrink-0 transition-all duration-200 overflow-hidden`}
      >
        {/* Logo / title */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20">
            <span className="text-indigo-400 text-sm font-bold">A</span>
          </div>
          <span className="text-sm font-semibold text-gray-100 whitespace-nowrap">AgentOps</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-1">
          <a
            href="#"
            className="flex items-center gap-3 rounded-lg bg-gray-800/60 px-3 py-2 text-sm font-medium text-gray-100"
          >
            <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Agent Office
          </a>
        </nav>

        {/* Collapse button */}
        <div className="px-2 py-3 border-t border-gray-800">
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 w-full transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            Collapse
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
                aria-label="Open sidebar"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            {/* Back arrow */}
            <button
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
              aria-label="Go back"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            {/* Building icon + title */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/10">
                <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h1 className="text-sm font-semibold text-gray-100">Agent Office</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Agent count */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {agentCount} agent{agentCount !== 1 ? 's' : ''}
            </div>
            {/* Relay status */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-emerald-500' :
                  connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`}
              />
              Relay
            </div>
            {/* Session selector */}
            <SessionSelector />
          </div>
        </header>

        {/* Content area with generous padding for breakout overlays */}
        <main id="office-main" className="flex-1 relative p-10 lg:p-16 bg-gray-950" style={{ minHeight: 0 }}>
          {/* Canvas with all overlays inside for correct relative positioning */}
          <div
            id="canvas-wrapper"
            className="relative h-full w-full rounded-xl border border-gray-800 overflow-visible"
          >
            {webglSupported === null ? null : webglSupported ? (
              <>
                <OfficeCanvas />

                {/* All breakout overlays positioned relative to canvas-wrapper */}
                {/* They use negative margins to "break out" ~12px past the canvas border */}

                {/* Weather widget - top left corner, breaks out */}
                <div className="absolute -top-3 -left-3 z-20">
                  <WeatherIndicator />
                </div>

                {/* Fullscreen toggle - top right corner, breaks out */}
                <button
                  onClick={toggleFullscreen}
                  className="absolute -top-3 -right-3 z-20 flex items-center justify-center h-9 w-9 rounded-lg border border-gray-700/50 bg-gray-900/80 backdrop-blur-sm shadow-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800/90 transition-colors"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>

                {/* Status bar - bottom edge, breaks out */}
                <div className="absolute -bottom-3 -left-3 -right-3 z-20">
                  <StatusBar onActivityOpen={() => setActivityOpen(true)} />
                </div>
              </>
            ) : (
              <ActivityTable />
            )}
          </div>

          {/* Activity Feed panel */}
          <ActivityFeed open={activityOpen} onOpenChange={setActivityOpen} />
        </main>
      </div>

    </div>
  );
}
