import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language } from '../lib/translations';

interface AppStore {
  language: Language;
  setLanguage: (language: Language) => void;
  telegramUserId: number | null;
  setTelegramUserId: (id: number | null) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      language: 'ru',
      setLanguage: (language) => set({ language }),
      telegramUserId: null,
      setTelegramUserId: (id) => set({ telegramUserId: id }),
    }),
    {
      name: 'app-storage',
    }
  )
);
