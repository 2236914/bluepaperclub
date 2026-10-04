/*
 * "Get updates on Messenger" for one order. Live, the button opens
 * m.me/<page>?ref=<code>; the customer taps Send once and the shop's system
 * messages them from then on. This preview has no real Page, so the button
 * opens a small dialog that explains the one tap, shows the real link, and
 * lets the reviewer simulate sending the message.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { MessageCircle, MessageCircleMore } from 'lucide-react';
import { api, errorMessage } from '../api';
import { Alert, Button, Dialog, Icon, cx } from '../design/components';
import { useI18n } from '../i18n';

export interface MessengerConnectProps {
  code: string;
  /** the order's email: connectMessenger checks it, like the tracking lookup */
  email: string;
  /** order.messengerConnectedAt, when known */
  connectedAt?: string | null;
  /** after a successful (simulated) connect, e.g. to reload the order */
  onConnected?: () => void;
  className?: string;
}

export function MessengerConnect({ code, email, connectedAt, onConnected, className }: MessengerConnectProps) {
  const { m, fmt } = useI18n();
  const t = m.customer.messenger;
  const link = api.messengerLink(code);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justConnected, setJustConnected] = useState(false);
  const connectedRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const connected = justConnected || !!connectedAt;

  // The button that opened the dialog is gone once connected; carry on from the "connected" note.
  useEffect(() => {
    if (justConnected && !open) connectedRef.current?.focus();
  }, [justConnected, open]);

  if (!link) return null;

  const simulate = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.connectMessenger(code, email);
      setJustConnected(true);
      setOpen(false);
      onConnected?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (connected) {
    return (
      <div
        ref={connectedRef}
        tabIndex={-1}
        role="status"
        className={cx('pp-msgr pp-msgr-on', className)}
      >
        <span className="pp-msgr-mark" aria-hidden="true">
          <Icon icon={MessageCircleMore} />
        </span>
        <div className="pp-msgr-copy">
          <p className="pp-msgr-title">{t.connectedTitle}</p>
          <p>{t.connectedBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cx('pp-msgr', className)}>
      <Button size="lg" icon={MessageCircle} className="pp-msgr-btn" onClick={() => setOpen(true)} aria-describedby={`${titleId}-explain`}>
        {t.button}
      </Button>
      <p className="pp-msgr-explain" id={`${titleId}-explain`}>{t.explain}</p>

      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={t.dialogTitle}
        size="md"
        footer={
          <>
            <Button variant="quiet" size="lg" onClick={() => setOpen(false)} disabled={busy}>{m.common.cancel}</Button>
            <Button variant="primary" size="lg" icon={MessageCircle} loading={busy} onClick={simulate} className="pp-msgr-simulate">
              {t.simulate}
            </Button>
          </>
        }
      >
        <div className="pp-msgr-dialog">
          <h3 className="pp-msgr-sub">{t.howTitle}</h3>
          <ol className="pp-msgr-how">
            {t.how.map((line, i) => (
              <li key={i}>
                <span className="pp-msgr-num" aria-hidden="true">{i + 1}</span>
                <p>{line}</p>
              </li>
            ))}
          </ol>
          <p>{t.why}</p>
          <div className="pp-msgr-preview">
            <p>{t.previewNote}</p>
            <span className="t-label">{t.linkLabel}</span>
            <p className="pp-msgr-link">{link}</p>
          </div>
          {error && <Alert tone="error">{fmt.error(error)}</Alert>}
        </div>
      </Dialog>
    </div>
  );
}
