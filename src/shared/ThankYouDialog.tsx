/*
 * The thank-you popup right after a customer sends their files. Written for
 * someone ordering alone for the first time: a big check mark, the order ID
 * very large with a copy button, what to do with it, how to pay, a read-aloud
 * button, and (with their OK) "remember me on this phone".
 */
import { useEffect, useRef, useState } from 'react';
import { Banknote, BookmarkCheck, Check, Mail, PenLine, Smartphone } from 'lucide-react';
import { Button, Dialog, Icon } from '../design/components';
import { useI18n } from '../i18n';
import { addRecentOrder, rememberDetails } from '../lib/remember';
import { MessengerConnect } from './MessengerConnect';
import { CopyCodeButton } from './OrderBits';
import { ReadAloudButton } from './ReadAloudButton';

export interface ThankYouDialogProps {
  open: boolean;
  onClose: () => void;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** this device already remembers the customer; the form saved the order to "your orders on this phone" */
  remembered: boolean;
}

/** "PRT-7K3QM" → "P R T, 7 K 3 Q M", so a speech voice reads it one character at a time. */
export function spellOrderCode(code: string): string {
  return code
    .split('-')
    .map((part) => part.split('').join(' '))
    .join(', ');
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

export function ThankYouDialog({ open, onClose, code, name, email, phone, remembered }: ThankYouDialogProps) {
  const { m } = useI18n();
  const t = m.customer.thanks;
  const first = firstNameOf(name);
  const title = first ? t.title(first) : t.titleNoName;
  const received = email ? t.received : t.receivedNoEmail;
  const speech = [title, received, t.idSpoken(spellOrderCode(code)), t.writeItDown, t.payAtCounter].join(' ');

  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null);
  const answerRef = useRef<HTMLParagraphElement>(null);
  const askToRemember = !remembered && !!email;

  // The question's buttons go away once answered; keep the focus inside the dialog, on the answer.
  useEffect(() => {
    if (answer) answerRef.current?.focus();
  }, [answer]);

  const rememberMe = () => {
    if (!email) return;
    rememberDetails({ name, email, phone: phone ?? '' });
    addRecentOrder({ code, email, createdAt: new Date().toISOString() });
    setAnswer('yes');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <Button variant="primary" size="lg" icon={Check} onClick={onClose} className="pp-ty-done">
          {m.common.done}
        </Button>
      }
    >
      <div className="pp-ty">
        <div className="pp-ty-lead">
          <span className="pp-ty-check" aria-hidden="true">
            <Icon icon={Check} size={40} />
          </span>
          <p className="pp-ty-message">{received}</p>
        </div>

        <div className="pp-ty-id-box">
          <span className="t-label">{t.yourOrderId}</span>
          <p className="pp-ty-id t-mono-id">{code}</p>
          <CopyCodeButton code={code} size="lg" className="pp-ty-copy" />
        </div>

        <ul className="pp-ty-points">
          <li>
            <Icon icon={PenLine} />
            <span className="t-body-strong">{t.writeItDown}</span>
          </li>
          <li>
            <Icon icon={Banknote} />
            <span>{t.payAtCounter}</span>
          </li>
          {email && (
            <li>
              <Icon icon={Mail} />
              <span className="pp-cu-break">{t.emailedTo(email)}</span>
            </li>
          )}
          {remembered && (
            <li>
              <Icon icon={BookmarkCheck} />
              <span>{t.savedToList}</span>
            </li>
          )}
        </ul>

        <div className="pp-ty-read">
          <ReadAloudButton text={speech} size="lg" />
        </div>

        {email && <MessengerConnect code={code} email={email} className="pp-ty-msgr" />}

        {askToRemember && (
          <section className="pp-ty-remember" aria-labelledby="pp-ty-remember-title">
            {answer === null && (
              <>
                <h3 className="pp-ty-remember-title" id="pp-ty-remember-title">
                  <Icon icon={Smartphone} />
                  {t.rememberTitle}
                </h3>
                <p>{t.rememberBody}</p>
                <div className="pp-ty-remember-actions">
                  <Button size="lg" icon={Check} onClick={rememberMe}>{t.rememberYes}</Button>
                  <Button size="lg" variant="quiet" onClick={() => setAnswer('no')}>{t.rememberNo}</Button>
                </div>
              </>
            )}
            <p
              ref={answerRef}
              tabIndex={-1}
              role="status"
              id={answer ? 'pp-ty-remember-title' : undefined}
              className={answer ? 'pp-ty-answer' : 'mn-sr'}
            >
              {answer === 'yes' && <Icon icon={BookmarkCheck} />}
              {answer === 'yes' ? t.rememberedNow : answer === 'no' ? t.notRemembered : ''}
            </p>
          </section>
        )}
      </div>
    </Dialog>
  );
}
