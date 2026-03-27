import { create } from 'zustand';
import { type User } from 'firebase/auth';
import type { UserDoc } from '../lib/firestoreSchema';

interface AuthState {
  user: User | null;
  userProfile: UserDoc | null;
  isLoading: boolean;
  isAnonymous: boolean;
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserDoc | null) => void;
  clearUser: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userProfile: null,
  isLoading: true,
  isAnonymous: false,
  setUser: (user) => set({
    user,
    isLoading: false,
    isAnonymous: user?.isAnonymous || false,
  }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  clearUser: () => set({
    user: null,
    userProfile: null,
    isLoading: false,
    isAnonymous: false,
  }),
}));

export const useAuth = () => {
  const store = useAuthStore();
  return { ...store };
};

// Direct store access for non-React contexts (services)
export const getAuthStore = useAuthStore.getState;
export const subscribeAuth = useAuthStore.subscribe;
