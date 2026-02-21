'use client';

// =============================================================================
// JalSeva - Conversational Voice Ordering Component
// =============================================================================
// A full-screen conversational interface where users can order water naturally
// by speaking in any language (or mixing languages). Supports:
//   - Blind users: TTS reads back every AI response
//   - Deaf users: Full visual transcript with animated feedback
//   - Low-literacy users: Icon-heavy, voice-first, minimal text
//   - Mixed-language: "Mujhe 20 litre RO water chahiye" works perfectly
//   - Error-tolerant: Gemini AI corrects garbled speech automatically
// =============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  Send,
  Droplets,
  Loader2,
  MessageCircle,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { useT } from '@/lib/i18n';
import { getSpeechLocale } from '@/lib/languages';
import type { WaterType } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface ExtractedOrder {
  waterType?: WaterType;
  quantity?: number;
  confirmed?: boolean;
}

interface VoiceConversationProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderConfirmed: (order: { waterType: WaterType; quantity: number }) => void;
  locale: string;
}

// ---------------------------------------------------------------------------
// TTS Helper
// ---------------------------------------------------------------------------

function speak(text: string, lang: string, onEnd?: () => void): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  if (onEnd) {
    utterance.onend = onEnd;
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VoiceConversation({
  isOpen,
  onClose,
  onOrderConfirmed,
  locale,
}: VoiceConversationProps) {
  const { t } = useT();

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [extractedOrder, setExtractedOrder] = useState<ExtractedOrder>({});
  const [textInput, setTextInput] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeText = getWelcomeMessage(locale);
      const welcome: ConversationMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        text: welcomeText,
        timestamp: new Date(),
      };
      setMessages([welcome]);

      if (ttsEnabled) {
        setIsSpeaking(true);
        speak(welcomeText, getSpeechLocale(locale), () => setIsSpeaking(false));
      }
    }
  }, [isOpen, locale, ttsEnabled, messages.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Haptic feedback helper
  const haptic = useCallback((pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Speech Recognition
  // -----------------------------------------------------------------------

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      toast.error(t('toast.voiceError'));
      return;
    }

    stopSpeaking();

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = getSpeechLocale(locale);
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      haptic(50);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Get the latest final result
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.trim();
          if (transcript) {
            recognition.stop();
            handleUserMessage(transcript);
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        console.error('[VoiceConversation] Recognition error:', event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [locale, haptic, t]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // -----------------------------------------------------------------------
  // Process user message through conversational AI
  // -----------------------------------------------------------------------

  const handleUserMessage = useCallback(
    async (text: string) => {
      // Add user message
      const userMsg: ConversationMessage = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsProcessing(true);
      haptic(30);

      try {
        const response = await fetch('/api/ai/conversational-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            language: locale,
            conversationHistory: messages.map((m) => ({
              role: m.role,
              content: m.text,
            })),
            currentOrder: extractedOrder,
          }),
        });

        if (!response.ok) {
          throw new Error('API request failed');
        }

        const data = await response.json();

        // Update extracted order if AI returned structured data
        if (data.extractedOrder) {
          setExtractedOrder((prev) => ({ ...prev, ...data.extractedOrder }));

          // If order is confirmed, trigger the callback
          if (
            data.extractedOrder.confirmed &&
            data.extractedOrder.waterType &&
            data.extractedOrder.quantity
          ) {
            haptic([100, 50, 100]);
            onOrderConfirmed({
              waterType: data.extractedOrder.waterType,
              quantity: data.extractedOrder.quantity,
            });
          }
        }

        // Add assistant response
        const assistantMsg: ConversationMessage = {
          id: `msg_${Date.now()}_assistant`,
          role: 'assistant',
          text: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // TTS: read the response aloud for blind users
        if (ttsEnabled) {
          setIsSpeaking(true);
          speak(data.response, getSpeechLocale(locale), () => {
            setIsSpeaking(false);
          });
        }
      } catch {
        const errorMsg: ConversationMessage = {
          id: `msg_${Date.now()}_error`,
          role: 'assistant',
          text: getErrorMessage(locale),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsProcessing(false);
      }
    },
    [messages, locale, extractedOrder, ttsEnabled, haptic, onOrderConfirmed]
  );

  // -----------------------------------------------------------------------
  // Text input handler (for deaf users or those who prefer typing)
  // -----------------------------------------------------------------------

  const handleTextSubmit = useCallback(() => {
    const text = textInput.trim();
    if (!text) return;
    setTextInput('');
    handleUserMessage(text);
  }, [textInput, handleUserMessage]);

  // -----------------------------------------------------------------------
  // Close handler
  // -----------------------------------------------------------------------

  const handleClose = useCallback(() => {
    stopSpeaking();
    stopListening();
    setMessages([]);
    setExtractedOrder({});
    onClose();
  }, [onClose, stopListening]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-slate-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={t('voice.conversationTitle')}
      >
        {/* Header */}
        <header className="bg-white border-b border-gray-100 safe-top">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-water rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  {t('voice.conversationTitle')}
                </h2>
                <p className="text-[10px] text-gray-400">
                  {t('voice.conversationSubtitle')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* TTS toggle for blind/deaf users */}
              <button
                onClick={() => {
                  setTtsEnabled((prev) => !prev);
                  if (isSpeaking) stopSpeaking();
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                aria-label={ttsEnabled ? t('voice.muteAudio') : t('voice.enableAudio')}
                aria-pressed={ttsEnabled}
              >
                {ttsEnabled ? (
                  <Volume2 className="w-5 h-5 text-blue-600" />
                ) : (
                  <VolumeX className="w-5 h-5 text-gray-400" />
                )}
              </button>

              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </header>

        {/* Order status bar - shows what's been extracted so far */}
        {(extractedOrder.waterType || extractedOrder.quantity) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-blue-50 border-b border-blue-100 px-4 py-2"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-3 text-sm">
              <Droplets className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="flex items-center gap-2 flex-wrap">
                {extractedOrder.waterType && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    {extractedOrder.waterType.toUpperCase()}
                  </span>
                )}
                {extractedOrder.quantity && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    {extractedOrder.quantity}L
                  </span>
                )}
                {extractedOrder.confirmed && (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Messages area */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          role="log"
          aria-live="polite"
          aria-label={t('voice.messageHistory')}
        >
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Droplets className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-medium text-blue-500">
                      JalSeva
                    </span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </p>
              </div>
            </motion.div>
          ))}

          {/* Processing indicator */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-sm text-gray-500">
                    {t('voice.thinking')}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Listening indicator */}
          {isListening && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-end"
            >
              <div className="bg-red-50 border border-red-200 rounded-2xl rounded-br-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scaleY: [1, 2.5, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.5,
                          delay: i * 0.1,
                        }}
                        className="w-0.5 h-3 bg-red-500 rounded-full"
                      />
                    ))}
                  </div>
                  <span className="text-sm text-red-600 font-medium">
                    {t('voice.listeningNow')}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area - voice + text for all users */}
        <div className="bg-white border-t border-gray-100 p-4 safe-bottom">
          {/* Text input row (for deaf users or typing preference) */}
          <div className="flex items-center gap-2 mb-3">
            <input
              ref={inputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextSubmit();
              }}
              placeholder={t('voice.typeMessage')}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 min-h-[44px]"
              aria-label={t('voice.typeMessage')}
              disabled={isProcessing}
            />
            <button
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || isProcessing}
              className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center disabled:opacity-30 hover:bg-blue-700 transition-colors"
              aria-label={t('voice.send')}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Large voice button */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className={`w-full rounded-2xl p-5 transition-all duration-300 active:scale-[0.98] ${
              isListening
                ? 'bg-red-500 shadow-lg shadow-red-200'
                : 'bg-water shadow-lg shadow-blue-200'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={
              isListening ? t('voice.tapToStop') : t('voice.tapToSpeak')
            }
          >
            <div className="flex items-center justify-center gap-3">
              <motion.div
                animate={
                  isListening
                    ? { scale: [1, 1.2, 1], transition: { repeat: Infinity, duration: 1 } }
                    : {}
                }
                className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
              >
                {isListening ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </motion.div>
              <span className="text-white font-bold text-base">
                {isListening
                  ? t('voice.tapToStop')
                  : t('voice.tapToSpeak')}
              </span>
            </div>
          </button>

          {/* Speaking indicator */}
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 mt-2"
            >
              <Volume2 className="w-4 h-4 text-blue-500 animate-pulse" />
              <span className="text-xs text-blue-500 font-medium">
                {t('voice.speaking')}
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWelcomeMessage(locale: string): string {
  const messages: Record<string, string> = {
    hi: 'नमस्ते! मैं JalSeva हूँ। आपको कैसा पानी चाहिए? बस बोल दीजिए - जैसे "20 लीटर RO पानी भेजो" या "एक टैंकर पानी चाहिए"। आप हिंदी, English या कोई भी भाषा बोल सकते हैं!',
    en: 'Hello! I\'m JalSeva. What water do you need? Just say it - like "Send 20 litres RO water" or "I need a water tanker". You can speak in Hindi, English, Tamil, Telugu or mix them all!',
    ta: 'வணக்கம்! நான் JalSeva. உங்களுக்கு என்ன தண்ணீர் வேண்டும்? "20 லிட்டர் RO தண்ணீர் அனுப்புங்கள்" என்று சொல்லுங்கள்.',
    te: 'నమస్కారం! నేను JalSeva. మీకు ఏ నీరు కావాలి? "20 లీటర్ల RO నీరు పంపండి" అని చెప్పండి.',
    bn: 'নমস্কার! আমি JalSeva। আপনার কী জল দরকার? শুধু বলুন - "20 লিটার RO জল পাঠান"।',
    mr: 'नमस्कार! मी JalSeva आहे. तुम्हाला कोणते पाणी हवे आहे? फक्त सांगा - "20 लिटर RO पाणी पाठवा".',
    gu: 'નમસ્તે! હું JalSeva છું. તમને કેવું પાણી જોઈએ? બસ કહો - "20 લિટર RO પાણી મોકલો".',
    kn: 'ನಮಸ್ಕಾರ! ನಾನು JalSeva. ನಿಮಗೆ ಯಾವ ನೀರು ಬೇಕು? "20 ಲೀಟರ್ RO ನೀರು ಕಳುಹಿಸಿ" ಎಂದು ಹೇಳಿ.',
    ml: 'നമസ്കാരം! ഞാൻ JalSeva ആണ്. നിങ്ങൾക്ക് എന്ത് വെള്ളം വേണം? "20 ലിറ്റർ RO വെള്ളം അയയ്ക്കൂ" എന്ന് പറയൂ.',
    pa: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ JalSeva ਹਾਂ। ਤੁਹਾਨੂੰ ਕਿਹੜਾ ਪਾਣੀ ਚਾਹੀਦਾ ਹੈ? ਬੱਸ ਦੱਸੋ - "20 ਲੀਟਰ RO ਪਾਣੀ ਭੇਜੋ"।',
  };
  return messages[locale] || messages.en;
}

function getErrorMessage(locale: string): string {
  const messages: Record<string, string> = {
    hi: 'माफ़ कीजिए, मैं समझ नहीं पाया। कृपया दोबारा बोलें या टाइप करें।',
    en: 'Sorry, I could not understand. Please try speaking again or type your request.',
    ta: 'மன்னிக்கவும், புரியவில்லை. மீண்டும் பேசுங்கள் அல்லது டைப் செய்யுங்கள்.',
    te: 'క్షమించండి, అర్థం కాలేదు. దయచేసి మళ్ళీ మాట్లాడండి లేదా టైప్ చేయండి.',
  };
  return messages[locale] || messages.en;
}
