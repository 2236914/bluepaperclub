/*
 * Read-aloud for people who find small text hard: speaks a passage with the
 * browser's built-in voices. Picks a Filipino voice when the page is in
 * Filipino and the device has one; otherwise the default voice reads it.
 * Hidden where the browser has no speech support.
 */
import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { usePreferences } from './Preferences';

function pickVoice(lang: 'en' | 'fil'): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (lang === 'fil') return voices.find((v) => /^(fil|tl)(-|_|$)/i.test(v.lang));
  return voices.find((v) => /^en-PH/i.test(v.lang)) ?? voices.find((v) => /^en(-|_|$)/i.test(v.lang));
}

export function useSpeech() {
  const { lang } = useI18n();
  const { prefs } = usePreferences();
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!supported) return;
    // Voices load asynchronously in some browsers; asking once warms the list.
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickVoice(lang);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? (lang === 'fil' ? 'fil-PH' : 'en-PH');
      u.rate = 0.9; // a little slower than usual, easier to follow
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    },
    [lang, supported],
  );

  return { supported, enabled: supported && prefs.readAloud, speaking, speak, stop };
}
