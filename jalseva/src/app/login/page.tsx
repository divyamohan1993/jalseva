'use client';
export const dynamic = 'force-dynamic';

import type React from 'react';
import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/store/authStore';
import { simulatedPhoneSignIn } from '@/actions/auth';
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
  KeyRound,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@/types';

type Step = 'phone' | 'otp' | 'success';
type Role = 'customer' | 'supplier';

// -------------------------------------------------------------------
// Designated demo numbers — each permanently locked to one role.
// They bypass the OTP step entirely and auto-register on first sign-in
// with simulated government-backed documents (Aadhaar, RC, FSSAI, etc.).
// -------------------------------------------------------------------
const DEMO_NUMBERS: Record<string, Role> = {
  '9999900001': 'customer',
  '9999900002': 'supplier',
};

// Random 6-digit OTP. Cryptographic strength is unnecessary here because
// the OTP is shown to the very user it gates — no SMS, no third party.
function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setLoading, setInitialized } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [role, setRole] = useState<Role>('customer');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isPendingSend, startSendTransition] = useTransition();
  const [isPendingVerify, startVerifyTransition] = useTransition();
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // --- Sign in helper shared by both flows ---
  const completeSignIn = async (result: {
    uid: string;
    phone: string;
    role: Role;
    name?: string;
  }) => {
    const demoUser: User = {
      id: result.uid,
      phone: result.phone,
      name: result.name || '',
      role: result.role,
      language: 'en',
      rating: { average: 5, count: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    try {
      localStorage.setItem('jalseva_demo_user', JSON.stringify(demoUser));
    } catch {
      // localStorage unavailable — Zustand store still carries the user
    }
    setUser(demoUser);
    setInitialized(true);
    setStep('success');
    toast.success(
      `Signed in as ${result.role}.\nलॉगिन सफल!`,
    );
    setTimeout(() => {
      const fallback = result.role === 'supplier' ? '/supplier' : '/';
      const redirect = searchParams.get('redirect') || fallback;
      router.push(redirect);
    }, 900);
  };

  // --- Send OTP (no SMS — OTP is generated and shown on screen) ---
  const handleSendOtp = () => {
    if (phoneNumber.length !== 10) {
      toast.error(
        'Please enter a valid 10-digit phone number.\nकृपया सही फ़ोन नंबर डालें।',
      );
      return;
    }

    // -------------------------------------------------------------------
    // Reserved demo numbers: skip the OTP entirely. Each demo number is
    // locked to one role; mismatched attempts are rejected by the server
    // action with a clear message.
    // -------------------------------------------------------------------
    const demoRole = DEMO_NUMBERS[phoneNumber];
    if (demoRole) {
      startSendTransition(async () => {
        try {
          const result = await simulatedPhoneSignIn(phoneNumber, role);
          if (!result.success) {
            toast.error(result.error || 'Demo sign-in failed.');
            return;
          }
          await completeSignIn(result);
        } catch (error) {
          console.error('[login] demo sign-in failed:', error);
          toast.error(
            error instanceof Error
              ? error.message
              : 'Demo sign-in failed.',
          );
        }
      });
      return;
    }

    // -------------------------------------------------------------------
    // Every other number: generate a 6-digit OTP locally and show it on
    // screen. No SMS is sent — Phone Auth is intentionally unlinked from
    // the backend to eliminate SMS billing exposure.
    // -------------------------------------------------------------------
    startSendTransition(async () => {
      const code = generateOtp();
      setGeneratedOtp(code);
      setOtp(['', '', '', '', '', '']);
      setStep('otp');
      setCountdown(60);
      toast.success(
        `Your OTP is ${code} (shown on screen — no SMS sent).`,
        { duration: 8000 },
      );
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
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
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // --- Verify OTP locally (no Firebase), then sign in via server action ---
  const handleVerifyOtp = (otpValue?: string) => {
    const code = otpValue || otp.join('');
    if (code.length !== 6) {
      toast.error(
        'Please enter the complete 6-digit OTP.\nकृपया पूरा 6 अंक का OTP डालें।',
      );
      return;
    }

    if (!generatedOtp) {
      toast.error('Session expired. Please request a new OTP.');
      setStep('phone');
      setOtp(['', '', '', '', '', '']);
      return;
    }

    if (code !== generatedOtp) {
      toast.error('Wrong OTP. Please try again.\nगलत OTP। दोबारा कोशिश करें।');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      return;
    }

    startVerifyTransition(async () => {
      setLoading(true);
      try {
        const result = await simulatedPhoneSignIn(phoneNumber, role);
        if (!result.success) {
          throw new Error(result.error || 'sign_in_failed');
        }
        await completeSignIn(result);
      } catch (error) {
        console.error('[login] verify failed:', error);
        const msg = error instanceof Error ? error.message : 'verify_failed';
        toast.error(msg);
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
    setGeneratedOtp('');
    setStep('phone');
    setCountdown(0);
  };

  // --- Copy OTP to clipboard ---
  const copyOtp = async () => {
    try {
      await navigator.clipboard.writeText(generatedOtp);
      toast.success('OTP copied.');
    } catch {
      toast.error('Could not copy OTP.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
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

              {/* Demo notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800 space-y-1">
                    <p className="font-semibold">
                      Demo mode — no SMS is sent.
                    </p>
                    <p className="font-mono">
                      +91 99999 00001 → Customer (no OTP needed)
                    </p>
                    <p className="font-mono">
                      +91 99999 00002 → Supplier (no OTP needed)
                    </p>
                    <p className="text-blue-700/80 mt-2">
                      Any other number: a 6-digit OTP is generated and
                      shown to you on screen. Suppliers auto-register with
                      simulated Aadhaar, vehicle RC, FSSAI and
                      water-quality certificates.
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone input */}
              <div className="space-y-2">
                <label
                  htmlFor="phone-number"
                  className="text-sm font-medium text-gray-700"
                >
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
                    onChange={(e) =>
                      setPhoneNumber(e.target.value.replace(/\D/g, ''))
                    }
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
                <span>
                  Demo only — no SMS, no real Phone Auth / सिर्फ़ डेमो
                </span>
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
                <p className="text-sm text-gray-400 mt-2">
                  For +91 {phoneNumber}
                </p>
              </div>

              {/* On-screen OTP display — replaces SMS delivery */}
              {generatedOtp && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                        Your OTP (no SMS sent)
                      </p>
                      <p className="text-3xl font-bold tracking-[0.4em] text-amber-900 mt-1 font-mono">
                        {generatedOtp}
                      </p>
                      <p className="text-[11px] text-amber-700/80 mt-1">
                        Type it into the boxes below to continue.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={copyOtp}
                      className="shrink-0 p-2 rounded-lg hover:bg-amber-100 transition-colors"
                      aria-label="Copy OTP"
                    >
                      <Copy className="w-4 h-4 text-amber-700" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-3">
                {Array.from(otp, (digit, pos) => ({ digit, pos })).map(
                  ({ digit, pos }) => (
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
                  ),
                )}
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
                  setGeneratedOtp('');
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
              <h2 className="text-2xl font-bold text-gray-900">
                Login Successful!
              </h2>
              <p className="text-gray-500">लॉगिन सफल!</p>
              <p className="text-sm text-gray-400">Redirecting...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
