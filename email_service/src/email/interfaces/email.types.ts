export interface EmailJobData {
  request_id: string;
  user_id: string;
  template_id: string;
  variables?: Record<string, string | number | boolean>;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  email: boolean;
  push: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  push_token?: string;
  created_at: string;
  updated_at: string;
  preferences?: UserPreferences;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  type: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string | null;
  meta?: Record<string, unknown> | null;
}

export type UserServiceResponse = ApiResponse<User>;

export type TemplateServiceResponse = ApiResponse<Template>;

export interface HttpResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

