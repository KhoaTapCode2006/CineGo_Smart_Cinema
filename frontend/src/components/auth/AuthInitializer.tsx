import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { me } from '../../api/auth';

export const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { access_token, token_expires_at, logout, setUser } = useAuthStore();

  useEffect(() => {
    // If no token, nothing to revalidate
    if (!access_token) return;

    // If token is already expired, log out immediately
    if (token_expires_at && Date.now() >= token_expires_at) {
      logout();
      return;
    }

    // Call GET /auth/me to re-validate session with backend
    me()
      .then((userData) => {
        setUser(userData);
      })
      .catch((error) => {
        console.warn('Session revalidation failed, logging out:', error);
        logout();
      });
  }, []);

  return <>{children}</>;
};

export default AuthInitializer;
