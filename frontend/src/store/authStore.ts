import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TokenResponse, UserPublic } from '../types/auth';

export interface AuthState {
  access_token: string | null;
  user: UserPublic | null;
  expires_in: number | null;
  isAuthenticated: boolean;
  login: (data: TokenResponse) => void;
  logout: () => void;
  setUser: (user: UserPublic | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      access_token: null,
      user: null,
      expires_in: null,
      isAuthenticated: false,

      login: (data: TokenResponse) => {
        set({
          access_token: data.access_token,
          user: data.user,
          expires_in: data.expires_in,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          access_token: null,
          user: null,
          expires_in: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: UserPublic | null) => {
        set({
          user,
          isAuthenticated: Boolean(user && get().access_token),
        });
      },
    }),
    {
      name: 'cinego_token',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = Boolean(state.access_token && state.user);
        }
      },
    }
  )
);

export const authStore = useAuthStore;
export default useAuthStore;
