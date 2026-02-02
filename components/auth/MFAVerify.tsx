import React, { useState, useRef, useEffect } from 'react';
import { Activity, ArrowLeft, Mail, Smartphone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface MFAVerifyProps {
  onCancel: () => void;
  preferredMethod?: 'totp' | 'email';
}

export function MFAVerify({ onCancel, preferredMethod = 'totp' }: MFAVerifyProps) {
  const { verifyMFA, sendEmailCode, isLoading, error } = useAuth();
  const [method, setMethod] = useState<'totp' | 'email'>(preferredMethod);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [emailSent, setEmailSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, [method]);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setLocalError(null);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (newCode.every(c => c) && newCode.join('').length === 6) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (fullCode?: string) => {
    const codeToVerify = fullCode || code.join('');
    if (codeToVerify.length !== 6) {
      setLocalError('Please enter a 6-digit code');
      return;
    }

    const success = await verifyMFA(codeToVerify, method);
    if (!success) {
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleSendEmailCode = async () => {
    const success = await sendEmailCode();
    if (success) {
      setEmailSent(true);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const switchMethod = (newMethod: 'totp' | 'email') => {
    setMethod(newMethod);
    setCode(['', '', '', '', '', '']);
    setLocalError(null);
    setEmailSent(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center bg-brand-600 p-4 rounded-2xl text-white">
              <Activity size={40} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Two-Factor Authentication</h1>
              <p className="text-slate-500 mt-2">
                {method === 'totp'
                  ? 'Enter the code from your authenticator app'
                  : emailSent
                    ? 'Enter the code sent to your email'
                    : 'Request a code sent to your email'}
              </p>
            </div>
          </div>

          {/* Method tabs */}
          <div className="flex border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => switchMethod('totp')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                method === 'totp'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Smartphone size={18} />
              Authenticator
            </button>
            <button
              onClick={() => switchMethod('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                method === 'email'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Mail size={18} />
              Email Code
            </button>
          </div>

          {/* Error message */}
          {(error || localError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error || localError}
            </div>
          )}

          {/* Code input */}
          {method === 'email' && !emailSent ? (
            <button
              onClick={handleSendEmailCode}
              disabled={isLoading}
              className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-md hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send Code to Email'}
            </button>
          ) : (
            <>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading}
                    className="w-12 h-14 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all disabled:opacity-50"
                  />
                ))}
              </div>

              {method === 'email' && emailSent && (
                <button
                  onClick={handleSendEmailCode}
                  disabled={isLoading}
                  className="text-sm text-brand-600 hover:text-brand-800 font-medium"
                >
                  Resend code
                </button>
              )}

              <button
                onClick={() => handleSubmit()}
                disabled={isLoading || code.some(c => !c)}
                className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-md hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </>
          )}

          {/* Back button */}
          <button
            onClick={onCancel}
            className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
