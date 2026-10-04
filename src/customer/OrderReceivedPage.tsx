import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Check, Plus, Search } from 'lucide-react';
import { api, type Order } from '../api';
import { Bleed, Button, ButtonLink, Card, Field, Icon, Skeleton } from '../design/components';
import { useI18n } from '../i18n';
import { isValidOrderCode, normalizeOrderCode } from '../lib/orderCode';
import { getRemembered, listRecentOrders } from '../lib/remember';
import { CopyCodeButton, FileListReadOnly, SettingsList } from '../shared/OrderBits';
import { useShop } from '../shared/ShopContext';
import { ThankYouDialog } from '../shared/ThankYouDialog';

interface ReceivedState {
  email?: string | null;
  name?: string;
  phone?: string | null;
  remembered?: boolean;
  /** set by the send-files page; shows the thank-you popup once */
  justSubmitted?: boolean;
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

export function OrderReceivedPage() {
  const { code: rawCode = '' } = useParams();
  const code = normalizeOrderCode(rawCode);
  const location = useLocation();
  const state = (location.state ?? {}) as ReceivedState;
  const navigate = useNavigate();
  const { shop } = useShop();
  const { m, fmt } = useI18n();
  const t = m.customer.received;

  // The email from the submit, or the one this phone saved with the order ("remember me").
  const knownEmail = state.email ?? listRecentOrders().find((o) => o.code === code)?.email ?? null;
  const [order, setOrder] = useState<Order | null | undefined>(knownEmail ? undefined : null);
  const [email, setEmail] = useState(() => getRemembered()?.email ?? '');

  // Thank-you popup: once, right after a submit. Clear the flag in history so a refresh doesn't show it again.
  const [thanksOpen, setThanksOpen] = useState(() => state.justSubmitted === true);
  const [submitted] = useState(() => state);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const wasOpen = useRef(thanksOpen);

  useEffect(() => {
    if (state.justSubmitted) {
      navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: { ...state, justSubmitted: false } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // After the popup closes, carry on from the page heading.
    if (wasOpen.current && !thanksOpen) headingRef.current?.focus();
    wasOpen.current = thanksOpen;
  }, [thanksOpen]);

  useEffect(() => {
    if (!knownEmail) return;
    let live = true;
    api.trackOrder(code, knownEmail).then(
      (o) => live && setOrder(o),
      () => live && setOrder(null),
    );
    return () => {
      live = false;
    };
  }, [code, knownEmail]);

  const goTrack = (e?: FormEvent) => {
    e?.preventDefault();
    navigate('/track', { state: { code, email: knownEmail ?? email } });
  };

  if (!isValidOrderCode(code)) {
    return (
      <Bleed tone="sunk" className="pp-cu">
        <h1 className="t-display">{t.badIdTitle}</h1>
        <p className="t-ink-2">{t.badIdBody}</p>
        <div className="pp-row pp-cu-actions">
          <ButtonLink to="/track" size="lg" icon={Search}>{t.badIdAction}</ButtonLink>
        </div>
      </Bleed>
    );
  }

  const name = state.name ?? order?.customerName;
  const first = name ? firstNameOf(name) : '';

  return (
    <div className="pp-cu">
      <Bleed tone="inverse" className="pp-hero">
        <span className="mn-tag pp-tag-on-inverse">
          <Icon icon={Check} size={12} />
          {t.tag}
        </span>
        <h1 className="t-display" ref={headingRef} tabIndex={-1}>
          {first ? t.thanks(first) : t.thanksNoName}
        </h1>
        <div className="pp-stack-2">
          <span className="t-label on-inverse">{t.yourOrderId}</span>
          <p className="pp-order-id">{code}</p>
        </div>
        <p className="pp-hero-copy pp-cu-break">{state.email ? t.emailed(state.email) : t.keepIt}</p>
        <div className="pp-row pp-cu-actions">
          <Button variant="primary" size="lg" icon={Search} onClick={() => goTrack()}>{t.trackThis}</Button>
          <CopyCodeButton code={code} size="lg" />
        </div>
      </Bleed>

      <section className="pp-section">
        <div className="pp-container pp-two-col">
          {order === undefined ? (
            <Card title={t.summaryTitle} aria-busy="true">
              <Skeleton lines={4} />
            </Card>
          ) : order ? (
            <Card title={t.summaryTitle} meta={t.submitted(fmt.dateTime(order.createdAt), fmt.filesSummary(order))} className="pp-stack">
              <FileListReadOnly files={order.files} />
              <hr className="pp-divider" />
              <SettingsList order={order} />
              {order.notes && (
                <div className="pp-note">
                  <span className="t-label">{t.yourNotes}</span>
                  <p className="t-ink-2">{order.notes}</p>
                </div>
              )}
            </Card>
          ) : (
            <Card title={t.detailsTitle} className="pp-stack">
              <p className="t-ink-2">{t.detailsBody}</p>
              <form className="pp-quick-track-form pp-cu-form" onSubmit={goTrack}>
                <Field label={t.emailLabel} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button type="submit" size="lg" icon={Search}>{t.showOrder}</Button>
              </form>
            </Card>
          )}

          <Card tone="sunk" title={t.nextTitle} className="pp-stack">
            <ol className="pp-next">
              {[...t.next, t.nextClaim(shop.address)].map((line, i) => (
                <li key={i}><span className="t-meta">{i + 1}</span><p>{line}</p></li>
              ))}
            </ol>
            <p className="t-small pp-cu-rule">{t.noEmail(shop.phone)}</p>
            <div className="pp-cu-actions"><ButtonLink to="/" size="lg" icon={Plus}>{t.sendMore}</ButtonLink></div>
          </Card>
        </div>
      </section>

      {submitted.justSubmitted && (
        <ThankYouDialog
          open={thanksOpen}
          onClose={() => setThanksOpen(false)}
          code={code}
          name={submitted.name ?? ''}
          email={submitted.email ?? null}
          phone={submitted.phone ?? null}
          remembered={submitted.remembered === true}
        />
      )}
    </div>
  );
}
