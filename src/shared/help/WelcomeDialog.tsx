/*
 * The welcome popup: greeting, language, text size, and how the customer
 * wants to start (step by step, a tour of the page, or straight in).
 */
import { useId } from 'react';
import { ArrowRight, Footprints, MousePointerClick } from 'lucide-react';
import { Button, Dialog, Icon } from '../../design/components';
import { useI18n } from '../../i18n';
import { useShop } from '../ShopContext';
import { usePreferences } from '../Preferences';
import { ReadAloudButton } from '../ReadAloudButton';
import { LanguagePicker, TextSizePicker } from './controls';

interface Props {
  open: boolean;
  onClose: () => void;
  onGuided: () => void;
  onTour: () => void;
}

export function WelcomeDialog({ open, onClose, onGuided, onTour }: Props) {
  const { m } = useI18n();
  const t = m.help.welcome;
  const { shop } = useShop();
  const { prefs } = usePreferences();
  const id = useId();

  return (
    <Dialog open={open} onClose={onClose} title={t.title(shop.name)} description={t.intro}>
      <div className="pp-help-welcome">
        <ReadAloudButton text={t.readText(shop.name)} />

        <section className="pp-help-welcome-part" aria-labelledby={`${id}-lang`}>
          <h3 className="pp-help-welcome-h" id={`${id}-lang`}>{t.languageTitle}</h3>
          <LanguagePicker look="tiles" labelledBy={`${id}-lang`} autoFocus />
        </section>

        <section className="pp-help-welcome-part" aria-labelledby={`${id}-size`}>
          <h3 className="pp-help-welcome-h" id={`${id}-size`}>{t.sizeTitle}</h3>
          <TextSizePicker look="tiles" labelledBy={`${id}-size`} />
          <p className="pp-help-sample" aria-live="polite">
            <span className="t-label">{t.sizeNames[prefs.textSize]}</span> {t.sample}
          </p>
        </section>

        <section className="pp-help-welcome-part" aria-labelledby={`${id}-start`}>
          <h3 className="pp-help-welcome-h" id={`${id}-start`}>{t.firstTimeTitle}</h3>
          <div className="pp-help-choices">
            <Button variant="primary" size="lg" className="pp-help-choice" onClick={onGuided}>
              <Icon icon={Footprints} />
              <span className="pp-help-choice-text">
                <span className="pp-help-choice-title">{t.guideMe}</span>
                <span className="pp-help-choice-hint">{t.guideMeHint}</span>
              </span>
            </Button>
            <Button size="lg" className="pp-help-choice" onClick={onTour}>
              <Icon icon={MousePointerClick} />
              <span className="pp-help-choice-text">
                <span className="pp-help-choice-title">{t.showMe}</span>
                <span className="pp-help-choice-hint">{t.showMeHint}</span>
              </span>
            </Button>
            <Button size="lg" className="pp-help-choice" onClick={onClose}>
              <Icon icon={ArrowRight} />
              <span className="pp-help-choice-text">
                <span className="pp-help-choice-title">{t.knowIt}</span>
              </span>
            </Button>
          </div>
        </section>

        <p className="pp-help-updates">{t.updates}</p>
      </div>
    </Dialog>
  );
}
