export type UserRole = "admin" | "user";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  credits: number;
  createdAt: string;
  avatar?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalKeys: number;
  totalScans: number;
  estimatedRevenueVnd: number;
  activeKeys: number;
}
