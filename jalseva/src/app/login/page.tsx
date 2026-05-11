'use client';
export const dynamic = 'force-dynamic';

import type React from 'react';
import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { signInWithIdToken } from '@/actions/auth';
import { Button } from '@/components/ui/Button';
import {
  Droplets,
  Phone,
  ArrowLeft,
  Shield,
  CheckCircle2,
  Info,
  User as UserIcon,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';

type Step = 'phone' | 'otp' | 'success';
type Role = 'customer' | 'supplier';

// Firebase test phone numbers configured in the Auth admin config —
// these never trigger real SMS and so do not consume the daily cap.
const TEST_PHONE_NUMBERS = new Set([
  '9999900001',
  '9999900002',
  '9999900003',
  '9999900004',
  '9999900005',
]);

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setLoading, setInitialized } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [role, setRole] = useState<Role>('customer');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [isPendingSend, startSendTransition] = useTransition();
  const [isPendingVerify, startVerifyTransition] = useTransition();
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  // --- Auto-detect phone & role from URL params ---
  useEffect(() => {
    const phone = searchParams.get('phone');
    if (phone) {
      const cleaned = phone.replace(/\D/g, '').replace(/^91/, '');
      if (cleaned.length === 10) setPhoneNumber(cleaned);
    }
    const roleParam = searchParams.get('role');
    if (roleParam === 'supplier' || roleParam === 'customer') setRole(roleParam);
  }, [searchParams]);

  // --- Countdown timer ---
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // --- Build / reset the invisible reCAPTCHA verifier ---
  const ensureRecaptcha = (): RecaptchaVerifier => {
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    recaptchaVerifierRef.current = new RecaptchaVerifier(
      auth,
      'recaptcha-container',
      { size: 'invisible' }
    );
    return recaptchaVerifierRef.current;
  };

  // --- Send OTP via Firebase Phone Auth ---
  const handleSendOtp = () => {
    if (phoneNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number.\nकृपया सही फ़ोन नंबर डालें।');
      return;
    }

    startSendTransition(async () => {
      try {
        const isTestNumber = TEST_PHONE_NUMBERS.has(phoneNumber);

        // Real numbers are gated by a project-wide daily counter so an idle
        // demo cannot rack up SMS billing. Test numbers bypass the gate
        // because they short-circuit inside Firebase without sending SMS.
        if (!isTestNumber) {
          const res = await fetch('/api/auth/sms-quota', { method: 'POST' });
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as {
              limit?: number;
              used?: number;
              error?: string;
            };
            if (res.status === 429) {
              toast.error(
                `Daily SMS limit reached (${data.used ?? data.limit ?? 2}/${data.limit ?? 2}).\nPlease use a demo test number: +91 99999 00001 (OTP 123456).`
              );
            } else {
              toast.error('SMS quota service unavailable. Try a demo test number.');
            }
            return;
          }
        }

        const verifier = ensureRecaptcha();
        const e164 = `+91${phoneNumber}`;
        const confirmation = await signInWithPhoneNumber(auth, e164, verifier);
        confirmationResultRef.current = confirmation;
        setStep('otp');
        setCountdown(60);
        toast.success('OTP sent.\nOTP भेजा गया।');
        setTimeout(() => otpRefs.current[0]?.focus(), 200);
      } catch (error) {
        console.error('[login] signInWithPhoneNumber failed:', error);
        // Reset verifier so user can retry
        try {
          recaptchaVerifierRef.current?.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
        const message =
          error instanceof Error ? error.message : 'Could not send OTP. Please try again.';
        toast.error(message);
      }
    });
  };

  // --- OTP input handling ---
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = [...otp];
      for (let i = 0; i < digits.length && index + i < 6; i++) {
        newOtp[index + i] = digits[i];
      }
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      if (newOtp.every((d) => d !== '')) handleVerifyOtp(newOtp.join(''));
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '');
    setOtp(newOtp);

    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (value && index === 5 && newOtp.every((d) => d !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // --- Verify OTP via Firebase + set server cookie via ID-token-verifying action ---
  const handleVerifyOtp = (otpValue?: string) => {
    const code = otpValue || otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP.\nकृपया पूरा 6 अंक का OTP डालें।');
      return;
    }

    const confirmation = confirmationResultRef.current;
    if (!confirmation) {
      toast.error('Session expired. Please request a new OTP.');
      setStep('phone');
      setOtp(['', '', '', '', '', '']);
      return;
    }

    startVerifyTransition(async () => {
      setLoading(true);
      try {
        const credential = await confirmation.confirm(code);
        const idToken = await credential.user.getIdToken();

        const result = await signInWithIdToken(idToken, role);
        if (!result.success) {
          throw new Error(result.error || 'sign_in_failed');
        }

        setUser({
          id: result.uid,
          phone: result.phone || `+91${phoneNumber}`,
          name: '',
          role: result.role,
          language: 'en',
          rating: { average: 5, count: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        setInitialized(true);
        setStep('success');
        toast.success('Login successful!\nलॉगिन सफल!');

        setTimeout(() => {
          const fallback = result.role === 'supplier' ? '/supplier' : '/';
          const redirect = searchParams.get('redirect') || fallback;
          router.push(redirect);
        }, 1200);
      } catch (error) {
        console.error('[login] verify failed:', error);
        const msg = error instanceof Error ? error.message : 'verify_failed';
        if (msg.includes('invalid-verification-code') || msg.includes('verify_failed')) {
          toast.error('Wrong OTP. Please try again.\nगलत OTP। दोबारा कोशिश करें।');
        } else {
          toast.error(msg);
        }
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      } finally {
        setLoading(false);
      }
    });
  };

  // --- Resend OTP ---
  const handleResendOtp = () => {
    if (countdown > 0) return;
    setOtp(['', '', '', '', '', '']);
    try {
      recaptchaVerifierRef.current?.clear();
    } catch {}
    recaptchaVerifierRef.current = null;
    confirmationResultRef.current = null;
    setStep('phone');
    setCountdown(0);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Invisible reCAPTCHA host */}
      <div id="recaptcha-container" />

      {/* --- Water-themed header --- */}
      <div className="relative bg-water h-48 overflow-hidden">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <motion.div
            key={n}
            className="absolute rounded-full bg-white/10"
            style={{
              width: 20 + Math.random() * 40,
              height: 20 + Math.random() * 40,
              left: `${10 + Math.random() * 80}%`,
              bottom: -20,
            }}
            animate={{ y: [0, -250], opacity: [0.6, 0] }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: 'easeOut',
            }}
          />
        ))}

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center safe-top"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center mb-3"
          >
            <Droplets className="w-10 h-10 text-blue-600" />
          </motion.div>
          <h1 className="text-white text-2xl font-bold">JalSeva</h1>
          <p className="text-white/80 text-sm">जलसेवा</p>
        </div>
      </div>

      {/* --- Main content --- */}
      <div className="flex-1 -mt-6 bg-white rounded-t-3xl relative z-10 px-6 pt-8 pb-6">
        <AnimatePresence mode="wait">
          {/* ===== PHONE STEP ===== */}
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Sign in with phone
                </h2>
                <p className="text-gray-500 mt-1">फ़ोन से साइन इन करें</p>
              </div>

              {/* Role toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                    role === 'customer'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  Customer / ग्राहक
                </button>
                <button
                  type="button"
                  onClick={() => setRole('supplier')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                    role === 'supplier'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  Supplier / सप्लायर
                </button>
              </div>

              {/* Demo notice with test numbers */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800 space-y-1">
                    <p className="font-semibold">Demo test numbers (no SMS sent):</p>
                    <p className="font-mono">+91 99999 00001 → OTP 123456</p>
                    <p className="font-mono">+91 99999 00002 → OTP 654321</p>
                    <p className="font-mono">+91 99999 00003 → OTP 111111</p>
                    <p className="text-blue-700/80 mt-2">
                      For any other number, a real OTP SMS will be sent via
                      Firebase.
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone input */}
              <div className="space-y-2">
                <label htmlFor="phone-number" className="text-sm font-medium text-gray-700">
                  Mobile Number / मोबाइल नंबर
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-4 py-3.5 bg-gray-100 rounded-xl text-gray-600 font-medium shrink-0">
                    <span className="text-lg">🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    id="phone-number"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="XXXXX XXXXX"
                    className="flex-1 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-lg font-medium tracking-wider placeholder:text-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <Button
                variant="primary"
                size="xl"
                fullWidth
                loading={isPendingSend}
                disabled={phoneNumber.length !== 10}
                onClick={handleSendOtp}
                leftIcon={<Phone className="w-5 h-5" />}
                className="rounded-2xl min-h-[56px]"
              >
                Send OTP / OTP भेजें
              </Button>

              <div className="flex items-center gap-2 justify-center text-xs text-gray-400">
                <Shield className="w-3.5 h-3.5" />
                <span>Your number is safe with us / आपका नंबर सुरक्षित है</span>
              </div>
            </motion.div>
          )}

          {/* ===== OTP STEP ===== */}
          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Enter OTP</h2>
                <p className="text-gray-500 mt-1">OTP डालें</p>
                <p className="text-sm text-gray-400 mt-2">Sent to +91 {phoneNumber}</p>
              </div>

              <div className="flex justify-center gap-3">
                {Array.from(otp, (digit, pos) => ({ digit, pos })).map(({ digit, pos }) => (
                  <input
                    key={pos}
                    ref={(el) => {
                      otpRefs.current[pos] = el;
                    }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(pos, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(pos, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all focus:outline-none ${
                      digit
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    } focus:border-blue-500 focus:ring-2 focus:ring-blue-100`}
                  />
                ))}
              </div>

              <Button
                variant="primary"
                size="xl"
                fullWidth
                loading={isPendingVerify}
                disabled={otp.some((d) => !d)}
                onClick={() => handleVerifyOtp()}
                className="rounded-2xl min-h-[56px]"
              >
                Verify OTP / OTP सत्यापित करें
              </Button>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-gray-400">
                    Resend OTP in {countdown}s
                  </p>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 min-h-[44px] px-4"
                  >
                    Resend OTP / OTP दोबारा भेजें
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setStep('phone');
                  setOtp(['', '', '', '', '', '']);
                  try {
                    recaptchaVerifierRef.current?.clear();
                  } catch {}
                  recaptchaVerifierRef.current = null;
                  confirmationResultRef.current = null;
                }}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 min-h-[44px]"
              >
                Change phone number / नंबर बदलें
              </button>
            </motion.div>
          )}

          {/* ===== SUCCESS STEP ===== */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
              >
                <CheckCircle2 className="w-20 h-20 text-green-500" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900">Login Successful!</h2>
              <p className="text-gray-500">लॉगिन सफल!</p>
              <p className="text-sm text-gray-400">Redirecting...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
