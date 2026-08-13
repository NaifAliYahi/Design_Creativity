export type UserRole = 'موظف' | 'مشرف' | 'مدير';

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  active: boolean;
}

export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  loginAt: string;
}
