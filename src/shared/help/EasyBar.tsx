/*
 * The "make this easier" bar under the customer header: language, text
 * size, more settings and the guided tour, always one tap away.
 */
import { useId } from 'react';
import { useLocation } from 'react-router-dom';
import { CircleHelp, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../design/components';
import { useI18n } from '../../i18n';
import { useHelp } from './HelpProvider';
import { LanguagePicker, TextSizePicker } from './controls';

export function EasyBar() {
  const { m } = useI18n();
  const t = m.help.bar;
  const { startTour, openSettings } = useHelp();
  const { pathname } = useLocation();
  const id = useId();
  if (pathname.startsWith('/staff')) return null;

  return (
    <section className="pp-easybar" data-tour="easybar" aria-label={t.region}>
      <div className="pp-container pp-easybar-inner">
        <div className="pp-easybar-group">
          <span className="pp-easybar-label" id={`${id}-lang`}>{t.language}</span>
          <LanguagePicker labelledBy={`${id}-lang`} />
        </div>
        <div className="pp-easybar-group">
          <span className="pp-easybar-label" id={`${id}-size`}>{t.textSize}</span>
          <TextSizePicker labelledBy={`${id}-size`} />
        </div>
        <div className="pp-easybar-actions">
          <Button size="lg" icon={SlidersHorizontal} onClick={openSettings}>{t.moreSettings}</Button>
          <Button size="lg" icon={CircleHelp} onClick={startTour}>{t.howToUse}</Button>
        </div>
      </div>
    </section>
  );
}
