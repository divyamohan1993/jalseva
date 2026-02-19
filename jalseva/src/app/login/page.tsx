'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import {
  Droplets,
  Phone,
  ArrowLeft,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 'phone' | 'otp' | 'success';

// ---------------------------------------------------------------------------
// Declare global for recaptcha
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

// ---------------------------------------------------------------------------
// Login Page
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setLoading } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [confirmResult, setConfirmResult] =
    useState<ConfirmationResult | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // --- Auto-detect phone from URL params (for WhatsApp deeplinks) ---
  useEffect(() => {
    const phone = searchParams.get('phone');
    if (phone) {
      // Remove any non-digit characters and leading 91/+91
      const cleaned = phone.replace(/\D/g, '').replace(/^91/, '');
      if (cleaned.length === 10) {
        setPhoneNumber(cleaned);
      }
    }
  }, [searchParams]);

  // --- Countdown timer ---
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // --- Initialize reCAPTCHA ---
  const initRecaptcha = useCallback(() => {
    if (window.recaptchaVerifier) return;

    try {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          },
          'expired-callback': () => {
            toast.error('reCAPTCHA expired. Please try again.\nदोबारा कोशिश करें।');
          },
        }
      );
    } catch (error) {
      console.error('reCAPTCHA init error:', error);
    }
  }, []);

  // --- Send OTP ---
  const handleSendOtp = async () => {
    if (phoneNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number.\nकृपया सही फ़ोन नंबर डालें।');
      return;
    }

    setSendingOtp(true);
    try {
      initRecaptcha();

      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) {
        toast.error('Verification setup failed. Refresh the page.\nपेज रिफ्रेश करें।');
        setSendingOtp(false);
        return;
      }

      const fullPhone = `+91${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, fullPhone, appVerifier);

      setConfirmResult(result);
      window.confirmationResult = result;
      setStep('otp');
      setCountdown(30);
      toast.success('OTP sent successfully!\nOTP भेज दिया गया!');

      // Focus first OTP input
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (error: unknown) {
      console.error('Send OTP error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('too-many-requests')) {
        toast.error(
          'Too many attempts. Please wait and try again.\nबहुत कोशिशें हुईं। थोड़ी देर बाद कोशिश करें।'
        );
      } else if (errorMessage.includes('invalid-phone-number')) {
        toast.error(
          'Invalid phone number. Please check and try again.\nगलत फ़ोन नंबर। दोबारा जांचें।'
        );
      } else {
        toast.error(
          'Failed to send OTP. Please try again.\nOTP भेजने में गड़बड़ी।'
        );
      }

      // Reset reCAPTCHA on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    } finally {
      setSendingOtp(false);
    }
  };

  // --- OTP input handling ---
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = [...otp];
      for (let i = 0; i < digits.length && index + i < 6; i++) {
        newOtp[index + i] = digits[i];
      }
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();

      // Auto-verify if all filled
      if (newOtp.every((d) => d !== '')) {
        handleVerifyOtp(newOtp.join(''));
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all filled
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

  // --- Verify OTP ---
  const handleVerifyOtp = async (otpValue?: string) => {
    const code = otpValue || otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP.\nकृपया पूरा 6 अंक का OTP डालें।');
      return;
    }

    setVerifyingOtp(true);
    setLoading(true);

    try {
      const confirmation = confirmResult || window.confirmationResult;
      if (!confirmation) {
        toast.error(
          'Session expired. Please request a new OTP.\nसत्र समाप्त। नया OTP मंगाएं।'
        );
        setStep('phone');
        setVerifyingOtp(false);
        setLoading(false);
        return;
      }

      const result = await confirmation.confirm(code);
      const firebaseUser = result.user;

      // Check if user profile exists
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        // Create new user document
        await setDoc(userDocRef, {
          phone: firebaseUser.phoneNumber || `+91${phoneNumber}`,
          name: '',
          role: 'customer',
          language: 'en',
          rating: { average: 5, count: 0 },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setStep('success');
      toast.success('Login successful!\nलॉगिन सफल!');

      // Redirect after success animation
      setTimeout(() => {
        const redirect = searchParams.get('redirect') || '/';
        router.push(redirect);
      }, 1500);
    } catch (error: unknown) {
      console.error('Verify OTP error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('invalid-verification-code')) {
        toast.error('Wrong OTP. Please try again.\nगलत OTP। दोबारा कोशिश करें।');
      } else if (errorMessage.includes('code-expired')) {
        toast.error(
          'OTP expired. Please request a new one.\nOTP का समय बीत गया। नया OTP मंगाएं।'
        );
      } else {
        toast.error('Verification failed. Please try again.\nसत्यापन विफल।');
      }
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setVerifyingOtp(false);
      setLoading(false);
    }
  };

  // --- Resend OTP ---
  const handleResendOtp = () => {
    if (countdown > 0) return;
    // Reset reCAPTCHA
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = undefined;
    }
    setOtp(['', '', '', '', '', '']);
    handleSendOtp();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* --- Water-themed header decoration --- */}
      <div className="relative bg-water h-48 overflow-hidden">
        {/* Water bubbles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/10"
            style={{
              width: 20 + Math.random() * 40,
              height: 20 + Math.random() * 40,
              left: `${10 + Math.random() * 80}%`,
              bottom: -20,
            }}
            animate={{
              y: [0, -250],
              opacity: [0.6, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center safe-top"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Logo centered */}
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
                  Enter your phone number
                </h2>
                <p className="text-gray-500 mt-1">
                  अपना फ़ोन नंबर डालें
                </p>
              </div>

              {/* Phone input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Mobile Number / मोबाइल नंबर
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-4 py-3.5 bg-gray-100 rounded-xl text-gray-600 font-medium shrink-0">
                    <span className="text-lg">🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) =>
                      setPhoneNumber(e.target.value.replace(/\D/g, ''))
                    }
                    placeholder="XXXXX XXXXX"
                    className="flex-1 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-lg font-medium tracking-wider placeholder:text-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {/* Send OTP button */}
              <Button
                variant="primary"
                size="xl"
                fullWidth
                loading={sendingOtp}
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
                  Your number is safe with us / आपका नंबर सुरक्षित है
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
                <h2 className="text-2xl font-bold text-gray-900">
                  Enter OTP
                </h2>
                <p className="text-gray-500 mt-1">OTP डालें</p>
                <p className="text-sm text-gray-400 mt-2">
                  Sent to +91 {phoneNumber}
                </p>
              </div>

              {/* OTP inputs */}
              <div className="flex justify-center gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={6} // Allow paste of full OTP
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all focus:outline-none ${
                      digit
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    } focus:border-blue-500 focus:ring-2 focus:ring-blue-100`}
                  />
                ))}
              </div>

              {/* Verify button */}
              <Button
                variant="primary"
                size="xl"
                fullWidth
                loading={verifyingOtp}
                disabled={otp.some((d) => !d)}
                onClick={() => handleVerifyOtp()}
                className="rounded-2xl min-h-[56px]"
              >
                Verify OTP / OTP सत्यापित करें
              </Button>

              {/* Resend */}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-gray-400">
                    Resend OTP in {countdown}s / {countdown} सेकंड में दोबारा
                    भेजें
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

              {/* Change number */}
              <button
                onClick={() => {
                  setStep('phone');
                  setOtp(['', '', '', '', '', '']);
                  if (window.recaptchaVerifier) {
                    window.recaptchaVerifier.clear();
                    window.recaptchaVerifier = undefined;
                  }
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

      {/* --- reCAPTCHA container (invisible) --- */}
      <div id="recaptcha-container" ref={recaptchaContainerRef} />
    </div>
  );
}
