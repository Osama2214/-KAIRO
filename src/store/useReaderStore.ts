import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ReadingProgress {
  volumeId: string;
  currentPage: number; // 0-indexed page number
  totalPages: number;
  percentage: number;  // 0 to 100
  isCompleted: boolean;
  lastReadAt: string;
}

interface ReaderStoreState {
  progressMap: Record<string, ReadingProgress>;
  saveProgress: (volumeId: string, currentPage: number, totalPages: number) => void;
  getProgress: (volumeId: string) => ReadingProgress | undefined;
  markCompleted: (volumeId: string, totalPages: number) => void;
  resetProgress: (volumeId: string) => void;
}

export const useReaderStore = create<ReaderStoreState>()(
  persist(
    (set, get) => ({
      progressMap: {
        // Initial defaults for standard demo volumes so progress bars are populated immediately
        "jjk-02": {
          volumeId: "jjk-02",
          currentPage: 2,
          totalPages: 3,
          percentage: 100,
          isCompleted: true,
          lastReadAt: "2026-09-06T10:00:00.000Z",
        },
        "csm-01": {
          volumeId: "csm-01",
          currentPage: 1,
          totalPages: 3,
          percentage: 67,
          isCompleted: false,
          lastReadAt: "2026-09-06T11:00:00.000Z",
        },
        "op-02": {
          volumeId: "op-02",
          currentPage: 0,
          totalPages: 3,
          percentage: 33,
          isCompleted: false,
          lastReadAt: "2026-09-06T11:30:00.000Z",
        },
      },

      saveProgress: (volumeId: string, currentPage: number, totalPages: number) => {
        if (!volumeId || totalPages <= 0) return;
        const percentage = Math.min(100, Math.round(((currentPage + 1) / totalPages) * 100));
        const isCompleted = currentPage >= totalPages - 1;

        set((state) => ({
          progressMap: {
            ...state.progressMap,
            [volumeId]: {
              volumeId,
              currentPage,
              totalPages,
              percentage,
              isCompleted,
              lastReadAt: new Date().toISOString(),
            },
          },
        }));
      },

      getProgress: (volumeId: string) => {
        return get().progressMap[volumeId];
      },

      markCompleted: (volumeId: string, totalPages: number) => {
        set((state) => ({
          progressMap: {
            ...state.progressMap,
            [volumeId]: {
              volumeId,
              currentPage: Math.max(0, totalPages - 1),
              totalPages,
              percentage: 100,
              isCompleted: true,
              lastReadAt: new Date().toISOString(),
            },
          },
        }));
      },

      resetProgress: (volumeId: string) => {
        set((state) => {
          const updated = { ...state.progressMap };
          delete updated[volumeId];
          return { progressMap: updated };
        });
      },
    }),
    {
      name: "kairo_reading_progress",
    }
  )
);
