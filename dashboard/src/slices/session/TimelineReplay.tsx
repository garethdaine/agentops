'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SPEED_OPTIONS = [0.5, 1, 2, 4] as const;

interface TimelineReplayProps {
  /** Total number of events in the replay. */
  totalEvents: number;
  /** Current event index. */
  currentIndex: number;
  /** Whether playback is active. */
  isPlaying: boolean;
  /** Current playback speed. */
  speed: number;
  /** Callback when user seeks to an index. */
  onSeek: (index: number) => void;
  /** Callback to toggle play/pause. */
  onPlayPause: () => void;
  /** Callback to stop replay. */
  onStop: () => void;
  /** Callback to change speed. */
  onSpeedChange: (speed: number) => void;
}

/** Format an event index as a readable label. */
function formatEventLabel(index: number, total: number): string {
  return `${index} / ${total}`;
}

/** Calculate the percentage progress. */
function calculateProgress(index: number, total: number): number {
  if (total === 0) return 0;
  return (index / total) * 100;
}

/** Timeline scrubber UI for session replay. */
export function TimelineReplay({
  totalEvents,
  currentIndex,
  isPlaying,
  speed,
  onSeek,
  onPlayPause,
  onStop,
  onSpeedChange,
}: TimelineReplayProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleTrackClick = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || totalEvents === 0) return;
      const rect = track.getBoundingClientRect();
      const fraction = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      onSeek(Math.round(fraction * totalEvents));
    },
    [totalEvents, onSeek],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      handleTrackClick(e.clientX);
    },
    [handleTrackClick],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => handleTrackClick(e.clientX);
    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleTrackClick]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          onPlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onSeek(Math.max(0, currentIndex - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          onSeek(Math.min(totalEvents, currentIndex + 1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalEvents, onPlayPause, onSeek]);

  const progress = calculateProgress(currentIndex, totalEvents);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'rgba(15, 20, 40, 0.92)',
        borderRadius: '8px',
        color: '#e0e8ff',
        fontSize: '13px',
        userSelect: 'none',
      }}
    >
      {/* Play / Pause */}
      <button
        onClick={onPlayPause}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        style={{
          background: 'none',
          border: 'none',
          color: '#e0e8ff',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '4px',
        }}
      >
        {isPlaying ? '\u23F8' : '\u25B6'}
      </button>

      {/* Stop */}
      <button
        onClick={onStop}
        title="Stop replay"
        style={{
          background: 'none',
          border: 'none',
          color: '#e0e8ff',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '4px',
        }}
      >
        {'\u23F9'}
      </button>

      {/* Timeline track */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        style={{
          flex: 1,
          height: '8px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '4px',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: '#6366f1',
            borderRadius: '4px',
            transition: isDragging ? 'none' : 'width 0.1s ease',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            left: `${progress}%`,
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: '#818cf8',
            border: '2px solid #e0e8ff',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Event counter */}
      <span style={{ minWidth: '80px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
        {formatEventLabel(currentIndex, totalEvents)}
      </span>

      {/* Speed selector */}
      <select
        value={speed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        style={{
          background: 'rgba(255,255,255,0.1)',
          color: '#e0e8ff',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '4px',
          padding: '2px 4px',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        {SPEED_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}x
          </option>
        ))}
      </select>
    </div>
  );
}
