import { create } from 'zustand';
import type { PostData } from '../components/feed/PostCard';

interface UIState {
  isBroadcastModalOpen: boolean;
  quoteData: PostData | null;
  openBroadcastModal: (quote?: PostData) => void;
  closeBroadcastModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isBroadcastModalOpen: false,
  quoteData: null,
  openBroadcastModal: (quote) => set({ isBroadcastModalOpen: true, quoteData: quote || null }),
  closeBroadcastModal: () => set({ isBroadcastModalOpen: false, quoteData: null }),
}));
