import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '../design/components';
import { useI18n } from '../i18n';
import { useSpeech } from './useSpeech';

/** "Read aloud" for a passage. Renders nothing when speech is off or unsupported. */
export function ReadAloudButton({ text, size = 'sm', variant = 'secondary' }: { text: string; size?: 'sm' | 'md' | 'lg'; variant?: 'secondary' | 'quiet' }) {
  const { m } = useI18n();
  const { enabled, speaking, speak, stop } = useSpeech();
  if (!enabled) return null;
  return (
    <Button size={size} variant={variant} icon={speaking ? VolumeX : Volume2} onClick={() => (speaking ? stop() : speak(text))} aria-pressed={speaking}>
      {speaking ? m.common.stopReading : m.common.readAloud}
    </Button>
  );
}
