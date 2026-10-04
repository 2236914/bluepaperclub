import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Search, SearchX, Smartphone, UserX } from 'lucide-react';
import { api, errorMessage, type Order, type OrderStatus } from '../api';
import { Alert, Bleed, Button, Card, Dialog, EmptyState, Field, Icon, Skeleton, StatusTag } from '../design/components';
import { useI18n } from '../i18n';
import { isValidOrderCode, normalizeOrderCode } from '../lib/orderCode';
import { forgetMe, getRemembered, listRecentOrders, type RecentOrder, type RememberedDetails } from '../lib/remember';
import { MessengerConnect } from '../shared/MessengerConnect';
import { TrackingSteps } from '../shared/OrderBits';
import { useReducedMotion } from '../shared/Preferences';
import { useShop } from '../shared/ShopContext';

type Result =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'found'; order: Order; email: string }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

const CODE_EXAMPLE = 'PRT-7K3QM';

export function TrackPage() {
  const { shop } = useShop();
  const { m, fmt } = useI18n();
  const t = m.track;
  const initial = (useLocation().state ?? {}) as { code?: string; email?: string | null };
  const [me, setMe] = useState<RememberedDetails | null>(() => getRemembered());
  const [recent, setRecent] = useState<RecentOrder[]>(() => listRecentOrders());
  const [code, setCode] = useState(initial.code ?? '');
  const [email, setEmail] = useState(initial.email ?? me?.email ?? '');
  const [errors, setErrors] = useState<{ code?: string; email?: string }>({});
  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const [announce, setAnnounce] = useState('');
  const [forgetOpen, setForgetOpen] = useState(false);
  const [forgotten, setForgotten] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const forgottenRef = useRef<HTMLDivElement>(null);
  const lastQuery = useRef<{ code: string; email: string } | null>(null);
  const runId = useRef(0);
  const reduceMotion = useReducedMotion();

  const run = useCallback(
    async (c: string, e: string) => {
      const id = ++runId.current;
      lastQuery.current = { code: c, email: e };
      setResult({ kind: 'loading' });
      setAnnounce(t.announce.loading);
      let next: Result;
      try {
        const order = await api.trackOrder(c, e);
        next = order ? { kind: 'found', order, email: e } : { kind: 'missing' };
      } catch (err) {
        next = { kind: 'error', message: errorMessage(err) };
      }
      if (id !== runId.current) return;
      setResult(next);
      if (next.kind === 'found') setAnnounce(t.announce.found(next.order.code, m.common.status[next.order.status]));
      else if (next.kind === 'missing') setAnnounce(t.announce.missing);
      else setAnnounce('');
      resultRef.current?.focus({ preventScroll: true });
      resultRef.current?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    },
    [t, m.common.status, reduceMotion],
  );

  useEffect(() => {
    if (initial.code && initial.email) run(normalizeOrderCode(initial.code), initial.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While an order is on screen, keep it fresh and say so when its status changes.
  const foundCode = result.kind === 'found' ? result.order.code : null;
  const foundEmail = result.kind === 'found' ? result.email : null;
  const refresh = useCallback(() => {
    if (!foundCode || !foundEmail) return;
    const id = runId.current;
    api.trackOrder(foundCode, foundEmail).then(
      (order) => {
        if (!order || id !== runId.current) return;
        setResult((prev) => {
          if (prev.kind !== 'found' || prev.order.code !== order.code) return prev;
          if (prev.order.status !== order.status) setAnnounce(t.announce.changed(order.code, m.common.status[order.status]));
          return { ...prev, order };
        });
      },
      () => {
        /* keep showing what we have; the next change tries again */
      },
    );
  }, [foundCode, foundEmail, t, m.common.status]);

  useEffect(() => {
    if (!foundCode) return;
    return api.subscribeOrders(refresh);
  }, [foundCode, refresh]);

  // Statuses for "Your orders on this phone", so a ready order stands out at a glance.
  const [recentStatus, setRecentStatus] = useState<Record<string, OrderStatus>>({});
  const recentKey = recent.map((o) => o.code).join(',');
  useEffect(() => {
    if (recent.length === 0) return;
    let live = true;
    Promise.all(recent.map((o) => api.trackOrder(o.code, o.email).catch(() => null))).then((orders) => {
      if (!live) return;
      const next: Record<string, OrderStatus> = {};
      for (const o of orders) if (o) next[o.code] = o.status;
      setRecentStatus(next);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentKey]);

  useEffect(() => {
    if (forgotten) forgottenRef.current?.focus();
  }, [forgotten]);

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    const c = normalizeOrderCode(code);
    const next: typeof errors = {};
    if (!c) next.code = t.errors.enterCode;
    else if (!isValidOrderCode(c)) next.code = t.errors.badCode;
    if (!email.trim()) next.email = t.errors.enterEmail;
    setErrors(next);
    if (next.code || next.email) {
      // Take the customer straight to the box that needs fixing.
      const form = ev.currentTarget as HTMLFormElement;
      requestAnimationFrame(() => form.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setCode(c);
    run(c, email.trim());
  };

  const viewRecent = (o: RecentOrder) => {
    setCode(o.code);
    setEmail(o.email);
    setErrors({});
    run(o.code, o.email);
  };

  const confirmForget = () => {
    if (me && email.trim().toLowerCase() === me.email.toLowerCase()) setEmail('');
    forgetMe();
    setMe(null);
    setRecent([]);
    setRecentStatus({});
    setForgetOpen(false);
    setForgotten(true);
  };

  const showRecent = recent.length > 0;

  return (
    <div className="pp-cu">
      <Bleed tone="sunk">
        <div className="pp-stack-2">
          <h1 className="t-display">{t.title}</h1>
          <p className="t-ink-2">{t.intro}</p>
        </div>
        <form className="pp-quick-track-form pp-tr-form" onSubmit={onSubmit} noValidate aria-label={t.formTitle}>
          <Field
            label={t.orderIdLabel}
            placeholder={CODE_EXAMPLE}
            value={code}
            error={errors.code}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            inputClassName="t-mono-id"
            onChange={(e) => setCode(e.target.value)}
          />
          <Field
            label={t.emailLabel}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t.emailPlaceholder}
            value={email}
            error={errors.email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" variant="primary" size="lg" icon={Search} loading={result.kind === 'loading'}>
            {t.submit}
          </Button>
        </form>
      </Bleed>

      <p className="mn-sr" role="status" aria-live="polite">{announce}</p>

      <section className="pp-section">
        <div className="pp-container pp-stack-6">
          <div ref={resultRef} tabIndex={-1} className="pp-tr-result">
            {result.kind === 'idle' && !showRecent && <p className="t-ink-2">{t.idle}</p>}
            {result.kind === 'loading' && (
              <Card aria-busy="true" title={<Skeleton width={160} height={26} />}>
                <Skeleton lines={5} />
              </Card>
            )}
            {result.kind === 'missing' && (
              <EmptyState icon={SearchX} title={t.missingTitle}>
                {t.missingBody(shop.phone)}
              </EmptyState>
            )}
            {result.kind === 'error' && (
              <Alert
                tone="error"
                title={t.errorTitle}
                action={
                  lastQuery.current && (
                    <Button size="lg" onClick={() => lastQuery.current && run(lastQuery.current.code, lastQuery.current.email)}>
                      {m.common.tryAgain}
                    </Button>
                  )
                }
              >
                {fmt.error(result.message)}
              </Alert>
            )}
            {result.kind === 'found' && <TrackResult order={result.order} email={result.email} onConnected={refresh} />}
          </div>

          {forgotten && (
            <div ref={forgottenRef} tabIndex={-1} className="pp-tr-forgotten" role="status">
              <Icon icon={Check} />
              <p>{t.recent.forgotten}</p>
            </div>
          )}

          {showRecent && (
            <Card title={t.recent.title} meta={me ? t.recent.rememberedAs(me.name) : undefined} className="pp-tr-recent">
              <p className="t-ink-2">{t.recent.intro}</p>
              <ul className="pp-tr-list">
                {recent.map((o) => {
                  const status = recentStatus[o.code];
                  const active = result.kind === 'found' && result.order.code === o.code;
                  return (
                    <li key={o.code} className={active ? 'pp-tr-item is-active' : 'pp-tr-item'}>
                      <div className="pp-tr-item-info">
                        <span className="pp-tr-code t-mono-id">{o.code}</span>
                        <span className="t-meta">{t.recent.sent(fmt.when(o.createdAt))}</span>
                        {status && <StatusTag status={status} short />}
                      </div>
                      <Button
                        size="lg"
                        variant={active ? 'secondary' : 'primary'}
                        icon={Search}
                        aria-label={t.recent.viewLabel(o.code)}
                        onClick={() => viewRecent(o)}
                        className="pp-tr-view"
                      >
                        {t.recent.view}
                      </Button>
                    </li>
                  );
                })}
              </ul>
              <div className="pp-tr-forget">
                <Button variant="quiet" size="lg" icon={UserX} onClick={() => setForgetOpen(true)}>
                  {t.recent.forget}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </section>

      <Dialog
        open={forgetOpen}
        onClose={() => setForgetOpen(false)}
        title={t.recent.forgetTitle}
        size="sm"
        alert
        footer={
          <>
            <Button variant="quiet" size="lg" onClick={() => setForgetOpen(false)} data-autofocus>{m.common.cancel}</Button>
            <Button variant="primary" size="lg" icon={UserX} onClick={confirmForget}>{t.recent.forgetConfirm}</Button>
          </>
        }
      >
        <div className="pp-tr-forget-body">
          <Icon icon={Smartphone} />
          <p>{t.recent.forgetBody}</p>
        </div>
      </Dialog>
    </div>
  );
}

function TrackResult({ order, email, onConnected }: { order: Order; email: string; onConnected: () => void }) {
  const { shop } = useShop();
  const { m, fmt } = useI18n();
  const t = m.track.result;
  const ready = order.status === 'ready';
  return (
    <div className="pp-two-col">
      <Card
        title={<span className="t-mono-id pp-tr-title-code">{order.code}</span>}
        meta={t.submitted(fmt.dateTime(order.createdAt), fmt.filesSummary(order))}
        actions={<StatusTag status={order.status} />}
        className="pp-stack-6 pp-tr-card"
      >
        <TrackingSteps order={order} phone={shop.phone} />
        {order.status !== 'claimed' && (
          <MessengerConnect
            key={order.code}
            code={order.code}
            email={email}
            connectedAt={order.messengerConnectedAt}
            onConnected={onConnected}
            className="pp-tr-msgr"
          />
        )}
      </Card>

      <div className="pp-stack-6">
        <Card tone="inverse" title={ready ? t.readyTitle : t.pickupTitle} className="pp-stack">
          <div className="pp-stack-2">
            <span className="t-label on-inverse">{t.address}</span>
            <p>{shop.address}</p>
          </div>
          <div className="pp-stack-2">
            <span className="t-label on-inverse">{t.hours}</span>
            <p>{shop.hours}</p>
          </div>
          <p className="pp-tr-pay">{t.payNote}</p>
        </Card>
        <Card title={t.yourOrder} className="pp-stack">
          <ul className="pp-plain-list pp-tr-files">
            {order.files.map((f) => (
              <li key={f.id}>
                <span className="pp-tr-file-name" title={f.originalName}>{f.originalName}</span>
                <span className="t-meta pp-tr-file-pages">{f.pages != null ? m.common.pages(f.pages) : fmt.fileLine(f)}</span>
              </li>
            ))}
          </ul>
          <p className="t-meta pp-tr-settings">{fmt.settingsSummary(order, true)}</p>
        </Card>
        <p className="t-small">{t.problem(shop.phone)}</p>
      </div>
    </div>
  );
}
