import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Inbox, Plus, Search, SearchX } from 'lucide-react';
import { api, type Order, type OrderView } from '../api';
import { Alert, Button, ButtonLink, Card, Drawer, EmptyState, Field, Segmented, Skeleton, StatusTag, toast } from '../design/components';
import { filesSummary, formatDuration, formatLongDay, formatWhen, plural, settingsSummary } from '../lib/format';
import { useDebounced, useLive, useMediaQuery, useNow } from '../shared/useLive';
import { OrderPanel } from './OrderPanel';

const VIEWS: Array<{ value: OrderView; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'all', label: 'All' },
];

function CountCard({ label, value, meta, strong }: { label: string; value?: number; meta: string; strong?: boolean }) {
  return (
    <Card tone={strong ? 'inverse' : 'default'} as="div" className="pp-count">
      <span className={strong ? 't-label on-inverse' : 't-label'}>{label}</span>
      <p className="t-display" aria-live="polite">{value ?? '–'}</p>
      <p className={strong ? 't-meta on-inverse' : 't-meta'}>{meta}</p>
    </Card>
  );
}

export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as OrderView) || 'active';
  const selected = params.get('order');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebounced(search.trim(), 250);
  const wide = useMediaQuery('(min-width: 1280px)');
  const now = useNow(30_000);

  const list = useLive(() => api.listOrders({ view, search: q || undefined }), `list-${view}-${q}`);
  const counts = useLive(() => api.orderCounts(), 'counts');
  const [updatedAt, setUpdatedAt] = useState(Date.now());

  const update = (patch: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') nextParams.delete(k);
      else nextParams.set(k, v);
    }
    setParams(nextParams, { replace: true });
  };

  useEffect(() => {
    if ((params.get('q') ?? '') !== q) update({ q: q || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Tell staff when a new order lands while they're looking at the list.
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!list.data) return;
    setUpdatedAt(Date.now());
    if (known.current && !q) {
      const fresh = list.data.filter((o) => !known.current!.has(o.id) && o.status === 'received');
      fresh.forEach((o) =>
        toast(`New order ${o.code} from ${o.customerName}`, {
          icon: Inbox,
          action: { label: 'View', onClick: () => update({ order: o.id }) },
        }),
      );
    }
    known.current = new Set([...(known.current ?? []), ...list.data.map((o) => o.id)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.data]);

  const c = counts.data;
  const orders = list.data;
  const close = () => update({ order: null });

  return (
    <main className="pp-staff-main" id="main">
      <div className="pp-row-between" style={{ alignItems: 'flex-end' }}>
        <div className="pp-stack-2">
          <h1 className="t-display">Orders</h1>
          <p className="t-meta">
            {formatLongDay()} · Updated {now - updatedAt < 60_000 ? 'just now' : `${formatDuration(new Date(updatedAt).toISOString(), now)} ago`}
          </p>
        </div>
        <div className="pp-row" style={{ alignItems: 'flex-end' }}>
          <Field
            label="Search"
            type="search"
            icon={Search}
            className="pp-search"
            placeholder="Order ID, name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ButtonLink to="/staff/new" icon={Plus}>Add walk-in order</ButtonLink>
        </div>
      </div>

      <div className="pp-counts">
        <CountCard strong label="To print" value={c?.toPrint} meta={c?.oldestWaitingAt ? `Oldest waiting ${formatDuration(c.oldestWaitingAt, now)}` : 'Nothing waiting'} />
        <CountCard label="Printing" value={c?.printing} meta="On the counter printer" />
        <CountCard label="Ready for pickup" value={c?.ready} meta="Customers emailed" />
        <CountCard label="Claimed today" value={c?.claimedToday} meta={c ? `${plural(c.pagesClaimedToday, 'page')} printed` : '–'} />
      </div>

      {c && c.fileIssue > 0 && (
        <Alert tone="warning">
          {c.fileIssue === 1 ? '1 order is' : `${c.fileIssue} orders are`} on hold with a file issue, waiting for the customer.
        </Alert>
      )}

      <div className={selected && wide ? 'pp-work has-panel' : 'pp-work'}>
        <div className="pp-stack pp-orders-wrap">
          <div className="pp-row-between">
            <Segmented<OrderView> label="Show orders" value={view} onChange={(v) => update({ view: v === 'active' ? null : v })} options={VIEWS} />
            <span className="t-meta">
              {orders ? `${plural(orders.length, view === 'all' ? 'order' : `${view} order`)}${q ? ` matching “${q}”` : ''} · newest first` : 'Loading orders'}
            </span>
          </div>

          {list.error && !orders ? (
            <Alert tone="error" title="Couldn't load orders" action={<Button size="sm" onClick={list.reload}>Try again</Button>}>
              {list.error}
            </Alert>
          ) : !orders ? (
            <ul className="pp-orders" aria-busy="true" aria-label="Loading orders">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="pp-order-row" style={{ cursor: 'default' }}>
                  <span className="pp-cell-code"><Skeleton lines={2} /></span>
                  <span className="pp-cell-name"><Skeleton lines={2} /></span>
                  <span className="pp-cell-files"><Skeleton lines={2} /></span>
                  <span className="pp-cell-tag"><Skeleton width={96} height={24} /></span>
                </li>
              ))}
            </ul>
          ) : orders.length === 0 ? (
            q ? (
              <EmptyState icon={SearchX} title={`No orders match “${q}”`} action={<Button onClick={() => setSearch('')}>Clear search</Button>}>
                Search by order ID (PRT-…), customer name or email. Try the All view for older orders.
              </EmptyState>
            ) : view === 'claimed' ? (
              <EmptyState icon={Inbox} title="No claimed orders yet">Orders show up here once a customer picks them up.</EmptyState>
            ) : (
              <EmptyState icon={Inbox} title="No orders waiting" action={<ButtonLink to="/staff/new" variant="primary" icon={Plus}>Add walk-in order</ButtonLink>}>
                New orders show up here as soon as customers send them.
              </EmptyState>
            )
          ) : (
            <OrderList orders={orders} selected={selected} onSelect={(id) => update({ order: id })} />
          )}
        </div>

        {selected && wide && (
          <div className="pp-panel-inline">
            <OrderPanel key={selected} orderId={selected} onClose={close} />
          </div>
        )}
      </div>

      {!wide && (
        <Drawer open={Boolean(selected)} onClose={close} title="Order details" width={480}>
          {selected && <OrderPanel key={selected} orderId={selected} />}
        </Drawer>
      )}
    </main>
  );
}

