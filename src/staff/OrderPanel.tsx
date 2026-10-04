import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  Eye,
  Mail,
  PackageCheck,
  Phone,
  Printer,
  Smartphone,
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
  IconButton,
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
import { fileKind } from '../lib/files';
import { STATUS_LABEL, filesSummary, firstName, formatDuration, formatWhen, plural } from '../lib/format';
import { printerFor } from '../lib/printers';
import { canPrintOnThisPhone, downloadUrl, shareForPrinting } from '../lib/share';
import { FileBadge } from '../shared/FileBadge';
import { fileLine, SettingsList } from '../shared/OrderBits';
import { useLive, useNow } from '../shared/useLive';

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
  const now = useNow(30_000);
  const orderQ = useLive(() => api.getOrder(orderId), `order-${orderId}`);
  const jobsQ = useLive(() => api.listPrintJobs(orderId), `jobs-${orderId}`);
  const agentQ = useLive(() => api.agentStatus(), 'agent', { pollMs: 15_000 });
  const staffQ = useLive(() => api.listStaff(), 'staff', { live: false });

  const [emailOn, setEmailOn] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [issueError, setIssueError] = useState<string | null>(null);
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
      <Card title="Order" className="pp-stack">
        <Alert tone="error" title="Couldn't open this order" action={<Button size="sm" onClick={orderQ.reload}>Try again</Button>}>
          {orderQ.error}
        </Alert>
        {onClose && <Button variant="quiet" onClick={onClose}>Close</Button>}
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
  const emailable = Boolean(order.email);
  const actorName = (actor: string) =>
    actor === 'customer' ? 'Customer' : actor === 'agent' ? 'Print agent' : actor === 'system' ? 'Portal' : names.get(actor) ?? 'Staff';

  /* ---------- actions ---------- */

  const changeStatus = async (status: OrderStatus, message?: string) => {
    const prev = order.status;
    setBusy(`status-${status}`);
    try {
      await api.setStatus(order.id, status, { emailCustomer: emailOn && emailable, message });
      const emailed = emailOn && emailable && (status === 'ready' || status === 'file_issue');
      toast(`${order.code} marked ${STATUS_LABEL[status]}${emailed ? ` · Emailed ${firstName(order.customerName)}` : ''}`, {
        icon: STATUS_ICON[status],
        action: {
          label: 'Undo',
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
      toast(
        `${sent === 1 ? files[0].originalName : plural(sent, 'file')} sent to ${printer}${twoSided ? ' · odd pages first' : ''}${agent && !agent.online ? ' · waiting for the laptop' : ''}`,
        { icon: Printer },
      );
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
      else window.location.href = url;
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
      toast('Staff note saved', { icon: StickyNote });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const submitIssue = async () => {
    if (!issueText.trim()) {
      setIssueError('Tell the customer what is wrong and what to send.');
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
    const pass = j.pass === 'odd' ? ' · odd pages' : j.pass === 'even' ? ' · even pages' : '';
    switch (j.status) {
      case 'queued':
        return <span className="pp-job">Queued for {j.printer}{pass}{agent && !agent.online ? ' · laptop offline' : ''}</span>;
      case 'printing':
        return <span className="pp-job"><span className="mn-btn-spin" aria-hidden="true" style={{ width: 10, height: 10 }} />Printing on {j.printer}{pass}</span>;
      case 'printed':
        return <span className="pp-job"><Icon icon={Check} size={12} />Printed{j.createdAt ? ` ${formatDuration(j.createdAt, now)} ago` : ''}{pass}</span>;
      case 'failed':
        return (
          <span className="pp-job is-failed">
            <Icon icon={TriangleAlert} size={12} />Error: {j.error ?? 'Print failed'}
            <button type="button" className="pp-linkbtn" onClick={() => printFiles([file], `retry-${file.id}`, j.pass)}>Retry</button>
          </span>
        );
    }
  };

  const next: { label: string; icon: IconType; run: () => void } | null =
    order.status === 'printing'
      ? { label: 'Mark as ready', icon: Check, run: () => changeStatus('ready') }
      : order.status === 'ready'
        ? { label: 'Mark as claimed', icon: PackageCheck, run: () => changeStatus('claimed') }
        : order.status === 'file_issue'
          ? { label: 'File fixed: back to Received', icon: Undo2, run: () => changeStatus('received') }
          : null;

  const issueEvent = [...order.events].reverse().find((e) => e.toStatus === 'file_issue');
  const activity: TimelineItem[] = [...order.events].reverse().map((e, i) => {
    const who = actorName(e.actor);
    let title: string;
    let icon: IconType = StickyNote;
    if (e.type === 'status_change' && e.toStatus) {
      icon = STATUS_ICON[e.toStatus];
      title = !e.fromStatus
        ? order.source === 'walk_in' ? 'Walk-in order added' : 'Order sent online'
        : `Marked ${STATUS_LABEL[e.toStatus]}`;
    } else if (e.type === 'email') {
      icon = Mail;
      title = e.message ?? 'Email sent';
    } else if (e.type === 'print') {
      icon = Printer;
      title = e.message ?? 'Printed';
    } else {
      title = 'Staff note';
    }
    return {
      title,
      body: e.type === 'note' || (e.type === 'status_change' && e.message) ? e.message : undefined,
      time: `${formatWhen(e.createdAt)} · ${who}`,
      icon,
      strong: i === 0,
    };
  });

  return (
    <Card
      as="section"
      aria-label={`Order ${order.code}`}
      className="pp-panel"
      title={<span className="t-mono-id">{order.code}</span>}
      meta={`${order.source === 'walk_in' ? 'Walk-in' : 'Online'} · ${formatWhen(order.createdAt)}`}
      actions={<StatusTag status={order.status} />}
    >
      {order.status === 'file_issue' && issueEvent?.message && (
        <Alert tone="warning" title="On hold: file issue">
          {issueEvent.message}
        </Alert>
      )}

      {next && (
        <div className="pp-row">
          <Button variant="primary" icon={next.icon} loading={busy?.startsWith('status')} onClick={next.run}>
            {next.label}
          </Button>
        </div>
      )}
      {order.status === 'claimed' && order.claimedAt && (
        <p className="t-small">Claimed {formatWhen(order.claimedAt)}. Files are deleted 7 days after the claim.</p>
      )}

      <div className="pp-panel-section">
        <span className="t-label">Customer</span>
        <p className="t-body-strong">{order.customerName}</p>
        <div className="pp-row">
          {order.email ? (
            <ButtonAnchor href={`mailto:${order.email}?subject=${encodeURIComponent(`Order ${order.code}`)}`} size="sm" variant="quiet" icon={Mail} style={{ paddingLeft: 0 }}>
              {order.email}
            </ButtonAnchor>
          ) : (
            <span className="t-meta">No email</span>
          )}
          {order.phone ? (
            <ButtonAnchor href={`tel:${order.phone.replace(/\s/g, '')}`} size="sm" variant="quiet" icon={Phone}>
              {order.phone}
            </ButtonAnchor>
          ) : (
            <span className="t-meta">No mobile number</span>
          )}
        </div>
      </div>

      <div className="pp-panel-section">
        <div className="pp-row-between">
          <span className="t-label">Files</span>
          <span className="t-meta">{filesSummary(order)}</span>
        </div>
        <ul className="pp-file-list">
          {order.files.map((f) => {
            const ready = canPrint(f);
            return (
              <li key={f.id} className="pp-file-row" style={{ alignItems: 'flex-start' }}>
                <FileBadge name={f.originalName} small />
                <div className="pp-file-info">
                  <span className="pp-file-name" title={f.originalName}>{f.originalName}</span>
                  <span className="t-meta">{fileLine(f)}</span>
                  {jobLine(f)}
                </div>
                <div className="pp-file-actions">
                  <IconButton icon={Eye} size="sm" label={ready ? `Preview ${f.originalName}` : `${f.originalName} is converting`} disabled={!ready} onClick={() => openFile(f)} />
                  <IconButton
                    icon={Printer}
                    size="sm"
                    label={ready ? `Print ${f.originalName} on the counter printer` : `${f.originalName} is converting`}
                    disabled={!ready}
                    loading={busy === `file-${f.id}`}
                    onClick={() => printFiles([f], `file-${f.id}`)}
                  />
                  <IconButton icon={Download} size="sm" label={`Download ${f.originalName}`} onClick={() => download(f)} />
                  {canPrintOnThisPhone() && (
                    <IconButton
                      icon={Smartphone}
                      size="sm"
                      label={`Print ${f.originalName} on this phone`}
                      disabled={!ready}
                      loading={busy === `phone-${f.id}`}
                      onClick={() => printOnPhone(f)}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <SettingsList order={order} columns={2} />

      {order.notes && (
        <div className="pp-note">
          <span className="t-label">Customer note</span>
          <p>{order.notes}</p>
        </div>
      )}

      <div className="pp-panel-section">
        <span className="t-label">Counter printer</span>
        <p className="pp-row t-small" style={{ color: 'var(--ink-2)' }}>
          <span className={agent?.online ? 'pp-dot' : 'pp-dot is-off'} aria-hidden="true" />
          {agent == null
            ? 'Checking the printer…'
            : agent.online
              ? `Online · prints on ${printer}`
              : `Offline · jobs wait until the shop laptop is back${agent.lastSeenAt ? ` (last seen ${formatDuration(agent.lastSeenAt, now)} ago)` : ''}`}
        </p>
        {awaitingFlip.length > 0 && !oddRunning && (
          <div className="pp-flip" role="status">
            <p className="t-body-strong">Flip the stack for two-sided</p>
            <p className="t-ink-2">
              Odd pages are done{awaitingFlip.length > 1 ? ` for ${plural(awaitingFlip.length, 'file')}` : ''}. Take the printed stack, turn it over
              without changing the order, put it back in the tray, then continue.
            </p>
            <div>
              <Button icon={Printer} loading={busy === 'even'} onClick={() => printFiles(awaitingFlip, 'even', 'even')}>
                Continue: print even pages
              </Button>
            </div>
          </div>
        )}
        {oddRunning && <p className="t-small">Printing odd pages. When they're done, you'll be asked to flip the stack.</p>}
        <div className="pp-row">
          <Button
            variant={order.status === 'received' ? 'primary' : 'secondary'}
            icon={Printer}
            disabled={printable.length === 0}
            loading={busy === 'all'}
            onClick={() => printFiles(printable, 'all')}
          >
            {printable.length === order.files.length ? 'Print all files' : `Print ${plural(printable.length, 'ready file')}`}
          </Button>
        </div>
        {printable.length < order.files.length && (
          <p className="t-small">Word files print once the shop laptop converts them to PDF.</p>
        )}
        {canPrintOnThisPhone() && (
          <p className="t-small">Printer cable on this phone? Use the phone button on a file to share it to NokoPrint.</p>
        )}
      </div>

      <div className="pp-panel-section">
        <span className="t-label" id={`status-${order.id}`}>Status</span>
        <Segmented<OrderStatus>
          labelledBy={`status-${order.id}`}
          value={order.status}
          wrap
          onChange={(s) => changeStatus(s)}
          options={SWITCHABLE.map((s) => ({ value: s, label: s === 'ready' ? 'Ready' : STATUS_LABEL[s] }))}
        />
        <div>
          <Button variant="quiet" size="sm" icon={TriangleAlert} style={{ paddingLeft: 0 }} onClick={() => setIssueOpen(true)} disabled={order.status === 'claimed'}>
            Report a file issue
          </Button>
        </div>
        <Checkbox
          checked={emailOn && emailable}
          disabled={!emailable}
          onChange={(e) => setEmailOn(e.target.checked)}
          label={emailable ? `Email ${firstName(order.customerName)} when the status changes` : 'No email on this order'}
          hint={emailable ? 'Sends the Ready for pickup and File issue emails.' : 'Call or text them instead.'}
        />
      </div>

      <div className="pp-panel-section">
        <TextAreaField
          label="Staff note"
          placeholder="Add a note for other staff"
          hint="Only staff can see this."
          value={note}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
          style={{ minHeight: 72 }}
        />
        {(note.trim() || null) !== (order.staffNote ?? null) && (
          <div className="pp-row">
            <Button size="sm" variant="primary" loading={busy === 'note'} onClick={saveNote}>Save note</Button>
            <Button size="sm" variant="quiet" onClick={() => setNote(order.staffNote ?? '')}>Cancel</Button>
          </div>
        )}
      </div>

      <div className="pp-panel-section">
        <span className="t-label">Activity</span>
        <Timeline items={showAllActivity ? activity : activity.slice(0, 5)} />
        {activity.length > 5 && (
          <div>
            <Button size="sm" variant="quiet" style={{ paddingLeft: 0 }} onClick={() => setShowAllActivity((v) => !v)}>
              {showAllActivity ? 'Show less' : `Show all ${activity.length} events`}
            </Button>
          </div>
        )}
      </div>

      {onClose && (
        <div className="pp-row">
          <Button variant="quiet" onClick={onClose}>Close</Button>
        </div>
      )}

      <Dialog
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title="Report a file issue"
        description={`The order goes on hold${emailable && emailOn ? ` and we email ${firstName(order.customerName)} your message` : ''}.`}
        footer={
          <>
            <Button variant="quiet" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={TriangleAlert} loading={busy === 'status-file_issue'} onClick={submitIssue}>
              Report file issue
            </Button>
          </>
        }
      >
        <TextAreaField
          label="Message to the customer"
          placeholder="The scan is cut off on page 2. Please send a full copy."
          hint="Say what's wrong and what to send. Keep it short."
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
