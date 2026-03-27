import type { StateCreator } from 'zustand';
import type { PlaybackState } from '@/types/office-store';

export type { PlaybackState } from '@/types/office-store';

/** A recorded session for replay. */
export interface Recording {
  id: string;
  name: string;
  startedAt: string;
  eventCount: number;
}

/** Session slice state and actions. */
export interface SessionSliceState {
  recordings: Recording[];
  playbackState: PlaybackState;
  isRecording: boolean;
  isReplaying: boolean;
  recordingId: string | null;
  recordingEventCount: number;
  replaySpeed: number;
  replayCurrentIndex: number;
  replayTotalEvents: number;
  addRecording: (recording: Recording) => void;
  setPlaybackState: (state: PlaybackState) => void;
  setRecordingState: (isRecording: boolean, recordingId: string | null, eventCount: number) => void;
  setReplayState: (isReplaying: boolean) => void;
  setReplayProgress: (currentIndex: number, totalEvents: number) => void;
  setReplaySpeed: (speed: number) => void;
}

/** Creates the session slice with recording and playback state. */
export const createSessionSlice: StateCreator<SessionSliceState, [], [], SessionSliceState> = (set, get) => ({
  recordings: [],
  playbackState: 'stopped',
  isRecording: false,
  isReplaying: false,
  recordingId: null,
  recordingEventCount: 0,
  replaySpeed: 1.0,
  replayCurrentIndex: 0,
  replayTotalEvents: 0,

  addRecording: (recording: Recording) => {
    set({ recordings: [...get().recordings, recording] });
  },

  setPlaybackState: (state: PlaybackState) => {
    set({ playbackState: state });
  },

  setRecordingState: (isRecording: boolean, recordingId: string | null, eventCount: number) => {
    set({ isRecording, recordingId, recordingEventCount: eventCount });
  },

  setReplayState: (isReplaying: boolean) => {
    set({ isReplaying, playbackState: isReplaying ? 'paused' : 'stopped' });
  },

  setReplayProgress: (currentIndex: number, totalEvents: number) => {
    set({ replayCurrentIndex: currentIndex, replayTotalEvents: totalEvents });
  },

  setReplaySpeed: (speed: number) => {
    set({ replaySpeed: speed });
  },
});
