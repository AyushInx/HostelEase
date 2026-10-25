import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthCredentials, AuthResult, AuthUser } from '../types/auth';
import { authService, IS_MOCK_AUTH } from '../services/mockAuthService';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isMock: boolean;
  loginStudent: (credentials: AuthCredentials) => Promise<AuthResult>;
  loginStaff: (credentials: AuthCredentials) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    authService.getCurrentUser()
      .then((currentUser) => {
        if (mounted) {
          setUser(currentUser);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const loginStudent = async (credentials: AuthCredentials): Promise<AuthResult> => {
    const res = await authService.loginStudent(credentials);
    if (res.success && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const loginStaff = async (credentials: AuthCredentials): Promise<AuthResult> => {
    const res = await authService.loginStaff(credentials);
    if (res.success && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isMock: IS_MOCK_AUTH,
        loginStudent,
        loginStaff,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
