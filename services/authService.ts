import { User, TOTPSetupData } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface AuthResponse {
  user?: User;
  mfaRequired?: boolean;
  mfaMethod?: 'totp' | 'email';
  error?: string;
}

// Helper for fetch with credentials
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// Google OAuth login
export async function loginWithGoogle(idToken: string, inviteToken?: string): Promise<AuthResponse> {
  try {
    const body: Record<string, string> = { idToken };
    if (inviteToken) {
      body.inviteToken = inviteToken;
    }

    const response = await authFetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Login failed' };
    }

    if (data.requiresMFA) {
      return { mfaRequired: true, mfaMethod: data.mfaMethod };
    }

    return { user: data.user };
  } catch (e) {
    console.error('Google login failed:', e);
    return { error: 'Network error during login' };
  }
}

// Get current user
export async function getCurrentUser(): Promise<AuthResponse> {
  try {
    const response = await authFetch(`${API_BASE_URL}/auth/me`);

    if (response.status === 401) {
      return { user: undefined };
    }

    if (response.status === 403) {
      const data = await response.json();
      if (data.code === 'MFA_REQUIRED') {
        return { mfaRequired: true, mfaMethod: data.mfaMethod };
      }
    }

    if (!response.ok) {
      return { error: 'Failed to get user' };
    }

    const data = await response.json();
    return { user: data.user };
  } catch (e) {
    console.error('Get current user failed:', e);
    return { error: 'Network error' };
  }
}

// Logout
export async function logout(): Promise<boolean> {
  try {
    const response = await authFetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
    });
    return response.ok;
  } catch (e) {
    console.error('Logout failed:', e);
    return false;
  }
}

// MFA: Setup TOTP
export async function setupTOTP(): Promise<TOTPSetupData | null> {
  try {
    const response = await authFetch(`${API_BASE_URL}/auth/mfa/setup/totp`, {
      method: 'POST',
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (e) {
    console.error('TOTP setup failed:', e);
    return null;
  }
}

// MFA: Verify TOTP setup
export async function verifyTOTPSetup(code: string, secret: string): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
  try {
    const response = await authFetch(`${API_BASE_URL}/auth/mfa/setup/totp/verify`, {
      method: 'POST',
      body: JSON.stringify({ code, secret }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Verification failed' };
    }

    return { success: true, backupCodes: data.backupCodes };
  } catch (e) {
    console.error('TOTP verification failed:', e);
    return { success: false, error: 'Network error' };
  }
}

// MFA: Setup email
export async function setupEmailMFA(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await authFetch(`${API_BASE_URL}/auth/mfa/setup/email`, {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Setup failed' };
    }

    return { success: true };
  } catch (e) {
    console.error('Email MFA setup failed:', e);
    return { success: false, error: 'Network error' };
  }
}

// MFA: Send email code
export async function sendMFACode(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await authFetch(`${API_BASE_URL}/auth/mfa/send-code`, {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send code' };
    }

    return { success: true };
  } catch (e) {
    console.error('Send MFA code failed:', e);
    return { success: false, error: 'Network error' };
  }
}

// MFA: Verify code (TOTP or email)
export async function verifyMFACode(code: string, method: 'totp' | 'email'): Promise<AuthResponse> {
  try {
    const response = await authFetch(`${API_BASE_URL}/auth/mfa/verify`, {
      method: 'POST',
      body: JSON.stringify({ code, method }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Verification failed' };
    }

    return { user: data.user };
  } catch (e) {
    console.error('MFA verification failed:', e);
    return { error: 'Network error' };
  }
}

// MFA: Disable
export async function disableMFA(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await authFetch(`${API_BASE_URL}/auth/mfa/disable`, {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to disable MFA' };
    }

    return { success: true };
  } catch (e) {
    console.error('Disable MFA failed:', e);
    return { success: false, error: 'Network error' };
  }
}

// Admin: Get all users
export async function getUsers(): Promise<User[]> {
  try {
    const response = await authFetch(`${API_BASE_URL}/admin/users`);

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch (e) {
    console.error('Get users failed:', e);
    return [];
  }
}

// Admin: Create invite
export async function createInvite(email: string, role: 'user' | 'admin'): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await authFetch(`${API_BASE_URL}/admin/invites`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create invite' };
    }

    return { success: true };
  } catch (e) {
    console.error('Create invite failed:', e);
    return { success: false, error: 'Network error' };
  }
}

// Admin: Delete user
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await authFetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete user' };
    }

    return { success: true };
  } catch (e) {
    console.error('Delete user failed:', e);
    return { success: false, error: 'Network error' };
  }
}

// Admin: Update user role
export async function updateUserRole(userId: string, role: 'user' | 'admin'): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await authFetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to update role' };
    }

    return { success: true };
  } catch (e) {
    console.error('Update user role failed:', e);
    return { success: false, error: 'Network error' };
  }
}
