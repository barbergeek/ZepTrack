import React, { useEffect, useRef, useState } from 'react';
import { Activity, FlaskConical } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface LoginPageProps {
  inviteToken?: string;
}

export function LoginPage({ inviteToken }: LoginPageProps) {
  const { login, isLoading, error } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>('2.1.1');

  useEffect(() => {
    if (initializedRef.current) return;

    const loadConfigAndInitialize = async () => {
      // Fetch runtime config from server
      let clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      try {
        const response = await fetch(`${API_BASE_URL}/config`);
        if (response.ok) {
          const config = await response.json();
          if (config.googleClientId) {
            clientId = config.googleClientId;
          }
          if (config.appVersion) {
            setAppVersion(config.appVersion);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch runtime config, using build-time values');
      }

      if (!clientId) {
        setConfigError('Google OAuth is not configured. Please set GOOGLE_CLIENT_ID in your environment.');
        return;
      }

      const initializeGoogle = () => {
        if (!window.google?.accounts?.id) {
          setTimeout(initializeGoogle, 100);
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (response.credential) {
              await login(response.credential, inviteToken);
            }
          },
        });

        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'filled_blue',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: 280,
          });
        }

        initializedRef.current = true;
      };

      initializeGoogle();
    };

    loadConfigAndInitialize();
  }, [login, inviteToken]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          {/* Logo and title */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center bg-brand-600 p-4 rounded-2xl text-white">
              <Activity size={40} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Welcome to ZepTrack</h1>
              <p className="text-slate-500 mt-2">Track your health journey with confidence</p>
            </div>
          </div>

          {/* Error message */}
          {(error || configError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error || configError}
            </div>
          )}

          {/* Invite banner */}
          {inviteToken && (
            <div className="bg-brand-50 border border-brand-200 text-brand-700 px-4 py-3 rounded-xl text-sm">
              You've been invited to join ZepTrack. Sign in with Google to accept.
            </div>
          )}

          {/* Google Sign-In button */}
          <div className="flex flex-col items-center space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
              </div>
            ) : (
              <div ref={buttonRef} className="flex justify-center"></div>
            )}
          </div>

          {/* Dev bypass — only rendered in development builds */}
          {import.meta.env.DEV && (
            <div className="border-t border-dashed border-slate-200 pt-4">
              <button
                onClick={async () => {
                  const res = await fetch(`${API_BASE_URL}/auth/dev-login`, { method: 'POST', credentials: 'include' });
                  if (res.ok) window.location.reload();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-400 hover:text-slate-600 hover:border-slate-400 text-xs font-medium transition-colors"
              >
                <FlaskConical size={14} />
                Dev Login (local only)
              </button>
            </div>
          )}

          {/* Privacy note */}
          <p className="text-xs text-slate-400 text-center">
            By signing in, you agree to our terms of service and privacy policy.
            Your data is encrypted and stored securely.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          ZepTrack v{appVersion}
        </p>
      </div>
    </div>
  );
}