function OrderList({ orders, selected, onSelect }: { orders: Order[]; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <ul className="pp-orders" aria-label="Orders">
      <li className="pp-orders-head t-label" aria-hidden="true">
        <span>Order</span>
        <span>Customer</span>
        <span>Files and settings</span>
        <span>Status</span>
      </li>
      {orders.map((o) => (
        <li key={o.id}>
          <button type="button" className="pp-order-row" aria-current={o.id === selected ? 'true' : undefined} onClick={() => onSelect(o.id)}>
            <span className="pp-cell-code">
              <span className="t-mono-id" style={{ display: 'block' }}>{o.code}</span>
              <span className="t-meta">{formatWhen(o.createdAt)}{o.source === 'walk_in' ? ' · Walk-in' : ''}</span>
            </span>
            <span className="pp-cell-name">
              <span className="t-body-strong t-truncate" style={{ display: 'block' }}>{o.customerName}</span>
              <span className="t-meta t-truncate" style={{ display: 'block' }}>{o.email ?? o.phone ?? 'No contact details'}</span>
            </span>
            <span className="pp-cell-files">
              <span style={{ display: 'block' }}>{filesSummary(o)}</span>
              <span className="t-meta">{settingsSummary(o)}</span>
            </span>
            <span className="pp-cell-tag">
              <StatusTag status={o.status} short />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
