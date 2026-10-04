import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, Inbox, MessageCircle, Plus, Search, SearchX } from 'lucide-react';
import { api, type Order, type OrderView } from '../api';
import { Alert, Button, ButtonLink, Card, Drawer, EmptyState, Field, Icon, Segmented, Skeleton, StatusTag, toast } from '../design/components';
import { useI18n } from '../i18n';
import { useDebounced, useLive, useMediaQuery, useNow } from '../shared/useLive';
import { OrderPanel } from './OrderPanel';

const VIEWS: OrderView[] = ['active', 'claimed', 'all'];

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
  const { m, fmt } = useI18n();
  const t = m.staff.dashboard;
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
        toast(t.newOrderToast(o.code, o.customerName), {
          icon: Inbox,
          action: { label: t.view, onClick: () => update({ order: o.id }) },
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
          <h1 className="t-display">{t.title}</h1>
          <p className="t-meta">
            {fmt.longDay()} · {now - updatedAt < 60_000 ? t.updatedJustNow : t.updatedAgo(fmt.duration(new Date(updatedAt).toISOString(), now))}
          </p>
          <p className="t-ink-2">{t.intro}</p>
        </div>
        <div className="pp-row" style={{ alignItems: 'flex-end' }}>
          <Field
            label={t.search}
            type="search"
            icon={Search}
            className="pp-search"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ButtonLink to="/staff/new" icon={Plus}>{m.staff.walkIn.title}</ButtonLink>
        </div>
      </div>

      <div className="pp-counts">
        <CountCard strong label={t.counts.toPrint} value={c?.toPrint} meta={c?.oldestWaitingAt ? t.counts.oldestWaiting(fmt.duration(c.oldestWaitingAt, now)) : t.counts.nothingWaiting} />
        <CountCard label={t.counts.printing} value={c?.printing} meta={t.counts.printingMeta} />
        <CountCard label={t.counts.ready} value={c?.ready} meta={t.counts.readyMeta} />
        <CountCard label={t.counts.claimedToday} value={c?.claimedToday} meta={c ? t.counts.pagesPrinted(c.pagesClaimedToday) : '–'} />
      </div>

      {c && c.fileIssue > 0 && (
        <Alert tone="warning">
          {t.fileIssueAlert(c.fileIssue)}
        </Alert>
      )}

      <div className={selected && wide ? 'pp-work has-panel' : 'pp-work'}>
        <div className="pp-stack pp-orders-wrap">
          <div className="pp-row-between">
            <Segmented<OrderView>
              label={t.showOrders}
              size="md"
              value={view}
              onChange={(v) => update({ view: v === 'active' ? null : v })}
              options={VIEWS.map((v) => ({ value: v, label: t.views[v] }))}
            />
            <span className="t-meta" aria-live="polite">
              {orders ? t.countLine(orders.length, view, q) : t.loading}
            </span>
          </div>

          {list.error && !orders ? (
            <Alert tone="error" title={t.loadError} action={<Button size="sm" onClick={list.reload}>{m.common.tryAgain}</Button>}>
              {fmt.error(list.error)}
            </Alert>
          ) : !orders ? (
            <ul className="pp-orders" aria-busy="true" aria-label={t.loading}>
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
              <EmptyState icon={SearchX} title={t.empty.searchTitle(q)} action={<Button onClick={() => setSearch('')}>{t.empty.clearSearch}</Button>}>
                {t.empty.searchBody}
              </EmptyState>
            ) : view === 'claimed' ? (
              <EmptyState icon={Inbox} title={t.empty.claimedTitle}>{t.empty.claimedBody}</EmptyState>
            ) : (
              <EmptyState icon={Inbox} title={t.empty.waitingTitle} action={<ButtonLink to="/staff/new" variant="primary" icon={Plus}>{m.staff.walkIn.title}</ButtonLink>}>
                {t.empty.waitingBody}
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
        <Drawer open={Boolean(selected)} onClose={close} title={t.orderDetails} width={480}>
          {selected && <OrderPanel key={selected} orderId={selected} />}
        </Drawer>
      )}
    </main>
  );
}

function OrderList({ orders, selected, onSelect }: { orders: Order[]; selected: string | null; onSelect: (id: string) => void }) {
  const { m, fmt } = useI18n();
  const t = m.staff.dashboard.list;
  return (
    <ul className="pp-orders" aria-label={t.label}>
      <li className="pp-orders-head t-label" aria-hidden="true">
        <span>{t.order}</span>
        <span>{t.customer}</span>
        <span>{t.filesSettings}</span>
        <span>{t.status}</span>
      </li>
      {orders.map((o) => (
        <li key={o.id}>
          <button type="button" className="pp-order-row" aria-current={o.id === selected ? 'true' : undefined} onClick={() => onSelect(o.id)}>
            <span className="pp-cell-code">
              <span className="t-mono-id" style={{ display: 'block' }}>{o.code}</span>
              <span className="t-meta">{fmt.when(o.createdAt)}{o.source === 'walk_in' ? ` · ${t.walkIn}` : ''}</span>
            </span>
            <span className="pp-cell-name">
              <span className="t-body-strong t-truncate" style={{ display: 'block' }}>{o.customerName}</span>
              <span className="t-meta t-truncate" style={{ display: 'block' }}>{o.email ?? o.phone ?? t.noContact}</span>
              {o.messengerConnectedAt && (
                <span className="pp-staff-chip" title={t.messengerConnected}>
                  <Icon icon={MessageCircle} />
                  {t.messenger}
                  <span className="mn-sr"> · {t.messengerConnected}</span>
                </span>
              )}
            </span>
            <span className="pp-cell-files">
              <span style={{ display: 'block' }}>{fmt.filesSummary(o)}</span>
              <span className="t-meta">{fmt.settingsSummary(o)}</span>
            </span>
            <span className="pp-cell-tag">
              <StatusTag status={o.status} short />
              <span className="pp-staff-open" aria-hidden="true">
                {t.open}
                <Icon icon={ChevronRight} />
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
