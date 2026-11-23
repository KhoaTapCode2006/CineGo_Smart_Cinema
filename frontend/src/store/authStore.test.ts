// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import { TokenResponse, UserPublic } from '../types/auth';

const mockUser: UserPublic = {
  id: 'user-uuid-123',
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '0901234567',
  role: 'customer',
  status: 'active',
  created_at: '2026-10-26T10:00:00Z',
};

const mockTokenResponse: TokenResponse = {
  access_token: 'mock-jwt-token-abc',
  token_type: 'bearer',
  expires_in: 1800,
  user: mockUser,
};

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    window.localStorage.clear();
  });

  it('initializes with unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.access_token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('updates state on login', () => {
    useAuthStore.getState().login(mockTokenResponse);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.access_token).toBe('mock-jwt-token-abc');
    expect(state.user).toEqual(mockUser);
    expect(state.expires_in).toBe(1800);
  });

  it('clears state on logout', () => {
    useAuthStore.getState().login(mockTokenResponse);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.access_token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('updates user via setUser', () => {
    useAuthStore.getState().login(mockTokenResponse);

    const updatedUser: UserPublic = {
      ...mockUser,
      full_name: 'Jane Doe',
    };

    useAuthStore.getState().setUser(updatedUser);

    const state = useAuthStore.getState();
    expect(state.user?.full_name).toBe('Jane Doe');
    expect(state.isAuthenticated).toBe(true);
  });
});
