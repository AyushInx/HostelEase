import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthCredentials, AuthResult, AuthUser, RegisterStudentData } from '../types/auth';
import { apiAuthService } from '../services/apiAuthService';
import { IS_MOCK_AUTH } from '../services/mockAuthService';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isMock: boolean;
  loginStudent: (credentials: AuthCredentials) => Promise<AuthResult>;
  loginStaff: (credentials: AuthCredentials) => Promise<AuthResult>;
  logout: () => Promise<void>;
  sendStudentOtp?: (email: string) => Promise<{ success: boolean; message?: string }>;
  registerStudent?: (data: RegisterStudentData) => Promise<AuthResult>;
  verifyDemoAccess?: (password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    apiAuthService.getCurrentUser()
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
    const res = await apiAuthService.loginStudent(credentials);
    if (res.success && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const loginStaff = async (credentials: AuthCredentials): Promise<AuthResult> => {
    const res = await apiAuthService.loginStaff(credentials);
    if (res.success && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const logout = async (): Promise<void> => {
    await apiAuthService.logout();
    setUser(null);
  };

  const sendStudentOtp = async (email: string) => {
    return await apiAuthService.sendStudentOtp(email);
  };

  const registerStudent = async (data: RegisterStudentData) => {
    const res = await apiAuthService.registerStudent(data);
    if (res.success && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const verifyDemoAccess = async (password: string) => {
    return await apiAuthService.verifyDemoAccess(password);
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
        sendStudentOtp,
        registerStudent,
        verifyDemoAccess,
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
