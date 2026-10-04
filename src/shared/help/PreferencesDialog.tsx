/*
 * Display and help settings: text size, language, high contrast, less
 * motion, step-by-step mode and read-aloud buttons. Every change applies
 * straight away (and is saved on the device by PreferencesProvider).
 */
import { useEffect, useId, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, Dialog, Switch } from '../../design/components';
import { useI18n } from '../../i18n';
import { usePreferences } from '../Preferences';
import { useSpeech } from '../useSpeech';
import { LanguagePicker, TextSizePicker } from './controls';

export function PreferencesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { m } = useI18n();
  const t = m.help.prefs;
  const { prefs, setPref, reset } = usePreferences();
  const { supported } = useSpeech();
  const id = useId();
  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    if (!open) setAnnounce('');
  }, [open]);

  const onReset = () => {
    reset();
    setAnnounce('');
    // a fresh string each time so screen readers say it again
    window.setTimeout(() => setAnnounce(t.resetDone), 50);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.title}
      description={t.intro}
      footer={
        <>
          <Button variant="quiet" icon={RotateCcw} onClick={onReset} aria-describedby={`${id}-reset`}>
            {t.reset}
          </Button>
          <Button variant="primary" onClick={onClose}>{m.common.done}</Button>
        </>
      }
    >
      <div className="pp-help-prefs">
        <div className="pp-help-prefs-row">
          <span className="mn-field-label pp-help-prefs-label" id={`${id}-size`}>{m.help.bar.textSize}</span>
          <TextSizePicker labelledBy={`${id}-size`} />
          <span className="mn-check-hint">{t.textSizeHint}</span>
        </div>
        <div className="pp-help-prefs-row">
          <span className="mn-field-label pp-help-prefs-label" id={`${id}-lang`}>{m.help.bar.language}</span>
          <LanguagePicker labelledBy={`${id}-lang`} />
          <span className="mn-check-hint">{t.languageHint}</span>
        </div>
        <Switch
          className="pp-help-switch"
          label={t.highContrast}
          hint={t.highContrastHint}
          checked={prefs.highContrast}
          onChange={(v) => setPref('highContrast', v)}
        />
        <Switch
          className="pp-help-switch"
          label={t.reduceMotion}
          hint={t.reduceMotionHint}
          checked={prefs.reduceMotion}
          onChange={(v) => setPref('reduceMotion', v)}
        />
        <Switch
          className="pp-help-switch"
          label={t.guided}
          hint={t.guidedHint}
          checked={prefs.guided}
          onChange={(v) => setPref('guided', v)}
        />
        <Switch
          className="pp-help-switch"
          label={t.readAloud}
          hint={supported ? t.readAloudHint : t.readAloudUnsupported}
          checked={prefs.readAloud && supported}
          disabled={!supported}
          onChange={(v) => setPref('readAloud', v)}
        />
        <p className="mn-check-hint" id={`${id}-reset`}>{t.reset}: {t.resetHint}</p>
        <p className="pp-help-vh" role="status" aria-live="polite">{announce}</p>
      </div>
    </Dialog>
  );
}
