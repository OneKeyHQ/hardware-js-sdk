import { create } from 'zustand';

export type EventTestSource = 'UI_EVENT' | 'DEVICE_EVENT' | 'FIRMWARE_EVENT' | 'LOG_EVENT' | 'API';

export interface EventTestEntry {
  id: string;
  source: EventTestSource;
  type: string;
  payload?: unknown;
  timestamp: number;
}

interface ActiveEventRun {
  id: string;
  scenarioId: string;
  startedAt: number;
  endedAt?: number;
}

interface EventTestState {
  entries: EventTestEntry[];
  activeRun: ActiveEventRun | null;
  isRecording: boolean;
  startRun: (scenarioId: string) => ActiveEventRun;
  finishRun: () => void;
  setRecording: (recording: boolean) => void;
  recordEvent: (entry: Omit<EventTestEntry, 'id' | 'timestamp'> & { timestamp?: number }) => void;
  clearEvents: () => void;
}

const MAX_EVENT_ENTRIES = 400;

const createEventId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useEventTestStore = create<EventTestState>((set, get) => ({
  entries: [],
  activeRun: null,
  isRecording: false,

  startRun: scenarioId => {
    const run = {
      id: createEventId(),
      scenarioId,
      startedAt: Date.now(),
    };
    set({
      activeRun: run,
      isRecording: true,
      entries: [],
    });
    return run;
  },

  finishRun: () => {
    set(state => ({
      activeRun: state.activeRun
        ? {
            ...state.activeRun,
            endedAt: Date.now(),
          }
        : null,
      isRecording: false,
    }));
  },

  setRecording: isRecording => set({ isRecording }),

  recordEvent: entry => {
    if (!get().isRecording) return;

    const nextEntry: EventTestEntry = {
      ...entry,
      id: createEventId(),
      timestamp: entry.timestamp ?? Date.now(),
    };

    set(state => ({
      entries: [nextEntry, ...state.entries].slice(0, MAX_EVENT_ENTRIES),
    }));
  },

  clearEvents: () => set({ entries: [], activeRun: null }),
}));
