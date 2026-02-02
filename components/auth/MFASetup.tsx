import React, { useState, useEffect, useRef } from 'react';
import { Shield, Smartphone, Mail, Copy, Check, X } from 'lucide-react';
import { TOTPSetupData, User } from '../../types';
import * as authService from '../../services/authService';

interface MFASetupProps {
  user: User;
  onComplete: () => void;
  onCancel: () => void;
}

export function MFASetup({ user, onComplete, onCancel }: MFASetupProps) {
  const [step, setStep] = useState<'choose' | 'totp-setup' | 'totp-verify' | 'email-setup' | 'backup-codes'>('choose');
  const [totpData, setTotpData] = useState<TOTPSetupData | null>(null);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 'totp-verify') {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  const handleSetupTOTP = async () => {
    setIsLoading(true);
    setError(null);

    const data = await authService.setupTOTP();
    if (data) {
      setTotpData(data);
      setStep('totp-setup');
    } else {
      setError('Failed to initialize TOTP setup');
    }
    setIsLoading(false);
  };

  const handleSetupEmail = async () => {
    setIsLoading(true);
    setError(null);

    const result = await authService.setupEmailMFA();
    if (result.success) {
      onComplete();
    } else {
      setError(result.error || 'Failed to enable email MFA');
    }
    setIsLoading(false);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyTOTP = async () => {
    if (!totpData) return;

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await authService.verifyTOTPSetup(fullCode, totpData.secret);
    if (result.success && result.backupCodes) {
      setBackupCodes(result.backupCodes);
      setStep('backup-codes');
    } else {
      setError(result.error || 'Invalid code');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
    setIsLoading(false);
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinish = () => {
    onComplete();
  };

  if (step === 'choose') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-brand-100 p-3 rounded-xl text-brand-600">
            <Shield size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Enable Two-Factor Authentication</h2>
          <p className="text-slate-500 text-sm">Add an extra layer of security to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleSetupTOTP}
            disabled={isLoading}
            className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 hover:border-brand-300 rounded-xl transition-all"
          >
            <div className="bg-slate-100 p-3 rounded-lg">
              <Smartphone className="text-slate-600" size={24} />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-slate-900">Authenticator App</p>
              <p className="text-sm text-slate-500">Use Google Authenticator or similar</p>
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Recommended</span>
          </button>

          <button
            onClick={handleSetupEmail}
            disabled={isLoading}
            className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 hover:border-brand-300 rounded-xl transition-all"
          >
            <div className="bg-slate-100 p-3 rounded-lg">
              <Mail className="text-slate-600" size={24} />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-slate-900">Email Code</p>
              <p className="text-sm text-slate-500">Receive codes via email</p>
            </div>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (step === 'totp-setup' && totpData) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Scan QR Code</h2>
          <p className="text-slate-500 text-sm">Scan this QR code with your authenticator app</p>
        </div>

        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <img src={totpData.qrCodeDataUrl} alt="TOTP QR Code" className="w-48 h-48" />
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl">
          <p className="text-xs text-slate-500 mb-2">Or enter this code manually:</p>
          <code className="text-sm font-mono text-slate-700 break-all">{totpData.secret}</code>
        </div>

        <button
          onClick={() => setStep('totp-verify')}
          className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-md hover:bg-brand-700 transition-colors"
        >
          Continue
        </button>

        <button
          onClick={() => setStep('choose')}
          className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium"
        >
          Back
        </button>
      </div>
    );
  }

  if (step === 'totp-verify') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Verify Code</h2>
          <p className="text-slate-500 text-sm">Enter the 6-digit code from your authenticator app</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-center gap-2">
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

        <button
          onClick={handleVerifyTOTP}
          disabled={isLoading || code.some(c => !c)}
          className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-md hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Verifying...' : 'Verify and Enable'}
        </button>

        <button
          onClick={() => setStep('totp-setup')}
          className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium"
        >
          Back
        </button>
      </div>
    );
  }

  if (step === 'backup-codes') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-green-100 p-3 rounded-xl text-green-600">
            <Check size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">MFA Enabled!</h2>
          <p className="text-slate-500 text-sm">Save these backup codes in a safe place</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, index) => (
              <code key={index} className="text-sm font-mono text-slate-700 bg-white px-3 py-2 rounded border border-slate-200">
                {code}
              </code>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
          <strong>Important:</strong> Each backup code can only be used once. Store them securely.
        </div>

        <button
          onClick={handleCopyBackupCodes}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
          {copied ? 'Copied!' : 'Copy Backup Codes'}
        </button>

        <button
          onClick={handleFinish}
          className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-md hover:bg-brand-700 transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  return null;
}
