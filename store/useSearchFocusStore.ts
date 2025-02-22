import { create } from 'zustand';

interface SearchFocusStore {
  shouldFocusSearch: boolean;
  setShouldFocusSearch: (value: boolean) => void;
}

export const useSearchFocusStore = create<SearchFocusStore>((set) => ({
  shouldFocusSearch: false,
  setShouldFocusSearch: (value) => set({ shouldFocusSearch: value }),
}));
