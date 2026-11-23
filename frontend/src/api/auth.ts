import apiClient from './client';
import {
  LoginPayload,
  RegisterPayload,
  TokenResponse,
  UserPublic,
} from '../types/auth';

/**
 * Register a new customer account.
 * Endpoint: POST /api/v1/auth/register
 */
export async function register(payload: RegisterPayload): Promise<UserPublic> {
  const { data } = await apiClient.post<UserPublic>('/auth/register', {
    full_name: payload.full_name.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone?.trim() || null,
    password: payload.password,
    password_confirmation: payload.password_confirmation,
  });
  return data;
}

/**
 * Log in with email and password to receive bearer token.
 * Endpoint: POST /api/v1/auth/login
 */
export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', {
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
  });
  return data;
}

/**
 * Revoke the current authenticated session on the backend.
 * Endpoint: POST /api/v1/auth/logout
 */
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

/**
 * Retrieve the current authenticated user profile.
 * Endpoint: GET /api/v1/auth/me
 */
export async function me(): Promise<UserPublic> {
  const { data } = await apiClient.get<UserPublic>('/auth/me');
  return data;
}
