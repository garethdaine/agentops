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
  addRecording: (recording: Recording) => void;
  setPlaybackState: (state: PlaybackState) => void;
}

/** Creates the session slice with recording and playback state. */
export const createSessionSlice: StateCreator<SessionSliceState, [], [], SessionSliceState> = (set, get) => ({
  recordings: [],
  playbackState: 'stopped',

  addRecording: (recording: Recording) => {
    set({ recordings: [...get().recordings, recording] });
  },

  setPlaybackState: (state: PlaybackState) => {
    set({ playbackState: state });
  },
});
