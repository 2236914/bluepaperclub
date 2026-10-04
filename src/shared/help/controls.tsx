/*
 * Language and text-size pickers shared by the EasyBar, the welcome popup
 * and the settings dialog. Joined square options (Monari segmented look)
 * with big hit areas; the chosen one is filled.
 */
import { useI18n, type Lang } from '../../i18n';
import { cx } from '../../design/components';
import { usePreferences, type TextSize } from '../Preferences';

const SIZES: TextSize[] = ['normal', 'large', 'xlarge'];
const SIZE_GLYPH: Record<TextSize, string> = { normal: 'A', large: 'A+', xlarge: 'A++' };

interface PickerProps {
  /** accessible name of the group (or labelledBy) */
  label?: string;
  labelledBy?: string;
  /** 'bar' = joined row; 'tiles' = separate big tiles with a word under the glyph (welcome popup) */
  look?: 'bar' | 'tiles';
  className?: string;
  autoFocus?: boolean;
}

export function TextSizePicker({ label, labelledBy, look = 'bar', className, autoFocus }: PickerProps) {
  const { m } = useI18n();
  const { prefs, setPref } = usePreferences();
  const t = m.help;
  return (
    <div
      role="group"
      aria-label={labelledBy ? undefined : label ?? t.bar.textSize}
      aria-labelledby={labelledBy}
      className={cx(look === 'bar' ? 'pp-help-seg' : 'pp-help-tiles', className)}
    >
      {SIZES.map((s) => (
        <button
          key={s}
          type="button"
          className={cx(look === 'bar' ? 'pp-help-seg-opt' : 'pp-help-tile', `pp-help-size-${s}`)}
          aria-pressed={prefs.textSize === s}
          aria-label={t.bar.sizes[s]}
          title={t.bar.sizes[s]}
          data-autofocus={autoFocus && prefs.textSize === s ? true : undefined}
          onClick={() => setPref('textSize', s)}
        >
          <span className="pp-help-glyph" aria-hidden="true">{SIZE_GLYPH[s]}</span>
          {look === 'tiles' && <span className="pp-help-tile-word" aria-hidden="true">{t.welcome.sizeNames[s]}</span>}
        </button>
      ))}
    </div>
  );
}

const LANGS: Lang[] = ['fil', 'en'];

export function LanguagePicker({ label, labelledBy, look = 'bar', className, autoFocus }: PickerProps) {
  const { m, lang, setLang } = useI18n();
  const names: Record<Lang, string> = { en: m.common.english, fil: m.common.filipino };
  return (
    <div
      role="group"
      aria-label={labelledBy ? undefined : label ?? m.help.bar.language}
      aria-labelledby={labelledBy}
      className={cx(look === 'bar' ? 'pp-help-seg' : 'pp-help-tiles', className)}
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l === 'fil' ? 'fil' : 'en'}
          className={look === 'bar' ? 'pp-help-seg-opt' : 'pp-help-tile'}
          aria-pressed={lang === l}
          data-autofocus={autoFocus && lang === l ? true : undefined}
          onClick={() => setLang(l)}
        >
          {names[l]}
        </button>
      ))}
    </div>
  );
}
