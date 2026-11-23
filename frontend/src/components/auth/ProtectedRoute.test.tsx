// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuthStore } from '../../store/authStore';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects to /login?redirect=... when unauthenticated', () => {
    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <div>Secret Tickets Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Secret Tickets Content')).toBeNull();
    expect(screen.queryByText('Login Page')).not.toBeNull();
  });

  it('renders children when authenticated', () => {
    useAuthStore.getState().login({
      access_token: 'valid-token',
      token_type: 'bearer',
      expires_in: 1800,
      user: {
        id: '123',
        full_name: 'Test User',
        email: 'test@example.com',
        phone: null,
        role: 'customer',
        status: 'active',
        created_at: '2026-10-26T10:00:00Z',
      },
    });

    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <div>Secret Tickets Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Secret Tickets Content')).not.toBeNull();
    expect(screen.queryByText('Login Page')).toBeNull();
  });
});
