import { create } from 'zustand';
import { signOut, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAnonymous: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true, // Initially true while Firebase auth state is determining
  isAnonymous: false,
  setUser: (user) => set({
    user,
    isLoading: false,
    isAnonymous: user?.isAnonymous || false
  }),
  clearUser: () => set({
    user: null,
    isLoading: false,
    isAnonymous: false
  }),
}));

export const useAuth = () => {
  const store = useAuthStore();

  const logout = async () => {
    try {
      await signOut(auth);
      store.clearUser();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    ...store,
    logout,
  };
};
