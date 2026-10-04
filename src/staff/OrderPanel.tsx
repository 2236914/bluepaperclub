import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Mail,
  MessageCircle,
  PackageCheck,
  Pencil,
  Phone,
  Printer,
  StickyNote,
  TriangleAlert,
  Undo2,
} from 'lucide-react';
import { api, errorMessage, type Order, type OrderFile, type OrderStatus, type PrintJob, type StaffMember } from '../api';
import {
  Alert,
  Button,
  ButtonAnchor,
  Card,
  Checkbox,
  Dialog,
  Icon,
  Segmented,
  Skeleton,
  STATUS_ICON,
  StatusTag,
  TextAreaField,
  Timeline,
  toast,
  type IconType,
  type TimelineItem,
} from '../design/components';
import { useI18n } from '../i18n';
import { fileKind } from '../lib/files';
import { firstName } from '../lib/format';
import { printerFor } from '../lib/printers';
import { canPrintOnThisPhone, downloadUrl, shareForPrinting } from '../lib/share';
import { SettingsList } from '../shared/OrderBits';
import { useShop } from '../shared/ShopContext';
import { useLive, useNow } from '../shared/useLive';
import { EditOrderDialog } from './EditOrderDialog';
import { OrderFiles } from './OrderFiles';

const SWITCHABLE: OrderStatus[] = ['received', 'printing', 'ready', 'claimed'];

function latestJobs(jobs: PrintJob[]): Map<string, PrintJob> {
  const map = new Map<string, PrintJob>();
  for (const j of jobs) map.set(j.fileId, j); // jobs come oldest first
  return map;
}

function passFor(order: Order, file: OrderFile): PrintJob['pass'] {
  // Manual two-sided: odd pages first, staff flip the stack, then even pages. One page needs one pass.
  return order.sides === 'two' && (file.pages ?? 2) > 1 ? 'odd' : 'all';
}

function canPrint(file: OrderFile): boolean {
  return !(fileKind(file.originalName) === 'word' && file.conversion !== 'done');
}

