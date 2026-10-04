import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Check, Plus, Search } from 'lucide-react';
import { api, type Order } from '../api';
import { Bleed, Button, ButtonLink, Card, Field, Icon, Skeleton } from '../design/components';
import { filesSummary, firstName, formatDateTime } from '../lib/format';
import { isValidOrderCode, normalizeOrderCode } from '../lib/orderCode';
import { CopyCodeButton, FileListReadOnly, SettingsList } from '../shared/OrderBits';
import { useShop } from '../shared/ShopContext';

interface ReceivedState {
  email?: string | null;
  name?: string;
}

export function OrderReceivedPage() {
  const { code: rawCode = '' } = useParams();
  const code = normalizeOrderCode(rawCode);
  const state = (useLocation().state ?? {}) as ReceivedState;
  const navigate = useNavigate();
  const { shop } = useShop();
  const [order, setOrder] = useState<Order | null | undefined>(state.email ? undefined : null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!state.email) return;
    let live = true;
    api.trackOrder(code, state.email).then(
      (o) => live && setOrder(o),
      () => live && setOrder(null),
    );
    return () => {
      live = false;
    };
  }, [code, state.email]);

  const goTrack = (e?: FormEvent) => {
    e?.preventDefault();
    navigate('/track', { state: { code, email: state.email ?? email } });
  };

  if (!isValidOrderCode(code)) {
    return (
      <Bleed tone="sunk">
        <h1 className="t-display">That isn't an order ID</h1>
        <p className="t-ink-2">Order IDs look like PRT-7K3QM. Check the link in your email, or track your order by ID.</p>
        <div><ButtonLink to="/track" icon={Search}>Track an order</ButtonLink></div>
      </Bleed>
    );
  }

  const name = state.name ?? order?.customerName;

  return (
    <>
      <Bleed tone="inverse" className="pp-hero">
        <span className="mn-tag pp-tag-on-inverse">
          <Icon icon={Check} size={12} />
          Order received
        </span>
        <h1 className="t-display">{name ? `Thanks, ${firstName(name)}. We have your files.` : 'We have your files.'}</h1>
        <div className="pp-stack-2">
          <span className="t-label on-inverse">Your order ID</span>
          <p className="pp-order-id">{code}</p>
        </div>
        <p className="pp-hero-copy">
          {state.email
            ? `We emailed it to ${state.email}. Keep it to track your order and to claim it at the counter.`
            : 'Keep it to track your order and to claim it at the counter.'}
        </p>
        <div className="pp-row">
          <Button variant="primary" size="lg" icon={Search} onClick={() => goTrack()}>Track this order</Button>
          <CopyCodeButton code={code} size="lg" />
        </div>
      </Bleed>

      <section className="pp-section">
        <div className="pp-container pp-two-col">
          {order === undefined ? (
            <Card title="Order summary" aria-busy="true">
              <Skeleton lines={4} />
            </Card>
          ) : order ? (
            <Card title="Order summary" meta={`Submitted ${formatDateTime(order.createdAt)} · ${filesSummary(order)}`} className="pp-stack">
              <FileListReadOnly files={order.files} />
              <hr className="pp-divider" />
              <SettingsList order={order} />
              {order.notes && (
                <div className="pp-note">
                  <span className="t-label">Your notes</span>
                  <p className="t-ink-2">{order.notes}</p>
                </div>
              )}
            </Card>
          ) : (
            <Card title="See your order details" className="pp-stack">
              <p className="t-ink-2">Enter the email you used when you sent your files.</p>
              <form className="pp-quick-track-form" onSubmit={goTrack}>
                <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button type="submit" icon={Search}>Show order</Button>
              </form>
            </Card>
          )}

          <Card tone="sunk" title="What happens next" className="pp-stack">
            <ol className="pp-next">
              <li><span className="t-meta">1</span><p>We check your files. If something won't print well, we email you before printing.</p></li>
              <li><span className="t-meta">2</span><p>We print your order and email you when it's ready for pickup.</p></li>
              <li><span className="t-meta">3</span><p>Claim it at {shop.address}. Show your order ID and pay at the counter.</p></li>
            </ol>
            <p className="t-small" style={{ paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
              No email after a few minutes? Check your spam folder, or call us at {shop.phone}.
            </p>
            <div><ButtonLink to="/" icon={Plus}>Send more files</ButtonLink></div>
          </Card>
        </div>
      </section>
    </>
  );
}
