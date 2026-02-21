'use client';

import type React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

type VoiceState = 'idle' | 'listening' | 'processing';

export interface VoiceButtonProps {
  onResult: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const langMap: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
};

const sizeConfig = {
  sm: { button: 'w-10 h-10', icon: 16, ring: 'w-14 h-14' },
  md: { button: 'w-14 h-14', icon: 22, ring: 'w-20 h-20' },
  lg: { button: 'w-20 h-20', icon: 32, ring: 'w-28 h-28' },
};

const VoiceButton: React.FC<VoiceButtonProps> = ({
  onResult,
  onError,
  language = 'hi',
  size = 'md',
  className,
}) => {
  const [state, setState] = useState<VoiceState>('idle');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const config = sizeConfig[size];

  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const startRecognition = useCallback(() => {
    if (!isSupported) {
      onError?.('Speech recognition is not supported in this browser');
      return;
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = langMap[language] || 'hi-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setState('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setState('processing');
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setState('idle');
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let message = 'Voice input failed';
      switch (event.error) {
        case 'no-speech':
          message = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          message = 'No microphone found. Please check your device.';
          break;
        case 'not-allowed':
          message = 'Microphone permission denied. Please allow access.';
          break;
        case 'network':
          message = 'Network error. Please check your connection.';
          break;
        default:
          message = `Voice error: ${event.error}`;
      }
      onError?.(message);
      setState('idle');
    };

    recognition.onend = () => {
      if (state === 'listening') {
        setState('idle');
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, language, onResult, onError, state]);

  const handleClick = useCallback(() => {
    if (state === 'listening') {
      stopRecognition();
      setState('idle');
    } else if (state === 'idle') {
      startRecognition();
    }
  }, [state, startRecognition, stopRecognition]);

  useEffect(() => {
    return () => {
      stopRecognition();
    };
  }, [stopRecognition]);

  if (!isSupported) {
    return (
      <div className={cn('relative inline-flex items-center justify-center', className)}>
        <button
          disabled
          className={cn(
            'relative z-10 rounded-full flex items-center justify-center shadow-lg bg-gray-300 text-gray-500 cursor-not-allowed',
            config.button,
          )}
          aria-label="Voice input not supported in this browser"
        >
          <MicOff size={config.icon} />
        </button>
      </div>
    );
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <AnimatePresence>
        {state === 'listening' && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={cn(
                'absolute rounded-full bg-red-400',
                config.ring
              )}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.05, 0.2] }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
              className={cn(
                'absolute rounded-full bg-red-300',
                config.ring
              )}
            />
          </>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleClick}
        disabled={state === 'processing'}
        className={cn(
          'relative z-10 rounded-full flex items-center justify-center shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          config.button,
          state === 'idle' &&
            'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
          state === 'listening' &&
            'bg-red-500 text-white hover:bg-red-600',
          state === 'processing' &&
            'bg-gray-400 text-white cursor-wait'
        )}
        aria-label={
          state === 'idle'
            ? 'Start voice input'
            : state === 'listening'
            ? 'Stop listening'
            : 'Processing voice...'
        }
      >
        {state === 'processing' ? (
          <Loader2 size={config.icon} className="animate-spin" />
        ) : state === 'listening' ? (
          <MicOff size={config.icon} />
        ) : (
          <Mic size={config.icon} />
        )}
      </motion.button>

      {state === 'listening' && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          aria-live="polite"
          className="absolute -bottom-6 text-xs text-red-500 font-medium whitespace-nowrap"
        >
          Listening...
        </motion.p>
      )}
    </div>
  );
};

VoiceButton.displayName = 'VoiceButton';

export { VoiceButton };
