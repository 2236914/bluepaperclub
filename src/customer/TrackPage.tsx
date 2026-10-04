import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, SearchX } from 'lucide-react';
import { api, errorMessage, type Order } from '../api';
import { Alert, Bleed, Button, Card, EmptyState, Field, Skeleton, StatusTag } from '../design/components';
import { filesSummary, formatDateTime, settingsSummary } from '../lib/format';
import { isValidOrderCode, normalizeOrderCode } from '../lib/orderCode';
import { fileLine, TrackingSteps } from '../shared/OrderBits';
import { useShop } from '../shared/ShopContext';

type Result =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'found'; order: Order }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

export function TrackPage() {
  const { shop } = useShop();
  const initial = (useLocation().state ?? {}) as { code?: string; email?: string | null };
  const [code, setCode] = useState(initial.code ?? '');
  const [email, setEmail] = useState(initial.email ?? '');
  const [errors, setErrors] = useState<{ code?: string; email?: string }>({});
  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const resultRef = useRef<HTMLDivElement>(null);
  const lastQuery = useRef<{ code: string; email: string } | null>(null);

  const run = async (c: string, e: string) => {
    lastQuery.current = { code: c, email: e };
    setResult({ kind: 'loading' });
    try {
      const order = await api.trackOrder(c, e);
      setResult(order ? { kind: 'found', order } : { kind: 'missing' });
    } catch (err) {
      setResult({ kind: 'error', message: errorMessage(err) });
    }
    resultRef.current?.focus();
  };

  useEffect(() => {
    if (initial.code && initial.email) run(normalizeOrderCode(initial.code), initial.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    const c = normalizeOrderCode(code);
    const next: typeof errors = {};
    if (!c) next.code = 'Enter your order ID.';
    else if (!isValidOrderCode(c)) next.code = 'Order IDs look like PRT-7K3QM.';
    if (!email.trim()) next.email = 'Enter the email you used for this order.';
    setErrors(next);
    if (next.code || next.email) return;
    setCode(c);
    run(c, email.trim());
  };

  return (
    <>
      <Bleed tone="sunk">
        <div className="pp-stack-2">
          <h1 className="t-display">Track your order</h1>
          <p className="t-ink-2">Use the order ID from your confirmation email.</p>
        </div>
        <form className="pp-quick-track-form" style={{ maxWidth: 840 }} onSubmit={onSubmit} noValidate>
          <Field
            label="Order ID"
            placeholder="PRT-7K3QM"
            value={code}
            error={errors.code}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            inputClassName="t-mono-id"
            onChange={(e) => setCode(e.target.value)}
          />
          <Field
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            error={errors.email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" variant="primary" icon={Search} loading={result.kind === 'loading'}> 
            Track order
          </Button>
        </form>
      </Bleed>

      <section className="pp-section" aria-live="polite">
        <div className="pp-container" ref={resultRef} tabIndex={-1} style={{ outline: 'none' }}>
          {result.kind === 'idle' && (
            <p className="t-ink-2">Your order ID starts with PRT- and is in the email we sent when you submitted your files.</p>
          )}
          {result.kind === 'loading' && (
            <Card aria-busy="true" title={<Skeleton width={160} height={26} />}>
              <Skeleton lines={5} />
            </Card>
          )}
          {result.kind === 'missing' && (
            <EmptyState icon={SearchX} title="No order found">
              Check the order ID in your email, and use the same email address you sent the files from. Walk-in orders without
              an email can't be tracked online; call us at {shop.phone}.
            </EmptyState>
          )}
          {result.kind === 'error' && (
            <Alert
              tone="error"
              title="We couldn't check your order"
              action={
                lastQuery.current && (
                  <Button size="sm" onClick={() => lastQuery.current && run(lastQuery.current.code, lastQuery.current.email)}>
                    Try again
                  </Button>
                )
              }
            >
              {result.message}
            </Alert>
          )}
          {result.kind === 'found' && <TrackResult order={result.order} />}
        </div>
      </section>
    </>
  );
}

function TrackResult({ order }: { order: Order }) {
  const { shop } = useShop();
  return (
    <div className="pp-two-col">
      <Card
        title={<span className="t-mono-id">{order.code}</span>}
        meta={`Submitted ${formatDateTime(order.createdAt)} · ${filesSummary(order)}`}
        actions={<StatusTag status={order.status} />}
        className="pp-stack-6"
      >
        <TrackingSteps order={order} phone={shop.phone} />
      </Card>

      <div className="pp-stack-6">
        <Card tone="inverse" title={order.status === 'ready' ? 'Ready at the counter' : 'Pickup details'} className="pp-stack">
          <div className="pp-stack-2">
            <span className="t-label on-inverse">Address</span>
            <p>{shop.address}</p>
          </div>
          <div className="pp-stack-2">
            <span className="t-label on-inverse">Hours</span>
            <p>{shop.hours}</p>
          </div>
          <p style={{ paddingTop: 12, borderTop: '1px solid var(--on-inverse)' }}>
            Show your order ID at the counter. You pay when you claim.
          </p>
        </Card>
        <Card title="Your order" className="pp-stack">
          <ul className="pp-plain-list">
            {order.files.map((f) => (
              <li key={f.id}>
                <span className="t-truncate" title={f.originalName}>{f.originalName}</span>
                <span className="t-meta" style={{ whiteSpace: 'nowrap' }}>{fileLine(f).split(' · ')[0]}</span>
              </li>
            ))}
          </ul>
          <p className="t-meta" style={{ paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>{settingsSummary(order, true)}</p>
        </Card>
        <p className="t-small">Something wrong with your order? Call us at {shop.phone} and mention your order ID.</p>
      </div>
    </div>
  );
}
