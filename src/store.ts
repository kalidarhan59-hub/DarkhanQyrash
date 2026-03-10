import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  username?: string;
  role: 'student' | 'tutor' | 'teacher';
  rating: number;
  coins: number;
  isPro: boolean;
  bio?: string;
  class?: string;
  strongSubjects?: string[];
  weakSubjects?: string[];
  subjectPercentages?: Record<string, number>;
  onboarded: boolean;
  iin?: string;
}

export interface AiMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
}

export interface AiLimits {
  messages: number;
  photos: number;
  summaries: number;
  lastReset: number;
}

interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  aiHistory: Record<string, AiMessage[]>;
  aiLimits: AiLimits;
  setUser: (user: User | null) => void;
  updateUser: (data: Partial<User>) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  addAiMessage: (userId: string, message: AiMessage) => void;
  useAiLimit: (type: keyof Omit<AiLimits, 'lastReset'>) => boolean;
  resetAiLimitsIfNeeded: () => void;
  clearAiHistory: (userId: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      theme: 'light',
      aiHistory: {},
      aiLimits: {
        messages: 20,
        photos: 5,
        summaries: 5,
        lastReset: Date.now(),
      },
      setUser: (user) => set({ user }),
      updateUser: (data) => set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),
      setTheme: (theme) => set({ theme }),
      addAiMessage: (userId, message) =>
        set((state) => ({
          aiHistory: {
            ...state.aiHistory,
            [userId]: [...(state.aiHistory[userId] || []), message],
          },
        })),
      useAiLimit: (type) => {
        const state = get();
        if (state.user?.isPro) return true;
        
        state.resetAiLimitsIfNeeded();
        const currentLimits = get().aiLimits;
        
        if (currentLimits[type] > 0) {
          set({
            aiLimits: {
              ...currentLimits,
              [type]: currentLimits[type] - 1,
            },
          });
          return true;
        }
        return false;
      },
      resetAiLimitsIfNeeded: () => {
        const state = get();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (now - state.aiLimits.lastReset > oneDay) {
          set({
            aiLimits: {
              messages: 20,
              photos: 5,
              summaries: 5,
              lastReset: now,
            },
          });
        }
      },
      clearAiHistory: (userId) =>
        set((state) => ({
          aiHistory: {
            ...state.aiHistory,
            [userId]: [],
          },
        })),
    }),
    {
      name: 'aqbohub-storage',
    }
  )
);