export function OrderPanel({ orderId, onClose }: { orderId: string; onClose?: () => void }) {
  const { m, fmt } = useI18n();
  const t = m.staffOrder;
  const c = m.common;
  const { shop } = useShop();
  const now = useNow(30_000);
  const orderQ = useLive(() => api.getOrder(orderId), `order-${orderId}`);
  const jobsQ = useLive(() => api.listPrintJobs(orderId), `jobs-${orderId}`);
  const agentQ = useLive(() => api.agentStatus(), 'agent', { pollMs: 15_000 });
  const staffQ = useLive(() => api.listStaff(), 'staff', { live: false });

  const [notifyOn, setNotifyOn] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [issueError, setIssueError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [note, setNote] = useState('');
  const [showAllActivity, setShowAllActivity] = useState(false);
  const order = orderQ.data;

  useEffect(() => {
    setNote(order?.staffNote ?? '');
    // Only reset when switching orders or after a save, not on every live refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.staffNote]);

  const names = useMemo(() => new Map((staffQ.data ?? []).map((s: StaffMember) => [s.id, s.name])), [staffQ.data]);
  const jobs = jobsQ.data ?? [];
  const latest = useMemo(() => latestJobs(jobs), [jobs]);

  if (orderQ.error && !order) {
    return (
      <Card title={t.panel.fallbackTitle} className="pp-stack">
        <Alert tone="error" title={t.panel.couldntOpen} action={<Button size="sm" onClick={orderQ.reload}>{c.tryAgain}</Button>}>
          {fmt.error(orderQ.error)}
        </Alert>
        {onClose && <Button variant="quiet" onClick={onClose}>{c.close}</Button>}
      </Card>
    );
  }
  if (!order) {
    return (
      <Card title={<Skeleton width={140} height={26} />} aria-busy="true" className="pp-stack-6">
        <Skeleton lines={3} />
        <Skeleton height={120} />
        <Skeleton lines={4} />
      </Card>
    );
  }

  const agent = agentQ.data;
  const printer = printerFor(order.paper);
  const printable = order.files.filter(canPrint);
  const awaitingFlip = order.files.filter((f) => {
    const j = latest.get(f.id);
    return j && j.pass === 'odd' && j.status === 'printed';
  });
  const oddRunning = order.files.some((f) => {
    const j = latest.get(f.id);
    return j && j.pass === 'odd' && (j.status === 'queued' || j.status === 'printing');
  });
  const first = firstName(order.customerName) || order.customerName;
  const hasEmail = Boolean(order.email);
  const hasMessenger = Boolean(order.messengerConnectedAt) && Boolean(shop.messengerPage);
  const reachable = hasEmail || hasMessenger;
  const notify = notifyOn && reachable;
  const actorName = (actor: string) =>
    actor === 'customer' ? t.actors.customer : actor === 'agent' ? t.actors.agent : actor === 'system' ? t.actors.system : names.get(actor) ?? t.actors.staff;

  /* ---------- actions ---------- */

  const changeStatus = async (status: OrderStatus, message?: string) => {
    const prev = order.status;
    setBusy(`status-${status}`);
    try {
      await api.setStatus(order.id, status, { emailCustomer: notify, message });
      const parts = [t.status.marked(order.code, c.status[status])];
      if (notify && hasEmail && (status === 'ready' || status === 'file_issue')) parts.push(t.status.emailed(first));
      if (notify && hasMessenger && status !== 'received') parts.push(t.status.messaged);
      toast(parts.join(' · '), {
        icon: STATUS_ICON[status],
        action: {
          label: t.status.undo,
          onClick: () => {
            api.setStatus(order.id, prev, { emailCustomer: false }).catch((err) => toast.error(errorMessage(err)));
          },
        },
      });
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const queue = async (files: OrderFile[], pass?: PrintJob['pass']) => {
    let sent = 0;
    for (const file of files) {
      await api.queuePrint({
        orderId: order.id,
        fileId: file.id,
        printer,
        copies: order.copies,
        color: order.color,
        paper: order.paper,
        pageRange: null,
        pass: pass ?? passFor(order, file),
      });
      sent++;
    }
    return sent;
  };

  const printFiles = async (files: OrderFile[], label: string, pass?: PrintJob['pass']) => {
    setBusy(label);
    try {
      const sent = await queue(files, pass);
      const twoSided = !pass && order.sides === 'two' && files.some((f) => passFor(order, f) === 'odd');
      const parts = [t.jobs.sent(sent === 1 ? files[0].originalName : c.files(sent), printer)];
      if (twoSided) parts.push(t.jobs.oddFirst);
      if (agent && !agent.online) parts.push(t.jobs.waitingLaptop);
      toast(parts.join(' · '), { icon: Printer });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const openFile = async (file: OrderFile) => {
    // Open the tab now so pop-up blockers allow it, then point it at the signed link.
    const win = window.open('', '_blank');
    try {
      const url = await api.getFileUrl(file.id, fileKind(file.originalName) === 'word' ? 'pdf' : 'original');
      if (win) win.location.href = url;
      else toast.error(t.files.blockedPopup);
    } catch (err) {
      win?.close();
      toast.error(errorMessage(err));
    }
  };

  const download = async (file: OrderFile) => {
    try {
      downloadUrl(await api.getFileUrl(file.id, 'original'), file.originalName);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const printOnPhone = async (file: OrderFile) => {
    setBusy(`phone-${file.id}`);
    try {
      const url = await api.getFileUrl(file.id, fileKind(file.originalName) === 'image' ? 'original' : 'pdf');
      await shareForPrinting(url, file.originalName);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const saveNote = async () => {
    setBusy('note');
    try {
      await api.updateStaffNote(order.id, note);
      toast(t.staffNote.saved, { icon: StickyNote });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const submitIssue = async () => {
    if (!issueText.trim()) {
      setIssueError(t.issue.required);
      return;
    }
    const ok = await changeStatus('file_issue', issueText.trim());
    if (ok) {
      setIssueOpen(false);
      setIssueText('');
      setIssueError(null);
    }
  };

  /* ---------- pieces ---------- */

  const jobLine = (file: OrderFile) => {
    const j = latest.get(file.id);
    if (!j) return null;
    const pass = j.pass === 'odd' ? ` · ${t.jobs.oddPages}` : j.pass === 'even' ? ` · ${t.jobs.evenPages}` : '';
    switch (j.status) {
      case 'queued':
        return (
          <span className="pp-job">
            {t.jobs.queued(j.printer)}
            {pass}
            {agent && !agent.online ? ` · ${t.jobs.laptopOffline}` : ''}
          </span>
        );
      case 'printing':
        return (
          <span className="pp-job">
            <span className="mn-btn-spin" aria-hidden="true" style={{ width: 10, height: 10 }} />
            {t.jobs.printing(j.printer)}
            {pass}
          </span>
        );
      case 'printed':
        return (
          <span className="pp-job">
            <Icon icon={Check} size={12} />
            {j.createdAt ? t.jobs.printedAgo(fmt.duration(j.createdAt, now)) : t.jobs.printed}
            {pass}
          </span>
        );
      case 'failed':
        return (
          <span className="pp-job is-failed">
            <Icon icon={TriangleAlert} size={12} />
            {fmt.error(j.error ?? t.jobs.failedDefault)}
            <button
              type="button"
              className="pp-linkbtn"
              aria-label={t.jobs.retryAria(file.originalName)}
              onClick={() => printFiles([file], `file-${file.id}`, j.pass)}
            >
              {t.jobs.retry}
            </button>
          </span>
        );
    }
  };

  const next: { label: string; icon: IconType; run: () => void } | null =
    order.status === 'printing'
      ? { label: t.panel.markReady, icon: Check, run: () => changeStatus('ready') }
      : order.status === 'ready'
        ? { label: t.panel.markClaimed, icon: PackageCheck, run: () => changeStatus('claimed') }
        : order.status === 'file_issue'
          ? { label: t.panel.backToReceived, icon: Undo2, run: () => changeStatus('received') }
          : null;

  const issueEvent = [...order.events].reverse().find((e) => e.toStatus === 'file_issue');
  const activity: TimelineItem[] = [...order.events].reverse().map((e, i) => {
    let title: string;
    let icon: IconType = StickyNote;
    let body: string | undefined;
    switch (e.type) {
      case 'status_change':
        if (e.toStatus) {
          icon = STATUS_ICON[e.toStatus];
          title = !e.fromStatus
            ? order.source === 'walk_in' ? t.activity.walkInAdded : t.activity.sentOnline
            : t.activity.marked(c.status[e.toStatus]);
        } else {
          title = t.activity.edit;
        }
        body = e.message;
        break;
      case 'email':
        icon = Mail;
        title = t.activity.email;
        body = e.message;
        break;
      case 'print':
        icon = Printer;
        title = t.activity.print;
        body = e.message;
        break;
      case 'edit':
        icon = Pencil;
        title = t.activity.edit;
        body = e.message;
        break;
      case 'messenger':
        icon = MessageCircle;
        title = t.activity.messenger;
        body = e.message;
        break;
      default:
        title = t.activity.note;
        body = e.message;
    }
    return {
      title,
      // Stored messages are English data from the backend; they show under a translated title.
      body: body ? <span lang="en">{body}</span> : undefined,
      time: `${fmt.when(e.createdAt)} · ${actorName(e.actor)}`,
      icon,
      strong: i === 0,
    };
  });

  const notifyHint = reachable ? (
    <>
      {hasEmail && <span className="so-hint-line">{t.status.notifyEmail}</span>}
      {hasMessenger && <span className="so-hint-line">{t.status.notifyMessenger}</span>}
    </>
  ) : (
    t.status.noChannelHint
  );

  return (
    <Card
      as="section"
      aria-label={t.panel.ariaLabel(order.code)}
      className="pp-panel"
      title={<span className="t-mono-id">{order.code}</span>}
      meta={`${order.source === 'walk_in' ? t.panel.walkIn : t.panel.online} · ${fmt.when(order.createdAt)}`}
      actions={<StatusTag status={order.status} />}
    >
      <div className="so-toolbar">
        {next && (
          <Button variant="primary" icon={next.icon} loading={busy?.startsWith('status')} onClick={next.run}>
            {next.label}
          </Button>
        )}
        <Button icon={Pencil} onClick={() => setEditOpen(true)}>
          {t.panel.editOrder}
        </Button>
      </div>

      {order.status === 'file_issue' && issueEvent?.message && (
        <Alert tone="warning" title={t.panel.onHold}>
          {issueEvent.message}
        </Alert>
      )}

      {order.status === 'claimed' && order.claimedAt && (
        <p className="t-small">{t.panel.claimedNote(fmt.when(order.claimedAt))}</p>
      )}

      <div className="pp-panel-section">
        <h3 className="t-label so-h">{t.customer.label}</h3>
        <p className="t-body-strong">{order.customerName}</p>
        <div className="pp-row">
          {order.email ? (
            <ButtonAnchor
              href={`mailto:${order.email}?subject=${encodeURIComponent(t.customer.mailSubject(order.code))}`}
              size="sm"
              variant="quiet"
              icon={Mail}
              className="so-contact"
            >
              {order.email}
            </ButtonAnchor>
          ) : (
            <span className="t-meta">{t.customer.noEmail}</span>
          )}
          {order.phone ? (
            <ButtonAnchor href={`tel:${order.phone.replace(/\s/g, '')}`} size="sm" variant="quiet" icon={Phone} className="so-contact">
              {order.phone}
            </ButtonAnchor>
          ) : (
            <span className="t-meta">{t.customer.noPhone}</span>
          )}
        </div>
        {order.messengerConnectedAt && (
          <p className="so-messenger">
            <Icon icon={MessageCircle} />
            {t.customer.messenger}
          </p>
        )}
      </div>

      <OrderFiles
        order={order}
        canPrint={canPrint}
        jobLine={jobLine}
        printingFileId={busy?.startsWith('file-') ? busy.slice(5) : null}
        onPrint={(f) => printFiles([f], `file-${f.id}`)}
        onPreview={openFile}
        onDownload={download}
        onPrintOnPhone={printOnPhone}
        onBackToReceived={() => void changeStatus('received')}
      />

      <SettingsList order={order} columns={2} />

      {order.notes && (
        <div className="pp-note">
          <span className="t-label">{t.customerNote}</span>
          <p>{order.notes}</p>
        </div>
      )}

      <div className="pp-panel-section">
        <h3 className="t-label so-h">{t.printer.label}</h3>
        <p className="pp-row t-small" style={{ color: 'var(--ink-2)' }}>
          <span className={agent?.online ? 'pp-dot' : 'pp-dot is-off'} aria-hidden="true" />
          {agent == null
            ? t.printer.checking
            : agent.online
              ? t.printer.online(printer)
              : `${t.printer.offline}${agent.lastSeenAt ? ` (${t.printer.lastSeen(fmt.duration(agent.lastSeenAt, now))})` : ''}`}
        </p>
        {awaitingFlip.length > 0 && !oddRunning && (
          <div className="pp-flip" role="status">
            <p className="t-body-strong">{t.printer.flipTitle}</p>
            <p className="t-ink-2">{t.printer.flipBody(awaitingFlip.length > 1 ? c.files(awaitingFlip.length) : null)}</p>
            <div>
              <Button icon={Printer} loading={busy === 'even'} onClick={() => printFiles(awaitingFlip, 'even', 'even')}>
                {t.printer.flipContinue}
              </Button>
            </div>
          </div>
        )}
        {oddRunning && <p className="t-small">{t.printer.oddRunning}</p>}
        <div className="pp-row">
          <Button
            variant={order.status === 'received' ? 'primary' : 'secondary'}
            icon={Printer}
            disabled={printable.length === 0}
            loading={busy === 'all'}
            onClick={() => printFiles(printable, 'all')}
          >
            {printable.length === order.files.length ? t.printer.printAll : t.printer.printReady(printable.length)}
          </Button>
        </div>
        {printable.length < order.files.length && <p className="t-small">{t.printer.wordNote}</p>}
        {canPrintOnThisPhone() && <p className="t-small">{t.printer.phoneNote}</p>}
      </div>

      <div className="pp-panel-section">
        <h3 className="t-label so-h" id={`status-${order.id}`}>{t.status.label}</h3>
        <Segmented<OrderStatus>
          labelledBy={`status-${order.id}`}
          value={order.status}
          wrap
          onChange={(s) => changeStatus(s)}
          options={SWITCHABLE.map((s) => ({ value: s, label: c.statusShort[s] }))}
        />
        <div>
          <Button
            variant="quiet"
            size="sm"
            icon={TriangleAlert}
            className="so-flush"
            onClick={() => setIssueOpen(true)}
            disabled={order.status === 'claimed'}
          >
            {t.status.reportIssue}
          </Button>
        </div>
        <Checkbox
          checked={notify}
          disabled={!reachable}
          onChange={(e) => setNotifyOn(e.target.checked)}
          label={reachable ? t.status.notify(first) : t.status.noChannel}
          hint={notifyHint}
        />
      </div>

      <div className="pp-panel-section">
        <TextAreaField
          label={t.staffNote.label}
          placeholder={t.staffNote.placeholder}
          hint={t.staffNote.hint}
          value={note}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
          style={{ minHeight: 72 }}
        />
        {(note.trim() || null) !== (order.staffNote ?? null) && (
          <div className="pp-row">
            <Button size="sm" variant="primary" loading={busy === 'note'} onClick={saveNote}>{t.staffNote.save}</Button>
            <Button size="sm" variant="quiet" onClick={() => setNote(order.staffNote ?? '')}>{c.cancel}</Button>
          </div>
        )}
      </div>

      <div className="pp-panel-section">
        <h3 className="t-label so-h">{t.activity.label}</h3>
        <Timeline items={showAllActivity ? activity : activity.slice(0, 5)} />
        {activity.length > 5 && (
          <div>
            <Button size="sm" variant="quiet" className="so-flush" aria-expanded={showAllActivity} onClick={() => setShowAllActivity((v) => !v)}>
              {showAllActivity ? t.activity.showLess : t.activity.showAll(activity.length)}
            </Button>
          </div>
        )}
      </div>

      {onClose && (
        <div className="pp-row">
          <Button variant="quiet" onClick={onClose}>{c.close}</Button>
        </div>
      )}

      <EditOrderDialog order={order} open={editOpen} onClose={() => setEditOpen(false)} />

      <Dialog
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title={t.issue.title}
        description={notify ? t.issue.onHoldNotify(first) : t.issue.onHold}
        footer={
          <>
            <Button variant="quiet" onClick={() => setIssueOpen(false)}>{c.cancel}</Button>
            <Button variant="primary" icon={TriangleAlert} loading={busy === 'status-file_issue'} onClick={submitIssue}>
              {t.issue.submit}
            </Button>
          </>
        }
      >
        <TextAreaField
          label={t.issue.messageLabel}
          placeholder={t.issue.placeholder}
          hint={t.issue.hint}
          value={issueText}
          error={issueError}
          data-autofocus
          onChange={(e) => {
            setIssueText(e.target.value);
            setIssueError(null);
          }}
        />
      </Dialog>
    </Card>
  );
}
