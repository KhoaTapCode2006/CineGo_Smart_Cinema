import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TokenResponse, UserPublic } from '../types/auth';

export interface AuthState {
  access_token: string | null;
  user: UserPublic | null;
  expires_in: number | null;
  token_expires_at: number | null;
  isAuthenticated: boolean;
  login: (data: TokenResponse) => void;
  logout: () => void;
  setUser: (user: UserPublic | null) => void;
  isTokenExpired: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      access_token: null,
      user: null,
      expires_in: null,
      token_expires_at: null,
      isAuthenticated: false,

      login: (data: TokenResponse) => {
        const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 1800;
        const tokenExpiresAt = Date.now() + expiresInSec * 1000;
        set({
          access_token: data.access_token,
          user: data.user,
          expires_in: expiresInSec,
          token_expires_at: tokenExpiresAt,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          access_token: null,
          user: null,
          expires_in: null,
          token_expires_at: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: UserPublic | null) => {
        set({
          user,
          isAuthenticated: Boolean(user && get().access_token && !get().isTokenExpired()),
        });
      },

      isTokenExpired: () => {
        const { token_expires_at } = get();
        return Boolean(token_expires_at && Date.now() >= token_expires_at);
      },
    }),
    {
      name: 'cinego_token',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const isExpired = Boolean(state.token_expires_at && Date.now() >= state.token_expires_at);
          if (isExpired) {
            state.access_token = null;
            state.user = null;
            state.expires_in = null;
            state.token_expires_at = null;
            state.isAuthenticated = false;
          } else {
            state.isAuthenticated = Boolean(state.access_token && state.user);
          }
        }
      },
    }
  )
);

export const authStore = useAuthStore;
export default useAuthStore;
