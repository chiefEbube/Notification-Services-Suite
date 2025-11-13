export interface UserPreferences {
  email: boolean;
  push: boolean;
}

export interface UserData {
  id: number;
  email: string;
  push_token?: string;
  preferences: UserPreferences;
}

export interface PushJobData {
  user_id: number;
  template_id: string;
  notification_type: 'email' | 'push';
  variables?: Record<string, string | number | boolean>;
  user_data: UserData;
  template_content: string;
  correlation_id: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  image?: string;
  link?: string;
  data?: Record<string, string>;
}

