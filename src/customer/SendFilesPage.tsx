import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Bleed, Button, Field } from '../design/components';
import { useI18n } from '../i18n';
import { getRemembered } from '../lib/remember';
import { normalizeOrderCode } from '../lib/orderCode';
import { GuidedOrder } from '../shared/GuidedOrder';
import { OrderForm, type SubmittedOrder } from '../shared/OrderForm';
import { usePreferences } from '../shared/Preferences';

/** What the order-received page gets in its router state right after a submit. */
export interface ReceivedRouteState {
  email: string | null;
  name: string;
  phone: string | null;
  remembered: boolean;
  justSubmitted: true;
}

const CODE_EXAMPLE = 'PRT-7K3QM';

export function SendFilesPage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { m } = useI18n();
  const t = m.customer.home;
  const { prefs } = usePreferences();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState(() => getRemembered()?.email ?? '');

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const track = (e: FormEvent) => {
    e.preventDefault();
    navigate('/track', { state: { code: normalizeOrderCode(code), email } });
  };

  const onSubmitted = ({ code: newCode, email: sentEmail, name, phone, remembered }: SubmittedOrder) => {
    const state: ReceivedRouteState = { email: sentEmail, name, phone, remembered, justSubmitted: true };
    navigate(`/order/${newCode}`, { state });
  };

  const OrderComponent = prefs.guided ? GuidedOrder : OrderForm;

  return (
    <div className="pp-cu">
      <Bleed tone="inverse" className="pp-hero">
        <h1 className="t-display-xl pp-cu-hero-title">{t.heroTitle}</h1>
        <p className="pp-hero-copy">{t.heroCopy}</p>
        <p className="pp-hero-services">{t.services}</p>
      </Bleed>

      <section className="pp-section" aria-label={t.formLabel}>
        <div className="pp-container">
          <OrderComponent mode="customer" onSubmitted={onSubmitted} />
        </div>
      </section>

      <Bleed tone="block" id="how" title={t.howTitle}>
        <ol className="pp-how">
          {t.steps.map((s, i) => (
            <li key={i}>
              <span className="t-meta pp-cu-on-block">{t.stepLabel(i + 1)}</span>
              <h3 className="t-title">{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </Bleed>

      <Bleed tone="sunk">
        <div className="pp-quick-track">
          <div className="pp-stack-2 pp-cu-quick-copy">
            <h2 className="t-title">{t.quickTitle}</h2>
            <p className="t-ink-2">{t.quickBody}</p>
          </div>
          <form className="pp-quick-track-form" onSubmit={track}>
            <Field
              label={t.orderIdLabel}
              placeholder={CODE_EXAMPLE}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputClassName="t-mono-id"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
            <Field
              label={t.emailLabel}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" size="lg" icon={Search}>{t.quickSubmit}</Button>
          </form>
        </div>
      </Bleed>
    </div>
  );
}
