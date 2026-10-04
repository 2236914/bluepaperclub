import { Search, Upload } from 'lucide-react';
import { Bleed, ButtonLink } from '../design/components';
import { useI18n } from '../i18n';

export function NotFoundPage() {
  const { m } = useI18n();
  const t = m.customer.notFound;
  return (
    <Bleed tone="sunk" className="pp-cu">
      <h1 className="t-display">{t.title}</h1>
      <p className="t-ink-2">{t.body}</p>
      <div className="pp-row pp-cu-actions">
        <ButtonLink to="/" variant="primary" size="lg" icon={Upload}>{t.sendFiles}</ButtonLink>
        <ButtonLink to="/track" size="lg" icon={Search}>{t.track}</ButtonLink>
      </div>
    </Bleed>
  );
}
