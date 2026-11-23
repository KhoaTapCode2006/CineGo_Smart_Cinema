export interface UserPublic {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: 'customer' | 'staff' | 'admin' | string;
  status: 'active' | 'inactive' | 'locked' | string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserPublic;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  phone?: string | null;
  password: string;
  password_confirmation: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
