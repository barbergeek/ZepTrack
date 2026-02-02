import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthState } from '../types';
import * as authService from '../services/authService';

interface AuthContextType extends AuthState {
  login: (idToken: string, inviteToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyMFA: (code: string, method: 'totp' | 'email') => Promise<boolean>;
  sendEmailCode: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    mfaRequired: false,
    mfaMethod: undefined,
    error: null,
  });

  const refreshUser = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const result = await authService.getCurrentUser();

    if (result.error) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        mfaRequired: false,
        mfaMethod: undefined,
        error: result.error,
      });
      return;
    }

    if (result.mfaRequired) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        mfaRequired: true,
        mfaMethod: result.mfaMethod,
        error: null,
      });
      return;
    }

    setState({
      user: result.user || null,
      isAuthenticated: !!result.user,
      isLoading: false,
      mfaRequired: false,
      mfaMethod: undefined,
      error: null,
    });
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (idToken: string, inviteToken?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const result = await authService.loginWithGoogle(idToken, inviteToken);

    if (result.error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: result.error || null,
      }));
      return;
    }

    if (result.mfaRequired) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        mfaRequired: true,
        mfaMethod: result.mfaMethod,
        error: null,
      });
      return;
    }

    setState({
      user: result.user || null,
      isAuthenticated: !!result.user,
      isLoading: false,
      mfaRequired: false,
      mfaMethod: undefined,
      error: null,
    });
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      mfaRequired: false,
      mfaMethod: undefined,
      error: null,
    });
  }, []);

  const verifyMFA = useCallback(async (code: string, method: 'totp' | 'email'): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const result = await authService.verifyMFACode(code, method);

    if (result.error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: result.error || null,
      }));
      return false;
    }

    setState({
      user: result.user || null,
      isAuthenticated: !!result.user,
      isLoading: false,
      mfaRequired: false,
      mfaMethod: undefined,
      error: null,
    });
    return true;
  }, []);

  const sendEmailCode = useCallback(async (): Promise<boolean> => {
    const result = await authService.sendMFACode();
    if (result.error) {
      setState(prev => ({ ...prev, error: result.error || null }));
      return false;
    }
    return true;
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    verifyMFA,
    sendEmailCode,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
